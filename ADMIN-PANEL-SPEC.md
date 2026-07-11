# Vytanexa Admin Panel — "Ultra God Mode"
**Stack:** Next.js (TypeScript) · same Supabase project, service-role backend
**Audience:** Non-technical admin operator (you) — every screen must be
self-explanatory, forgiving of mistakes (soft-delete + audit log backstop
everything), and never require touching code to change the live app.
**Status:** Built incrementally, block by block. See TOC.

---

## TABLE OF CONTENTS

- [x] A01 — Admin Design System · Component Philosophy (data-dense, desktop-first)
- [ ] A02 — Information Architecture · Navigation · Auth & Roles
- [ ] A03 — Dashboard Home · Unified Moderation Queue Pattern
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

_(File continues — A02: Information Architecture, Navigation, Auth & Roles, in next commit)_
