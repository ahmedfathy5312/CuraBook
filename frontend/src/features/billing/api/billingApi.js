/**
 * CuraBook — Billing API
 * All calls to /api/v1/billing/*
 * FIX ⚠️: Replaced all hardcoded strings with API.BILLING.* constants.
 */

import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

export const billingApi = {
  // GET /api/v1/billing/plans/
  getPlans: () =>
    apiClient.get(API.BILLING.PLANS).then(r => r.data),

  // GET /api/v1/billing/subscription/
  getSubscription: () =>
    apiClient.get(API.BILLING.SUBSCRIPTION).then(r => r.data),

  // POST /api/v1/billing/checkout/  { plan_tier, interval }
  createCheckout: (plan_tier, interval = 'monthly') =>
    apiClient.post(API.BILLING.CHECKOUT, { plan_tier, interval }).then(r => r.data),

  // POST /api/v1/billing/upgrade/  { plan_tier, interval }
  upgradePlan: (plan_tier, interval = 'monthly') =>
    apiClient.post(API.BILLING.UPGRADE, { plan_tier, interval }).then(r => r.data),

  // POST /api/v1/billing/cancel/  { at_period_end: true }
  cancelSubscription: (at_period_end = true) =>
    apiClient.post(API.BILLING.CANCEL, { at_period_end }).then(r => r.data),

  // POST /api/v1/billing/reactivate/
  reactivateSubscription: () =>
    apiClient.post(API.BILLING.REACTIVATE).then(r => r.data),

  // POST /api/v1/billing/portal/
  getBillingPortal: () =>
    apiClient.post(API.BILLING.PORTAL).then(r => r.data),
};
