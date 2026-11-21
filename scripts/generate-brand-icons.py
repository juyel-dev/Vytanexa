#!/usr/bin/env python3
"""
Regenerates every raster brand icon from the canonical vector source
(apps/web/src/app/icon.svg). Never hand-edit or hand-encode the PNG/ICO files.

  pip install cairosvg pillow numpy
  python3 scripts/generate-brand-icons.py
  # then bump BRAND_ICON_VERSION (apps/web/src/lib/brand-assets.ts) and run
  node scripts/verify-brand-assets.mjs

Outputs:
  icon-192x192.png / icon-512x512.png   rounded blue tile, transparent corners ("any")
  icon-maskable-512x512.png             full-bleed blue, symbol inside the 40% safe circle
  apple-icon.png (180x180)              opaque square (iOS applies its own mask)
  badge-96x96.png                       white silhouette on transparent (Android notification badge)
  favicon.ico                           16/32/48/64 px, each rendered from the vector
"""
import cairosvg, io, re, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'apps/web/src/app/icon.svg')
ICONS = os.path.join(ROOT, 'apps/web/public/icons')
svg = open(SRC).read()
g = re.search(r'<g transform="[^"]*">(.*?)</g>', svg, re.S).group(1)
BASE = 0.834375                      # scale used by the canonical icon.svg
CXL, CYL = (47.8+448.6)/2, (112.3+413.4)/2   # symbol centre in its local coordinates

def tile(rx, scale, bg=True, mono=None):
    s = BASE*scale
    tx, ty = 256 - s*CXL, 256 - s*CYL
    body = re.sub(r'fill="#[0-9A-Fa-f]{6}"', f'fill="{mono}"', g) if mono else g
    rect = f'<rect width="512" height="512" rx="{rx}" fill="#1756C8"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">{rect}'
            f'<g transform="translate({tx:.3f} {ty:.3f}) scale({s:.6f})">{body}</g></svg>')

def png(svg_text, px):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg_text.encode(), output_width=px, output_height=px))).convert('RGBA')

probe = np.array(png(tile(0, 1.0, bg=False), 1024))
ys, xs = np.nonzero(probe[..., 3] > 8)
r = np.sqrt((xs-512)**2 + (ys-512)**2).max()/2          # in 512 space
print("symbol: max radius", round(r,1), "(of 512); bbox", (xs.min()/2, xs.max()/2, ys.min()/2, ys.max()/2))
mask_scale = min(1.0, 0.38*512/r)                        # keep inside 40% safe circle with margin
print("maskable scale", round(mask_scale,3))

png(tile(112, 1.0), 512).save(os.path.join(ICONS,'icon-512x512.png'), optimize=True)
png(tile(112, 1.0), 192).save(os.path.join(ICONS,'icon-192x192.png'), optimize=True)
png(tile(0, mask_scale), 512).convert('RGB').save(os.path.join(ICONS,'icon-maskable-512x512.png'), optimize=True)
png(tile(0, 1.0), 180).convert('RGB').save(os.path.join(ROOT,'apps/web/src/app/apple-icon.png'), optimize=True)
png(tile(0, 1.0, bg=False, mono="#FFFFFF"), 96).save(os.path.join(ICONS,'badge-96x96.png'), optimize=True)
sizes = [16, 32, 48, 64]
imgs = [png(tile(112, 1.0), s) for s in sizes]
imgs[-1].save(os.path.join(ROOT,'apps/web/public/favicon.ico'), format='ICO', sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
print('Regenerated brand icons. Now bump BRAND_ICON_VERSION in apps/web/src/lib/brand-assets.ts and run: node scripts/verify-brand-assets.mjs')
