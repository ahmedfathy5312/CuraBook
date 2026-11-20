#!/usr/bin/env node
/**
 * CuraBook — API-M03 i18n Key Parity Check
 * Compares en.js and ar.js translation objects recursively.
 * Exits code 1 if mismatches found — CI fails the build.
 * Usage: node scripts/check-i18n-keys.js
 *
 * FIX (v32): Rewritten as ES module to match package.json "type": "module".
 * The original used require() which caused:
 *   ReferenceError: require is not defined in ES module scope
 * making the CI check silently crash and never validate any i18n keys.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname }                           from 'path';
import { tmpdir }                                  from 'os';
import { fileURLToPath }                           from 'url';
import { createRequire }                           from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

/**
 * Load a locale file that uses `export default { ... }`.
 * Strategy: strip `export default`, write a .cjs temp file (Node.js
 * always treats .cjs as CommonJS regardless of package "type"),
 * load via createRequire (ESM-safe), then clean up.
 */
async function loadLocale(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const stripped = raw
    .replace(/^\/\*[\s\S]*?\*\/\s*/m, '')        // strip leading block comment
    .replace(/^export default\s+/m, 'module.exports = ');  // CJS-ify

  const tmp = join(
    tmpdir(),
    `locale_${Date.now()}_${Math.random().toString(36).slice(2)}.cjs`
  );
  writeFileSync(tmp, stripped, 'utf8');

  try {
    const require = createRequire(import.meta.url);
    return require(tmp);
  } finally {
    try { unlinkSync(tmp); } catch (_) { /* best-effort cleanup */ }
  }
}

function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flattenKeys(v, full)) keys.add(sub);
    } else {
      keys.add(full);
    }
  }
  return keys;
}

async function main() {
  const localesDir = join(__dirname, '../src/i18n/locales');

  let en, ar;
  try {
    en = await loadLocale(join(localesDir, 'en.js'));
    ar = await loadLocale(join(localesDir, 'ar.js'));
  } catch (err) {
    console.error('❌ Failed to load locale files:', err.message);
    process.exit(2);
  }

  const enKeys      = flattenKeys(en);
  const arKeys      = flattenKeys(ar);
  const missingInAr = [...enKeys].filter(k => !arKeys.has(k));
  const missingInEn = [...arKeys].filter(k => !enKeys.has(k));

  console.log('🌐 CuraBook i18n Key Parity Check');
  console.log('─'.repeat(50));

  let hasErrors = false;

  if (missingInAr.length) {
    hasErrors = true;
    console.log(`\n❌ Missing in ar.js (${missingInAr.length}):`);
    missingInAr.forEach(k => console.log(`   • ${k}`));
  }
  if (missingInEn.length) {
    hasErrors = true;
    console.log(`\n❌ Missing in en.js (${missingInEn.length}):`);
    missingInEn.forEach(k => console.log(`   • ${k}`));
  }
  if (!hasErrors) {
    console.log(`\n✅ All ${enKeys.size} keys are in sync`);
    process.exit(0);
  } else {
    console.log('\n💡 Fix: add missing keys to the appropriate locale file.');
    process.exit(1);
  }
}

main();
