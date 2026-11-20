import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { useAuth } from '../../../context/AuthContext';
import { tokenStorage } from '../../../utils/tokenUtils.jsx';
import useTranslation from '../../../i18n/useTranslation';

const COPY = {
  ar: {
    title: 'المحادثات',
    search: 'ابحث في المحادثات...',
    noConversations: 'لا توجد محادثات متاحة',
    noConversationsHint: 'تظهر المحادثات بعد تأكيد حجز بين المريض والطبيب.',
    selectTitle: 'اختر محادثة',
    selectHint: 'اختر محادثة من القائمة لبدء التواصل.',
    startTitle: 'ابدأ المحادثة',
    startHint: 'أرسل رسالتك الأولى الآن.',
    type: 'اكتب رسالة...',
    send: 'إرسال',
    edit: 'تعديل',
    save: 'حفظ',
    cancel: 'إلغاء',
    edited: 'تم التعديل',
    read: 'تمت القراءة',
    sent: 'مرسلة',
    online: 'متصل الآن',
    offline: 'غير متصل',
    connected: 'متصل',
    disconnected: 'غير متصل',
    today: 'اليوم',
    yesterday: 'أمس',
    attach: 'إرفاق ملف',
    fileFail: 'فشل رفع الملف',
    doctor: 'طبيب',
    patient: 'مريض',
  },
  en: {
    title: 'Messages',
    search: 'Search conversations...',
    noConversations: 'No conversations yet',
    noConversationsHint: 'Chats become available after a confirmed booking.',
    selectTitle: 'Select a conversation',
    selectHint: 'Choose a conversation from the list to start chatting.',
    startTitle: 'Start the conversation',
    startHint: 'Send your first message now.',
    type: 'Write a message...',
    send: 'Send',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    edited: 'edited',
    read: 'Read',
    sent: 'Sent',
    online: 'Online now',
    offline: 'Offline',
    connected: 'Connected',
    disconnected: 'Disconnected',
    today: 'Today',
    yesterday: 'Yesterday',
    attach: 'Attach file',
    fileFail: 'File upload failed',
    doctor: 'Doctor',
    patient: 'Patient',
  },
};

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function formatClock(value, lang) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDay(value, lang, copy) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return copy.today;
  if (date.toDateString() === yesterday.toDateString()) return copy.yesterday;

  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

function otherName(conversation) {
  return conversation?.other_participant?.full_name || conversation?.other_participant?.name || '';
}

function isOwnMessage(message, user) {
  return message?.sender_type === 'me' || message?.sender === user?.id || message?.sender?.id === user?.id;
}

function ChatStyles() {
  return (
    <style>{`
      .chat-page {
        --chat-bg: var(--bg, #eef3f7);
        --chat-panel: var(--bg-card, #ffffff);
        --chat-panel-2: var(--bg-elevated, #f8fafc);
        --chat-text: var(--text-h, #102033);
        --chat-muted: var(--text-muted, #64748b);
        --chat-faint: var(--text-hint, #94a3b8);
        --chat-border: var(--border, #dbe5ee);
        --chat-primary: var(--primary, #0e7490);
        --chat-primary-2: var(--primary-light, #22c7d7);
        --chat-danger: var(--danger, #dc2626);
        box-sizing: border-box;
        height: calc(100dvh - 170px);
        min-height: 560px;
        padding: 16px 24px;
        overflow: hidden;
        background: var(--chat-bg);
        color: var(--chat-text);
        font-family: 'Cairo', sans-serif;
      }

      [data-theme='dark'] .chat-page,
      .dark .chat-page,
      body.dark .chat-page {
        --chat-bg: #071018;
        --chat-panel: #0f1d29;
        --chat-panel-2: #152636;
        --chat-text: #f6fbff;
        --chat-muted: #b4c3d2;
        --chat-faint: #8193a6;
        --chat-border: #28445a;
        --chat-primary: #25c7dd;
        --chat-primary-2: #7ce7f2;
      }

      .chat-shell {
        width: min(100%, 1650px);
        max-width: 1650px;
        height: 100%;
        min-height: 0;
        margin: 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(360px, 430px);
        overflow: hidden;
        border: 1px solid var(--chat-border);
        border-radius: 20px;
        background: var(--chat-panel);
        box-shadow: 0 24px 70px rgba(2, 12, 27, 0.18);
      }

      .chat-sidebar {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        grid-column: 2;
        grid-row: 1;
        border-inline-start: 1px solid var(--chat-border);
        background: linear-gradient(180deg, var(--chat-panel), var(--chat-panel-2));
      }

      .chat-main {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        grid-column: 1;
        grid-row: 1;
        background:
          radial-gradient(circle at 20% 15%, rgba(37, 199, 221, 0.08), transparent 26%),
          var(--chat-panel);
      }

      [dir='ltr'] .chat-sidebar {
        grid-column: 1;
        border-inline-start: 0;
        border-inline-end: 1px solid var(--chat-border);
      }

      [dir='ltr'] .chat-main {
        grid-column: 2;
      }

      .chat-section-header {
        flex: 0 0 auto;
        padding: 18px;
        border-bottom: 1px solid var(--chat-border);
        background: linear-gradient(180deg, var(--chat-panel), var(--chat-panel-2));
        z-index: 2;
      }

      .chat-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .chat-title {
        margin: 0;
        font-size: 22px;
        font-weight: 900;
        color: var(--chat-text);
      }

      .chat-connection {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--chat-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .chat-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #7c8b9c;
        box-shadow: 0 0 0 3px rgba(124, 139, 156, 0.14);
      }

      .chat-dot.online {
        background: #22c55e;
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
      }

      .chat-search {
        width: 100%;
        min-height: 44px;
        box-sizing: border-box;
        border: 1px solid var(--chat-border);
        border-radius: 14px;
        background: var(--chat-panel-2);
        color: var(--chat-text);
        padding: 0 16px;
        outline: none;
        font: inherit;
        font-size: 14px;
      }

      .chat-search:focus {
        border-color: var(--chat-primary);
        box-shadow: 0 0 0 3px rgba(37, 199, 221, 0.14);
      }

      .chat-list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 12px;
        scrollbar-width: thin;
        scrollbar-color: var(--chat-primary) transparent;
      }

      .chat-list::-webkit-scrollbar,
      .chat-messages::-webkit-scrollbar {
        width: 10px;
      }

      .chat-list::-webkit-scrollbar-track,
      .chat-messages::-webkit-scrollbar-track {
        background: transparent;
      }

      .chat-list::-webkit-scrollbar-thumb,
      .chat-messages::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, var(--chat-primary), var(--chat-primary-2));
        border: 3px solid var(--chat-panel);
        border-radius: 999px;
      }

      .chat-conversation {
        width: 100%;
        border: 1px solid transparent;
        border-radius: 16px;
        background: transparent;
        color: var(--chat-text);
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        padding: 12px;
        text-align: inherit;
        cursor: pointer;
        font: inherit;
      }

      .chat-conversation:hover,
      .chat-conversation.active {
        background: var(--chat-panel-2);
        border-color: var(--chat-border);
      }

      .chat-conversation.active {
        box-shadow: inset 3px 0 0 var(--chat-primary);
      }

      [dir='rtl'] .chat-conversation.active {
        box-shadow: inset -3px 0 0 var(--chat-primary);
      }

      .chat-avatar {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        background: linear-gradient(135deg, var(--chat-primary), #8b5cf6);
        color: white;
        font-size: 14px;
        font-weight: 900;
        position: relative;
        overflow: visible;
        border: 2px solid rgba(255, 255, 255, 0.12);
      }

      .chat-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }

      .chat-presence {
        position: absolute;
        display: block;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #7c8b9c;
        border: 3px solid var(--chat-panel);
        right: -2px;
        bottom: -1px;
        z-index: 2;
        font-size: 0;
        line-height: 0;
        box-shadow: 0 0 0 2px rgba(124, 139, 156, 0.14);
      }

      [dir='rtl'] .chat-presence {
        right: auto;
        left: 0;
      }

      .chat-presence.online {
        background: #22c55e;
        box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2), 0 0 14px rgba(34, 197, 94, 0.55);
      }

      .chat-conv-body {
        min-width: 0;
      }

      .chat-conv-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .chat-conv-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 15px;
        font-weight: 850;
      }

      .chat-time {
        flex: 0 0 auto;
        font-size: 11px;
        color: var(--chat-faint);
      }

      .chat-preview {
        margin-top: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: var(--chat-muted);
        font-size: 12px;
      }

      .chat-preview span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .chat-badge {
        min-width: 22px;
        height: 22px;
        border-radius: 999px;
        display: inline-grid;
        place-items: center;
        background: var(--chat-primary);
        color: #042331;
        font-size: 11px;
        font-weight: 900;
        padding: 0 6px;
      }

      .chat-topbar {
        flex: 0 0 auto;
        min-height: 76px;
        border-bottom: 1px solid var(--chat-border);
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 20px;
        background: rgba(255, 255, 255, 0.02);
      }

      .chat-topbar-title {
        min-width: 0;
        flex: 1;
      }

      .chat-topbar-title h2 {
        margin: 0;
        color: var(--chat-text);
        font-size: 18px;
        font-weight: 900;
      }

      .chat-topbar-title p {
        margin: 3px 0 0;
        color: var(--chat-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .chat-status-text {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border: 1px solid var(--chat-border);
        background: var(--chat-panel-2);
        padding: 3px 10px;
        border-radius: 999px;
      }

      .chat-messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 24px;
        scrollbar-width: thin;
        scrollbar-color: var(--chat-primary) transparent;
      }

      .chat-date {
        display: flex;
        justify-content: center;
        margin: 12px 0 18px;
      }

      .chat-date span {
        border: 1px solid var(--chat-border);
        background: var(--chat-panel-2);
        color: var(--chat-muted);
        border-radius: 999px;
        padding: 5px 14px;
        font-size: 12px;
        font-weight: 800;
      }

      .chat-message-row {
        display: flex;
        margin: 8px 0;
      }

      .chat-message-row.mine {
        justify-content: flex-start;
      }

      .chat-message-row.theirs {
        justify-content: flex-end;
      }

      [dir='ltr'] .chat-message-row.mine {
        justify-content: flex-end;
      }

      [dir='ltr'] .chat-message-row.theirs {
        justify-content: flex-start;
      }

      .chat-bubble-wrap {
        max-width: min(640px, 76%);
      }

      .chat-bubble {
        border: 1px solid var(--chat-border);
        background: var(--chat-panel-2);
        color: var(--chat-text);
        border-radius: 18px;
        padding: 11px 14px;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.65;
        font-size: 14px;
      }

      .chat-message-row.mine .chat-bubble {
        background: linear-gradient(135deg, var(--chat-primary), var(--chat-primary-2));
        color: #04202b;
        border-color: transparent;
        font-weight: 700;
      }

      .chat-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 5px;
        color: var(--chat-faint);
        font-size: 11px;
      }

      .chat-message-row.mine .chat-meta {
        justify-content: flex-start;
      }

      .chat-message-row.theirs .chat-meta {
        justify-content: flex-end;
      }

      [dir='ltr'] .chat-message-row.mine .chat-meta {
        justify-content: flex-end;
      }

      [dir='ltr'] .chat-message-row.theirs .chat-meta {
        justify-content: flex-start;
      }

      .chat-edit-btn {
        border: 0;
        background: transparent;
        color: var(--chat-primary);
        cursor: pointer;
        font: inherit;
        font-size: 11px;
        font-weight: 900;
        padding: 0;
      }

      .chat-composer {
        flex: 0 0 auto;
        border-top: 1px solid var(--chat-border);
        padding: 14px 18px;
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) 54px;
        gap: 10px;
        align-items: end;
        background: var(--chat-panel);
      }

      .chat-icon-btn,
      .chat-send-btn {
        height: 44px;
        border-radius: 14px;
        border: 1px solid var(--chat-border);
        background: var(--chat-panel-2);
        color: var(--chat-text);
        cursor: pointer;
        font: inherit;
        font-weight: 900;
      }

      .chat-send-btn {
        border: 0;
        background: var(--chat-primary);
        color: #042331;
      }

      .chat-send-btn:disabled,
      .chat-icon-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .chat-input {
        min-height: 44px;
        max-height: 124px;
        resize: none;
        box-sizing: border-box;
        border: 1px solid var(--chat-border);
        border-radius: 14px;
        background: var(--chat-panel-2);
        color: var(--chat-text);
        padding: 11px 14px;
        outline: none;
        font: inherit;
        line-height: 1.5;
      }

      .chat-input:focus {
        border-color: var(--chat-primary);
        box-shadow: 0 0 0 3px rgba(37, 199, 221, 0.14);
      }

      .chat-empty {
        height: 100%;
        min-height: 360px;
        display: grid;
        place-items: center;
        text-align: center;
        padding: 24px;
        color: var(--chat-muted);
      }

      .chat-empty-card {
        max-width: 360px;
      }

      .chat-empty-icon {
        width: 78px;
        height: 78px;
        display: grid;
        place-items: center;
        margin: 0 auto 16px;
        border-radius: 24px;
        background: var(--chat-panel-2);
        color: var(--chat-primary);
        font-size: 34px;
      }

      .chat-empty h2,
      .chat-empty h3 {
        color: var(--chat-text);
        margin: 0 0 8px;
        font-size: 20px;
      }

      .chat-empty p {
        margin: 0;
        color: var(--chat-muted);
        line-height: 1.7;
      }

      .chat-edit-box {
        display: grid;
        gap: 8px;
      }

      .chat-edit-actions {
        display: flex;
        gap: 8px;
      }

      .chat-small-btn {
        border: 1px solid var(--chat-border);
        border-radius: 10px;
        background: var(--chat-panel);
        color: var(--chat-text);
        padding: 6px 12px;
        font: inherit;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
      }

      .chat-small-btn.primary {
        border-color: transparent;
        background: var(--chat-primary);
        color: #042331;
      }

      @media (max-width: 900px) {
        .chat-page {
          padding: 12px;
        }

        .chat-shell {
          height: calc(100vh - 150px);
          grid-template-columns: 1fr;
        }

        .chat-sidebar {
          display: none;
        }

        .chat-shell.show-list .chat-sidebar {
          display: flex;
        }

        .chat-shell.show-list .chat-main {
          display: none;
        }

        .chat-bubble-wrap {
          max-width: 88%;
        }
      }
    `}</style>
  );
}

function Avatar({ participant, isOnline }) {
  const name = participant?.full_name || participant?.name || '?';
  return (
    <div className="chat-avatar">
      {participant?.avatar ? <img src={participant.avatar} alt={name} /> : initials(name)}
      <span className={`chat-presence ${isOnline ? 'online' : ''}`} />
    </div>
  );
}

function EmptyState({ icon, title, hint }) {
  return (
    <div className="chat-empty">
      <div className="chat-empty-card">
        <div className="chat-empty-icon">{icon}</div>
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { language = 'ar', isRTL } = useTranslation();
  const lang = language === 'en' ? 'en' : 'ar';
  const copy = COPY[lang];
  const rtl = isRTL ?? lang === 'ar';
  const chatMode = location.pathname.includes('/chat/doctor') ? 'doctor' : 'patient';
  const expectedOtherRole = chatMode === 'doctor' ? 'patient' : 'doctor';

  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [query, setQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState({});
  const [sending, setSending] = useState(false);
  const [showList, setShowList] = useState(true);

  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const conversationsQuery = useQuery({
    queryKey: ['chat', 'conversations', user?.id, chatMode],
    queryFn: chatApi.getConversations,
    refetchInterval: 30000,
    enabled: Boolean(user?.id),
  });

  const conversations = useMemo(() => {
    const raw = conversationsQuery.data;
    const list = Array.isArray(raw) ? raw : raw?.results || [];
    return list.filter(conv => conv?.other_participant?.role === expectedOtherRole);
  }, [conversationsQuery.data, expectedOtherRole]);

  const filteredConversations = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return conversations;
    return conversations.filter(conv => {
      const participant = conv.other_participant || {};
      return [
        participant.full_name,
        participant.name,
        participant.specialty,
        conv.last_message?.content,
      ].filter(Boolean).some(text => String(text).toLowerCase().includes(value));
    });
  }, [conversations, query]);

  useEffect(() => {
    const convParam = searchParams.get('conv');
    if (convParam) {
      setActiveId(Number(convParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  useEffect(() => {
    setActiveId(null);
    setMessages([]);
    setDraft('');
    setEditingId(null);
  }, [user?.id, chatMode]);

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', user?.id, activeId],
    queryFn: () => chatApi.getMessages(activeId),
    enabled: Boolean(user?.id && activeId),
  });

  useEffect(() => {
    const raw = messagesQuery.data;
    const next = Array.isArray(raw) ? raw : raw?.results || [];
    setMessages([...next].reverse());
  }, [messagesQuery.data]);

  const activeConversation = conversations.find(conv => conv.id === activeId);
  const activeParticipant = activeConversation?.other_participant;
  const activeParticipantOnline = Boolean(
    activeParticipant && (presence[activeParticipant.id] ?? activeParticipant.is_online)
  );

  const markActiveAsRead = useCallback(() => {
    if (!activeId) return;
    chatApi.markAsRead(activeId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    }).catch(() => {});
  }, [activeId, queryClient]);

  useEffect(() => {
    if (!activeId) return undefined;
    let cancelled = false;

    const connect = async () => {
      try {
        const accessToken = tokenStorage?.getAccess?.();
        if (!accessToken) return;

        const ticketResponse = await fetch('/api/v1/auth/ws-ticket/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!ticketResponse.ok || cancelled) return;

        const ticketData = await ticketResponse.json();
        if (!ticketData?.ticket || cancelled) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat/${activeId}/?ticket=${ticketData.ticket}`);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
          markActiveAsRead();
        };
        socket.onclose = () => setIsConnected(false);
        socket.onerror = () => setIsConnected(false);
        socket.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'chat_message' && data.message) {
              setMessages(prev => (
                prev.some(msg => String(msg.id) === String(data.message.id))
                  ? prev
                  : [...prev, data.message]
              ));
              markActiveAsRead();
              queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
            }
            if (data.type === 'message_updated' && data.message) {
              setMessages(prev => prev.map(msg => (
                String(msg.id) === String(data.message.id) ? data.message : msg
              )));
              queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
            }
            if (data.type === 'read_receipt' && data.reader_id !== user?.id) {
              setMessages(prev => prev.map(msg => (
                isOwnMessage(msg, user) ? { ...msg, is_read: true } : msg
              )));
            }
            if (data.type === 'presence') {
              setPresence(prev => ({ ...prev, [data.user_id]: data.is_online }));
            }
          } catch {
            // Ignore malformed realtime payloads.
          }
        };
      } catch {
        setIsConnected(false);
      }
    };

    connect();
    markActiveAsRead();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [activeId, markActiveAsRead, queryClient, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeId]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let current = '';
    messages.forEach(message => {
      const day = formatDay(message.created_at, lang, copy);
      if (day !== current) {
        groups.push({ type: 'day', id: `day-${day}`, label: day });
        current = day;
      }
      groups.push({ type: 'message', id: message.id, message });
    });
    return groups;
  }, [messages, lang, copy]);

  const handleSelectConversation = conv => {
    setActiveId(conv.id);
    setShowList(false);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeId || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      content: text,
      message_type: 'text',
      sender_type: 'me',
      sender: user?.id,
      is_read: false,
      created_at: new Date().toISOString(),
      optimistic: true,
    };

    setDraft('');
    setSending(true);
    setMessages(prev => [...prev, optimistic]);

    try {
      const saved = await chatApi.sendMessage(activeId, text);
      setMessages(prev => prev.map(msg => msg.id === tempId ? saved : msg));
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } catch {
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const handleEdit = message => {
    setEditingId(message.id);
    setEditingText(message.content || '');
  };

  const handleSaveEdit = async () => {
    const text = editingText.trim();
    if (!text || !activeId || !editingId) return;
    const messageId = editingId;
    setEditingId(null);
    setEditingText('');
    try {
      const updated = await chatApi.editMessage(activeId, messageId, text);
      setMessages(prev => prev.map(msg => String(msg.id) === String(messageId) ? updated : msg));
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } catch {
      setEditingId(messageId);
      setEditingText(text);
    }
  };

  const handleFileUpload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeId) return;
    setSending(true);
    try {
      const saved = await chatApi.sendFile(activeId, file);
      setMessages(prev => [...prev, saved]);
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } catch {
      alert(copy.fileFail);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-page" dir={rtl ? 'rtl' : 'ltr'}>
      <ChatStyles />
      <div className={`chat-shell ${showList ? 'show-list' : ''}`}>
        <aside className="chat-sidebar">
          <div className="chat-section-header">
            <div className="chat-title-row">
              <h1 className="chat-title">{copy.title}</h1>
              <span className="chat-connection">
                <span className={`chat-dot ${isConnected ? 'online' : ''}`} />
                {isConnected ? copy.connected : copy.disconnected}
              </span>
            </div>
            <input
              className="chat-search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.search}
            />
          </div>

          <div className="chat-list">
            {conversationsQuery.isLoading ? (
              <EmptyState icon="..." title={copy.title} hint="" />
            ) : filteredConversations.length === 0 ? (
              <EmptyState icon="💬" title={copy.noConversations} hint={copy.noConversationsHint} />
            ) : (
              filteredConversations.map(conversation => {
                const participant = conversation.other_participant || {};
                const name = otherName(conversation);
                const isOnline = Boolean(presence[participant.id] ?? participant.is_online);
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`chat-conversation ${conversation.id === activeId ? 'active' : ''}`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <Avatar participant={participant} isOnline={isOnline} />
                    <span className="chat-conv-body">
                      <span className="chat-conv-top">
                        <span className="chat-conv-name">
                          {participant.role === 'doctor' && lang === 'ar' ? `د. ${name}` : name}
                        </span>
                        <span className="chat-time">
                          {formatDay(conversation.last_message?.created_at || conversation.updated_at, lang, copy)}
                        </span>
                      </span>
                      <span className="chat-preview">
                        <span>{conversation.last_message?.content || participant.specialty || '...'}</span>
                        {conversation.unread_count > 0 && <span className="chat-badge">{conversation.unread_count}</span>}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="chat-main">
          {!activeConversation ? (
            <EmptyState icon="👋" title={copy.selectTitle} hint={copy.selectHint} />
          ) : (
            <>
              <header className="chat-topbar">
                <button type="button" className="chat-icon-btn" onClick={() => setShowList(true)} aria-label={copy.title}>
                  ☰
                </button>
                <Avatar participant={activeParticipant} isOnline={activeParticipantOnline} />
                <div className="chat-topbar-title">
                  <h2>{activeParticipant?.role === 'doctor' && lang === 'ar' ? `د. ${otherName(activeConversation)}` : otherName(activeConversation)}</h2>
                  <p>
                    <span className="chat-status-text">
                      <span className={`chat-dot ${activeParticipantOnline ? 'online' : ''}`} />
                      {activeParticipantOnline ? copy.online : copy.offline}
                    </span>
                    {activeParticipant?.specialty ? ` · ${activeParticipant.specialty}` : ''}
                  </p>
                </div>
              </header>

              <section className="chat-messages">
                {messagesQuery.isLoading ? (
                  <EmptyState icon="..." title={copy.title} hint="" />
                ) : messages.length === 0 ? (
                  <EmptyState icon="👋" title={copy.startTitle} hint={copy.startHint} />
                ) : (
                  groupedMessages.map(item => {
                    if (item.type === 'day') {
                      return (
                        <div className="chat-date" key={item.id}>
                          <span>{item.label}</span>
                        </div>
                      );
                    }

                    const message = item.message;
                    const mine = isOwnMessage(message, user);
                    const isEditing = String(editingId) === String(message.id);
                    return (
                      <div key={message.id} className={`chat-message-row ${mine ? 'mine' : 'theirs'}`}>
                        <div className="chat-bubble-wrap">
                          <div className="chat-bubble">
                            {isEditing ? (
                              <div className="chat-edit-box">
                                <textarea
                                  className="chat-input"
                                  value={editingText}
                                  onChange={event => setEditingText(event.target.value)}
                                  rows={2}
                                  autoFocus
                                />
                                <div className="chat-edit-actions">
                                  <button type="button" className="chat-small-btn primary" onClick={handleSaveEdit}>{copy.save}</button>
                                  <button type="button" className="chat-small-btn" onClick={() => setEditingId(null)}>{copy.cancel}</button>
                                </div>
                              </div>
                            ) : message.message_type === 'image' && message.file_url ? (
                              <a href={message.file_url} target="_blank" rel="noreferrer">
                                <img src={message.file_url} alt="" style={{ maxWidth: 260, borderRadius: 12, display: 'block' }} />
                              </a>
                            ) : message.file_url ? (
                              <a href={message.file_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', fontWeight: 900 }}>
                                {message.file_name || copy.attach}
                              </a>
                            ) : (
                              message.content
                            )}
                          </div>
                          <div className="chat-meta">
                            <span>{formatClock(message.created_at, lang)}</span>
                            {message.edited_at && <span>{copy.edited}</span>}
                            {mine && <span>{message.is_read ? copy.read : copy.sent}</span>}
                            {mine && message.message_type === 'text' && !message.optimistic && !isEditing && (
                              <button type="button" className="chat-edit-btn" onClick={() => handleEdit(message)}>
                                {copy.edit}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </section>

              <footer className="chat-composer">
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="chat-icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title={copy.attach}
                >
                  📎
                </button>
                <textarea
                  className="chat-input"
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={copy.type}
                  disabled={sending}
                />
                <button
                  type="button"
                  className="chat-send-btn"
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  aria-label={copy.send}
                >
                  {rtl ? '➤' : '➤'}
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
