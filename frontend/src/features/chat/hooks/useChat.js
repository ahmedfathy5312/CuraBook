/**
 * useChat.js — Real-time chat via shared notifications WebSocket
 * Messages arrive via socketManager with type='chat_message'
 * and conversation_id to filter by conversation.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import socketManager from '../../../services/socketManager';

export function useConversations() {
  return useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn:  chatApi.getConversations,
    staleTime: 30_000,
  });
}

export function useChatMessages(conversationId) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState([]);

  // Load initial messages
  const { data, isLoading } = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn:  () => chatApi.getMessages(conversationId),
    enabled:  !!conversationId,
  });

  // Populate messages from query
  useEffect(() => {
    if (!data) return;
    const msgs = Array.isArray(data) ? data : (data?.results || []);
    setMessages([...msgs].reverse()); // oldest first
  }, [data]);

  // Real-time via shared socket — filter by conversation_id
  useEffect(() => {
    if (!conversationId) return;

    const handler = (event) => {
      if (event.type !== 'chat_message') return;
      if (event.conversation_id !== conversationId) return;
      const msg = event.message;
      if (!msg) return;
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev; // dedupe
        return [...prev, msg];
      });
      qc.invalidateQueries(['chat', 'conversations']);
    };

    const unsub = socketManager.subscribe('chat_message', handler);
    return unsub;
  }, [conversationId, qc]);

  const sendMutation = useMutation({
    mutationFn: ({ content, messageType }) =>
      chatApi.sendMessage(conversationId, content, messageType),
    onMutate: async ({ content }) => {
      const optimistic = {
        id: `opt-${Date.now()}`,
        content,
        message_type: 'text',
        sender_type: 'me',
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };
      setMessages(prev => [...prev, optimistic]);
      return { optimistic };
    },
    onSuccess: (data, _, ctx) => {
      setMessages(prev => prev.map(m => m.id === ctx.optimistic.id ? data : m));
    },
    onError: (_, __, ctx) => {
      setMessages(prev => prev.filter(m => m.id !== ctx.optimistic.id));
    },
  });

  const markRead = useCallback(() => {
    if (conversationId) chatApi.markAsRead(conversationId).catch(() => {});
  }, [conversationId]);

  return {
    messages,
    isLoading,
    sendMessage: sendMutation.mutate,
    isSending:   sendMutation.isPending,
    markRead,
  };
}
