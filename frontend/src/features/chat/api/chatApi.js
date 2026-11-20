/**
 * chatApi.js — CuraBook In-App Chat API
 * Uses centralized API.CHAT route constants
 */
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';

export const chatApi = {
  getConversations: () =>
    apiClient.get(API.CHAT.CONVERSATIONS).then(r => r.data),

  getMessages: (conversationId, page = 1) =>
    apiClient.get(API.CHAT.MESSAGES(conversationId), {
      params: { page, page_size: 30 },
    }).then(r => r.data),

  startConversation: (participantId) =>
    apiClient.post(API.CHAT.CONVERSATIONS, { participant_id: participantId }).then(r => r.data),

  sendMessage: (conversationId, content, messageType = 'text') =>
    apiClient.post(API.CHAT.MESSAGES(conversationId), {
      content, message_type: messageType,
    }).then(r => r.data),

  editMessage: (conversationId, messageId, content) =>
    apiClient.patch(API.CHAT.EDIT_MESSAGE(conversationId, messageId), {
      content,
    }).then(r => r.data),

  markAsRead: (conversationId) =>
    apiClient.post(API.CHAT.MARK_READ(conversationId)).then(r => r.data),

  sendFile: (conversationId, file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('message_type', file.type.startsWith('image/') ? 'image' : 'file');
    return apiClient.post(API.CHAT.MESSAGES(conversationId), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};
