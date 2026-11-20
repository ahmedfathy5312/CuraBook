#!/usr/bin/env node
/**
 * CuraBook Design Token Builder
 * ──────────────────────────────
 * Reads tokens.source.json and generates:
 *   1. tokens.js       — JS/React imports
 *   2. Prints tailwind extend config block (copy into tailwind.config.js)
 *   3. Prints CSS variables block (copy into index.css :root)
 *
 * Usage: node src/theme/build-tokens.js
 */

const fs   = require('fs');
const path = require('path');

const src    = path.join(__dirname, 'tokens.source.json');
const tokens = JSON.parse(fs.readFileSync(src, 'utf8'));

// ── 1. Generate tokens.js ────────────────────────────────────────────────────
const tokensJs = `/**
 * CuraBook Design System Tokens — AUTO-GENERATED
 * DO NOT EDIT MANUALLY — edit tokens.source.json and run build-tokens.js
 * Generated: ${new Date().toISOString()}
 */

export const tokens = ${JSON.stringify(tokens, null, 2)};

export default tokens;
`;

fs.writeFileSync(path.join(__dirname, 'tokens.js'), tokensJs);
console.log('✅ tokens.js updated');

// ── 2. CSS variables ─────────────────────────────────────────────────────────
const c = tokens.colors;
const cssVars = `
  /* AUTO-GENERATED from tokens.source.json — do not edit manually */
  --primary:              ${c.primary.DEFAULT};
  --primary-light:        ${c.primary.light};
  --primary-pale:         ${c.primary.pale};
  --primary-dark:         ${c.primary.dark};
  --color-primary:        ${c.primary.DEFAULT};
  --color-primary-dark:   ${c.primary.dark};
  --color-primary-light:  ${c.primary.pale};
  --color-success:        ${c.success.DEFAULT};
  --color-danger:         ${c.danger.DEFAULT};
  --color-warning:        ${c.warning.DEFAULT};
  --color-bg:             ${c.bg};
  --color-surface:        ${c.surface};
  --color-border:         ${c.border};
  --color-text:           ${c.text};
  --color-text-secondary: ${c['text-secondary']};
  --color-text-muted:     ${c['text-muted']};`;

console.log('\n📋 CSS variables for index.css :root {\n' + cssVars + '\n}');
console.log('\n✅ Done. Commit tokens.source.json + tokens.js together.');
