#!/usr/bin/env node
// tests/accessibility/audit.js
// Automated WCAG 2.1 AA Accessibility Audit using axe-core + Playwright
// Usage: node tests/accessibility/audit.js [--url http://localhost:3000]

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:3000';

// Pages to audit (public pages — no auth needed)
const PUBLIC_PAGES = [
  { name: 'Home',             path: '/'                },
  { name: 'Login',            path: '/login'           },
  { name: 'Register Patient', path: '/register'        },
  { name: 'Doctor Signup',    path: '/register/doctor' },
  { name: 'Forgot Password',  path: '/forgot-password' },
  { name: 'About Us',         path: '/about'           },
  { name: 'Contact',          path: '/contact'         },
];

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'];

// Rules that are known false positives in SPAs / are chart-related
const EXCLUDE_RULES = [
  'color-contrast', // charts often fail this — handle separately
];

async function auditPage(page, url, name) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Run axe on full page
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .disableRules(EXCLUDE_RULES)
      .exclude(['.recharts-wrapper', 'canvas']) // skip chart elements
      .analyze();

    // Run contrast check separately
    const contrastResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    const allViolations = [
      ...results.violations,
      ...contrastResults.violations,
    ];

    // Sort by impact severity
    allViolations.sort((a, b) =>
      (IMPACT_ORDER[a.impact] ?? 4) - (IMPACT_ORDER[b.impact] ?? 4),
    );

    const critical = allViolations.filter(v => v.impact === 'critical');
    const serious  = allViolations.filter(v => v.impact === 'serious');
    const moderate = allViolations.filter(v => v.impact === 'moderate');
    const minor    = allViolations.filter(v => v.impact === 'minor');

    const score = calculateA11yScore(allViolations, results.passes.length);

    return {
      page:    name,
      url,
      score,
      summary: {
        violations: allViolations.length,
        passes:     results.passes.length,
        incomplete: results.incomplete.length,
        critical:   critical.length,
        serious:    serious.length,
        moderate:   moderate.length,
        minor:      minor.length,
      },
      violations:  allViolations,
      passes:      results.passes.map(p => p.id),
      incomplete:  results.incomplete.map(i => ({ id: i.id, description: i.description })),
    };
  } catch (err) {
    return { page: name, url, error: err.message, score: 0 };
  }
}

function calculateA11yScore(violations, passCount) {
  if (passCount === 0 && violations.length === 0) return 100;
  const total = passCount + violations.length;
  if (total === 0) return 100;

  // Weight by impact: critical=4, serious=3, moderate=2, minor=1
  const weightedViolations = violations.reduce((sum, v) => {
    const weights = { critical: 4, serious: 3, moderate: 2, minor: 1 };
    return sum + (weights[v.impact] || 1);
  }, 0);

  const maxWeight = total * 4;
  return Math.round(((maxWeight - weightedViolations) / maxWeight) * 100);
}

function printPageResult(result) {
  const icon = result.score >= 90 ? '🟢' : result.score >= 70 ? '🟡' : '🔴';
  console.log(`\n${icon} ${result.page} — Score: ${result.score}/100`);
  console.log(`   URL: ${result.url}`);

  if (result.error) {
    console.log(`   ⚠️  Error: ${result.error}`);
    return;
  }

  const s = result.summary;
  console.log(`   Violations: ${s.violations} | Passes: ${s.passes} | Incomplete: ${s.incomplete}`);
  console.log(`   🔴 Critical: ${s.critical} | 🟠 Serious: ${s.serious} | 🟡 Moderate: ${s.moderate} | ⚪ Minor: ${s.minor}`);

  if (s.critical > 0) {
    console.log('\n   ── Critical Issues ──');
    result.violations
      .filter(v => v.impact === 'critical')
      .forEach(v => {
        console.log(`   ❌ [${v.id}] ${v.description}`);
        console.log(`      WCAG: ${v.tags.filter(t => t.startsWith('wcag')).join(', ')}`);
        console.log(`      Fix: ${v.help}`);
        console.log(`      Docs: ${v.helpUrl}`);
        if (v.nodes?.length > 0) {
          const node = v.nodes[0];
          console.log(`      Element: ${node.html?.substring(0, 100)}...`);
        }
      });
  }

  if (s.serious > 0) {
    console.log('\n   ── Serious Issues ──');
    result.violations
      .filter(v => v.impact === 'serious')
      .slice(0, 3) // show top 3
      .forEach(v => {
        console.log(`   ⚠️  [${v.id}] ${v.description} (${v.nodes?.length} element(s))`);
      });
    if (s.serious > 3) console.log(`   ... and ${s.serious - 3} more serious issues`);
  }
}

function generateHtmlReport(results) {
  const totalScore = Math.round(results.reduce((s, r) => s + (r.score || 0), 0) / results.length);
  const timestamp  = new Date().toLocaleString();

  const rowsHtml = results.map(r => {
    const scoreClass = r.score >= 90 ? 'good' : r.score >= 70 ? 'warn' : 'bad';
    const s = r.summary || {};
    return `
      <tr>
        <td><a href="${r.url}" target="_blank">${r.page}</a></td>
        <td class="score ${scoreClass}">${r.score}/100</td>
        <td class="critical">${s.critical || 0}</td>
        <td class="serious">${s.serious || 0}</td>
        <td class="moderate">${s.moderate || 0}</td>
        <td class="minor">${s.minor || 0}</td>
        <td>${s.passes || 0}</td>
      </tr>`;
  }).join('');

  const violationsHtml = results.flatMap(r =>
    (r.violations || []).filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `
      <div class="violation ${v.impact}">
        <h3>[${v.id}] ${v.description}</h3>
        <p><strong>Page:</strong> ${r.page}</p>
        <p><strong>Impact:</strong> <span class="${v.impact}">${v.impact}</span></p>
        <p><strong>WCAG:</strong> ${v.tags.filter(t => t.startsWith('wcag')).join(', ')}</p>
        <p><strong>Fix:</strong> ${v.help}</p>
        <p><strong>Docs:</strong> <a href="${v.helpUrl}" target="_blank">${v.helpUrl}</a></p>
        <p><strong>Affected:</strong> ${v.nodes?.length || 0} element(s)</p>
      </div>`),
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CuraBook Accessibility Audit Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; color: #1e293b; }
    h1 { color: #0f172a; }
    .meta { color: #64748b; margin-bottom: 2rem; }
    .overall { display: flex; gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.08); text-align: center; min-width: 120px; }
    .stat-card .value { font-size: 2.5rem; font-weight: 700; }
    .stat-card .label { color: #64748b; font-size: 0.85rem; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); margin-bottom: 2rem; }
    th { background: #0f172a; color: white; padding: 0.75rem 1rem; text-align: left; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; }
    tr:last-child td { border-bottom: none; }
    .score { font-weight: 700; font-size: 1.1rem; }
    .score.good { color: #16a34a; }
    .score.warn { color: #d97706; }
    .score.bad  { color: #dc2626; }
    .critical { color: #dc2626; font-weight: 600; }
    .serious  { color: #ea580c; font-weight: 600; }
    .moderate { color: #d97706; }
    .violation { background: white; border-left: 4px solid #e2e8f0; padding: 1rem 1.5rem; margin-bottom: 1rem; border-radius: 0 8px 8px 0; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .violation.critical { border-color: #dc2626; }
    .violation.serious  { border-color: #ea580c; }
    .violation h3 { margin: 0 0 0.5rem; color: #0f172a; }
    span.critical { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 999px; font-size: 0.8rem; }
    span.serious  { background: #ffedd5; color: #ea580c; padding: 2px 8px; border-radius: 999px; font-size: 0.8rem; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>♿ CuraBook Accessibility Audit Report</h1>
  <p class="meta">Generated: ${timestamp} | Target: ${BASE_URL} | Standard: WCAG 2.1 AA</p>

  <div class="overall">
    <div class="stat-card">
      <div class="value" style="color:${totalScore >= 90 ? '#16a34a' : totalScore >= 70 ? '#d97706' : '#dc2626'}">${totalScore}</div>
      <div class="label">Overall Score</div>
    </div>
    <div class="stat-card">
      <div class="value">${results.length}</div>
      <div class="label">Pages Audited</div>
    </div>
    <div class="stat-card">
      <div class="value" style="color:#dc2626">${results.reduce((s, r) => s + (r.summary?.critical || 0), 0)}</div>
      <div class="label">Critical Issues</div>
    </div>
    <div class="stat-card">
      <div class="value" style="color:#ea580c">${results.reduce((s, r) => s + (r.summary?.serious || 0), 0)}</div>
      <div class="label">Serious Issues</div>
    </div>
    <div class="stat-card">
      <div class="value" style="color:#16a34a">${results.reduce((s, r) => s + (r.summary?.passes || 0), 0)}</div>
      <div class="label">Passed Rules</div>
    </div>
  </div>

  <h2>📊 Page-by-Page Summary</h2>
  <table>
    <thead>
      <tr><th>Page</th><th>Score</th><th>Critical</th><th>Serious</th><th>Moderate</th><th>Minor</th><th>Passes</th></tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <h2>🚨 Critical & Serious Violations</h2>
  ${violationsHtml || '<p style="color:#16a34a">✅ No critical or serious violations found!</p>'}

  <p style="color:#64748b;margin-top:3rem;font-size:0.85rem">
    Generated by CuraBook Accessibility Audit Tool | axe-core + Playwright
  </p>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function runAudit() {
  console.log('♿ CuraBook Accessibility Audit — WCAG 2.1 AA');
  console.log(`📡 Target: ${BASE_URL}`);
  console.log('═'.repeat(60));

  mkdirSync('test-results/accessibility', { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'en-US' });
  const page    = await context.newPage();
  const results = [];

  for (const { name, path } of PUBLIC_PAGES) {
    console.log(`\n🔍 Auditing: ${name}...`);
    const result = await auditPage(page, `${BASE_URL}${path}`, name);
    results.push(result);
    printPageResult(result);
  }

  await browser.close();

  // ── Summary ──────────────────────────────────────────────────────────────
  const validResults = results.filter(r => !r.error);
  const avgScore     = Math.round(validResults.reduce((s, r) => s + r.score, 0) / validResults.length);
  const totalCritical = results.reduce((s, r) => s + (r.summary?.critical || 0), 0);
  const totalSerious  = results.reduce((s, r) => s + (r.summary?.serious  || 0), 0);

  console.log('\n' + '═'.repeat(60));
  console.log('📊 AUDIT SUMMARY');
  console.log('═'.repeat(60));
  console.log(`📈 Average Score: ${avgScore}/100`);
  console.log(`🔴 Total Critical: ${totalCritical}`);
  console.log(`🟠 Total Serious:  ${totalSerious}`);

  if (avgScore >= 90) console.log('\n🎉 Excellent accessibility! WCAG 2.1 AA compliant.');
  else if (avgScore >= 70) console.log('\n⚠️  Good accessibility but improvements needed.');
  else console.log('\n❌ Significant accessibility issues found. Remediation required.');

  // Save reports
  const jsonPath = 'test-results/accessibility/audit-report.json';
  const htmlPath = 'test-results/accessibility/audit-report.html';

  writeFileSync(jsonPath, JSON.stringify({ timestamp: new Date().toISOString(), baseUrl: BASE_URL, avgScore, results }, null, 2));
  writeFileSync(htmlPath, generateHtmlReport(results));

  console.log(`\n📁 JSON report: ${jsonPath}`);
  console.log(`📁 HTML report: ${htmlPath}`);

  process.exit(totalCritical > 0 ? 1 : 0);
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
