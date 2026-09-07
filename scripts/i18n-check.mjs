#!/usr/bin/env node
/**
 * i18n translation completeness checker.
 *
 * See I18N-IMPLEMENTATION-SPEC.md § 8a. Plain Node, zero new dependencies —
 * deliberate, since this repo has no test runner or CI today and adding
 * either just for this would be out of scope (I18N-ARCHITECTURE.md § 6).
 *
 * For a messages directory shaped like:
 *   messages/bn/common.json  messages/bn/nav.json  ...
 *   messages/en/common.json  messages/en/nav.json  ...
 * asserts that every locale directory has exactly the same set of
 * namespace files as the default-locale directory, and that every
 * namespace file has exactly the same (recursively flattened) key set
 * across all locales. Exits non-zero with a readable diff on any mismatch.
 *
 * Usage:
 *   node scripts/i18n-check.mjs apps/web/messages bn
 *   node scripts/i18n-check.mjs apps/admin/messages bn
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [, , messagesDirArg, defaultLocaleArg] = process.argv;

if (!messagesDirArg || !defaultLocaleArg) {
  console.error('Usage: node scripts/i18n-check.mjs <messagesDir> <defaultLocale>');
  process.exit(2);
}

/** Recursively flattens a nested message object into dotted key paths,
 *  e.g. { a: { b: "x" } } -> ["a.b"]. Arrays are treated as leaves (their
 *  own index-shape isn't compared — see note below). */
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function listLocales(messagesDir) {
  return readdirSync(messagesDir).filter((name) => statSync(join(messagesDir, name)).isDirectory());
}

function listNamespaces(localeDir) {
  return readdirSync(localeDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

function loadNamespace(localeDir, ns) {
  return JSON.parse(readFileSync(join(localeDir, `${ns}.json`), 'utf8'));
}

let hasError = false;
const messagesDir = messagesDirArg;
const locales = listLocales(messagesDir);

if (!locales.includes(defaultLocaleArg)) {
  console.error(`[i18n-check] default locale "${defaultLocaleArg}" has no directory under ${messagesDir}`);
  process.exit(2);
}

const defaultDir = join(messagesDir, defaultLocaleArg);
const defaultNamespaces = listNamespaces(defaultDir);

for (const locale of locales) {
  if (locale === defaultLocaleArg) continue;
  const localeDir = join(messagesDir, locale);
  const namespaces = listNamespaces(localeDir);

  const missingFiles = defaultNamespaces.filter((ns) => !namespaces.includes(ns));
  const extraFiles = namespaces.filter((ns) => !defaultNamespaces.includes(ns));
  if (missingFiles.length > 0) {
    hasError = true;
    console.error(`[i18n-check] ${locale}/: missing namespace file(s): ${missingFiles.map((n) => `${n}.json`).join(', ')}`);
  }
  if (extraFiles.length > 0) {
    hasError = true;
    console.error(`[i18n-check] ${locale}/: unexpected extra namespace file(s) not in ${defaultLocaleArg}/: ${extraFiles.map((n) => `${n}.json`).join(', ')}`);
  }

  for (const ns of defaultNamespaces) {
    if (!namespaces.includes(ns)) continue; // already reported above
    const defaultKeys = new Set(flattenKeys(loadNamespace(defaultDir, ns)));
    const localeKeys = new Set(flattenKeys(loadNamespace(localeDir, ns)));

    const missingKeys = [...defaultKeys].filter((k) => !localeKeys.has(k));
    const extraKeys = [...localeKeys].filter((k) => !defaultKeys.has(k));

    if (missingKeys.length > 0) {
      hasError = true;
      console.error(`[i18n-check] ${locale}/${ns}.json: missing key(s): ${missingKeys.join(', ')}`);
    }
    if (extraKeys.length > 0) {
      hasError = true;
      console.error(`[i18n-check] ${locale}/${ns}.json: extra key(s) not in ${defaultLocaleArg}/${ns}.json: ${extraKeys.join(', ')}`);
    }
  }
}

if (hasError) {
  console.error(`\n[i18n-check] FAILED — ${messagesDir}`);
  process.exit(1);
} else {
  console.log(`[i18n-check] OK — ${messagesDir} (${locales.length} locale(s), ${defaultNamespaces.length} namespace(s))`);
}
