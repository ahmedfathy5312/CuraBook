import { API } from '../../../constants/apiRoutes';
import apiClient from '../../../services/apiClient';

export const getNotifications = async (params = {}) => {
  const { data } = await apiClient.get(API.NOTIFICATIONS.LIST, { params });
  return data;
};

export const markNotificationRead = async (id) => {
  // HIGH-05 FIX: was hardcoded `/notifications/${id}/mark_read/` — now uses API.NOTIFICATIONS.MARK_READ
  const { data } = await apiClient.patch(API.NOTIFICATIONS.MARK_READ(id));
  return data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await apiClient.post(API.NOTIFICATIONS.MARK_ALL_READ);
  return data;
};

export const deleteNotification = async (id) => {
  const { data } = await apiClient.delete(API.NOTIFICATIONS.DELETE(id));
  return data;
};
