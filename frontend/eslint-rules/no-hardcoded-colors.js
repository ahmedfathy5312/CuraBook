/**
 * eslint-rules/no-hardcoded-colors.js — v31 API-M14 / UX-01
 *
 * Custom ESLint rule: warn when a hardcoded hex color string is used
 * directly in JSX style props or JS objects instead of tokens.js / CSS vars.
 *
 * Catches patterns like:
 *   style={{ background: '#1B5E8A' }}   ← warn: use tokens.colors.primary.DEFAULT
 *   style={{ color: '#E5701F' }}        ← warn: use tokens.colors.accent.DEFAULT
 *
 * Allows:
 *   style={{ background: 'var(--primary)' }}
 *   style={{ color: tokens.colors.primary.DEFAULT }}
 *   const P = '#1B5E8A'  ← still warns — define in tokens.js instead
 *
 * Rule severity: "warn" (not "error") — gradual migration, not a blocker.
 *
 * Installation:
 *   Already wired in .eslintrc.json via "plugins": ["local-rules"]
 *   Add to package.json scripts or let IDE pick it up automatically.
 *
 * References:
 *   DESIGN_SYSTEM.md § "قاعدة صارمة: لا hardcoded hex"
 *   frontend/src/theme/tokens.js  — canonical color values
 */

'use strict';

const HEX_RE = /#([0-9A-Fa-f]{3,8})\b/;

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded hex color strings — use tokens.js or CSS variables instead.',
      category: 'CuraBook Design System',
      recommended: true,
      url: 'https://github.com/curabook/docs/design-system',
    },
    schema: [],
    messages: {
      noHardcodedColor:
        'Hardcoded color "{{ value }}" found. Use tokens.colors.* or var(--*) from tokens.js / index.css instead. ' +
        'See DESIGN_SYSTEM.md for the canonical color palette.',
    },
  },

  create(context) {
    function checkStringValue(node, value) {
      if (typeof value === 'string' && HEX_RE.test(value)) {
        context.report({
          node,
          messageId: 'noHardcodedColor',
          data: { value },
        });
      }
    }

    return {
      // Catches: style={{ color: '#fff' }} and similar JSX attribute object values
      Property(node) {
        if (node.value.type === 'Literal') {
          checkStringValue(node.value, node.value.value);
        }
      },

      // Catches: const COLOR = '#1B5E8A'
      VariableDeclarator(node) {
        if (node.init && node.init.type === 'Literal') {
          checkStringValue(node.init, node.init.value);
        }
      },

      // Catches: return '#1B5E8A' or function calls with hex args
      Literal(node) {
        if (typeof node.value === 'string' && HEX_RE.test(node.value)) {
          // Avoid double-reporting Property literals (already caught above)
          if (node.parent.type !== 'Property' && node.parent.type !== 'VariableDeclarator') {
            checkStringValue(node, node.value);
          }
        }
      },
    };
  },
};
