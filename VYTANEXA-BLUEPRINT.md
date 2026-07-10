# Vytanexa — Complete Product Blueprint
**Life Connected through Care.** | Nationwide Healthcare Discovery & Coordination Platform
**Stack:** Next.js (TypeScript) · Supabase (PostgreSQL) · next-intl (i18n)
**Status:** In active design — this file is updated incrementally, section by section.

---

## TABLE OF CONTENTS

- [x] S01 — Brand System · Design Tokens · Component Philosophy
- [x] S02 — Information Architecture · Navigation · Routing Map
- [x] S03 — Splash · Language Selection · Onboarding · Location Setup · Sign-in
- [x] S04 — Home Page (Full Section-by-Section Design)
- [x] S05 — Universal Search · Autocomplete · Voice Input
- [x] S06 — Doctor List Page · Filters · Sort
- [x] S07 — Doctor Profile Page (Hero · Tabs · Lead Capture · Share)
- [x] S08 — Hospital List · Hospital Detail
- [ ] S09 — Symptoms Page · Symptom Detail
- [ ] S10 — Lab & Diagnostic Tests
- [ ] S11 — Blood Services Page
- [ ] S12 — Emergency System
- [ ] S13 — Health Magazine · Articles
- [ ] S14 — Q&A Community
- [ ] S15 — Polls · Reports · User Submissions
- [ ] S16 — More Page (Hamburger Menu)
- [ ] S17 — User Account (Profile · Favorites · History)
- [ ] S18 — Settings (Language · Location · Notifications · Privacy)
- [ ] S19 — Custom Pages / Block Builder
- [ ] S20 — Notifications Center · Announcement Banner
- [ ] S21 — SEO Landing Pages (State/District/Specialty)
- [ ] S22 — Offline Page · PWA · Next.js Architecture · i18n
- [ ] DB  — Complete Database Schema (Supabase/PostgreSQL)
- [ ] ADMIN — Admin Panel (Ultra God Mode) Full Design

---

## S01 — BRAND SYSTEM · DESIGN TOKENS · COMPONENT PHILOSOPHY

### Brand Identity
```
Name:     Vytanexa
Origin:   Vita (Latin: life) + Nexa (Latin: connection/linkage)
Meaning:  A life-connection system — connecting patients, doctors,
          and healthcare services into one intelligent platform.
Tagline:  "Connect. Care. Live." (EN) · "আপনার স্বাস্থ্য, আপনার সংযোগ" (BN)
Region:   All-India, nationwide scalable (no hardcoded regions)
```

### Logo Concept
Stylized "V" where two strokes form a pulse/heartbeat line converging into a
connection node — representing vita + nexus. Minimal vector, 2-color
(primary blue + accent teal). Works at 16px favicon through 512px splash.

### Color System
```css
/* Brand */
--color-brand-600: #1756C8;  /* Primary */
--color-brand-700: #1245A8;  /* Pressed */
--color-brand-500: #2D6FD9;  /* Hover */
--color-brand-50:  #EEF4FF;  /* Tint */

/* Life (secondary — verified/success) */
--color-life-600: #0CAF74;
--color-life-700: #099460;
--color-life-50:  #E8FBF3;

/* Accent (ratings/highlights) */
--color-accent-500: #F59E0B;
--color-accent-50:  #FFFBEB;

/* Emergency */
--color-emergency-600: #DC2626;
--color-emergency-500: #EF4444;
--color-emergency-50:  #FEF2F2;

/* Subscription tiers */
--color-tier-free: #94A3B8;  --color-tier-basic: #0CAF74;
--color-tier-pro: #1756C8;   --color-tier-premium: #7C3AED;

/* Neutrals: 950→50 scale, standard Tailwind-style gray ramp */
--color-neutral-900: #111827;  --color-neutral-50: #F9FAFB;
```

### Typography
```css
--font-bengali-display: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
--font-bengali-body:    'Noto Sans Bengali', sans-serif;
--font-latin:           'Plus Jakarta Sans', 'Inter', sans-serif;
--font-mono:            'JetBrains Mono', monospace;

/* Scale: display-xl 32/700 → label-sm 11/500 (full scale in design system) */
/* Rule: Bengali font for BN text, Latin font ALWAYS for numbers/fees/ratings */
```

### Spacing (4px base unit)
`--space-1:4px … --space-16:64px` | Screen padding-x: 16px | Card padding: 16px
| Card gap: 12px | Section gap: 24px

### Radius
`xs:4px sm:8px md:12px lg:16px xl:20px 2xl:24px 3xl:32px full:9999px`

### Shadows
6 elevation levels (xs→xl) + `shadow-brand` (CTA glow) + `shadow-card`
(brand-tinted subtle card elevation) — see full spec in design tokens file.

### Motion
```css
--ease-out: cubic-bezier(0.16,1,0.3,1);      /* entrances */
--ease-spring: cubic-bezier(0.34,1.56,0.64,1); /* FAB, stars */
--duration-fast:150ms  --duration-normal:250ms  --duration-slow:350ms
```
Named keyframes: fadeIn, slideUp, slideInRight, scaleIn, pulse, bounce,
shake, ripple, spin.

### Z-Index Layers
`base:0 dropdown:100 sticky:200 navbar:300 fab:400 sheet:500 modal:600
toast:700 overlay:800 splash:900`

### Layout Constants
`topbar:56px navbar:64px+safe-area | fab-size:56px`

### Component Philosophy
1. **Bengali-first, not Bengali-only** — every component designed for BN
   text as default; EN/numbers secondary.
2. **Touch-safe by default** — 44×44px min tap target, 48px preferred.
3. **Skeleton before content** — every async list/card shows skeleton first.
4. **Three states always** — loading / error / empty handled everywhere.
5. **Offline-aware** — cached data + "last updated" indicator, not breakage.
6. **Progressive enhancement** — Server Components for core content (SEO),
   Client Components enhance interactivity.

### Atomic Structure
`Atoms (Button,Badge,Avatar,Rating,Chip…) → Molecules (SearchBar,
DoctorMeta,SubscriptionBadge…) → Organisms (DoctorCard,HospitalCard,
ReviewCard…) → Templates (ProfileLayout,ListPageLayout…) → Pages`

### Accessibility
WCAG AA contrast (4.5:1 text) · visible 2px focus outline · aria-labels on
all icon buttons · prefers-reduced-motion respected · 13px min font size.

---

## S02 — INFORMATION ARCHITECTURE · NAVIGATION · ROUTING MAP

### Content Taxonomy
```
DISCOVERY:    Doctors · Hospitals · Lab & Tests · Blood Services
HEALTH GUIDE: Symptoms · Articles · Q&A · Polls
EMERGENCY:    Ambulance · Blood banks · Hospital ER · Helplines
ACCOUNT:      Favorites · Appointment leads history · Profile
SYSTEM:       Custom Pages · SEO landing · Notifications · Settings
ADMIN-CONTROLLED: Homepage section order/visibility, ad placements,
                  banners, custom nav items, footer content
```

### Bottom Navigation (5 tabs)
`🏠 Home · 👨‍⚕️ Doctors · [🔍 Search — center pill] · 🏥 Hospitals · ☰ More`
Height 64px+safe-area · active=filled icon+brand-600+bold label ·
inactive=outline+neutral-400 · search tab=pill bg brand-50.

### Top App Bar — 5 Variants
A) Home (logo+search+bell) B) List/Section (back+title+action)
C) Detail — transparent→solid at 80px scroll, title fades in
D) Search (full-width input, auto-focus, voice icon)
E) Modal/Sheet (✕/↓ + title + action, drag handle on sheets)

### Emergency FAB
Bottom-right, above navbar. Default: pulsing 🚨. Expanded: 3 staggered
options (🏥 nearest hospital / 🩸 blood / 🚑 ambulance), backdrop overlay,
50ms stagger animation.

### Location Chip
Pill, below topbar on Home/List/Search pages. Shows
`📍 State · District [▾]` → opens Location Picker Sheet.

### Complete Route Map (Next.js App Router)
```
(main)/          → search, doctors, doctors/[slug], hospitals,
                    hospitals/[slug], symptoms, symptoms/[slug],
                    health/lab-tests, health/blood-services, emergency,
                    community/{articles,qa,polls}, more, notifications,
                    page/[slug]
(account)/        → account, account/{profile,favorites,history},
                    settings  [auth-guarded via layout]
(auth)/           → auth/login, auth/verify, onboarding [no navbar]
(static)/         → about, privacy, terms, support, offline
(seo)/            → [state]/[district]/[specialty]  [SSG+ISR]
api/               → search, analytics, leads, reviews, sitemap.xml
```
Rendering: SSR for lists, SSG+ISR for profiles/SEO pages (1hr revalidate),
CSR for search/account/settings.

### Auth & Route Protection
Hard-gate: `/account/*` → redirect to `/auth/login?returnUrl=`.
Soft-gate: reviews submission, favorites → inline "sign in" prompt,
no redirect.

### i18n Routing Strategy
Cookie/localStorage-based (NOT URL-prefixed) — `locale=bn` cookie read by
next-intl, same URL serves all languages. Default: `bn`. Supported:
bn|en|hi (+ admin-extensible). DB content uses `*_translations` JSONB.

### Key User Journeys (6 mapped)
1. Find doctor by specialty (Home→category→list→profile→lead/call)
2. Symptom-based discovery (Symptoms→detail→specialist match→list)
3. Emergency at night (FAB→ambulance sheet→one-tap call)
4. Find lab test (Home quick action→search→hospital match)
5. New user onboarding (splash→language→slides→location→signin)
6. Location change (chip→picker sheet→state→district→confirm)

### Scroll & Interaction Rules
Bottom nav NEVER hides on scroll (accessibility). Doctor Profile: sticky
tab bar, transparent→solid topbar. List pages: infinite scroll,
scroll-position restored on back nav via sessionStorage.

### Share & Deep Linking
Shareable: doctor/hospital/symptom/custom-page routes. Share sheet:
WhatsApp (primary) → copy link → Web Share API. OG tags per-route,
JSON-LD schema markup (Physician/Hospital/FAQPage).

---

## S03 — SPLASH · LANGUAGE · ONBOARDING · LOCATION · SIGN-IN

### Flow
`Splash(2s) → [first-time only] Language → 3 Onboarding Slides →
Location Setup → Optional Sign-in → Home`. Returning users skip straight
to Home (state persisted in localStorage: `vytanexa_first_run`,
`vytanexa_lang`, `vytanexa_location`, `vytanexa_user_guest`).

### Splash
Full-bleed brand-600 bg, logo mark scale-spring-in (400ms), wordmark
fadeIn+slideUp (delay 250ms), tagline fadeIn (delay 450ms), thin progress
line animates 1800ms, auto-advances at 2000ms.

### Language Selection
3 language cards (bn/en/hi, admin-extensible), native-name primary +
English label secondary, default = browser-detected language, selected
card = brand-50 bg + brand-600 border + checkmark. Saves to
localStorage + cookie for next-intl.

### Onboarding Slides (3, swipeable)
1. "সঠিক ডাক্তার খুঁজুন" — doctor discovery illustration
2. "হাসপাতাল ও টেস্ট সহজে" — hospitals/diagnostics illustration
3. "জরুরি মুহূর্তে পাশে আছি" — emergency/community illustration, CTA
   changes to filled green "শুরু করুন ✓"
Skip button always visible top-right. Progress dots (active=24px pill).
Swipe threshold 60px, 350ms ease-out transition.

### Location Setup
GPS auto-detect option (reverse geocode → match DB state/district) OR
manual 3-step cascading dropdown: State → District → Sub-district
(optional, skippable). Bottom-sheet picker with live search filter.
Skip allowed → shows "সব এলাকার তথ্য দেখানো হচ্ছে" on Home.

### Optional Sign-in
Benefit cards (save favorites, track appointments, notifications) →
phone number + OTP (6-digit auto-verify boxes, 30s resend countdown) OR
Google sign-in. Skip always available → guest mode
(`vytanexa_user_guest=true`), hard-gate only on `/account/*`.

### Edge Cases Handled
App killed mid-onboarding (resumes from last step) · GPS denied (silent
fallback to manual) · no states in DB yet (skip prominent) · offline
during onboarding (language/slides work offline, signin shows "internet
প্রয়োজন" with skip) · location not in DB (empty search + fallback message).

---

## S04 — HOME PAGE (Complete Section-by-Section)

### Architecture — Admin-Controlled Section Order
Sections stored in `app_settings.homepage_settings` JSONB array
`[{id, visible, order}]` — admin drag-drop reorders, each section
component renders null if hidden. Empty-data sections auto-hide (no
empty shells shown to users).

### Section List (in default order)
1. **Announcement Banner** — conditional, dismissible, general(brand-50)
   or emergency(emergency-50) style, from `notifications` table
2. **Hero Banner Slider** — 2:1 ratio ads, auto-advance 4500ms, swipe,
   pagination dots, from `ads WHERE placement='homepage_banner'`
3. **Quick Stats Bar** — horizontal chips (doctors/hospitals/districts
   count), count-up animation on viewport entry, cached 1hr
4. **Quick Actions Row** — 4 equal buttons: Doctors/Hospitals/Lab
   Tests/Emergency, colored icon circles
5. **Category Grid** — 3-col specialty grid w/ doctor-count badges,
   expandable "সব দেখুন", admin controls visible categories+order
6. **Popular Doctors** — full-width cards, location-filtered,
   verified/popular/available-today badges computed client-side from
   chamber schedule, 3-button action row (call/whatsapp/detail)
7. **Native Ad** — sponsor card between content, impression+click
   tracked, from `ads WHERE placement='native_feed'`
8. **Trending Hospitals** — horizontal scroll cards, type badges,
   facility pills (🚨ER/🩺ICU/🚑ambulance)
9. **Symptom Quick Access** — 2-row horizontal scroll, photo cards,
   emergency symptoms flagged with red corner+🚨 icon
10. **Health Articles** — conditional (only if articles exist), 1
    featured + horizontal scroll small cards
11. **Community Q&A Teaser** — conditional (feature-flag gated)
12. **Blood Services CTA** — emergency-50 tinted banner, blood-type
    decorative chips, always-visible admin toggle
13. **PWA Install Banner** — visits≥2 AND not dismissed AND not
    installed, triggers `deferredPrompt.prompt()`

### Footer
Admin-controlled via `app_settings`: logo+tagline, social icons
(`social_links` JSONB), quick links, custom footer links
(`footer_links` JSONB), contact phone/email, version number.

### Performance Strategy
SEC 1-4: SSR (above fold) · SEC 5-9: hydrated client + skeleton-on-
viewport-entry · SEC 10+: lazy-loaded via IntersectionObserver.
ISR revalidate: home=5min, stats=1hr, doctor-lists=30min.

---

## S05 — UNIVERSAL SEARCH

### 4 States
1. **Empty** — recent searches (localStorage, max 10) + trending chips
   (from analytics_events aggregation) + category shortcuts grid
2. **Typing** (debounce 300ms, min 2 chars) — dropdown overlay w/
   sectioned results (Doctors/Hospitals/Categories/Symptoms), backdrop,
   "সব ফলাফল →" link, parallel Supabase queries per section
3. **Results** — full page, tabbed (All/Doctors/Hospitals/Symptoms/
   Tests), sticky tab bar w/ counts, filter sheet, sort popover
4. **No Results** — illustration + retry suggestions + category
   fallback chips + "জানান" WhatsApp CTA

### Voice Search
Browser SpeechRecognition API, `lang='bn-BD'` primary w/ en-IN fallback,
full-screen overlay w/ pulsing mic → listening (waveform) → processing
→ auto-submit. Graceful hide if unsupported.

### Bengali-English Alias Resolution
Client-side alias map (হার্ট→cardiology, চিনি রোগ→diabetes, etc.) merges
into search query before hitting DB, handles code-mixed local search
behavior.

### Analytics
Every search tracked (`search` event) for trending; autocomplete
selections tracked separately (`search_select`).

---

## S06 — DOCTOR LIST PAGE

### Layout
Sticky stack: Topbar → Location chip → Specialty chip row (single-select,
horizontal scroll) → Result count+Sort bar → Card list (infinite scroll,
12/page, native ad every 5th card).

### Full Doctor Card
Photo(72px circle)+tier badge+verified icon, name, specialty, degrees+
experience, 5-star rating+review count+🔥popular tag, location, fee chip,
live availability chip (🟢open/🟡opens-later/🔴closed — computed from
chamber.schedule vs current time), 3-button action row
(call/whatsapp/detail).

### Filter Sheet (bottom sheet, 85vh)
District selector (opens location picker) · specialty multi-select
chips (expandable) · fee dual-handle range slider (₹0-2000) · rating
radio (4.5+/4.0+/any) · "শুধু আজ উপলব্ধ" toggle · verified-only toggle
(locked true — unverified never shown publicly) · language multi-select.
Sticky footer button shows live result count.

### Sort Options
সেরা রেটিং(default) · সবচেয়ে বেশি রিভিউ · কম ভিজিট ফি · বেশি অভিজ্ঞতা ·
আজ উপলব্ধ · নিকটতম (requires geolocation).

### URL State
All filters synced to query params (shareable, back-safe):
`?specialty=&district=&feeMin=&feeMax=&rating=&availableToday=&sort=`

### Empty States
3 variants: no doctors in area (suggest nearby/all-India), no results
after filter (suggest relaxing filters), network error (retry button).

---

## S07 — DOCTOR PROFILE PAGE ★ Most Critical Page ★

### Structure
Transparent→solid topbar (80px threshold) → Gradient hero card (photo,
name, specialty, rating, tier/popular/experience badges) → Trust strip
(BMDC, languages) → Sticky 4-tab bar (Info/Chambers/Reviews/Hospitals)
→ Sticky bottom action bar (fee + "অ্যাপয়েন্টমেন্ট অনুরোধ" CTA, replaces
bottom nav on this page).

### Tab 1 — তথ্য (Info)
Bio (4-line clamp, expandable), education list, expertise tag pills,
"treats" 2-column list, language chips. Empty sections auto-hidden.

### Tab 2 — চেম্বার (Chambers)
Per-chamber card: address, smart-grouped schedule (consecutive days
w/ same hours merged), LIVE status pill (🟢open-until/🟡opens-in-N-min/
🔴closed-until-next-day, computed client-side), fee, phone, 3-button
row (call/whatsapp/directions→map_link or lat/lng fallback).

### Tab 3 — রিভিউ (Reviews)
Summary (large score+stars+distribution bars, animated fill), sort
dropdown, review cards (avatar/name/date/stars/text+admin reply if any),
"আরো দেখুন" load-more, floating "+ রিভিউ দিন" CTA → modal (star rating,
name, 20-500 char text, honeypot spam field, rate-limited 3/IP/24h,
status=pending until admin approval → triggers rating recalc SQL trigger).

### Tab 4 — হাসপাতাল (Hospital Affiliations)
Cards from `doctor_hospital_links` JOIN hospitals — image, name, role
(Visiting Consultant etc.), location, link to hospital detail. Empty
state redirects to Chambers tab (private practice messaging).

### Appointment Lead Capture (Income Stream Feature)
Bottom sheet: chamber radio-select, name+phone (required), preferred
time dropdown, optional message → `POST /api/leads` → `leads` table,
status='new', rate-limited 3/phone/doctor/24h. Direct call/WhatsApp
always available alongside (never gated behind form). Disclaimer
clarifies "request not confirmed booking."

### Share Sheet
Mini preview + WhatsApp/Copy-link/Web-Share-API icons, analytics logged
per method. OG meta + JSON-LD Physician schema server-rendered per
doctor.

### Analytics Events
`doctor_view, call_click, whatsapp_click, lead_submit, share,
review_submit, tab_view` — all logged to `analytics_events`.

---

## S08 — HOSPITAL LIST · HOSPITAL DETAIL PAGE

### Hospital List Page (`/hospitals`)
Same shell pattern as Doctor List (S06): Topbar → Location chip → Type
filter chips (সব/হাসপাতাল/ডায়াগনস্টিক/ক্লিনিক/নার্সিং হোম) → result
count+sort bar → infinite-scroll card list.

**Hospital Card (full, list variant):**
```
┌─────────────────────────────────────────────────┐
│  [COVER IMAGE 16:9]                    [🚨 জরুরি]│
│  ─────────────────────────────────────────────  │
│  কোচবিহার মেডিকেল কলেজ হাসপাতাল      [✅ Verified]│
│  🏥 সরকারি হাসপাতাল                              │
│  ⭐ 4.3 (৫৬ রিভিউ)   📍 কোচবিহার সদর            │
│  🩺 ICU  🚑 Ambulance  🧪 Lab  🩸 Blood Bank      │
│  [📞 কল করুন] [🗺️ দিকনির্দেশনা] [বিস্তারিত →]   │
└─────────────────────────────────────────────────┘
```
Cover image 16:9, radius-xl top. Type badge color-coded (govt=brand,
diagnostic=life, clinic=accent, nursing_home=neutral). Facility pill
row: icons pulled from `hospitals.facilities[]` array — dynamic, only
existing facilities shown. Emergency badge (🚨) top-right of image if
`has_emergency=true`.

**Filter Sheet:** District, Type (multi-select), Facilities (multi-
select checkboxes: ICU/Ambulance/Blood Bank/Lab/Emergency/24×7),
Rating. Same sheet mechanics as S06.

**Sort:** সেরা রেটিং · নিকটতম · সবচেয়ে বেশি রিভিউ (no fee sort — hospitals
don't have single fee).

### Hospital Detail Page (`/hospitals/[slug]`)

**Structure:** Transparent→solid topbar → Image gallery (swipeable,
dot indicators) → Hero info block → Sticky tab bar (তথ্য/ডাক্তার/সেবা/
রিভিউ) → Sticky bottom bar (call + directions).

**Hero Info Block:**
```
কোচবিহার মেডিকেল কলেজ হাসপাতাল          [✅ Verified] [🚨 জরুরি সেবা]
🏥 সরকারি হাসপাতাল · প্রতিষ্ঠিত ১৯৬৩
⭐ 4.3  (৫৬ রিভিউ)
📍 ফুলবাড়ি রোড, কোচবিহার সদর, পশ্চিমবঙ্গ
📞 ০৩৫৮২-২২০১৭১   🕐 ২৪ ঘণ্টা খোলা
```

**Tab 1 — তথ্য (Info):** About text (expandable), facilities grid
(icon+label, e.g. 🩺ICU 🚑Ambulance 🧪Lab 🩸Blood Bank 💊Pharmacy
🅿️Parking), visiting hours, insurance/scheme acceptance chips (if
applicable — Ayushman Bharat etc.), full address + embedded static map
thumbnail (tap → opens directions).

**Tab 2 — ডাক্তার (Available Doctors):** Reverse of S07 Tab 4 — list
of doctors linked via `doctor_hospital_links` who visit this hospital,
using compact Doctor Card variant (same as S06), each with role label
(Visiting Consultant / Resident). Empty state: "এখনো কোনো ডাক্তারের
তথ্য যোগ হয়নি।"

**Tab 3 — সেবা (Services & Tests):** Grid/list of `hospitals.services[]`
and `hospitals.tests[]` — grouped by category (Pathology, Radiology,
Cardiology tests etc.), each item shows test name + price (if set) +
"অন্যান্য তথ্যের জন্য কল করুন" fallback if no price. This tab is what
powers S10 Lab Test search matching.

**Tab 4 — রিভিউ:** Identical mechanics to S07 Tab 3 (summary,
distribution bars, sort, review cards, submission modal), scoped to
`hospital_id` instead of `doctor_id`.

**Image Gallery:**
Swipeable, 16:9, dot pagination, tap → full-screen lightbox w/
pinch-zoom, source: `hospitals.gallery_images[]`. Single image → no
swipe/dots, static.

**Sticky Bottom Bar:**
```
[📞 কল করুন]              [🗺️ দিকনির্দেশনা]
```
Two equal-width buttons (no fee display — hospitals don't have single
appointment fee like doctors). No lead-capture form here — hospitals
are contact-direct only in Phase 1.

**Emergency Visual Treatment:**
If `has_emergency=true`: hero shows red "🚨 জরুরি সেবা ২৪×৭" pill,
emergency contact number displayed prominently in emergency-50 tinted
box above the fold, separate from general contact number if different.

**Empty/Error States:** Same 3-state pattern as S06/S07 (not found →
404 redirect to hospital list; unverified hospitals never publicly
queryable via RLS).

**Analytics:** `hospital_view, call_click, directions_click, share,
review_submit, tab_view` events.

**OG/SEO:** JSON-LD `Hospital` schema type, address+geo coordinates,
`amenityFeature` array from facilities.

---

_(File continues — next sections appended in subsequent commits)_
