# Blood Service — Full Spec (v2, Lifecycle-Complete)
> Supersedes the "just add blood_requests" section of BLOOD-SERVICE-PLAN.md Phase C.1.
> Bug fixes in that file (Phase A/D) still stand as-is and go first. This document
> replaces Phase B/C for the **request/donation lifecycle** only, because the original
> plan stopped at "post a request, reveal a phone number" — it never tracked what
> happens after a donor says "আমি যাব" (I'll go). That gap is the actual product:
> a phone directory is not a coordination system. This is health-critical — no
> shortcuts.

---

## 0. Non-negotiable ground truth

**Vytanexa is a connector, not a medical transaction system.** It cannot draw blood,
cross-match, screen for disease, or legally facilitate a direct donor→patient
transfusion. Every request MUST be anchored to a real, `verification_status='verified'`
hospital tagged `blood_bank` — donation always happens *at* that blood bank, under
medical staff, never peer-to-peer. This is stated up front because it shapes every
decision below: `hospital_id` on a request is **required**, not optional (the current
plan had it nullable — that's wrong and gets corrected here).

The app cannot *prove* a donation happened — no digital link to blood bank systems
exists or is planned for v1. So the design goal is not "verify truth with certainty,"
it's "make the two people closest to the truth (donor + requester) each confirm it,
catch mismatches, and give admin the tools to chase disputes by phone." This is the
same honesty standard the project already applies elsewhere (e.g. computed-not-stale
data, disclosed bugs) — it should show up in the UI as an explicit disclaimer, not be
hidden.

---

## 1. Actors & what each one can do

| Actor | Can do |
|---|---|
| Requester | Post a request (anchored to a verified blood bank), see who committed, mark "রক্ত পেয়েছি" (received), report a no-show |
| Donor | Browse open requests, tap "আমি যাব" (commit), later mark "রক্ত দিয়েছি" (donated), report a bad-faith request |
| Blood bank | Offline only in v1 — no digital portal. The place where donation physically happens. |
| Admin | Full visibility into every request + response, resolve disputes, moderate flagged donors/requesters, deactivate bad actors |

---

## 2. State machine

### `blood_requests.status`
```
open ──(donor commits)──> open (unchanged; commits don't close it — multiple people may respond)
open ──(requester marks received)──> fulfilled
open ──(time passes, urgency-based deadline)──> expired
open ──(requester cancels)──> cancelled
```
Urgency → auto-expiry window: `critical` = 2 days, `today` = 1 day, `this_week` = 7 days.
Computed at read time (`status='open' AND expires_at > now()`), same convention as
`blood_bank_inventory` staleness — no cron.

### `blood_request_responses.status` (one row per donor who commits to a request)
```
committed ──(donor self-reports)──> donor_confirmed
committed ──(requester or donor reports no-show)──> no_show
committed ──(donor withdraws)──> cancelled
```

### Reconciliation rule (this is the actual anti-fraud core)
- Request `fulfilled` **requires** the requester to pick which response(s) fulfilled it
  (if only one donor committed, auto-suggested; if several, requester picks).
- If a request is marked `fulfilled` but the linked response never reached
  `donor_confirmed`, OR a response reaches `donor_confirmed` but its request never
  reaches `fulfilled` within 48h — both are **mismatches**, surfaced in a dedicated
  admin "বিরোধ" (disputes) queue for a manual follow-up call. This is the mechanism
  that catches fake commits, fake fulfillment claims, and no-shows that nobody
  bothered to report.

---

## 3. Schema (migration, extends BLOOD-SERVICE-PLAN.md Phase B)

```sql
CREATE TABLE blood_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name    TEXT,
  blood_group     TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
  units_needed    INT NOT NULL DEFAULT 1,
  urgency         TEXT NOT NULL CHECK (urgency IN ('critical','today','this_week')),
  hospital_id     UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,  -- REQUIRED, not nullable
  contact_name    TEXT NOT NULL,
  contact_phone   TEXT NOT NULL,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','fulfilled','expired','cancelled')),
  fulfilled_via   UUID,  -- FK to blood_request_responses.id, added after that table exists
  expires_at      TIMESTAMPTZ NOT NULL,  -- set server-side from urgency at insert
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE blood_request_responses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id           UUID REFERENCES blood_donors(id) ON DELETE SET NULL,  -- nullable: ad-hoc responder
  responder_name     TEXT NOT NULL,
  responder_phone    TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'committed'
                       CHECK (status IN ('committed','donor_confirmed','no_show','cancelled')),
  committed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at       TIMESTAMPTZ,
  no_show_reported_by TEXT CHECK (no_show_reported_by IN ('requester','donor','admin')),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE blood_requests
  ADD CONSTRAINT fk_requests_fulfilled_via
  FOREIGN KEY (fulfilled_via) REFERENCES blood_request_responses(id) ON DELETE SET NULL;

CREATE INDEX idx_requests_status_open ON blood_requests(status, urgency)
  WHERE status = 'open' AND deleted_at IS NULL;
CREATE INDEX idx_responses_request ON blood_request_responses(request_id);
CREATE INDEX idx_responses_donor ON blood_request_responses(donor_id) WHERE donor_id IS NOT NULL;

CREATE TRIGGER trg_blood_requests_updated_at BEFORE UPDATE ON blood_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blood_responses_updated_at BEFORE UPDATE ON blood_request_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**Reused, not reinvented:** the "report a bad actor" mechanism is the *existing*
`data_reports` table (DATABASE-SCHEMA.md §5.4) — extend its `entity_type` enum with
`'blood_donor'` and `'blood_request'` (`ALTER TYPE entity_type ADD VALUE ...`) instead
of building a bespoke moderation table. This matches the project's own stated
principle ("Generic > bespoke — subscriptions, rate_limits, analytics_events") and
gives admin one unified reports queue instead of a second one just for blood.

**Donor reliability** (committed / donor_confirmed / no_show counts) is a computed
view over `blood_request_responses` grouped by `donor_id`, not stored counters —
same "computed, not maintained" convention as inventory staleness. Shown to admin
only in v1, not public (avoids donors gaming a public score).

### RLS
- Public INSERT on `blood_requests` (rate-limited 1/phone/24h via `check_rate_limit`,
  same mechanism as donor registration).
- Public read via `public_blood_requests` view (omits `contact_phone`), same pattern
  as `public_blood_donors`.
- Public INSERT on `blood_request_responses` (a donor committing) — rate-limited too.
- Phone reveal both directions via SECURITY DEFINER RPCs mirroring `get_donor_phone`:
  `get_request_contact_phone(request_id)` and `get_response_contact_phone(response_id)`,
  each rate-limited per IP+target. Requester's phone reveals to a donor **after** they
  commit (not before — controls scope/spam); donor's phone reveals to the requester
  the same way. Neither is ever public/plaintext in a list.
- Status transitions (`donor_confirmed`, `fulfilled`, `no_show`) go through Route
  Handlers, not raw client writes — same reasoning as `apps/web` never holding
  elevated access: these are trust-sensitive state changes, not open updates.

---

## 4. Fake donor / fake requester moderation — the real blocker

Without **phone ownership verification at registration**, nothing stops someone from
registering fake donors or posting fake requests with any number they type in — the
`chk_donor_consent`/rate-limit checks only prevent *repeat* abuse from the *same*
number, not a *first* fake number. This is the one piece that needs a product decision
before it can be built:

> **Decision needed from Juyel:** OTP verification (SMS or WhatsApp) at donor
> registration and request creation requires a paid provider (e.g. MSG91, Twilio,
> WhatsApp Business API) — real recurring cost, needs an account/vendor choice. Do we
> budget for this now, or launch v1 without it and rely on the mitigations below?

**v1 without OTP (buildable now, zero added cost):**
- Two-sided confirm + dispute queue (§2) — the strongest available fraud signal
  without OTP, because it requires *two independent people* to agree.
- Reuse `data_reports` for a "report this donor / this request" button, surfaced to
  admin's existing reports queue, repeated reports → auto-flag for review.
- Donor reliability view (§3) visible to admin — a donor with several `no_show`s and
  no `donor_confirmed`s gets manually deactivated.
- Existing per-phone rate limits (registration: 1/90days, contact reveal: 5/hour)
  stay as first-line spam control.

**v2 (once a provider is chosen):** OTP at registration + request creation closes the
identity gap properly. Designing the schema/RLS above to already separate
`donor_id`/`responder_phone` etc. means OTP can be layered in later without a rework.

---

## 5. Admin panel additions

New **"রক্তের অনুরোধ"** tab in `BloodManager`:
- Table: request, urgency (color-coded), hospital, committed-donor count, status,
  age. Sortable by urgency, filterable by status.
- Row expand → all responses for that request with each responder's status.
- **বিরোধ (Disputes)** sub-view: requests/responses with a §2 mismatch, surfaced with
  both parties' phone numbers (admin has service-role access, no reveal RPC needed)
  for a manual follow-up call — this is the safety net for everything OTP would have
  caught automatically.
- Donor tab gets a reliability column (committed / confirmed / no-show) computed from
  the view in §3.
- Reports queue already exists for `data_reports` — just needs the two new
  `entity_type` values wired into its filters.

---

## 6. User-app additions

- Blood-services page gets a third tab: **"প্রয়োজন"** (requests) — open requests,
  urgent ones visually distinct, each showing hospital name/address/map link (never
  omit — this is where the donor actually goes) and a committed-donor count.
- "আমি যাব" button on a request → creates the response row → reveals requester's
  phone → adds the request to the donor's own **"আমার প্রতিশ্রুতি"** (my commitments)
  list, where they later tap "রক্ত দিয়েছি" to self-confirm.
- Requester's own request needs to be revisitable without a login (this app is
  guest-first). v1 approach: remember posted request IDs in `localStorage` on the
  device that created it (works for the common case — same phone, same session) +
  a phone-based lookup fallback (`POST /api/blood-requests/lookup {phone}` returns
  the requester's own open requests) for cross-device access, rate-limited like
  everything else here.
- A persistent, honest disclaimer on both the request form and the request detail
  view: **"রক্তদান শুধুমাত্র লাইসেন্সপ্রাপ্ত ব্লাড ব্যাংকে হবে। অ্যাপ শুধু যোগাযোগ করিয়ে দেয়,
  চিকিৎসাগত স্ক্রিনিং বা রক্ত সরবরাহের দায়িত্ব নেয় না।"** — sets correct expectations,
  matches the "no compromise on health" standard.

---

## 7. Explicitly out of scope for v1 (so it's a decision, not a silent gap)

- Push/SMS notification to matching donors when a request is posted (needs FCM or an
  SMS provider — same vendor question as §4; can layer on once §4 is decided).
- Any digital integration with blood bank staff systems (doesn't exist; donation
  confirmation stays two-sided self-report + admin dispute resolution, §2).
- Donor-side public reliability score (kept admin-only in v1 to prevent gaming).
- Transport/logistics assistance for the donor getting to the blood bank.

---

## 8. Build order (once Juyel decides §4)

1. Phase A bug fixes from BLOOD-SERVICE-PLAN.md (unchanged, first).
2. Migration: `blood_requests` + `blood_request_responses` + `entity_type` enum
   extension for `data_reports` reuse + all RPCs/RLS above. `get_advisors` pass.
3. Request creation + browse + commit flow (user app).
4. Two-sided confirm flow (donor "রক্ত দিয়েছি" / requester "রক্ত পেয়েছি") + dispute
   detection logic.
5. Admin "রক্তের অনুরোধ" tab incl. disputes sub-view + donor reliability column.
6. Report button wired into existing `data_reports`/admin reports queue.
7. Remaining BLOOD-SERVICE-PLAN.md Phase C/D items (bank detail page, WhatsApp CTA,
   homepage pill wiring, polish).
