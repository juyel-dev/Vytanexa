#!/usr/bin/env node
/**
 * Verifies the raster brand assets are structurally valid, not just present.
 *
 * Why this exists: the install/favicon icons once shipped with a corrupt PNG
 * palette chunk (CRC mismatch) and a favicon.ico whose directory offsets
 * pointed into the middle of other images. File sizes and headers looked
 * fine, but libpng-based browsers (Chrome, Firefox) refuse to decode such
 * files, so the PWA install prompt and tab icon silently fell back to
 * generic/old artwork. Every critical chunk CRC is checked here.
 *
 * No dependencies. Run: node scripts/verify-brand-assets.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = resolve(root, 'apps/web');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const errors = [];
const fail = (file, msg) => {
  errors.push(`${file}: ${msg}`);
  return null; // lets `return fail(...)` signal "no valid image" to callers
};

/** Returns { width, height, colorType } or null (errors are recorded). */
function checkPng(buf, label) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) return fail(label, 'not a PNG (bad signature)');
  let pos = 8;
  let info = null;
  let sawIdat = false;
  let sawIend = false;
  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const end = pos + 12 + len;
    if (end > buf.length) return fail(label, `chunk ${type} is truncated`);
    const crc = buf.readUInt32BE(pos + 8 + len);
    if (crc32(buf.subarray(pos + 4, pos + 8 + len)) !== crc) return fail(label, `chunk ${type} has a CRC mismatch (corrupt PNG)`);
    if (type === 'IHDR') info = { width: buf.readUInt32BE(pos + 8), height: buf.readUInt32BE(pos + 12), colorType: buf[pos + 17] };
    if (type === 'IDAT') sawIdat = true;
    if (type === 'IEND') { sawIend = true; break; }
    pos = end;
  }
  if (!info) return fail(label, 'missing IHDR');
  if (!sawIdat) return fail(label, 'missing IDAT');
  if (!sawIend) return fail(label, 'missing IEND');
  return info;
}

const hasAlpha = (colorType) => colorType === 4 || colorType === 6;

// ---- PNG icons -----------------------------------------------------------
const pngs = [
  // path, size, alpha: true = must have alpha, false = must be opaque
  ['apps/web/public/icons/icon-192x192.png', 192, true],
  ['apps/web/public/icons/icon-512x512.png', 512, true],
  ['apps/web/public/icons/icon-maskable-512x512.png', 512, false], // full-bleed, no transparent corners
  ['apps/web/public/icons/badge-96x96.png', 96, true], // white silhouette on transparent
  ['apps/web/src/app/apple-icon.png', 180, false], // iOS paints transparency black
];
for (const [rel, size, alpha] of pngs) {
  const file = resolve(root, rel);
  if (!existsSync(file)) { fail(rel, 'missing'); continue; }
  const info = checkPng(readFileSync(file), rel);
  if (!info) continue;
  if (info.width !== size || info.height !== size) fail(rel, `expected ${size}x${size}, got ${info.width}x${info.height}`);
  if (hasAlpha(info.colorType) !== alpha) fail(rel, alpha ? 'must have an alpha channel' : 'must be opaque (no alpha channel)');
}

// ---- favicon.ico ---------------------------------------------------------
{
  const rel = 'apps/web/public/favicon.ico';
  const file = resolve(root, rel);
  if (!existsSync(file)) fail(rel, 'missing');
  else {
    const buf = readFileSync(file);
    const sizes = [];
    if (buf.length < 22 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) fail(rel, 'bad ICO header');
    else {
      const count = buf.readUInt16LE(4);
      for (let i = 0; i < count; i++) {
        const e = 6 + i * 16;
        const w = buf[e] || 256;
        const h = buf[e + 1] || 256;
        const bytes = buf.readUInt32LE(e + 8);
        const offset = buf.readUInt32LE(e + 12);
        const label = `${rel} [${w}x${h}]`;
        if (offset + bytes > buf.length) { fail(label, 'entry points outside the file'); continue; }
        const img = buf.subarray(offset, offset + bytes);
        if (img.subarray(0, 8).equals(PNG_SIG)) {
          const info = checkPng(img, label);
          if (info && (info.width !== w || info.height !== h)) fail(label, `directory says ${w}x${h} but image is ${info.width}x${info.height}`);
        } else if (img.readUInt32LE(0) !== 40) {
          fail(label, 'entry is neither a PNG nor a BMP (DIB header size != 40)');
        } else if (img.readInt32LE(4) !== w) {
          fail(label, `BMP width ${img.readInt32LE(4)} does not match directory width ${w}`);
        }
        sizes.push(w);
      }
      for (const need of [16, 32, 48]) if (!sizes.includes(need)) fail(rel, `missing ${need}x${need} entry`);
    }
  }
}

// ---- manifest + head references must point at files that exist ------------
{
  const manifest = readFileSync(resolve(web, 'src/app/manifest.ts'), 'utf8');
  const refs = new Set([...manifest.matchAll(/iconUrl\('(\/[^']+)'\)/g)].map((m) => m[1]));
  if (refs.size === 0) fail('apps/web/src/app/manifest.ts', 'no iconUrl() references found (script out of date?)');
  for (const ref of refs) if (!existsSync(resolve(web, 'public', ref.slice(1)))) fail('apps/web/src/app/manifest.ts', `references ${ref} but apps/web/public${ref} does not exist`);
  const hasMaskable = /purpose:\s*'maskable'/.test(manifest);
  if (!hasMaskable) fail('apps/web/src/app/manifest.ts', "no icon with purpose: 'maskable'");
}

if (errors.length) {
  console.error('Brand asset check FAILED:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('Brand asset check passed: PNG icons, apple-touch-icon, badge, favicon.ico and manifest references are valid.');
