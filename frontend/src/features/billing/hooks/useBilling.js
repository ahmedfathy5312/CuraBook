/**
 * CuraBook — Billing Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../api/billingApi';

export function usePlans() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: billingApi.getPlans,
    staleTime: 1000 * 60 * 60, // 1 hour — plans rarely change
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: billingApi.getSubscription,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: ({ plan_tier, interval }) =>
      billingApi.createCheckout(plan_tier, interval),
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
  });
}

export function useUpgradePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plan_tier, interval }) =>
      billingApi.upgradePlan(plan_tier, interval),
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        qc.invalidateQueries({ queryKey: ['billing'] });
      }
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ at_period_end }) =>
      billingApi.cancelSubscription(at_period_end),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useReactivateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingApi.reactivateSubscription,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: billingApi.getBillingPortal,
    onSuccess: (data) => {
      if (data.portal_url) window.location.href = data.portal_url;
    },
  });
}
