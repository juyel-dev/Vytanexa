# Vytanexa brand identity

Vytanexa's permanent mark combines a human figure with a connected V-shaped form and a leaf-like inner detail: life, care, and connection in one symbol.

## Canonical assets

- `apps/web/public/brand/vytanexa-logo.svg` — horizontal wordmark for larger placements.
- `apps/web/public/brand/vytanexa-symbol.svg` — transparent symbol for UI and compact placements.
- `apps/web/src/app/icon.svg` — default browser/app icon.
- `apps/web/public/icons/icon-192x192.png` and `icon-512x512.png` — standard install icons.
- `apps/web/public/icons/icon-maskable-512x512.png` — full-bleed Android maskable icon.
- `apps/web/src/app/apple-icon.png` — Apple touch icon (opaque 180px square; iOS applies its own mask).
- `apps/web/public/icons/badge-96x96.png` — white-on-transparent silhouette used as the Android notification badge.
- `apps/web/public/favicon.ico` — multi-size (16/32/48/64) browser icon.

## Brand colors

- Trust blue: `#1756C8`
- Life green: `#0CAF74`
- Deep blue wordmark: `#1245A8`

Keep the two-color symbol consistent. Do not replace it with a typed initial, a generic medical cross, or an unrelated stock icon. For small-size app icons, use the blue tile with the white-and-green reversed mark to preserve contrast.

## Changing the icons

Never hand-edit or hand-encode the raster files: a PNG with a bad palette chunk looks fine in file listings but is rejected by Chrome and Firefox, which silently breaks the install prompt and tab icon.

1. Edit the vector source `apps/web/src/app/icon.svg`.
2. `pip install cairosvg pillow numpy && python3 scripts/generate-brand-icons.py`
3. Bump `BRAND_ICON_VERSION` in `apps/web/src/lib/brand-assets.ts` (busts browser, installed-PWA and service-worker icon caches; used by the `<head>` links, the web manifest and the install banner).
4. `npm run check:brand-assets` (also runs in CI) validates every PNG chunk CRC, sizes, alpha/opacity, the ICO directory, and the manifest icon references.
