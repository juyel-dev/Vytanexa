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
- [x] S09 — Symptoms Page · Symptom Detail
- [x] S10 — Lab & Diagnostic Tests
- [x] S11 — Blood Services Page
- [x] S12 — Emergency System
- [x] S13 — Health Magazine · Articles
- [x] S14 — Q&A Community
- [x] S15 — Polls · Reports · User Submissions
- [x] S16 — More Page (Hamburger Menu)
- [x] S17 — User Account (Profile · Favorites · History)
- [x] S18 — Settings (Language · Location · Notifications · Privacy)
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

## S09 — SYMPTOMS PAGE · SYMPTOM DETAIL · EMERGENCY FLAGGING

### Symptoms List Page (`/symptoms`)
Grid page (2-col), no location filter (symptoms are universal, only
the matched doctor list is location-filtered downstream).

```
┌─────────────────────────────────────────────────┐
│  [←]  উপসর্গ দেখে ডাক্তার খুঁজুন                │
├─────────────────────────────────────────────────┤
│  🚨 জরুরি উপসর্গ                                 │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ 🚨[PHOTO]    │  │ 🚨[PHOTO]    │             │
│  │ বুকে ব্যথা   │  │ শ্বাসকষ্ট    │             │
│  └──────────────┘  └──────────────┘             │
│  ─────────────────────────────────────────────  │
│  সাধারণ উপসর্গ                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │[PHOTO]   │ │[PHOTO]   │ │[PHOTO]   │         │
│  │জ্বর,সর্দি│ │মাথাব্যথা │ │পেটব্যথা │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│  ... (grouped by category)                       │
└─────────────────────────────────────────────────┘
```

**Emergency section (always pinned top):** cards w/ 2px emergency-600
border + 🚨 badge, `is_emergency=true` from `symptoms` table. Visually
separated from general grid with its own labeled section + subtle
emergency-50 background band.

**General grid:** 2-column, grouped by `symptoms.category` (জ্বর ও
সংক্রমণ / পেট ও হজম / হাড় ও জয়েন্ট / মানসিক স্বাস্থ্য etc.), each group
has a section header, cards within use standard styling.

**Symptom Card:** image (16:10), gradient overlay, label bottom-left
white text, `radius-lg`, press scale(0.95). Same visual language as
S04 SEC-09 mini-cards but larger (grid, not horizontal scroll).

**Search-within-page:** small search bar at top, filters grid client-
side across all loaded symptoms (dataset small enough to be SSG'd
entirely, no server round-trip needed).

### Symptom Detail Page (`/symptoms/[slug]`)

```
┌─────────────────────────────────────────────────┐
│  [←]         বুকে ব্যথা                    [🔗] │
├─────────────────────────────────────────────────┤
│  [COVER IMAGE 16:9]                              │
│                                                 │
│  🚨 জরুরি সতর্কতা                                │  ← only if emergency
│  ┌─────────────────────────────────────────┐   │
│  │ এই লক্ষণ গুরুতর হতে পারে। দেরি না করে   │   │
│  │ নিকটস্থ হাসপাতালে যান বা ১০২ নম্বরে      │   │
│  │ কল করুন।                                │   │
│  │      [🚨 জরুরি সেবা দেখুন →]             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  বিবরণ                                          │
│  ─────────────────────────────────────────────  │
│  বুকে ব্যথা বিভিন্ন কারণে হতে পারে — হৃদরোগ,    │
│  গ্যাস্ট্রিক, মাংসপেশির টান ইত্যাদি...           │
│                                                 │
│  সাধারণ কারণ                                    │
│  ─────────────────────────────────────────────  │
│  • হৃদরোগ সংক্রান্ত সমস্যা                       │
│  • গ্যাস্ট্রিক ও অ্যাসিডিটি                      │
│  • মাংসপেশির টান বা আঘাত                        │
│  • উদ্বেগজনিত কারণ                               │
│                                                 │
│  কখন ডাক্তার দেখাবেন                            │
│  ─────────────────────────────────────────────  │
│  ✓ ব্যথা ৫ মিনিটের বেশি স্থায়ী হলে              │
│  ✓ শ্বাসকষ্ট বা ঘামের সাথে ব্যথা হলে             │
│                                                 │
│  ── এই বিশেষজ্ঞ দেখুন ──                        │
│  ┌──────────┐  ┌──────────┐                    │
│  │🫀হৃদরোগ  │  │⚕️মেডিসিন │                    │
│  │ ৫ জন     │  │ ১৮ জন    │                    │
│  └──────────┘  └──────────┘                    │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │     সংশ্লিষ্ট বিশেষজ্ঞ ডাক্তার খুঁজুন →   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Emergency Banner** (only if `is_emergency=true`): emergency-50 bg,
2px emergency-600 left border, warning icon, direct CTA to `/emergency`
— this is the single most important visual escalation in the whole app,
positioned immediately below the cover image, above all other content.

**Content sections** (from `symptoms` table fields, each auto-hidden
if empty): description, common_causes[], when_to_see_doctor[],
related_specialties[] (rendered as tappable specialty chips w/ live
doctor count for current location).

**Bottom CTA:** primary button → `/doctors?specialty=[matched]&
district=[current]` — pre-filtered, the core conversion action of this
entire page.

**Data model note:** `related_specialties` is an array (a symptom can
map to multiple specialties — e.g. chest pain → cardiology AND
medicine), each rendered as its own chip with independent doctor count
and independent tap-through.

**SEO:** SSG at build time (symptom list is admin-managed, low churn),
ISR revalidate 6hr. JSON-LD `MedicalSymptom` schema type.

**Analytics:** `symptom_view, specialty_chip_click, cta_click` events.

---

## S10 — LAB & DIAGNOSTIC TESTS (`/health/lab-tests`)

### Purpose
Separate from symptom→doctor flow. User knows the *test name* (CBC,
X-Ray, USG, Thyroid Profile) and wants to find *which nearby facility*
offers it — a distinct search intent from doctor discovery.

### Layout
```
┌─────────────────────────────────────────────────┐
│ [←]      ল্যাব ও ডায়াগনস্টিক টেস্ট                │
├─────────────────────────────────────────────────┤
│ [🔍 টেস্টের নাম লিখুন (CBC, X-Ray, USG...)    ]  │
├─────────────────────────────────────────────────┤
│ 📍 কোচবিহার                                [▾]  │
├─────────────────────────────────────────────────┤
│ জনপ্রিয় টেস্ট:                                   │
│ [CBC] [X-Ray] [USG] [Thyroid] [Blood Sugar]      │
│ [ECG] [Urine Test] [Lipid Profile]               │
├─────────────────────────────────────────────────┤
│ "CBC" এর জন্য ৫টি সেন্টার পাওয়া গেছে             │
│                                                 │
│ [Diagnostic Center Card]                        │
│ [Diagnostic Center Card]                        │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

### Search Behavior
Input matches against `hospitals.services[]` / a dedicated
`diagnostic_tests` join table (test name normalized + aliases, e.g.
"CBC" = "Complete Blood Count" = "সিবিসি"). Debounce 300ms, min 2 chars.
Empty state before typing: popular-test chip grid (admin-curated,
`is_popular=true` on tests master list) — tapping a chip = instant
search, no typing required (critical for low-literacy UX).

### Result Card (Diagnostic Center)
```
┌─────────────────────────────────────────────────┐
│ [🏢 56px] প্রান্ত ডায়াগনস্টিক সেন্টার            │
│  🔬 ডায়াগনস্টিক সেন্টার  ·  📍 কোচবিহার সদর     │
│  ✅ এই টেস্ট পাওয়া যায়: CBC                     │
│  🕐 সকাল ৮টা - রাত ৮টা                          │
│  📞 03582-XXXXXX                                │
│  [📞 কল করুন]      [বিস্তারিত →]                │
└─────────────────────────────────────────────────┘
```
Same card system as Hospital compact card (S08) with one addition: a
confirmation line showing which searched test is available there
(pulled from matched `services[]` entry), builds trust the result is
relevant not just a generic hospital listing.

### No Results
"এই টেস্ট এখনো কোনো কেন্দ্রে যোগ হয়নি এই এলাকায়" + "সব ডায়াগনস্টিক
সেন্টার দেখুন →" fallback (drops test filter, shows all diagnostic-type
hospitals in district) + WhatsApp "জানান" CTA (same pattern as Search
no-results, S05).

### Data Model Note
Tests are NOT a separate content type with detail pages — they exist
only as a *search index* into hospital services. This keeps admin
workload minimal (no separate test CMS) while still enabling the
search UX. Admin manages a master `test_catalog` (name_en, name_bn,
aliases[], is_popular) that hospitals reference when tagging their
`services[]`.

### Analytics
`test_search { query, results_count }` — critical for admin to see
which tests are searched-but-unavailable in a district (expansion
signal for outreach to new diagnostic centers).

---

## S11 — BLOOD SERVICES PAGE (`/health/blood-services`)

### Purpose
High-emotion, high-urgency traffic (someone searching this is usually
in crisis for themselves or family). Design principle: **zero friction,
maximum speed-to-phone-number.**

### Layout
```
┌─────────────────────────────────────────────────┐
│ [←]         ব্লাড সার্ভিস                        │
├─────────────────────────────────────────────────┤
│ 📍 কোচবিহার                                [▾]  │
├─────────────────────────────────────────────────┤
│ আপনার রক্তের গ্রুপ বেছে নিন                      │
│ [A+][A-][B+][B-][O+][O-][AB+][AB-][সবগুলো]      │
├─────────────────────────────────────────────────┤
│ 🩸 রক্তদান করতে চান?                             │
│ [+ রক্তদাতা হিসেবে নাম লেখান]                    │
├─────────────────────────────────────────────────┤
│ কোচবিহারের ব্লাড ব্যাংক (৪টি)                    │
│                                                 │
│ [Blood Bank Card]                               │
│ [Blood Bank Card]                               │
│                                                 │
│ ─────── রক্তদাতা তালিকা ───────                 │
│ [Donor Card — opt-in, phone masked until tap]   │
└─────────────────────────────────────────────────┘
```

### Blood Group Filter Chips
8 chips + "সবগুলো" — filters both blood bank stock display (if bank
reports inventory) and donor list. Selected = emergency-600 bg/white
text (red theme fits urgency, distinct from brand-blue elsewhere).

### Blood Bank Card
```
┌─────────────────────────────────────────────────┐
│ 🏥 কোচবিহার জেলা হাসপাতাল ব্লাড ব্যাংক           │
│ 📍 কোচবিহার সদর  ·  🕐 ২৪ ঘণ্টা খোলা             │
│ স্টক (যদি রিপোর্ট করা থাকে):                     │
│ A+✅ A-⚠️ B+✅ B-❌ O+✅ O-⚠️ AB+✅ AB-❌         │
│ [📞 এখনই কল করুন]                                │
└─────────────────────────────────────────────────┘
```
Stock indicator (✅ available / ⚠️ low / ❌ unavailable) is **optional**
— only rendered if `blood_bank_inventory` record exists and was updated
within 48hrs (stale data hidden entirely rather than shown wrong,
prevents false trust in emergency).

### Donor Registration (Opt-in Directory)
```
┌─────────────────────────────────────────────────┐
│ ✕         রক্তদাতা হিসেবে নাম লেখান              │
│ ─────────────────────────────────────────────── │
│ নাম *            [____________________]         │
│ মোবাইল নম্বর *   [🇮🇳+91 __________]            │
│ রক্তের গ্রুপ *    [O+ ▾]                         │
│ জেলা *           [কোচবিহার ▾]                    │
│ ☑ শেষ রক্তদান ৩ মাসের বেশি আগে হয়েছে            │
│    (WHO নির্দেশিকা অনুযায়ী)                      │
│ ☑ আমি জরুরি প্রয়োজনে যোগাযোগ পেতে সম্মত         │
│ [নিবন্ধন করুন]                                   │
└─────────────────────────────────────────────────┘
```
Donor phone numbers are **never shown in plaintext publicly** —
donor list shows name + blood group + area only; phone revealed via
"📞 যোগাযোগ করুন" tap which triggers `tel:` intent directly (number
never rendered as visible text, prevents scraping/spam harvesting).
Donor consent checkbox is mandatory (`consent_contact=true`), donors
can self-deactivate via SMS/WhatsApp link (future) or admin removal.

### Data Model Note
`blood_donors` table separate from `users` — donor registration does
NOT require app account/login (guest-submittable), maximizing donor
pool size. Rate-limited 1 registration per phone per 90 days
(matches WHO donation interval, also anti-spam).

### Emergency FAB Integration
This page is also directly reachable from the Emergency FAB's
"🩸 ব্লাড সার্ভিস" option — FAB tap opens a *condensed* bottom-sheet
version (blood-bank phone numbers only, no donor registration) for
fastest possible access; full page reached via "সব দেখুন →" in that
sheet.

### Analytics
`blood_page_view, blood_group_filter, donor_contact_click,
donor_register_submit`.

---

## S12 — EMERGENCY SYSTEM (FAB + `/emergency` Full Page)

### Design Principle
Emergency access must work in **under 2 taps from anywhere in the app**,
even on a slow connection, even for a panicking user. This overrides
normal navigation patterns — the FAB is global (renders in root layout,
survives route changes without remount).

### FAB Recap (full spec in S02 §2.3)
Global bottom-right FAB → expands to 3 options (Nearest Hospital /
Blood / Ambulance) → each option opens a **condensed bottom-sheet**
first (fastest path to a phone number), with "সব দেখুন →" escalating
to the full `/emergency` page only if user needs more.

### Condensed Sheets (from FAB tap)
```
🚑 AMBULANCE SHEET:
┌─────────────────────────────────────────────────┐
│ ↓  অ্যাম্বুলেন্স                                 │
│ [📞 ১০২ — জাতীয় অ্যাম্বুলেন্স সেবা]              │  ← always first,
│ [📞 কোচবিহার জেলা হাসপাতাল]                      │    hardcoded
│ [📞 প্রান্ত প্রাইভেট অ্যাম্বুলেন্স]                │
│ সব জরুরি নম্বর দেখুন →                           │
└─────────────────────────────────────────────────┘
```
Each row = single tap → `tel:` intent directly (no confirmation dialog,
speed is the priority). National number (102 / 108, state-dependent)
always pinned first regardless of local data — hardcoded fallback that
never depends on DB/network availability.

### Full Emergency Page (`/emergency`)
```
┌─────────────────────────────────────────────────┐
│ [←]         জরুরি সেবা                           │
├─────────────────────────────────────────────────┤
│ 📍 কোচবিহার                                [▾]  │
├─────────────────────────────────────────────────┤
│ 🚨 জাতীয় জরুরি নম্বর                             │
│ [📞 ১০২ অ্যাম্বুলেন্স] [📞 ১০০ পুলিশ]            │
│ [📞 ১০১ ফায়ার সার্ভিস] [📞 ১০৯১ নারী হেল্পলাইন]│
├─────────────────────────────────────────────────┤
│ 🏥 জরুরি বিভাগ (কাছের হাসপাতাল)                  │
│ [Hospital Card — emergency=true only, phone      │
│  + distance/area, sorted by is_featured then      │
│  district match]                                 │
├─────────────────────────────────────────────────┤
│ 🩸 ব্লাড ব্যাংক                                  │
│ [condensed blood bank list → full page link]     │
├─────────────────────────────────────────────────┤
│ 🚑 অ্যাম্বুলেন্স সার্ভিস                          │
│ [Local ambulance providers, from hospitals or     │
│  dedicated ambulance_services table]              │
└─────────────────────────────────────────────────┘
```

### National Numbers (Hardcoded, Not DB-Dependent)
```
১০২ — Ambulance (National)     ১০০ — Police
১০১ — Fire Service              ১০৮ — Emergency (state-var, alt ambulance)
১০৯১ — Women's Helpline         ১০৯৮ — Child Helpline
১৪৪১৬ — Mental Health (Kiran)   ১৯৩০ — Cyber Crime
```
These render even with zero network connectivity (bundled in app
shell / service worker cache) — this is the one page in the app that
**must** work offline.

### Offline Behavior
`/emergency` page shell + national numbers are precached via next-pwa
service worker on first visit. If offline: national numbers still
fully functional (tel: links work without network); local
hospital/blood-bank data shows last-cached version with "শেষ আপডেট: X
আগে" timestamp, or graceful "ইন্টারনেট সংযোগ দরকার" note only on the
sections that need fresh data.

### Data Model Note
Hospital emergency card only shows hospitals WHERE
`has_emergency_dept=true`. Ambulance-specific entries may come from
`hospitals` (type filter) or need a lightweight dedicated table if
standalone ambulance providers (not hospital-affiliated) are expected
— **flagged as an open schema question**, resolved in the DB section.

### Analytics
`emergency_page_view, emergency_call_click{number_type}` — number_type
distinguishes national vs local vs ambulance, useful for understanding
real-world usage patterns and validating which numbers matter most.

---

## S13 — HEALTH MAGAZINE · ARTICLES

### List Page (`/community/articles`)
```
┌─────────────────────────────────────────────────┐
│ [←]      স্বাস্থ্য ম্যাগাজিন                     │
├─────────────────────────────────────────────────┤
│ [সব] [ডায়াবেটিস] [শিশু স্বাস্থ্য] [পুষ্টি] [→] │  ← category chips
├─────────────────────────────────────────────────┤
│ [FEATURED ARTICLE — large card, 16:9 cover]     │
│ [Article Card] [Article Card]  ← 2-col grid      │
│ [Article Card] [Article Card]                    │
│ ... infinite scroll, 10/page                     │
└─────────────────────────────────────────────────┘
```
Card: cover image, category pill, title (2-line clamp), author +
read-time meta, publish date. Grid: 2-column on mobile, cards ~168px
wide. Category chips filter client-side (dataset paginated server-side
per category via `?category=` param).

### Article Detail (`/community/articles/[slug]`)
```
┌─────────────────────────────────────────────────┐
│ [←]                                   [🔗][⋯]   │
│ [COVER IMAGE — full width, 16:9]                │
│ ডায়াবেটিস টিপস                                   │  ← category tag
│ ডায়াবেটিস নিয়ন্ত্রণে যা করবেন ও করবেন না       │  ← H1, 22px 700
│ ✍️ ডা. রহিম উদ্দিন  ·  ৩ মিনিট পড়া  ·  ২ দিন আগে│
│ ─────────────────────────────────────────────── │
│ [Rich text body — headings, paragraphs, images,  │
│  bullet lists, rendered from stored HTML/MDX]    │
│ ─────────────────────────────────────────────── │
│ 🏷️ ট্যাগ: [ডায়াবেটিস] [পুষ্টি] [জীবনযাত্রা]      │
│ ─────────────────────────────────────────────── │
│ সম্পর্কিত আর্টিকেল                                │
│ [Related Card] [Related Card]                    │
└─────────────────────────────────────────────────┘
```
Body content: sanitized HTML (server-side sanitization mandatory,
admin-authored via rich text editor in Admin Panel — see ADMIN
section). Typography uses `--text-body-lg` (16px/1.6) for readability.
Author can optionally link to a `doctors` record (byline becomes
tappable → doctor profile) or be plain text (guest contributor/editorial
team). SEO: SSG+ISR(1hr), full OG tags, `Article`/`MedicalWebPage`
JSON-LD schema. Share sheet identical pattern to Doctor Profile (S07).

### Analytics
`article_view, article_read_complete (scroll≥90%), article_share,
related_article_click`.

---

## S14 — Q&A COMMUNITY

### Feature Flag Gate
Entire module gated behind `app_settings.features.community_qa`
(admin toggle) — if disabled, all routes 404 gracefully and nav
entries hide (Home teaser, More menu item).

### List Page (`/community/qa`)
```
┌─────────────────────────────────────────────────┐
│ [←]    প্রশ্নোত্তর               [+ প্রশ্ন করুন]│
├─────────────────────────────────────────────────┤
│ [সব] [উত্তর দেওয়া হয়েছে] [অনুত্তরিত]           │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐     │
│ │ ডায়াবেটিস থাকলে কি আম খাওয়া যাবে?      │     │
│ │ ⬆ ১২   💬 ৩ উত্তর   🏷️ ডায়াবেটিস        │     │
│ │ ✅ Dr. Sumana Das উত্তর দিয়েছেন           │     │
│ └─────────────────────────────────────────┘     │
│ ... infinite scroll                              │
└─────────────────────────────────────────────────┘
```
Sort: newest / most-upvoted / unanswered-first (surfaces questions
needing doctor attention). Question card: upvote count (⬆, tap to
vote — one vote per device via localStorage id, or per-user if
signed-in), answer count, topic tag, "✅ answered by verified doctor"
indicator (only doctor-role answers get the checkmark; community
answers shown separately, unbadged).

### Ask a Question (Modal/Sheet)
```
┌─────────────────────────────────────────────────┐
│ ✕            প্রশ্ন করুন                          │
│ শিরোনাম * [___________________________]         │
│ বিস্তারিত  [___________________________]         │
│ বিভাগ * [ডায়াবেটিস ▾]                            │
│ ☐ নাম গোপন রাখুন (বেনামে জিজ্ঞাসা করুন)          │
│ [প্রশ্ন জমা দিন]                                  │
│ প্রশ্নটি অনুমোদনের পর প্রকাশিত হবে।              │
└─────────────────────────────────────────────────┘
```
Anonymous option important for sensitive health topics (sexual health,
mental health) — stores `is_anonymous=true`, displays "একজন ব্যবহারকারী"
instead of name. All questions moderated (`status='pending'`) before
publish, same pattern as reviews (S07).

### Question Detail (`/community/qa/[id]`)
Question body → answer list (doctor answers pinned top with ✅ Verified
Doctor badge + doctor's specialty + link to their profile; community
answers below, chronological) → "উত্তর দিন" input at bottom (requires
sign-in — soft-gate). Doctor answers come from a doctor-facing
mechanism (out of scope for user-app; doctors answer via a future
doctor portal or admin manually posts on their behalf — **flagged as
scope decision for Admin Panel**).

### Analytics
`question_view, question_submit, question_upvote, answer_submit`.

---

## S15 — POLLS · REPORTS · USER SUBMISSIONS

### Polls (`/community/polls`)
```
┌─────────────────────────────────────────────────┐
│ [←]         স্বাস্থ্য জরিপ                       │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐     │
│ │ আপনি কি নিয়মিত স্বাস্থ্য পরীক্ষা করান?    │     │
│ │ ○ হ্যাঁ, বছরে একবার          ▓▓▓▓▓ ৪৫%  │     │
│ │ ○ মাঝে মাঝে                  ▓▓▓ ৩০%    │     │
│ │ ○ কখনো করাইনি                ▓▓ ২৫%    │     │
│ │ মোট ভোট: ৫৬৮   ·   ৩ দিন বাকি            │     │
│ └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```
Single-select radio, one vote per device (localStorage poll_id list)
or per-account if signed in — prevents duplicate voting without
requiring login (device-level dedup acceptable for engagement polls,
not a security-critical feature). Results bar reveals + animates
immediately after voting (optimistic UI, then reconciled with server
count). Admin creates polls with `expires_at`; expired polls show
results-only, no voting UI.

### Reports (User-Flagged Data Corrections)
Not a standalone page — a **cross-cutting action** available on Doctor
Profile, Hospital Detail (⋯ menu → "তথ্য ভুল আছে?"):
```
┌─────────────────────────────────────────────────┐
│ ✕      ভুল তথ্য জানান                            │
│ কোন তথ্যে সমস্যা? *                              │
│ ○ ফোন নম্বর ভুল    ○ ঠিকানা ভুল                 │
│ ○ সময়সূচি ভুল      ○ বন্ধ হয়ে গেছে             │
│ ○ অন্যান্য                                       │
│ বিস্তারিত (ঐচ্ছিক) [_______________________]     │
│ [জমা দিন]                                        │
└─────────────────────────────────────────────────┘
```
Submits to a `data_reports` table (entity_type, entity_id, reason,
detail, status='open') — surfaces in Admin Panel as a moderation queue,
NOT auto-applied (prevents vandalism; admin verifies then edits source
record). No login required — this is a trust/data-quality safety valve
essential for a crowd-sourced-feeling directory at scale.

### Analytics
`poll_view, poll_vote, data_report_submit{entity_type, reason}`.

---

## S16 — MORE PAGE (`/more`) — Hamburger Menu

### Design Principle
This page is the **overflow container** for everything that doesn't
fit in the 5-tab bottom nav — but it must never feel like a dumping
ground. Grouped into clear sections, admin-extensible without a code
release (custom pages auto-appear here).

### Layout
```
┌─────────────────────────────────────────────────┐
│  [👤 Avatar]  স্বাগতম, করিম!         [সাইন ইন] │  ← account header
│               +91 98765-43210                    │    (or CTA if guest)
├─────────────────────────────────────────────────┤
│  আমার অ্যাকাউন্ট                                 │
│  ❤️ পছন্দের তালিকা          👤 প্রোফাইল          │
│  📋 অ্যাপয়েন্টমেন্ট হিস্টরি                       │
├─────────────────────────────────────────────────┤
│  স্বাস্থ্য টুলস                                   │
│  🩺 উপসর্গ দেখুন            🧪 ল্যাব টেস্ট        │
│  🩸 ব্লাড সার্ভিস            🚨 জরুরি সেবা        │
├─────────────────────────────────────────────────┤
│  কমিউনিটি                                        │
│  📰 স্বাস্থ্য ম্যাগাজিন       🙋 প্রশ্নোত্তর       │
│  📊 জরিপ                                         │
├─────────────────────────────────────────────────┤
│  [Custom admin-added pages appear here           │
│   automatically — icon+title from admin CMS]     │
│  📄 আমাদের সম্পর্কে                               │
├─────────────────────────────────────────────────┤
│  সেটিংস                                          │
│  🌐 ভাষা: বাংলা              📍 অবস্থান: কোচবিহার│
│  🔔 নোটিফিকেশন               🔒 প্রাইভেসি         │
├─────────────────────────────────────────────────┤
│  সহায়তা                                          │
│  💬 সাপোর্ট                  📜 শর্তাবলী          │
│  🔐 গোপনীয়তা নীতি                                │
├─────────────────────────────────────────────────┤
│         [সাইন আউট]  (only if signed in)          │
│                                                 │
│  Vytanexa v1.0.0                                │
└─────────────────────────────────────────────────┘
```

### Account Header
Signed-in: avatar (photo or initials), name, masked phone, tappable →
`/account`. Guest: "সাইন ইন করুন" pill button, brand-50 bg, opens
`/auth/login`. This single header replaces the need for a separate
profile-icon anywhere else in the app.

### Menu Row Component
```
Height: 52px | Icon: 22px in 36px circle (category-tinted bg) |
Label: 15px 500 neutral-800 | Right: chevron-right 16px neutral-300 |
Press: neutral-50 bg flash, 100ms
```
Grid: 2-column for compact rows (icon+label pairs) within each
section, full-width single-column for settings rows that show a
current-value (language, location).

### Custom Pages Injection (Admin God Mode)
Rendered from `custom_pages WHERE show_in_menu=true ORDER BY
menu_order`. Each entry: `{icon (emoji or SVG key), title, slug}` →
routes to `/page/[slug]`. This is the mechanism referenced in S02 —
admin adds a page in Admin Panel, it appears here with **zero app
redeploy**, fully data-driven menu.

### Notification Badge
Small red dot on "নোটিফিকেশন" row if unread notifications exist
(mirrors bottom-nav bell badge state, single source of truth from
`notifications_read_status`).

### Sign Out Confirmation
Tap "সাইন আউট" → simple confirm dialog ("আপনি কি সাইন আউট করতে
চান?") → clears session, resets to guest state, stays on `/more`
(does not force navigation).

---

## S17 — USER ACCOUNT (`/account/*`) — Auth-Guarded

### Account Home (`/account`)
```
┌─────────────────────────────────────────────────┐
│ [←]          আমার অ্যাকাউন্ট                     │
├─────────────────────────────────────────────────┤
│  [👤 Avatar 64px]  করিম উদ্দিন                   │
│                    +91 98765-43210               │
│                    [✏️ সম্পাদনা করুন]             │
├─────────────────────────────────────────────────┤
│  ❤️ পছন্দের তালিকা                        (৮) → │
│  📋 অ্যাপয়েন্টমেন্ট অনুরোধ হিস্টরি        (৩) → │
│  🙋 আমার প্রশ্ন ও উত্তর                    (২) → │
│  ⭐ আমার রিভিউ                              (৫) → │
├─────────────────────────────────────────────────┤
│  [অ্যাকাউন্ট মুছে ফেলুন]  ← muted, bottom, small │
└─────────────────────────────────────────────────┘
```
Each row → dedicated sub-page, count badge shows live total.

### Profile Edit (`/account/profile`)
Name, phone (read-only, verified via OTP — changing requires
re-verification flow), email (optional), preferred language shortcut
(mirrors Settings), default location shortcut. Save button, inline
field validation, toast confirmation on save.

### Favorites (`/account/favorites`)
```
┌─────────────────────────────────────────────────┐
│ [←]         পছন্দের তালিকা                       │
├─────────────────────────────────────────────────┤
│ [ডাক্তার (৫)] [হাসপাতাল (৩)]     ← tabs         │
├─────────────────────────────────────────────────┤
│ [Doctor Card — full variant, with ❤️ filled       │
│  top-right, tap to unfavorite w/ confirm toast    │
│  "সরানো হয়েছে ↩️ পূর্বাবস্থায় ফেরান"]            │
│ ...                                              │
└─────────────────────────────────────────────────┘
```
Empty state: "এখনো কোনো পছন্দ যোগ করেননি" + "ডাক্তার খুঁজুন →" CTA.
Heart-icon toggle available globally on Doctor/Hospital cards
everywhere in the app (list, search, home) — writes to
`user_favorites (user_id, entity_type, entity_id)`; guest users tapping
heart → inline prompt "সাইন ইন করে সেভ করুন" (soft-gate, not a hard
redirect, preserves their place in the flow).

### Appointment History (`/account/history`)
```
┌─────────────────────────────────────────────────┐
│ [←]      অ্যাপয়েন্টমেন্ট হিস্টরি                  │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐     │
│ │ Dr. Priyanka Das — মেডিসিন                │     │
│ │ 📅 ২ দিন আগে অনুরোধ করা হয়েছে             │     │
│ │ 🟡 অপেক্ষমাণ  /  🟢 যোগাযোগ করা হয়েছে      │     │
│ │ [আবার যোগাযোগ করুন]                       │     │
│ └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```
Read-only log of the user's own `leads` submissions (status: new →
contacted → completed/cancelled, set by chamber/admin side — no
patient self-update). Sets correct expectation: this is a request
log, not a live booking calendar (matches the disclaimer set in S07).

### Account Deletion
Confirmation flow (type "মুছুন" to confirm, or simple double-confirm
dialog) → soft-deletes account (anonymizes PII, retains aggregate
analytics per data-retention policy) → signs out → toast confirmation.

---

## S18 — SETTINGS (`/settings`) — Not Auth-Gated

### Layout
```
┌─────────────────────────────────────────────────┐
│ [←]            সেটিংস                            │
├─────────────────────────────────────────────────┤
│  🌐 ভাষা                          বাংলা      → │
│  📍 ডিফল্ট অবস্থান              কোচবিহার      → │
├─────────────────────────────────────────────────┤
│  🔔 নোটিফিকেশন                                    │
│  সাধারণ ঘোষণা                        [●━━]      │
│  জরুরি সতর্কতা                        [●━━] লক  │  ← always-on, disabled
│  স্বাস্থ্য টিপস ও আর্টিকেল             [━━○]      │
├─────────────────────────────────────────────────┤
│  🔒 প্রাইভেসি                                     │
│  📜 শর্তাবলী দেখুন                              → │
│  🔐 গোপনীয়তা নীতি দেখুন                          → │
│  আমার ডেটা ডাউনলোড করুন                          → │
├─────────────────────────────────────────────────┤
│  ℹ️ অ্যাপ সম্পর্কে                                │
│  ভার্সন                          1.0.0            │
│  ক্যাশ পরিষ্কার করুন                             → │
└─────────────────────────────────────────────────┘
```

### Language Row
Tap → same Language Selection sheet as onboarding (S03), applies
instantly (no app restart), updates cookie/localStorage, re-fetches
translated content client-side where already loaded.

### Default Location Row
Tap → same Location Picker sheet (S03/S02) — updates the global
location used across Home/Doctors/Hospitals filtering.

### Notification Toggles
Granular opt-out for non-critical notification types. "জরুরি সতর্কতা"
(emergency alerts, e.g. dengue outbreak warnings) is **non-togglable**
by design — a locked/disabled switch state communicates this is a
safety broadcast, not marketing. Toggle changes call
`PATCH /api/user/notification-prefs`, optimistic UI update.

### Privacy Section
Static content links (Terms/Privacy render `(static)` route group
pages — S22). "আমার ডেটা ডাউনলোড করুন" — GDPR/data-portability-style
export request (queues a job, emails/WhatsApps a data export link;
lightweight compliance feature, low priority but included for
completeness of privacy posture).

### Clear Cache
Clears service-worker cache + IndexedDB offline data (does NOT clear
account session or preferences) — useful escape hatch for users
reporting stale content, framed simply as "যদি অ্যাপ ঠিকমতো কাজ না
করে" helper text.

### Guest vs Signed-in
Settings page fully functional for guests (language/location/privacy
all work) — only the notification toggles are irrelevant for guests
(hidden, replaced with "নোটিফিকেশন পেতে সাইন ইন করুন" prompt row).

---

_(File continues — next sections appended in subsequent commits)_
