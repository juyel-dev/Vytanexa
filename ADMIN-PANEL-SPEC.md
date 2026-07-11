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
- [ ] A04 — Locations Manager · Categories Manager
- [ ] A05 — Doctors Manager (List · CRUD · Verification · Chambers)
- [ ] A06 — Hospitals Manager + Ambulance + Blood Bank Management
- [ ] A07 — Homepage Section Control · Theme Editor  ★ God Mode Core ★
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

_(File continues — A04: Locations Manager · Categories Manager, in next commit)_
