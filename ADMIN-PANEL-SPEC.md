# Vytanexa Admin Panel — "Ultra God Mode"
**Stack:** Next.js (TypeScript) · same Supabase project, service-role backend
**Audience:** Non-technical admin operator (you) — every screen must be
self-explanatory, forgiving of mistakes (soft-delete + audit log backstop
everything), and never require touching code to change the live app.
**Status:** Built incrementally, block by block. See TOC.

---

## TABLE OF CONTENTS

- [x] A01 — Admin Design System · Component Philosophy (data-dense, desktop-first)
- [x] A02 — Information Architecture · Navigation · Auth & Roles
- [x] A03 — Dashboard Home · Unified Moderation Queue Pattern
- [x] A04 — Locations Manager · Categories Manager
- [x] A05 — Doctors Manager (List · CRUD · Verification · Chambers)
- [x] A06 — Hospitals Manager + Ambulance + Blood Bank Management
- [x] A07 — Homepage Section Control · Theme Editor  ★ God Mode Core ★
- [ ] A08 — Footer/Social/Contact Editor · Feature Flags · Menu Manager
- [ ] A09 — Custom Page / Block Builder  ★ Biggest Single Screen ★
- [ ] A10 — Articles CMS · Q&A Management
- [ ] A11 — Polls Composer · Notifications/Announcement Composer
- [ ] A12 — Subscription Plans Manager · Ads Manager
- [ ] A13 — Leads Inbox
- [ ] A14 — Admin Users/Roles · Audit Log Viewer
- [ ] A15 — Analytics Dashboard · General Settings

---

## A01 — ADMIN DESIGN SYSTEM · COMPONENT PHILOSOPHY

### Why NOT Reuse the User-App Design System Wholesale
The user app (S01) is optimized for one-handed mobile thumb use,
Bengali-first, low information density, generous whitespace. The admin
panel has the opposite job: **one operator, desktop-first, scanning
tables of 500+ rows, filling long forms, making fast bulk decisions.**
Reusing S01's spacing/type-scale here would make every screen feel
sparse and force excessive scrolling. So: **shared brand identity
(colors, logo, tone), different component density.**

### What Carries Over Unchanged From S01
```
Brand colors        → identical tokens (brand-600, life-600, emergency-600...)
Font families        → identical (Plus Jakarta Sans for UI chrome; admin
                       panel is primarily English/mixed so Bengali font
                       is secondary here, reversed from user app)
Motion easing curves  → identical (ease-out, ease-spring)
Border radius scale   → identical, but admin skews toward smaller radii
                       (sm/md) — dense data UI reads better with tighter
                       corners than the user app's generous xl/2xl cards
```

### What's New/Different for Admin
```css
/* Density-first spacing scale (tighter than user app) */
--admin-space-1: 4px;   --admin-space-2: 8px;   --admin-space-3: 12px;
--admin-space-4: 16px;  --admin-space-6: 24px;  --admin-space-8: 32px;

/* Table row height — information density is the priority */
--table-row-height-compact: 40px;   /* default for large lists */
--table-row-height-comfortable: 56px; /* for rows with avatar/photo */

/* Sidebar */
--sidebar-width-expanded: 240px;
--sidebar-width-collapsed: 64px;

/* Admin surface tones — subtle gray canvas, white cards, NOT the
   brand-tinted shadow-card look from user app (that would fatigue
   the eye across dozens of table rows) */
--admin-bg-canvas: #F4F5F7;
--admin-bg-card: #FFFFFF;
--admin-border: #E2E4E9;
```

### Typography (Desktop Scale)
```css
--admin-text-h1: 24px/700;   /* page titles */
--admin-text-h2: 18px/600;   /* section headers, card titles */
--admin-text-h3: 15px/600;   /* table column headers, form labels */
--admin-text-body: 14px/400; /* table cells, general content — this is
                               the WORKHORSE size, everything defaults here */
--admin-text-small: 12px/400; /* meta text, timestamps, helper text */
--admin-text-mono: 13px monospace; /* IDs, tokens, phone numbers */
```

### Core Component Additions (Beyond S01's Atomic Set)

**DataTable** — the single most-used component in the entire admin panel
```
Features: sortable columns · sticky header on scroll · row selection
(checkboxes) for bulk actions · inline status badges · row-hover action
icons (edit/view/delete appear on hover, not always visible — reduces
visual clutter) · pagination footer (25/50/100 per page) · empty state
· loading skeleton rows · column visibility toggle (operator can hide
columns they don't need) · sticky "bulk actions" bar appears when
rows selected
```

**FormSection** — collapsible grouped form fields (long forms like
Doctor Create/Edit have 20+ fields; grouping into named collapsible
sections — "Basic Info", "Chambers", "SEO" — prevents one giant
overwhelming scroll)

**StatusBadge** — consistent color-coded pill used everywhere
(pending=accent-500, verified/approved=life-600, rejected=emergency-500,
suspended=neutral-500)

**ConfirmDialog** — every destructive action (delete, reject, suspend)
routes through one shared confirm component: shows what will happen in
plain language, requires explicit confirm click, never a silent
one-tap delete. This is the primary safety net against admin mistakes
alongside soft-delete + audit log.

**MediaUploader** — drag-drop image upload to Supabase Storage, with
preview, crop-to-aspect-ratio helper (e.g. forces 16:9 for article
covers, 1:1 for doctor photos), progress bar, and automatic
WebP conversion before upload (keeps storage costs + page load fast
on the user-app side — a decision made once here, benefits every image
across the whole platform).

**RichTextEditor** — for Article body / Custom Page rich_text blocks.
Constrained toolbar (headings, bold/italic, lists, links, image embed)
— NOT a full HTML source editor, to prevent an accidental broken tag
from breaking the live user-facing page. Output is sanitized server-side
regardless (defense in depth, matches the DB schema note on
`articles.body_html`).

**JSONPreview** — read-only formatted preview panel shown next to any
JSONB-editing form (theme colors, feature flags) so the non-technical
operator sees a friendly form UI on the left, and can optionally
expand a "advanced/raw view" on the right for transparency/trust —
never required to hand-edit JSON, but visible for confidence.

### Layout Shell (Every Admin Page)
```
┌───────────┬─────────────────────────────────────────────┐
│           │  [Page Title]              [Primary Action]  │  ← 64px topbar
│  SIDEBAR  ├─────────────────────────────────────────────┤
│           │                                             │
│  240px    │              PAGE CONTENT                   │
│  fixed    │                                             │
│           │                                             │
│  (S02-    │                                             │
│  style    │                                             │
│  grouped  │                                             │
│  nav —    │                                             │
│  full map │                                             │
│  in A02)  │                                             │
│           │                                             │
└───────────┴─────────────────────────────────────────────┘
```
Sidebar collapsible (icon-only 64px mode) for smaller laptop screens.
Topbar: breadcrumb-style page title (left), primary action button
(right, e.g. "+ নতুন ডাক্তার যোগ করুন"), admin avatar+role menu (far right).

### Responsive Stance
Admin panel is **desktop-first, tablet-usable, not mobile-optimized**
— this is a deliberate, correct trade-off. Deep data-table work and
block-builder drag-drop genuinely need screen real estate; forcing a
mobile-first admin would compromise the desktop experience for a use
case (managing a directory of hundreds of doctors) that will
overwhelmingly happen at a desk. Breakpoint floor: 768px, below which
the panel shows a polite "ডেস্কটপ বা ট্যাবলেটে ব্যবহার করুন" notice
rather than attempting a broken cramped layout.

### Accessibility & Trust Signals (Non-Technical Operator Specific)
```
Every form field:      inline validation with plain-language errors
                       (not "Error 422", but "ফোন নম্বর ১০ সংখ্যার হতে হবে")
Every save action:      visible toast confirmation ("সংরক্ষিত হয়েছে ✅")
Every destructive action: ConfirmDialog, never instant
Every list/table:       empty state explains WHY it's empty + what to
                       do next (never a bare blank table)
Autosave drafts:        long forms (Custom Page builder, Article editor)
                       autosave to a draft state every 30s — protects
                       a non-technical user from losing 20 minutes of
                       work to an accidental tab close
```

---

## A02 — INFORMATION ARCHITECTURE · NAVIGATION · AUTH & ROLES

### Sidebar Navigation Map
```
📊 ড্যাশবোর্ড
─────────────────────────
এন্টিটি ম্যানেজমেন্ট
  👨‍⚕️ ডাক্তার
  🏥 হাসপাতাল
  📍 এলাকা (Locations)
  🏷️ বিভাগ (Categories)
  🩸 ব্লাড ব্যাংক
  🚑 অ্যাম্বুলেন্স
─────────────────────────
মডারেশন
  ⭐ রিভিউ                    [count badge]
  🙋 প্রশ্নোত্তর               [count badge]
  🚩 তথ্য রিপোর্ট             [count badge]
─────────────────────────
কন্টেন্ট
  📰 আর্টিকেল
  📊 জরিপ (Polls)
  📄 কাস্টম পেজ
  🔔 নোটিফিকেশন
─────────────────────────
বিজনেস
  📋 লিড ইনবক্স                [count badge]
  💳 সাবস্ক্রিপশন প্ল্যান
  📢 বিজ্ঞাপন
─────────────────────────
গড মোড কন্ট্রোল
  🏠 হোমপেজ সেকশন
  🎨 থিম এডিটর
  📱 ফুটার ও সোশ্যাল
  🚩 ফিচার ফ্ল্যাগ
  ☰ মেনু ম্যানেজার
─────────────────────────
সিস্টেম
  📈 অ্যানালিটিক্স
  👤 অ্যাডমিন ও রোল
  📜 অডিট লগ
  ⚙️ সেটিংস
─────────────────────────
[Admin Avatar]  নাম, রোল       [সাইন আউট]
```

### Sidebar Grouping Rationale
6 groups, not a flat 20-item list — matches how the underlying schema
is organized (Parts 1-5) so the mental model stays consistent between
"what admin panel section am I in" and "which DB tables am I touching."
**"গড মোড কন্ট্রোল"** is its own distinct group (not buried in Content)
because these are the highest-leverage, highest-blast-radius screens —
visually separated to make the operator pause and be deliberate.

### Route Map (Next.js App Router — Separate App from User App)
```
admin/app/
├── (auth)/
│   └── login/page.tsx              ← /login, no sidebar
├── (dashboard)/                    ← sidebar shell layout
│   ├── layout.tsx                  ← auth guard + role check + sidebar
│   ├── page.tsx                    ← / → Dashboard Home
│   ├── doctors/
│   │   ├── page.tsx                ← list
│   │   ├── new/page.tsx            ← create
│   │   └── [id]/page.tsx           ← edit
│   ├── hospitals/{page,new,[id]}.tsx
│   ├── locations/page.tsx          ← tree view, inline CRUD (no separate new/edit route)
│   ├── categories/page.tsx
│   ├── blood-donors/page.tsx
│   ├── ambulance/{page,new,[id]}.tsx
│   ├── moderation/
│   │   ├── reviews/page.tsx
│   │   ├── qa/page.tsx
│   │   └── reports/page.tsx
│   ├── articles/{page,new,[id]}.tsx
│   ├── polls/{page,new,[id]}.tsx
│   ├── pages/                      ← custom page builder
│   │   ├── page.tsx                ← list
│   │   └── [id]/page.tsx           ← block builder editor
│   ├── notifications/{page,new}.tsx
│   ├── leads/page.tsx
│   ├── subscriptions/{plans,entities}/page.tsx
│   ├── ads/{page,new,[id]}.tsx
│   ├── god-mode/
│   │   ├── homepage/page.tsx
│   │   ├── theme/page.tsx
│   │   ├── footer/page.tsx
│   │   ├── flags/page.tsx
│   │   └── menu/page.tsx
│   ├── analytics/page.tsx
│   ├── admins/{page,new,[id]}.tsx
│   ├── audit-log/page.tsx
│   └── settings/page.tsx
└── api/
    └── [mirrors each domain — server-side service-role mutations]
```

**Deployment note:** separate Next.js project/repo from the user app
(or a monorepo with two apps) — different auth model, different design
system, different deploy cadence (admin changes shouldn't risk a user-app
redeploy). Both connect to the **same Supabase project**. Recommend a
subdomain: `admin.vytanexa.app` (or `vytanexa-admin.vercel.app`
initially) — never expose admin routes on the main consumer domain.

### Authentication Flow
```
/login
┌─────────────────────────────────────────────┐
│              ◈ Vytanexa Admin                │
│                                             │
│  ইমেইল / ফোন   [_____________________]      │
│  পাসওয়ার্ড      [_____________________]      │
│  [সাইন ইন]                                   │
│                                             │
│  (No public signup — accounts created only   │
│   by super_admin via Admin Users screen, A14)│
└─────────────────────────────────────────────┘
```
Uses Supabase Auth (email/password, separate credential set from the
user-app's phone-OTP flow) — session checked in `(dashboard)/layout.tsx`
against the `admin_users` table (from DB Part 5): must have a row with
`is_active = true`, or redirect to `/login` with "অ্যাক্সেস নেই" message.
2FA (TOTP) recommended as a Phase 2 hardening step given the blast
radius of this panel — noted, not blocking for launch.

### Role & Permission Matrix
```
                          super_admin  admin   moderator  editor
─────────────────────────────────────────────────────────────────
Doctors/Hospitals CRUD         ✅        ✅        ❌        ✅
Verify doctor/hospital         ✅        ✅        ❌        ❌
Moderation (reviews/QA/reports)✅        ✅        ✅        ❌
Articles/Polls/Custom Pages    ✅        ✅        ❌        ✅
Publish content live           ✅        ✅        ❌        ❌
  (editor can DRAFT, not publish — a review step, matches the
   RichTextEditor safety philosophy from A01)
Notifications/Announcements    ✅        ✅        ❌        ❌
Leads inbox                    ✅        ✅        ❌        ❌
Subscription plans/pricing     ✅        ❌        ❌        ❌
Ads management                 ✅        ✅        ❌        ❌
God Mode (homepage/theme/       ✅        ❌        ❌        ❌
  footer/flags/menu)
  (deliberately super_admin-only — this is the highest blast-radius
  category; even a trusted "admin" role shouldn't casually reshuffle
  the live homepage or repaint the brand colors)
Analytics                      ✅        ✅        ✅        ❌
Manage other admins            ✅        ❌        ❌        ❌
Audit log (view)                ✅        ✅        ❌        ❌
Settings                       ✅        ❌        ❌        ❌
```
Enforced in TWO layers (defense in depth, matching the RLS philosophy
from the DB schema): (1) sidebar hides items the role can't access —
UX-level, prevents confusion; (2) every server-side mutation route
independently re-checks the role via `admin_users.role` +
`permissions` JSONB override — never trusts the client to have hidden
a button correctly. `admin_users.permissions` JSONB allows
super_admin to grant a one-off exception (e.g. "this specific admin
CAN also touch god-mode") without inventing a new role.

### Practical Starting Point for a Solo/Small Team
Given this is currently a one-person operation (you), day one setup:
one `super_admin` account (you). As the team grows — hiring a content
editor for articles, a moderator for reviews — this matrix is already
ready without any schema or code change, just assigning roles in A14.

---

## A03 — DASHBOARD HOME · UNIFIED MODERATION QUEUE PATTERN

### Dashboard Home (`/`)
```
┌─────────────────────────────────────────────────────────────┐
│  স্বাগতম, জুয়েল 👋                          শনিবার, ১১ জুলাই │
├─────────────────────────────────────────────────────────────┤
│  ⏳ আজ যা মনোযোগ দরকার                                        │
│  ┌───────────┐┌───────────┐┌───────────┐┌───────────┐       │
│  │ ⭐ ৮ টি   ││ 🙋 ৩ টি   ││ 🚩 ২ টি   ││ 📋 ৫ টি   │       │
│  │ রিভিউ     ││ প্রশ্ন     ││ রিপোর্ট    ││ নতুন লিড   │       │
│  │ অপেক্ষমাণ  ││ অপেক্ষমাণ  ││ খোলা      ││            │       │
│  │ [দেখুন →] ││ [দেখুন →] ││ [দেখুন →] ││ [দেখুন →] │       │
│  └───────────┘└───────────┘└───────────┘└───────────┘       │
├─────────────────────────────────────────────────────────────┤
│  📊 এই মাসের সংক্ষিপ্ত চিত্র                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ মোট ডাক্তার: ২৪৩     │  │ মোট হাসপাতাল: ৬৮     │           │
│  │ ↑ ১২ নতুন এই মাসে    │  │ ↑ ৩ নতুন এই মাসে     │           │
│  └─────────────────────┘  └─────────────────────┘           │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ পেজ ভিউ (৩০ দিন)      │  │ টপ সার্চ (এই সপ্তাহে) │           │
│  │ [Line chart]          │  │ ১. মেডিসিন ডাক্তার    │           │
│  │ ৪২,১৮০ ভিউ            │  │ ২. হৃদরোগ বিশেষজ্ঞ    │           │
│  └─────────────────────┘  └─────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  🕐 সাম্প্রতিক অ্যাডমিন কার্যকলাপ                              │
│  • আপনি Dr. রহিম উদ্দিন কে ভেরিফাই করেছেন — ২ ঘণ্টা আগে       │
│  • আপনি হোমপেজে নতুন ব্যানার যোগ করেছেন — ৫ ঘণ্টা আগে         │
│  [পুরো অডিট লগ দেখুন →]                                       │
└─────────────────────────────────────────────────────────────┘
```

### Design Intent
Dashboard answers ONE question first: **"আজ আমার কী করা দরকার?"** —
the attention-needed row (pending queues) sits above the vanity-metrics
row (totals/charts), reversed from typical admin dashboards that lead
with charts. For a solo non-technical operator, "8 reviews waiting"
is actionable; a line chart is not — so it's positioned as
secondary/contextual, not the hero.

### Attention Cards
Each card: count (large, 28px bold), label, colored left-border
matching urgency (reports=emergency-500, reviews/QA=accent-500,
leads=brand-600), "দেখুন →" jumps directly into that queue with
filters pre-applied (e.g. leads card → `/leads?status=new`). Card
count = 0 → card auto-hides (no "0 pending" clutter), and if ALL
queues are empty, the whole attention row collapses to a friendly
"✅ সব কিছু আপ টু ডেট!" single-line state.

### Recent Admin Activity
Reads directly from `audit_logs` (DB Part 5), last 5 entries,
human-readable action descriptions generated from
`{action, entity_type, entity_id}` via a small formatter map — full
detail lives in A14's dedicated Audit Log viewer.

---

## UNIFIED MODERATION QUEUE PATTERN
> Reviews, Q&A, and Data Reports (three separate DB tables, three
> separate routes: `/moderation/reviews`, `/moderation/qa`,
> `/moderation/reports`) share ONE interaction pattern end-to-end.
> Documenting it once here; each route is a thin data-binding on top
> of this shared `<ModerationQueue>` component — avoids re-specifying
> near-identical UI three times, and guarantees the operator learns
> the pattern once and reuses it everywhere.

### Shared Layout
```
┌─────────────────────────────────────────────────────────────┐
│  রিভিউ মডারেশন                                                │
├─────────────────────────────────────────────────────────────┤
│  [অপেক্ষমাণ (৮)] [অনুমোদিত] [প্রত্যাখ্যাত]      🔍[খুঁজুন...]  │  ← status tabs
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⭐⭐⭐⭐⭐  Dr. Priyanka Das এর জন্য                     │    │
│  │ "ওনার চিকিৎসা অনেক ভালো। ধৈর্য সহকারে..."              │    │
│  │ — মো. করিম উদ্দিন  ·  ২ ঘণ্টা আগে                       │    │
│  │ [✅ অনুমোদন করুন]  [❌ প্রত্যাখ্যান করুন]  [প্রোফাইল দেখুন]│    │
│  └─────────────────────────────────────────────────────┘    │
│  ... (repeats per pending item)                              │
└─────────────────────────────────────────────────────────────┘
```

### Interaction Rules (Apply to All 3 Queues)
```
Approve tap:      instant action (not a form) — status → 'approved',
                  triggers the relevant recalc trigger (rating, upvote/
                  answer count) automatically at the DB layer (no admin-
                  side calculation needed, per DB Part 4 design)
                  Row fades out of "pending" list, toast: "অনুমোদিত ✅"

Reject tap:       opens small inline reason field (optional, for
                  internal record only, not shown to submitter) →
                  status → 'rejected', row fades out

Admin reply       (Reviews only, per S07 spec): inline textarea appears
(reviews):        under approved reviews, saves to reviews.admin_reply

Bulk actions:     checkbox-select multiple pending rows → sticky bar
                  "৩ টি নির্বাচিত  [✅ সব অনুমোদন করুন] [❌ সব প্রত্যাখ্যান]"
                  — critical for a solo operator facing a backlog after
                  a busy day; approving one-by-one doesn't scale

Context link:     every queue item links to the parent entity ("Dr.
                  Priyanka Das" tappable → opens that doctor's edit
                  page in a new tab) — moderation decisions often need
                  quick context-checking without losing queue position

Data Reports      "মার্ক রিজলভড" replaces approve/reject — reports
(variant):        don't have content to approve, they flag something
                  needing a manual fix elsewhere (e.g. admin reads the
                  report, jumps to the entity, fixes the phone number,
                  THEN marks report resolved) — resolved_by/resolved_at
                  captured automatically (DB Part 5)
```

### Empty & Zero-State
"🎉 এই মুহূর্তে অনুমোদনের অপেক্ষায় কিছু নেই" — friendly, not clinical,
reinforces that an empty queue is a good outcome worth acknowledging
for a solo operator's morale.

### Why This Pattern Matters for "5-Year Thinking"
Any FUTURE moderatable content type (e.g. if doctor-submitted content
or a new UGC feature is added later) can adopt this exact
`<ModerationQueue>` component with a new data adapter — this is the
extensibility payoff of designing the pattern once, deliberately, now.

---

## A04 — LOCATIONS MANAGER · CATEGORIES MANAGER

### Locations Manager (`/locations`)
> This screen is the operator-facing UI over the self-referencing
> `locations` table (DB Part 1). Since there's no pre-seeded data
> (confirmed decision), this is often the FIRST screen a new admin
> touches before anything else can be created (doctors/hospitals need
> a location to attach to).

```
┌─────────────────────────────────────────────────────────────┐
│  এলাকা ম্যানেজমেন্ট                    [+ নতুন এলাকা যোগ করুন]│
├─────────────────────────────────────────────────────────────┤
│  🔍 [এলাকা খুঁজুন...]                                          │
├─────────────────────────────────────────────────────────────┤
│  ▾ পশ্চিমবঙ্গ (State)                          [✏️][🗑️][+ যোগ]│
│    ▾ কোচবিহার (District)                       [✏️][🗑️][+ যোগ]│
│      • কোচবিহার সদর (Sub-district)             [✏️][🗑️]      │
│      • তুফানগঞ্জ (Sub-district)                 [✏️][🗑️]      │
│      • দিনহাটা (Sub-district)                   [✏️][🗑️]      │
│    ▸ জলপাইগুড়ি (District)               [collapsed, ▸ expand]│
│  ▸ মহারাষ্ট্র (State)                     [collapsed, ▸ expand]│
│  ▸ অসম (State)                                                │
└─────────────────────────────────────────────────────────────┘
```

### Interaction Model
Expandable tree (not a flat table) — mirrors the actual hierarchy
mentally, matches how the DB `locations` table + `location_paths`
recursive view are structured. Each row has inline `[✏️ edit] [🗑️
delete] [+ যোগ করুন = add child]` — the "add child" button is
context-aware: clicking it under "কোচবিহার" pre-fills the new form's
`parent_id` and `type` (next level down), removing the chance of an
admin accidentally creating a District with no State parent (the DB
CHECK constraint from Part 1 backstops this too — defense in depth).

### Add/Edit Location Modal
```
┌─────────────────────────────────────────────┐
│ ✕      নতুন এলাকা যোগ করুন                    │
│ ─────────────────────────────────────────── │
│  ধরন:  জেলা (District)      ← locked, inherited
│  প্যারেন্ট: পশ্চিমবঙ্গ        ← locked, inherited
│                                             │
│  নাম (বাংলা) *   [_______________________]  │
│  Name (English)  [_______________________]  │
│  नाम (हिन्दी)     [_______________________]  │
│  স্লাগ (URL)      [auto-generated, editable] │
│                                             │
│  অক্ষাংশ (ঐচ্ছিক) [___]  দ্রাঘিমাংশ [___]   │
│                                             │
│  ☑ সক্রিয় (Active — অ্যাপে দেখাবে)          │
│                                             │
│  [সংরক্ষণ করুন]                              │
└─────────────────────────────────────────────┘
```
Slug auto-generated from Bengali/English name (transliterated,
lowercase, hyphenated) but editable — matters because slugs feed
directly into the SEO landing page URLs (S21). "সক্রিয় (Active)"
toggle = soft-hide without deleting (maps to `is_active`, distinct
from `deleted_at` — an inactive location stays in the tree for admin
reference but disappears from the user-app's location picker
immediately).

### Delete Safety
Deleting a location with children OR with doctors/hospitals/chambers
still attached is **blocked with a clear message**: "এই এলাকায় এখনো
৫টি চেম্বার যুক্ত আছে। প্রথমে সেগুলো সরান বা অন্য এলাকায় স্থানান্তর
করুন।" — never a silent cascade delete of real business data (the DB
FK is `ON DELETE RESTRICT` for exactly this reason, Part 1). Deleting
an empty leaf location asks for standard ConfirmDialog only.

### Bulk Import (Practical Necessity)
Given "nationwide, no pre-seeded data" — manually adding 28 states +
hundreds of districts one-by-one is impractical. A **CSV import**
option lives here:
```
[📥 CSV থেকে আমদানি করুন]
→ Template download: state_name_bn, state_name_en, district_name_bn,
  district_name_en, ...
→ Upload → preview table showing what will be created → confirm →
  batch insert (server-side, validates duplicates against existing
  slugs, skips rather than errors on conflict)
```
This is a one-time-heavy-use, low-frequency-after tool — but essential
for practically bootstrapping national coverage without weeks of
manual data entry.

---

### Categories Manager (`/categories`)
```
┌─────────────────────────────────────────────────────────────┐
│  বিভাগ (বিশেষজ্ঞতা) ম্যানেজমেন্ট         [+ নতুন বিভাগ যোগ করুন]│
├─────────────────────────────────────────────────────────────┤
│  [drag ⠿] [🫀 icon] হৃদরোগ (Cardiology)      ৫ জন ডাক্তার     │
│           হোমপেজে দেখাবে: ☑        [✏️][🗑️]                 │
│  [drag ⠿] [👶 icon] শিশু রোগ (Pediatrics)    ৮ জন ডাক্তার     │
│           হোমপেজে দেখাবে: ☑        [✏️][🗑️]                 │
│  ...                                                          │
└─────────────────────────────────────────────────────────────┘
```
Drag-handle (⠿) reorders `display_order` — this directly drives the
Category Grid order in S04 SEC-05 on the live user app, so the
operator sees an immediate visual link between "reorder here" and
"homepage changes." Doctor count column is a live read-only reference
(helps decide which categories deserve homepage visibility).

### Add/Edit Category Modal
```
নাম (বাংলা/English/हिन्दी) *, স্লাগ, আইকন [icon picker — small curated
SVG set, not arbitrary upload, keeps visual consistency with S01's
icon system], সার্চ কিওয়ার্ড (comma-separated aliases — feeds S05's
Bengali-English alias resolution), ☑ হোমপেজে দেখাবে, ☑ সক্রিয়
```

### Delete Safety
Same pattern as Locations — blocked if doctors reference this
category (`RESTRICT` FK, DB Part 2), clear message shown, points
admin to reassign those doctors first.

---

## A05 — DOCTORS MANAGER

### List Page (`/doctors`)
```
┌─────────────────────────────────────────────────────────────┐
│  ডাক্তার                                  [+ নতুন ডাক্তার]   │
├─────────────────────────────────────────────────────────────┤
│ 🔍[খুঁজুন...] [সব স্ট্যাটাস▾] [সব বিভাগ▾] [সব এলাকা▾]  ⚙️কলাম│
├─────────────────────────────────────────────────────────────┤
│☐│ফটো│নাম          │বিভাগ   │এলাকা    │স্ট্যাটাস │রেটিং│একশন│
│☐│👤 │Dr. Priyanka  │মেডিসিন │কোচবিহার │✅ভেরিফাই│4.8 │⋯  │
│☐│👤 │Dr. Rahul     │হৃদরোগ  │তুফানগঞ্জ│🟡পেন্ডিং│ -  │⋯  │
│☐│👤 │Dr. Sumana    │শিশু    │দিনহাটা  │✅ভেরিফাই│4.5 │⋯  │
├─────────────────────────────────────────────────────────────┤
│ ২৪৩ জন ডাক্তার   |◂ ১ ২ ৩ ... ১০ ▸|          [25/page ▾] │
└─────────────────────────────────────────────────────────────┘
```
`DataTable` component from A01 — sortable columns (name, rating,
created date), status filter defaults to showing ALL (pending +
verified both visible here; the separate moderation queue pattern
from A03 is for content moderation, not entity verification — this
list is the entity system-of-record). Row `⋯` menu: এডিট / ভেরিফাই /
সাসপেন্ড / মুছুন (soft-delete) / প্রোফাইল দেখুন (opens live user-app
profile in new tab — quick sanity-check of how an edit actually looks
live).

Bulk select → bulk actions bar: bulk verify, bulk feature/unfeature.

### Create/Edit Doctor Form — Collapsible Sections (A01 `FormSection`)
```
┌─────────────────────────────────────────────────────────────┐
│  ডাক্তার সম্পাদনা: Dr. Priyanka Das      [খসড়া সংরক্ষিত ✓]   │
├─────────────────────────────────────────────────────────────┤
│ ▾ মৌলিক তথ্য                                                  │
│   ছবি: [MediaUploader — crops to 1:1]                         │
│   নাম (বাংলা)* [___________]  Name (English) [___________]   │
│   नाम (हिन्दी)  [___________]                                 │
│   বিভাগ* [মেডিসিন ▾]         BMDC নম্বর [___________]        │
│   ডিগ্রি (একাধিক) [MBBS ✕][MD (Medicine) ✕][+ যোগ করুন]      │
│   অভিজ্ঞতা (বছর) [___]                                        │
│   ভাষা [বাংলা✓][English✓][हिन्दी]                             │
├─────────────────────────────────────────────────────────────┤
│ ▸ পরিচিতি ও বিশেষজ্ঞতা                          [collapsed]  │
│   (bio_translations, expertise_tags, treats_conditions)       │
├─────────────────────────────────────────────────────────────┤
│ ▸ যোগাযোগ ও ফি                                  [collapsed]  │
│   (whatsapp_number, consultation_fee_min/max)                 │
├─────────────────────────────────────────────────────────────┤
│ ▸ সার্চ সেটিংস                                   [collapsed]  │
│   (search_aliases — "এই ডাক্তারকে অন্য কোন নামে মানুষ খুঁজতে   │
│    পারে?" helper text, e.g. nicknames/spelling variants)       │
├─────────────────────────────────────────────────────────────┤
│ ▾ চেম্বার (২টি)                    [+ নতুন চেম্বার যোগ করুন]  │
│   [Chamber Sub-Editor — see below]                             │
├─────────────────────────────────────────────────────────────┤
│ ▾ স্ট্যাটাস                                                    │
│   ভেরিফিকেশন: [🟡 পেন্ডিং ▾]  ফিচার্ড: ☐  ফিচার প্রায়োরিটি:[0]│
│   সক্রিয় (is_available): ☑                                    │
├─────────────────────────────────────────────────────────────┤
│              [খসড়া হিসেবে সংরক্ষণ]  [সংরক্ষণ ও প্রকাশ করুন]   │
└─────────────────────────────────────────────────────────────┘
```

### Chamber Sub-Editor (Nested, Inline — Not a Separate Page)
```
┌─────────────────────────────────────────────────────────────┐
│ চেম্বার ১: প্রান্ত ডায়াগনস্টিক সেন্টার  [প্রধান ●] [🗑️]      │
│ চেম্বার নাম* [___________]                                    │
│ এলাকা* [কোচবিহার সদর ▾]  ঠিকানা* [___________________]      │
│ ফোন* [___________]  WhatsApp [___________]                    │
│ Google Maps লিংক [___________]                                │
│ ভিজিট ফি [___]                                                │
│                                                               │
│ সময়সূচি:                                                      │
│  ☑শনি ☑রবি ☐সোম ☑মঙ্গল ☐বুধ ☑বৃহঃ ☐শুক্র                    │
│  খোলা: [15:00 ▾]   বন্ধ: [21:00 ▾]                            │
│  [+ ভিন্ন সময়ের জন্য আরেকটি সময়সূচি যোগ করুন]                │
│  ← multiple schedule rows if hours differ by day-group          │
│                                                               │
│ [এই চেম্বারকে প্রধান হিসেবে সেট করুন]                          │
└─────────────────────────────────────────────────────────────┘
```
Day-checkbox + time-picker UI (not raw JSON editing) generates the
`chambers.schedule` JSONB array under the hood — the operator never
sees or touches JSON directly (matches A01's `JSONPreview` philosophy:
friendly form always, raw view only if they expand "advanced").
"প্রধান" (primary) toggle enforces the DB's one-primary-per-doctor
unique index automatically — selecting a new primary silently
unsets the previous one, no error shown for what is actually normal
behavior.

### Verification Workflow (Distinct From Content Moderation)
```
┌─────────────────────────────────────────────┐
│  ভেরিফিকেশন স্ট্যাটাস পরিবর্তন                 │
│  ─────────────────────────────────────────  │
│  বর্তমান: 🟡 পেন্ডিং                          │
│                                             │
│  ○ ✅ ভেরিফাই করুন                            │
│    (এই ডাক্তার এখনই পাবলিক অ্যাপে দেখা যাবে)   │
│  ○ ❌ প্রত্যাখ্যান করুন                         │
│    কারণ (অভ্যন্তরীণ নোট) [_________________]  │
│  ○ 🚫 সাসপেন্ড করুন (আগে ভেরিফাইড ছিল)         │
│    কারণ [_________________]                  │
│                                             │
│  [নিশ্চিত করুন]                               │
└─────────────────────────────────────────────┘
```
This directly flips `doctors.verification_status` — the SAME field
that the DB RLS policy checks (Part 2) before showing a doctor
publicly. The UI makes explicit what's at stake ("এখনই পাবলিক অ্যাপে
দেখা যাবে") precisely because this single toggle is the actual
publish gate for the entire live app — the operator should never be
surprised by that.

### Why "Save as Draft" vs "Save & Publish" Both Exist
A doctor record can be saved mid-entry (e.g. admin has photo + name
but is still gathering chamber details) without accidentally exposing
an incomplete profile — `verification_status` stays whatever it was
(defaults to `pending`, invisible publicly per RLS) until the admin
explicitly verifies. This is a soft distinction (both buttons save the
same row) but the labeling matters for operator confidence.

---

## A06 — HOSPITALS MANAGER + AMBULANCE + BLOOD BANK

### Hospitals List (`/hospitals`)
Same `DataTable` pattern as Doctors (A05) — columns: photo, name,
type (hospital/clinic/diagnostic/nursing_home), location, emergency
badge (🚨 if `has_emergency_dept`), status, rating, actions. Filters:
status, type, location, "শুধু জরুরি বিভাগ আছে এমন" checkbox.

### Create/Edit Hospital Form
```
▾ মৌলিক তথ্য
  কভার ছবি [MediaUploader, 16:9]   গ্যালারি [multi-upload, up to 8]
  নাম (বাংলা/English/हिन्दी)*
  ধরন* [হাসপাতাল ▾]  (হাসপাতাল/ক্লিনিক/ডায়াগনস্টিক/নার্সিং হোম)
  এলাকা* [▾]  ঠিকানা* [_______]
  ফোন* [___]  WhatsApp [___]  Maps লিংক [___]
▸ বিবরণ                                          [collapsed]
▾ সেবা ও সুবিধা
  পরীক্ষা/সেবা (Test Catalog থেকে বেছে নিন):
  [🔍 টেস্ট খুঁজুন...] [✓CBC][✓X-Ray Chest][✓ECG][+ আরো যোগ করুন]
  ← multi-select searchable picker against test_catalog (DB Part 3),
    NOT free-text — keeps services[] values canonical, matches S10's
    search-index design intent exactly
  সুবিধা ট্যাগ: [✓ICU][✓জরুরি বিভাগ ২৪/৭][✓অ্যাম্বুলেন্স][✓ব্লাড ব্যাংক]
  ☑ জরুরি বিভাগ আছে (has_emergency_dept)
    ← this single checkbox is what makes the hospital appear on
    /emergency (S12) — flagged explicitly in the UI, same "visible
    stakes" philosophy as doctor verification
▾ সময়
  ☑ ২৪ ঘণ্টা খোলা      OR      [day/time schedule — same UI as
                                 Chamber Sub-Editor, A05, reused
                                 component]
▾ স্ট্যাটাস
  ভেরিফিকেশন [🟡 পেন্ডিং ▾]  ফিচার্ড ☐  ট্রেন্ডিং ☐
[খসড়া সংরক্ষণ]  [সংরক্ষণ ও প্রকাশ করুন]
```

### Why Services Are Picked, Not Typed
Directly enforces the DB Part 3 design: `hospitals.services[]` must
contain `test_catalog.canonical_key` values for S10's search to work
(free-text "X-Ray" vs "xray" vs "এক্স-রে" would silently break
search matching). The picker searches `test_catalog` (name +
aliases), shows results, admin clicks to add — impossible to enter an
unmatched value. If a needed test isn't in the catalog yet, an inline
"+ নতুন টেস্ট ক্যাটালগে যোগ করুন" shortcut opens a mini-modal to add
it to `test_catalog` without leaving this form.

---

### Ambulance Services (`/ambulance`)
Simple list+form, same `DataTable`/`FormSection` pattern:
```
নাম*, এলাকা*, ফোন*, WhatsApp, সংযুক্ত হাসপাতাল [optional, dropdown —
maps to ambulance_services.hospital_id, leave blank for independent
operators, per our schema discussion], গাড়ির সংখ্যা, ☑ ICU সুবিধা,
প্রতি কিমি ভাড়া, কভারেজ ব্যাসার্ধ (কিমি), ☑ ২৪/৭, ভেরিফিকেশন স্ট্যাটাস
```

---

### Blood Bank Management (`/blood-donors`)
Two tabs — distinct data, distinct operator tasks:

**Tab 1 — রক্তদাতা তালিকা (Donor Directory)**
```
┌─────────────────────────────────────────────────────────────┐
│ [সব গ্রুপ▾] [সব এলাকা▾]  🔍                                   │
├─────────────────────────────────────────────────────────────┤
│ নাম          │গ্রুপ│এলাকা      │শেষ দান     │স্ট্যাটাস│একশন│
│ করিম উদ্দিন   │O+   │কোচবিহার   │৪ মাস আগে   │✅সক্রিয় │⋯  │
├─────────────────────────────────────────────────────────────┤
```
Unlike the public app (S11), admin here CAN see phone numbers
(operator needs this for verification/moderation calls) —
`⋯` menu: নিষ্ক্রিয় করুন (deactivate — self-service via SMS is future
scope; admin can do it manually meanwhile), মুছুন (soft-delete, e.g.
spam/fake entries). This is a service-role-only screen; RLS from DB
Part 3 blocks anon/authenticated direct table reads entirely — only
the admin backend (service role) reaches raw `blood_donors` rows.

**Tab 2 — ব্লাড ব্যাংক স্টক (Hospital Inventory Reporting)**
```
┌─────────────────────────────────────────────────────────────┐
│  হাসপাতাল: কোচবিহার জেলা হাসপাতাল ব্লাড ব্যাংক                │
│  সর্বশেষ আপডেট: ৬ ঘণ্টা আগে                                   │
│  A+[✅উপলব্ধ▾] A-[⚠️কম▾] B+[✅▾] B-[❌নেই▾] O+[✅▾] O-[⚠️▾]   │
│  AB+[✅▾] AB-[❌▾]                          [সংরক্ষণ করুন]     │
└─────────────────────────────────────────────────────────────┘
```
One dropdown per blood-group per hospital-with-blood-bank-tag, quick
weekly-update workflow. Writes to `blood_bank_inventory`
(`reported_at` auto-updates to `now()`) — the "48hr staleness = hidden
publicly" rule (DB Part 3 RLS) means this genuinely needs to be
refreshed periodically for the public feature to keep showing data;
a **"স্টক আপডেট করুন"** reminder badge appears on the Dashboard
Home (A03) attention row if any hospital's inventory is >36hrs stale
(early warning before the 48hr public-hide threshold hits).

---

## A07 — HOMEPAGE SECTION CONTROL · THEME EDITOR ★ GOD MODE CORE ★

> Both screens write to the SAME row: `app_settings` (DB Part 1,
> singleton). This is the highest-leverage, highest-blast-radius
> corner of the entire admin panel — every change here is instantly
> visible to every user of the live app. `super_admin`-only (A02).

### Homepage Section Control (`/god-mode/homepage`)
```
┌─────────────────────────────────────────────────────────────┐
│  হোমপেজ সেকশন কন্ট্রোল          [👁️ লাইভ প্রিভিউ] [প্রকাশ করুন]│
├─────────────────────────────────────────────────────────────┤
│  বাম পাশে সাজান → ডান পাশে সরাসরি প্রিভিউ দেখুন                │
├───────────────────────┬───────────────────────────────────┤
│ [⠿] ℹ️ ঘোষণা ব্যানার  ☑│                                   │
│ [⠿] 🖼️ হিরো ব্যানার   ☑│      [LIVE IFRAME PREVIEW —       │
│ [⠿] 📊 কুইক স্ট্যাটস   ☑│       actual user-app /home       │
│ [⠿] ⚡ কুইক অ্যাকশন   ☑│       rendered at mobile width,    │
│ [⠿] 🏷️ বিভাগ গ্রিড    ☑│       updates live as you drag/    │
│ [⠿] 👨‍⚕️ জনপ্রিয় ডাক্তার☑│       toggle on the left]         │
│ [⠿] 📢 নেটিভ বিজ্ঞাপন ☑│                                   │
│ [⠿] 🏥 ট্রেন্ডিং হাসপাতাল☑│                                 │
│ [⠿] 🩺 উপসর্গ          ☑│                                   │
│ [⠿] 📰 স্বাস্থ্য আর্টিকেল☐│  ← currently OFF, per your        │
│ [⠿] 🙋 প্রশ্নোত্তর টিজার☐│    launch config (Q&A/articles     │
│ [⠿] 🩸 ব্লাড সার্ভিস CTA☑│    feature-flagged off initially) │
└───────────────────────┴───────────────────────────────────┘
```

### Interaction Model
Drag-handle (⠿) reorders, checkbox toggles visibility — **directly
maps to `app_settings.homepage_settings.sections[]`**
(`{id, visible, order}`, exact shape from DB Part 1 / referenced
throughout S04). No "save" needed for the preview (updates
optimistically on every drag/toggle, client-side only) — but a
**explicit "প্রকাশ করুন" (Publish) button** is required to actually
write to the database and go live. This two-step (arrange freely →
deliberately publish) prevents a half-finished reorder from
accidentally going live mid-edit, and gives one more deliberate pause
before the highest-blast-radius action in the whole panel.

### Live Preview Mechanism
The right panel is a real `<iframe>` pointed at a special preview
route on the user app (`/?preview=true`) that reads section config
from a `postMessage`-passed draft state instead of the live DB row —
so the operator sees an **accurate, actual rendering** (not a mockup
approximation) before publishing. This is a meaningful engineering
investment but directly serves "যেন ঝামেলা না হয়" — nothing builds
non-technical operator trust like seeing the REAL result before
committing.

### Publish Confirmation
```
┌─────────────────────────────────────────────┐
│  হোমপেজ পরিবর্তন প্রকাশ করবেন?                  │
│  এই পরিবর্তন সাথে সাথে সব ইউজারের কাছে         │
│  দেখা যাবে।                                    │
│  [বাতিল]                    [হ্যাঁ, প্রকাশ করুন]│
└─────────────────────────────────────────────┘
```
On confirm: writes to `app_settings`, logs to `audit_logs`
(before/after diff = old vs new `sections[]` array — full accountability
per DB Part 5 design), toast "✅ হোমপেজ আপডেট হয়েছে"।

---

### Theme Editor (`/god-mode/theme`)
```
┌─────────────────────────────────────────────────────────────┐
│  থিম এডিটর                      [👁️ লাইভ প্রিভিউ] [প্রকাশ করুন]│
├───────────────────────┬───────────────────────────────────┤
│ ব্র্যান্ড রং              │                                   │
│  প্রাইমারি (Brand)        │      [LIVE IFRAME PREVIEW —       │
│  [🟦 #1756C8] [পরিবর্তন] │       same mechanism as Homepage  │
│                          │       Control above]              │
│  সাকসেস/ভেরিফাইড (Life)  │                                   │
│  [🟩 #0CAF74] [পরিবর্তন] │                                   │
│                          │                                   │
│  জরুরি (Emergency)       │                                   │
│  [🟥 #DC2626] [পরিবর্তন] │                                   │
│                          │                                   │
│  ─────────────────────  │                                   │
│  লোগো ও আইকন              │                                   │
│  [MediaUploader: Logo]   │                                   │
│  [MediaUploader: Favicon]│                                   │
│                          │                                   │
│  [🔄 ডিফল্ট রঙে ফিরে যান] │                                   │
└───────────────────────┴───────────────────────────────────┘
```

### Deliberately Constrained, Not a Full Design Tool
Color pickers offer **swatch + hex input**, but only for the ~4
semantic brand tokens defined in S01 (`brand`, `life`, `emergency`,
`accent`) — NOT every single design token (neutrals, spacing,
typography scale stay code-defined, not admin-editable). This is an
intentional god-mode boundary: full design-system-level control from
a UI would risk an operator accidentally breaking contrast ratios,
touch-target sizes, or visual consistency across 22 screens of
carefully-specified UI (S01-S22). Brand color re-tinting is safe and
valuable (rebranding, seasonal campaigns); token-level chaos is not
— this line is drawn deliberately, matching your own instruction
"এমন কিছু একদম না যেন ঝামেলা হয়।"

### Contrast Safety Check
On any color change, before allowing publish: an automated check
computes contrast ratio of the new brand color against white text
(used on buttons/FAB/badges throughout S01-S22) — if below WCAG AA
(4.5:1), a warning appears: **"⚠️ এই রং বাটনের সাদা লেখার সাথে
পড়তে কষ্ট হতে পারে। তবুও প্রকাশ করবেন?"** — not a hard block (your
call is still respected), but an informed one.

### How Theme Changes Actually Apply (Technical Note)
`app_settings.theme_colors` JSONB is read at request-time by the
user-app's root layout and injected as CSS custom property overrides
(`--color-brand-600: <admin value>`) — meaning a theme change is
**instant on next page load**, no rebuild/redeploy needed. This is
precisely why the ISR revalidate window for the Home page (S04:
5 minutes) matters — worst case, a just-published theme change takes
up to 5 minutes to reach already-cached pages; acceptable trade-off
for the performance benefit ISR gives everywhere else.

---

_(File continues — A08: Footer/Social/Contact Editor · Feature Flags · Menu Manager, in next commit)_
