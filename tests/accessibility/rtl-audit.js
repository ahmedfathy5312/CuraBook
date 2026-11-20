#!/usr/bin/env node
// tests/accessibility/rtl-audit.js
// RTL-specific Accessibility & Layout Audit for CuraBook
// Checks WCAG compliance in Arabic/RTL mode using axe-core + Playwright
//
// Usage:
//   node tests/accessibility/rtl-audit.js
//   node tests/accessibility/rtl-audit.js --url http://localhost:5173

import { chromium } from 'playwright';
import AxeBuilder   from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:5173';

const PAGES = [
  { name: 'Home',         path: '/'             },
  { name: 'Login',        path: '/login'         },
  { name: 'Register',     path: '/register'      },
  { name: 'Forgot Pwd',   path: '/forgot-password' },
];

// ── RTL layout checks ──────────────────────────────────────────────────────

async function checkRtlLayout(page, name) {
  const checks = {};

  // 1. dir attribute on <html>
  checks.htmlDir = await page.evaluate(() => document.documentElement.dir);

  // 2. Body text direction
  checks.bodyDirection = await page.evaluate(() =>
    window.getComputedStyle(document.body).direction
  );

  // 3. No horizontal overflow
  checks.noOverflow = await page.evaluate(() =>
    document.body.scrollWidth <= window.innerWidth + 5
  );

  // 4. Sidebar on the right in RTL (if sidebar exists)
  const sidebar = page.getByRole('navigation').first();
  if (await sidebar.count() > 0) {
    const box = await sidebar.boundingBox();
    const vw  = page.viewportSize()?.width ?? 1280;
    if (box) {
      // In RTL, navigation should be on the right half
      checks.sidebarPosition = box.x > vw * 0.5 ? 'right (correct)' : 'left (may be wrong)';
    }
  }

  // 5. Text alignment is right for Arabic text
  checks.textAlign = await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2, h3, p');
    for (const el of headings) {
      const align = window.getComputedStyle(el).textAlign;
      if (align === 'right' || align === 'start') return 'right-aligned';
    }
    return 'not-checked';
  });

  // 6. Pagination arrows are flipped (scaleX(-1))
  const paginationArrows = page.locator('.pagination-arrow, [class*="pagination"] svg');
  if (await paginationArrows.count() > 0) {
    const transform = await paginationArrows.first().evaluate(el =>
      window.getComputedStyle(el).transform
    );
    checks.paginationFlipped = transform !== 'none' && transform !== '';
  }

  return checks;
}

// ── Switch page to Arabic ──────────────────────────────────────────────────

async function switchToArabic(page) {
  const btn = page.getByRole('button', { name: /arabic|AR|العربية/i });
  if (await btn.count() > 0) {
    await btn.first().click();
    await page.waitForTimeout(600);
    return true;
  }
  // Try setting lang via URL or localStorage
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'ar');
    localStorage.setItem('language', 'ar');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  return false;
}

// ── axe-core RTL audit ─────────────────────────────────────────────────────

async function auditRtlPage(page, url, name) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    const switched = await switchToArabic(page);

    // Run axe with RTL-specific rule set
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude(['.recharts-wrapper', 'canvas'])
      .analyze();

    const layout = await checkRtlLayout(page, name);

    const violations = results.violations.sort((a, b) => {
      const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      return (order[a.impact] ?? 4) - (order[b.impact] ?? 4);
    });

    return {
      page:       name,
      url,
      rtlSwitched: switched,
      layout,
      violations: violations.map(v => ({
        id:          v.id,
        impact:      v.impact,
        description: v.description,
        help:        v.help,
        helpUrl:     v.helpUrl,
        nodes:       v.nodes?.length ?? 0,
        wcag:        v.tags.filter(t => t.startsWith('wcag')),
      })),
      passes:   results.passes.length,
      summary: {
        total:    violations.length,
        critical: violations.filter(v => v.impact === 'critical').length,
        serious:  violations.filter(v => v.impact === 'serious').length,
        moderate: violations.filter(v => v.impact === 'moderate').length,
        minor:    violations.filter(v => v.impact === 'minor').length,
      },
    };
  } catch (err) {
    return { page: name, url, error: err.message, violations: [], summary: {} };
  }
}

// ── Console output ─────────────────────────────────────────────────────────

function printResult(r) {
  const icon = !r.error && r.summary.critical === 0 && r.summary.serious === 0
    ? '🟢' : r.summary.critical > 0 ? '🔴' : '🟡';

  console.log(`\n${icon} ${r.page}`);
  if (r.error) { console.log(`   ⚠️  ${r.error}`); return; }

  console.log(`   RTL switched: ${r.rtlSwitched ? 'Yes' : 'Partial'}`);
  console.log(`   HTML dir: ${r.layout?.htmlDir ?? 'n/a'}`);
  console.log(`   No overflow: ${r.layout?.noOverflow ?? 'n/a'}`);
  console.log(`   Violations: ${r.summary.total} (${r.summary.critical} critical, ${r.summary.serious} serious)`);
  console.log(`   Passes: ${r.passes}`);

  if (r.summary.critical > 0 || r.summary.serious > 0) {
    console.log('   Top issues:');
    r.violations
      .filter(v => ['critical', 'serious'].includes(v.impact))
      .slice(0, 3)
      .forEach(v => console.log(`   • [${v.impact.toUpperCase()}] ${v.id}: ${v.description}`));
  }
}

// ── HTML report ────────────────────────────────────────────────────────────

function generateHtml(results) {
  const totalCritical = results.reduce((s, r) => s + (r.summary?.critical || 0), 0);
  const totalSerious  = results.reduce((s, r) => s + (r.summary?.serious  || 0), 0);
  const allPass       = totalCritical === 0 && totalSerious === 0;

  const rows = results.map(r => `
    <tr>
      <td>${r.page}</td>
      <td>${r.layout?.htmlDir ?? 'n/a'}</td>
      <td class="${r.layout?.noOverflow ? 'good' : 'bad'}">${r.layout?.noOverflow ? '✅ OK' : '❌ Overflow'}</td>
      <td class="${(r.summary?.critical || 0) > 0 ? 'bad' : 'good'}">${r.summary?.critical ?? 0}</td>
      <td class="${(r.summary?.serious  || 0) > 0 ? 'warn' : 'good'}">${r.summary?.serious ?? 0}</td>
      <td>${r.summary?.moderate ?? 0}</td>
      <td class="good">${r.passes ?? 0}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <title>CuraBook RTL Accessibility Audit</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc; color: #1e293b; }
    h1   { color: #0f172a; }
    .badge { display:inline-block; padding: 4px 12px; border-radius: 999px; font-weight:700; font-size:.85rem; }
    .pass  { background:#dcfce7; color:#166534; }
    .fail  { background:#fee2e2; color:#991b1b; }
    table  { width:100%; border-collapse:collapse; background:white; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.08); margin-top:1.5rem; }
    th { background:#0f172a; color:white; padding:.75rem 1rem; text-align:left; }
    td { padding:.75rem 1rem; border-bottom:1px solid #e2e8f0; }
    .good { color:#16a34a; font-weight:600; }
    .warn { color:#d97706; font-weight:600; }
    .bad  { color:#dc2626; font-weight:600; }
  </style>
</head>
<body>
  <h1>🌍 CuraBook RTL Accessibility Audit</h1>
  <p>Generated: ${new Date().toLocaleString()} | Base URL: ${BASE_URL}</p>
  <p>Overall: <span class="badge ${allPass ? 'pass' : 'fail'}">${allPass ? '✅ PASS' : `❌ ${totalCritical} Critical, ${totalSerious} Serious`}</span></p>
  <table>
    <thead>
      <tr><th>Page</th><th>HTML dir</th><th>Overflow</th><th>Critical</th><th>Serious</th><th>Moderate</th><th>Passes</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#94a3b8;margin-top:2rem;font-size:.8rem">axe-core + Playwright | WCAG 2.1 AA</p>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function runRtlAudit() {
  console.log('🌍 CuraBook RTL Accessibility Audit');
  console.log(`📡 Target: ${BASE_URL}`);
  console.log('─'.repeat(50));

  mkdirSync('test-results/accessibility', { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale:   'ar-EG',
  });
  const page    = await context.newPage();
  const results = [];

  for (const { name, path } of PAGES) {
    console.log(`\n🔍 ${name}...`);
    const result = await auditRtlPage(page, `${BASE_URL}${path}`, name);
    results.push(result);
    printResult(result);
  }

  await browser.close();

  // Summary
  const totalCritical = results.reduce((s, r) => s + (r.summary?.critical || 0), 0);
  const totalSerious  = results.reduce((s, r) => s + (r.summary?.serious  || 0), 0);

  console.log('\n' + '═'.repeat(50));
  console.log('📊 RTL AUDIT SUMMARY');
  console.log('═'.repeat(50));
  console.log(`🔴 Critical: ${totalCritical}`);
  console.log(`🟠 Serious:  ${totalSerious}`);
  if (totalCritical === 0 && totalSerious === 0) {
    console.log('\n🎉 No critical or serious RTL accessibility issues!');
  }

  const jsonPath = 'test-results/accessibility/rtl-audit.json';
  const htmlPath = 'test-results/accessibility/rtl-audit.html';
  writeFileSync(jsonPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  writeFileSync(htmlPath, generateHtml(results));

  console.log(`\n📁 JSON: ${jsonPath}`);
  console.log(`📁 HTML: ${htmlPath}`);

  process.exit(totalCritical > 0 ? 1 : 0);
}

runRtlAudit().catch(err => { console.error(err); process.exit(1); });
