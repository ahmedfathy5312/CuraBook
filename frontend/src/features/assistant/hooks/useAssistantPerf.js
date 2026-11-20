/**
 * useAssistantPerf.js — Performance Optimization Hooks
 * Sprint 4: React.memo + useMemo + useCallback patterns للمساعد.
 *
 * يحل 3 مشاكل مُكتشفة في UX Report:
 *  1. AssistantDashboardPage يعمل 3 API calls في كل render
 *  2. لا يوجد memoization في heavy components
 *  3. Re-renders غير ضرورية من parent state changes
 */

import { useMemo, useCallback, useRef } from 'react';

/* ─── 1. useMemoizedStats ─────────────────────────────────────────────────── */

/**
 * يُحسب إحصائيات المواعيد مرة واحدة فقط ما لم تتغير البيانات.
 *
 * المشكلة القديمة: الـ filter يتنفذ مع كل re-render صغير.
 *
 * @param {Array} appointments - قائمة المواعيد الكاملة (server total)
 * @param {number} totalCount  - العدد الإجمالي من الـ API
 */
export function useMemoizedStats(appointments = [], totalCount = 0) {
  return useMemo(() => {
    const safe = Array.isArray(appointments) ? appointments : [];

    const byStatus = (status) =>
      safe.filter(a => a.status?.toLowerCase() === status).length;

    return {
      total:      totalCount || safe.length,
      pending:    byStatus('pending'),
      confirmed:  byStatus('confirmed'),
      completed:  byStatus('completed'),
      cancelled:  byStatus('cancelled'),
      rejected:   byStatus('rejected'),
      reschedule: byStatus('reschedule_pending'),
      today: safe.filter(a => {
        if (!a.date) return false;
        const d = new Date(a.date);
        const t = new Date();
        return (
          d.getFullYear() === t.getFullYear() &&
          d.getMonth()    === t.getMonth() &&
          d.getDate()     === t.getDate()
        );
      }).length,
    };
  }, [appointments, totalCount]);
}

/* ─── 2. useMemoizedFilter ────────────────────────────────────────────────── */

/**
 * يُطبّق فلاتر المواعيد (status, date, search, workplace) بكفاءة.
 * يُعيد الـ filtered list فقط إذا تغيرت الـ dependencies.
 */
export function useMemoizedFilter(appointments, { statusTab, searchQ, dateFilter, dateTo, wpFilter }) {
  return useMemo(() => {
    let list = Array.isArray(appointments) ? [...appointments] : [];

    if (statusTab && statusTab !== 'all') {
      list = list.filter(a => a.status?.toLowerCase() === statusTab);
    }

    if (searchQ?.trim()) {
      const q = searchQ.trim().toLowerCase();
      list = list.filter(a =>
        a.patient_name?.toLowerCase().includes(q) ||
        a.patient_phone?.includes(q) ||
        a.notes?.toLowerCase().includes(q)
      );
    }

    if (dateFilter) {
      const from = new Date(dateFilter);
      from.setHours(0, 0, 0, 0);
      list = list.filter(a => new Date(a.date) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(a => new Date(a.date) <= to);
    }

    if (wpFilter && wpFilter !== 'all') {
      if (wpFilter.startsWith('clinic_')) {
        const id = wpFilter.replace('clinic_', '');
        list = list.filter(a => a.clinic_id != null && String(a.clinic_id) === id);
      } else if (wpFilter.startsWith('hospital_')) {
        const id = wpFilter.replace('hospital_', '');
        list = list.filter(a => a.hospital_id != null && String(a.hospital_id) === id);
      }
    }

    return list;
  }, [appointments, statusTab, searchQ, dateFilter, dateTo, wpFilter]);
}

/* ─── 3. useStableCallback ────────────────────────────────────────────────── */

/**
 * مثل useCallback لكن يضمن أن الـ function لا تتغير مرجعياً أبداً.
 * مفيد للـ event handlers اللي بتتمرر كـ props لـ memoized components.
 *
 * @example
 *   const handleApprove = useStableCallback((id) => approveMutation.mutate(id));
 */
export function useStableCallback(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args) => ref.current(...args), []);
}

/* ─── 4. useDebouncedValue ────────────────────────────────────────────────── */

/**
 * يُرجع قيمة بعد delay — للـ search input حتى لا نعمل re-render مع كل حرف.
 *
 * @param {any}    value - القيمة المراد تأخيرها
 * @param {number} delay - التأخير بالـ ms (افتراضي: 300)
 */
import { useState, useEffect } from 'react';

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/* ─── 5. withMemo HOC helper ──────────────────────────────────────────────── */

/**
 * Helper لتطبيق React.memo مع custom areEqual (اختياري).
 * يُستخدم لـ wrap الـ components الثقيلة.
 *
 * @example
 *   // بدلاً من:
 *   export default React.memo(AssistantOverviewSection);
 *
 *   // استخدم:
 *   export default withMemo(AssistantOverviewSection, ['appointments', 'workplaces']);
 */
import { memo } from 'react';

export function withMemo(Component, watchedProps) {
  if (!watchedProps) return memo(Component);

  return memo(Component, (prev, next) => {
    // true = لا تعيد الـ render (متساويان)
    return watchedProps.every(key => {
      const p = prev[key];
      const n = next[key];
      if (p === n) return true;
      // للـ arrays: قارن الطول والـ reference
      if (Array.isArray(p) && Array.isArray(n)) {
        return p.length === n.length && p === n;
      }
      return false;
    });
  });
}
