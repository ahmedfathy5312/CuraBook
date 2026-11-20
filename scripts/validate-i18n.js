/**
 * CuraBook — i18n Key Validation Script
 * Usage: node scripts/validate-i18n.js
 * 
 * Checks that all keys in en.js exist in ar.js and vice versa.
 * Exits with code 1 if mismatches are found (for CI use).
 */

const fs   = require('fs');
const path = require('path');

// ── Load files via text parsing (avoids ES module issues) ──────────────────
function extractKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadLocale(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  // Strip export default and trailing semicolon, evaluate as object
  src = src.replace(/^[\s\S]*?export default\s*/, '').replace(/;\s*$/, '');
  // eslint-disable-next-line no-eval
  return eval('(' + src + ')');
}

const localesDir = path.join(__dirname, '../frontend/src/i18n/locales');
const enPath = path.join(localesDir, 'en.js');
const arPath = path.join(localesDir, 'ar.js');

console.log('🔍 CuraBook i18n Validation\n');

let en, ar;
try {
  en = loadLocale(enPath);
  ar = loadLocale(arPath);
} catch (err) {
  console.error('❌ Failed to load locale files:', err.message);
  process.exit(1);
}

const enKeys = extractKeys(en);
const arKeys = extractKeys(ar);

const missingInAr = enKeys.filter(k => !arKeys.includes(k));
const missingInEn = arKeys.filter(k => !enKeys.includes(k));

if (missingInAr.length === 0 && missingInEn.length === 0) {
  console.log('✅ All keys are in sync! No mismatches found.');
  console.log(`   EN: ${enKeys.length} keys | AR: ${arKeys.length} keys`);
  process.exit(0);
}

if (missingInAr.length > 0) {
  console.log(`❌ Missing in AR (${missingInAr.length} keys):`);
  missingInAr.forEach(k => console.log(`   - ${k}`));
}

if (missingInEn.length > 0) {
  console.log(`\n❌ Missing in EN (${missingInEn.length} keys):`);
  missingInEn.forEach(k => console.log(`   - ${k}`));
}

console.log('\n💡 Fix the missing keys and re-run: node scripts/validate-i18n.js');
process.exit(1);
