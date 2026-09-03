# Blood Service — Deep-Dive End-to-End Plan
> Source: Blood Service Audit Report + direct code/schema inspection
> (apps/web/src/components/blood-services/*, apps/web/src/app/api/blood-donors|blood-services/*,
> apps/admin/src/components/blood/BloodManager.tsx, apps/admin/src/app/api/admin/blood-*,
> DATABASE-SCHEMA.md §3.3/3.4). Every bug below was re-verified in the actual code, not
> just taken from the audit. Execution order: A (bug fixes, no migration) → B (schema) →
> C (missing features) → D (polish). Work top to bottom, commit after each verified item,
> disclose fixes explicitly per project convention.

## Phase A — Critical Bug Fixes (no schema change)

1. **Donor phone validation mismatch** — client (`DonorRegistrationSheet.tsx`) accepts
   `/^[0-9+]{10,14}$/` with placeholder `+91XXXXXXXXXX`; server (`validations/blood-donors.ts`)
   requires exactly `/^[6-9]\d{9}$/` (bare 10-digit). Fix: normalize on submit — strip
   leading `+91`/`91`/`0`, validate the resulting 10 digits client-side with the *same*
   regex the server uses (extract to a shared `normalizePhone()` helper used by both the
   client check and the POST body), update placeholder to `XXXXXXXXXX`.

2. **Blood bank count wrong** — header renders `bloodBanks.length` (unfiltered) while the
   list below applies `.filter(b => !selectedGroup || ...)`. Fix: compute the filtered
   array once, use its `.length` for the header and for the `.map()`.

3. **"Has stock" filter is wrong** — the same filter only checks *presence* of a stock row
   for the group (`b.stock.some(s => s.blood_group === selectedGroup)`), so a bank with
   `stock_level: 'unavailable'` for that group still shows up as if it has it. Fix: check
   `stock_level === 'available' || stock_level === 'low'`.

4. **"২৪ ঘণ্টা খোলা" is wrong** — renders whenever `has_emergency_dept` is true, unrelated
   to actual hours. `hospitals.operating_hours` (`{is_24x7, schedule}`) is already fetched
   in `getBloodBanks()` but never used. Fix: render from `operating_hours.is_24x7` /
   `schedule`, drop the emergency-dept conflation entirely.

5. **Privacy fail-open** — `contact/route.ts`: on `rateLimitError` it only `console.error`s
   and falls through to the RPC call, i.e. reveals the phone number if the rate-limit check
   itself fails. Fix: fail-closed — return 503/429 on `rateLimitError` instead of proceeding.

6. **Donor list doesn't refresh after registration** — `DonorRegistrationSheet` closes on
   success but never notifies `BloodServicesClient`. Fix: `onSuccess` callback prop that
   re-triggers the existing `/api/blood-services` fetch (or prepends the new donor
   optimistically using the id/fields echoed back from the POST response).

7. **Admin donor list capped at 200, no pagination** — `blood-donors/page.tsx` does
   `.limit(200)` with all filtering done client-side in `BloodManager`. Fix: server-side
   pagination (cursor or offset) + move `qGroup`/`qLoc` filters into the query.

8. **No name/phone search in admin** — only group/location dropdowns exist. Fix: add a
   debounced text search box filtering by name/phone server-side (admin has service-role
   access, so raw phone search is fine).

9. **Desktop "blank tab" on donor contact tap** — `<a href="/api/blood-donors/[id]/contact">`
   302-redirects to a `tel:` URL, which desktop browsers can't handle and often open as a
   blank tab. Fix: detect non-touch/desktop (e.g. `matchMedia('(pointer: coarse)')`) and
   show the number as copyable text via a small fetch+reveal instead of a top-level nav.

## Phase B — Schema Additions (migration)

> **Superseded by `BLOOD-SERVICE-SPEC.md`.** The version below only covers "post a
> request, reveal a phone" — it never tracks whether the donor actually showed up or
> donated. `BLOOD-SERVICE-SPEC.md` is the authoritative spec for Phase B/C.1
> (adds `blood_request_responses`, a two-sided confirm state machine, admin dispute
> queue, and reuses `data_reports` for moderation). Left here for history only.

- **`blood_requests` table** (new — the "রক্ত চাই" flow, currently fully absent):
  ```sql
  CREATE TABLE blood_requests (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name   TEXT,
    blood_group    TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
    units_needed   INT NOT NULL DEFAULT 1,
    urgency        TEXT NOT NULL CHECK (urgency IN ('critical','today','this_week')),
    hospital_id    UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    location_id    UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    contact_name   TEXT NOT NULL,
    contact_phone  TEXT NOT NULL,
    notes          TEXT,
    status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','expired','cancelled')),
    expires_at     TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
  );
  ```
  - RLS mirrors `blood_donors`: public INSERT allowed (rate-limited 1/phone/24h via
    `check_rate_limit`), public SELECT only through a `public_blood_requests` view that
    omits `contact_phone`; a `get_blood_request_phone(id)` SECURITY DEFINER RPC (same
    pattern as `get_donor_phone`) resolves it server-side, rate-limited per IP+request.
  - Staleness/expiry computed at read time (`status='open' AND expires_at > now()`) —
    same "computed not maintained" convention as `blood_bank_inventory`, no cron needed.
  - Admin gets full raw-table access via service role (list, sort by urgency, mark
    fulfilled/expired/cancelled).

- **Hospitals hours bug** needs no schema change — `operating_hours` already exists and is
  already fetched; Phase A item 4 is a rendering fix only.

## Phase C — Missing Feature Build-out

1. **Blood Request flow end-to-end** (the single biggest gap):
   - User app: "রক্ত চাই" bottom sheet (same pattern as donor registration) reachable from
     (a) a new tab on the blood-services page, (b) the homepage blood-group pills once
     wired (see below), (c) Emergency FAB.
   - Open requests listed on the blood-services page (urgent ones visually highlighted),
     so donors browsing can respond directly — contact via the same tap-to-reveal pattern
     as donors.
   - Admin: new "অনুরোধ" tab in `BloodManager` — urgency-sorted table, fulfil/expire/cancel
     actions, shows a live count of matching active donors in that district+group.

2. **Admin donor edit** — currently only active/inactive toggle + soft delete exist, no
   way to fix a wrong name/phone/group. Extend `PATCH /api/admin/blood-donors/[id]` to
   accept `name`/`phone`/`blood_group`/`location_id`, add an edit modal in `BloodManager`.

3. **Blood bank detail page** — dedicated `/health/blood-services/[hospitalSlug]` (or
   reuse the hospital detail route) with full stock table, hours, WhatsApp button, map.

4. **WhatsApp CTA** — `hospitals.whatsapp_number` already exists and is already fetched in
   `getBloodBanks()` but never rendered; add a `wa.me` button next to the call button.

5. **Homepage blood-group pills wired** — `BloodServicesCTA.tsx` renders the 8 groups as
   plain `<span>`s (not tappable at all, confirming the audit's "dead button" note). Fix:
   make each a `Link` to `/health/blood-services?group=X`; page reads the query param to
   pre-select the group in `BloodServicesClient`.

6. **Emergency FAB → blood shortcut** — reduce the current multi-tap path; FAB gets a
   direct "নিকটতম ব্লাড ব্যাংকে কল করুন" action using the user's district (already in the
   Zustand store) to call the nearest verified blood bank's number in one tap.

## Phase D — Small Polish

- Show `last_donated_at` + district name on donor cards (data already queried; district
  name needs a lookup against the already-loaded `districts` prop — no new fetch).
- Stock icon legend strip (✅ উপলব্ধ · ⚠️ কম · ❌ নেই) shown once above the stock section.
- Per-IP secondary rate limit on donor registration (currently only per-phone/90days) —
  add `check_rate_limit('donor_register_ip:'+ip, 5, '1 day')` alongside the existing check.
- Admin stale-stock visibility — badge per hospital in the inventory tab when
  `updatedAt` > 48h old, plus a page-level "N ব্যাংকের স্টক পুরনো" summary banner so this
  doesn't silently go dark the way it does today.

## Execution Order
1. Phase A (8 fixes, each a separate small commit).
2. Migration for `blood_requests` + RLS + RPC; `get_advisors` (security + performance)
   against baseline.
3. Phase C.1 Blood Request flow (user + admin), then C.5/C.6 wiring.
4. Phase C.2–C.4 (admin edit, bank detail page, WhatsApp).
5. Phase D polish items.
6. Update `TODO.md`/`CHECKPOINT.md` as each step lands.
