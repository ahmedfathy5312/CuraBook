import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notificationsApi';
import { useToast } from '../../../context/ToastContext';

export function useNotifications(params = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn:  () => getNotifications(params),
    staleTime: 30_000,
    refetchInterval: 60_000, // poll every minute as fallback
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async () => {
      const keys = [
        ['notifications', 'unread-count'],
        ['notifications', 'unread-count', 'page'],
        ['notifications', 'unread-count', 'hospital-bell'],
      ];
      keys.forEach(key => {
        queryClient.setQueryData(key, old => {
          if (!old) return old;
          const current = old.unread_count ?? old.unread ?? old.count ?? 0;
          const next = Math.max(0, current - 1);
          return { ...old, unread: next, unread_count: next, count: next };
        });
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      [
        ['notifications', 'unread-count'],
        ['notifications', 'unread-count', 'page'],
        ['notifications', 'unread-count', 'hospital-bell'],
      ].forEach(key => {
        queryClient.setQueryData(key, old => ({ ...(old || {}), unread: 0, unread_count: 0, count: 0 }));
      });
    },
    onSuccess: () => {
      // Invalidate all notifications queries (list, unread-count, bell-list dropdown)
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Explicitly invalidate badge counter and dropdown list used by NotificationBell
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'bell-list'] });
      // Safe toast call in case ToastContext is not mounted in some routes
      try { toast?.success?.('تم تحديد جميع الإشعارات كمقروءة.'); } catch (_) { /* noop */ }
    },
    onError: () => {
      try { toast?.error?.('حدث خطأ أثناء تحديث الإشعارات.'); } catch (_) { /* noop */ }
    },
  });
}
