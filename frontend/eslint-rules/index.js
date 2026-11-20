/**
 * eslint-rules/index.js — CuraBook local ESLint plugin entry point
 *
 * Registers all custom rules under the "local-rules" plugin namespace.
 * Referenced in .eslintrc.json as:
 *   "plugins": ["local-rules"]
 *   "rules": { "local-rules/no-hardcoded-colors": "warn" }
 */
'use strict';

module.exports = {
  rules: {
    'no-hardcoded-colors': require('./no-hardcoded-colors'),
  },
};
