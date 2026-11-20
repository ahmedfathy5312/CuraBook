/**
 * services/endpoints.js
 *
 * Required by the Enterprise spec as the canonical entry point for all
 * API endpoint constants.
 *
 * All actual endpoint definitions live in constants/apiRoutes.js.
 * This file re-exports them under the name `endpoints` so the spec-required
 * import path works without duplicating any data:
 *
 *   import { endpoints } from '../services/endpoints';
 *   // or
 *   import endpoints from '../services/endpoints';
 */
export { API as endpoints, API as default } from '../constants/apiRoutes';
