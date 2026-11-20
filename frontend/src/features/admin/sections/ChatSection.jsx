/**
 * ChatSection.jsx — Admin Chat Interface
 * Sprint 3: Chat Integration — واجهة المحادثات للـ Admin
 *
 * Admin يستطيع:
 *  • عرض كل المحادثات النشطة في المنصة
 *  • مراسلة أي مستخدم (مريض / طبيب / مستشفى)
 *  • ابدء محادثة جديدة
 *  • Real-time via shared socketManager
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../../chat/api/chatApi';
import socketManager from '../../../services/socketManager';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import { tokens } from '../../../theme/tokens';

// ── Constants ────────────────────────────────────────────────────────────────
const P    = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const PL   = tokens?.colors?.primary?.lighter  || '#E0F7FA';
const G100 = tokens?.colors?.gray?.[100]       || '#F3F4F6';
const G200 = tokens?.colors?.gray?.[200]       || '#E5E7EB';
const G300 = tokens?.colors?.gray?.[300]       || '#D1D5DB';
const G400 = tokens?.colors?.gray?.[400]       || '#9CA3AF';
const G500 = tokens?.colors?.gray?.[500]       || '#6B7280';
const G700 = tokens?.colors?.gray?.[700]       || '#374151';
const G800 = tokens?.colors?.gray?.[800]       || '#1F2937';
const G900 = tokens?.colors?.gray?.[900]       || '#111827';
const SUC  = tokens?.colors?.success?.DEFAULT  || '#31A870';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return '';
  const d   = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000)   return 'الآن';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000)
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

function formatMsgTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe }) {
  const isImage = msg.message_type === 'image';
  const isFile  = msg.message_type === 'file';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMe ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 6,
      opacity: msg.is_optimistic ? 0.7 : 1,
      transition: 'opacity .2s',
    }}>
      {!isMe && (
        <Avatar
          name={msg.sender_name || '?'}
          src={msg.sender_avatar}
          size="xs"
          style={{ flexShrink: 0, marginBottom: 2 }}
        />
      )}
      <div style={{ maxWidth: '68%' }}>
        {!isMe && msg.sender_name && (
          <div style={{ fontSize: 11, color: G400, marginBottom: 3, paddingRight: 4 }}>
            {msg.sender_name}
          </div>
        )}
        <div style={{
          background: isMe ? P : 'var(--bg-card, #fff)',
          color: isMe ? '#fff' : G800,
          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: isImage ? '4px' : '10px 14px',
          boxShadow: tokens.shadows.xs,
          fontSize: 14,
          lineHeight: 1.55,
          wordBreak: 'break-word',
          border: isMe ? 'none' : `1px solid ${G200}`,
        }}>
          {isImage && msg.file_url ? (
            <img
              src={msg.file_url}
              alt="صورة"
              style={{ maxWidth: 220, maxHeight: 220, borderRadius: 14, display: 'block', cursor: 'pointer' }}
              onClick={() => window.open(msg.file_url, '_blank')}
            />
          ) : isFile && msg.file_url ? (
            <a
              href={msg.file_url} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: isMe ? '#fff' : P, textDecoration: 'none', fontWeight: 600 }}
            >
              <span style={{ fontSize: 18 }}>📎</span>
              <span style={{ fontSize: 13 }}>{msg.file_name || 'ملف'}</span>
            </a>
          ) : (
            msg.content
          )}
        </div>
        <div style={{
          fontSize: 11, color: G400, marginTop: 3,
          textAlign: isMe ? 'left' : 'right',
          display: 'flex', alignItems: 'center', gap: 4,
          justifyContent: isMe ? 'flex-start' : 'flex-end',
        }}>
          {formatMsgTime(msg.created_at)}
          {isMe && (
            <span style={{ color: msg.is_read ? '#3B82F6' : G300 }}>
              {msg.is_optimistic ? '⏳' : '✓✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Conversation Item ─────────────────────────────────────────────────────────
function ConversationItem({ conv, isActive, onClick }) {
  const name    = conv.other_participant?.full_name || conv.other_participant?.name || 'محادثة';
  const lastMsg = conv.last_message?.content || '';
  const unread  = conv.unread_count || 0;
  const time    = conv.last_message?.created_at;
  const role    = conv.other_participant?.role;

  const roleColors = {
    patient:   { bg: '#D1FAE5', text: '#065F46', label: 'مريض' },
    doctor:    { bg: '#DBEAFE', text: '#1E3A5F', label: 'طبيب' },
    assistant: { bg: '#EDE9FE', text: '#5B21B6', label: 'مساعد' },
    hospital:  { bg: '#FEF3C7', text: '#92400E', label: 'مستشفى' },
  };
  const roleStyle = roleColors[role] || { bg: G200, text: G700, label: role || '—' };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
        background: isActive ? PL : 'transparent',
        borderRadius: 12, transition: 'background .15s', alignItems: 'center',
        borderLeft: isActive ? `3px solid ${P}` : '3px solid transparent',
        marginBottom: 2,
      }}
      onMouseOver={e => { if (!isActive) e.currentTarget.style.background = G100; }}
      onMouseOut={e  => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar name={name} src={conv.other_participant?.image} size="sm" />
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 10, height: 10, borderRadius: '50%',
          background: conv.other_participant?.is_online ? SUC : G300,
          border: '2px solid var(--bg-card, #fff)',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: G900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
            {name}
          </span>
          <span style={{ fontSize: 10, color: G400, flexShrink: 0 }}>{formatTime(time)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: G500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
            {lastMsg || 'ابدأ المحادثة...'}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {role && (
              <span style={{ fontSize: 9, fontWeight: 700, background: roleStyle.bg, color: roleStyle.text, padding: '1px 5px', borderRadius: 8 }}>
                {roleStyle.label}
              </span>
            )}
            {unread > 0 && (
              <span style={{
                background: P, color: '#fff', fontSize: 10, fontWeight: 700,
                borderRadius: '50%', minWidth: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chat Window ───────────────────────────────────────────────────────────────
function ChatWindow({ conversationId, otherUser }) {
  const qc = useQueryClient();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileInputRef = useRef(null);
  const [text, setText]       = useState('');
  const [messages, setMessages] = useState([]);

  // Load messages
  const { data, isLoading } = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn:  () => chatApi.getMessages(conversationId),
    enabled:  !!conversationId,
  });

  useEffect(() => {
    if (!data) return;
    const msgs = Array.isArray(data) ? data : (data?.results || []);
    setMessages([...msgs].reverse());
  }, [data]);

  // Real-time new messages
  useEffect(() => {
    if (!conversationId) return;
    const handler = (event) => {
      if (event.type !== 'chat_message') return;
      if (event.conversation_id !== conversationId) return;
      const msg = event.message;
      if (!msg) return;
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      qc.invalidateQueries(['chat', 'conversations']);
    };
    const unsub = socketManager.subscribe('chat_message', handler);
    return unsub;
  }, [conversationId, qc]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when opened
  useEffect(() => {
    if (conversationId) chatApi.markAsRead(conversationId).catch(() => {});
  }, [conversationId]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: ({ content, messageType }) =>
      chatApi.sendMessage(conversationId, content, messageType || 'text'),
    onMutate: async ({ content }) => {
      const optimistic = {
        id: `opt-${Date.now()}`, content,
        message_type: 'text', sender_type: 'me',
        created_at: new Date().toISOString(), is_optimistic: true,
      };
      setMessages(prev => [...prev, optimistic]);
      return { optimistic };
    },
    onSuccess: (data, _, ctx) => {
      setMessages(prev => prev.map(m => m.id === ctx.optimistic.id ? data : m));
      qc.invalidateQueries(['chat', 'conversations']);
    },
    onError: (_, __, ctx) => {
      setMessages(prev => prev.filter(m => m.id !== ctx.optimistic.id));
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate({ content: trimmed });
    setText('');
    inputRef.current?.focus();
  }, [text, sendMutation]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await chatApi.sendFile(conversationId, file);
      qc.invalidateQueries(['chat', 'messages', conversationId]);
      qc.invalidateQueries(['chat', 'conversations']);
    } catch { /* ignore */ }
    e.target.value = '';
  };

  const name = otherUser?.full_name || otherUser?.name || 'محادثة';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        borderBottom: `1px solid ${G200}`, background: 'var(--bg-card, #fff)',
        flexShrink: 0,
      }}>
        <div style={{ position: 'relative' }}>
          <Avatar name={name} src={otherUser?.image} size="sm" />
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: '50%',
            background: otherUser?.is_online ? SUC : G300,
            border: '2px solid var(--bg-card, #fff)',
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: G900 }}>{name}</div>
          <div style={{ fontSize: 12, color: otherUser?.is_online ? SUC : G400 }}>
            {otherUser?.is_online ? '● نشط الآن' : 'غير متصل'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        background: 'var(--bg-page, #F8FAFC)',
        display: 'flex', flexDirection: 'column',
      }}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: i % 2 ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              <Skeleton width={i % 2 ? 180 : 220} height={38} style={{ borderRadius: 18 }} />
            </div>
          ))
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: G400, marginTop: 60, fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontWeight: 600, color: G700, marginBottom: 4 }}>لا توجد رسائل بعد</div>
            <div style={{ fontSize: 13 }}>ابدأ المحادثة بكتابة رسالة أدناه</div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_type === 'me' || msg.is_optimistic;
            return (
              <MessageBubble key={msg.id || idx} msg={msg} isMe={isMe} />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10, padding: '14px 20px',
        borderTop: `1px solid ${G200}`, background: 'var(--bg-card, #fff)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: G100, border: 'none', cursor: 'pointer', borderRadius: 10,
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: G500, flexShrink: 0, transition: 'background .15s',
          }}
          title="إرفاق ملف"
          onMouseOver={e => e.currentTarget.style.background = G200}
          onMouseOut={e => e.currentTarget.style.background = G100}
        >
          📎
        </button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFile} />

        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالة... (Enter للإرسال)"
          rows={1}
          style={{
            flex: 1, resize: 'none', border: `1px solid ${G200}`, borderRadius: 20,
            padding: '9px 16px', fontSize: 14, fontFamily: 'inherit',
            outline: 'none', color: G800, background: 'var(--bg-page, #F8FAFC)',
            minHeight: 38, maxHeight: 100, lineHeight: 1.5,
            transition: 'border-color .15s',
          }}
          onFocus={e  => e.target.style.borderColor = P}
          onBlur={e   => e.target.style.borderColor = G200}
          dir="rtl"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          style={{
            background: text.trim() ? P : G200,
            border: 'none', cursor: text.trim() ? 'pointer' : 'not-allowed',
            borderRadius: '50%', width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: text.trim() ? '#fff' : G400,
            transition: 'background .15s', flexShrink: 0,
          }}
          title="إرسال"
        >
          {sendMutation.isPending ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}

// ── New Conversation Modal ────────────────────────────────────────────────────
function NewConvModal({ onClose, onStart }) {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleStart = async () => {
    const id = parseInt(userId.trim(), 10);
    if (!id) { setError('يرجى إدخال معرف مستخدم صحيح'); return; }
    setLoading(true); setError('');
    try {
      const conv = await chatApi.startConversation(id);
      onStart(conv);
    } catch {
      setError('لم يتم إيجاد المستخدم أو حدث خطأ، تحقق من المعرف.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card, #fff)', borderRadius: 16,
          padding: 28, width: 380, boxShadow: tokens.shadows.modal,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 800, fontSize: 16, color: G900, marginBottom: 4 }}>محادثة جديدة</div>
        <div style={{ fontSize: 13, color: G500, marginBottom: 20 }}>أدخل معرف المستخدم (User ID)</div>

        <input
          type="number"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder="مثال: 42"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
            border: `1px solid ${error ? tokens.colors.danger.DEFAULT : G200}`,
            outline: 'none', color: G800, boxSizing: 'border-box', fontFamily: 'inherit',
          }}
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleStart()}
        />
        {error && <div style={{ fontSize: 12, color: tokens.colors.danger.DEFAULT, marginTop: 6 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${G200}`,
              background: 'none', cursor: 'pointer', fontSize: 14, color: G700, fontFamily: 'inherit',
            }}
          >إلغاء</button>
          <button
            onClick={handleStart}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: P, cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 700, fontFamily: 'inherit',
            }}
          >{loading ? 'جارٍ...' : 'ابدأ المحادثة'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChatSection() {
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId]   = useState(null);
  const [activeConv,   setActiveConv]     = useState(null);
  const [searchQ,      setSearchQ]        = useState('');
  const [showNewModal, setShowNewModal]   = useState(false);

  // Fetch all conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn:  chatApi.getConversations,
    staleTime: 30_000,
  });

  // Filter conversations by search
  const filtered = searchQ
    ? conversations.filter(c => {
        const name = (c.other_participant?.full_name || c.other_participant?.name || '').toLowerCase();
        return name.includes(searchQ.toLowerCase());
      })
    : conversations;

  // Total unread badge
  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  // Select conversation
  const selectConv = useCallback((conv) => {
    setActiveConvId(conv.id);
    setActiveConv(conv);
    chatApi.markAsRead(conv.id).catch(() => {});
    qc.invalidateQueries(['chat', 'conversations']);
  }, [qc]);

  // After starting new conversation
  const handleNewConvStarted = useCallback((conv) => {
    qc.invalidateQueries(['chat', 'conversations']);
    setShowNewModal(false);
    selectConv(conv);
  }, [qc, selectConv]);

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 0, borderRadius: 16, overflow: 'hidden', boxShadow: tokens.shadows.card }}>

      {/* ── Left Sidebar: Conversation list ── */}
      <div style={{
        width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card, #fff)', borderRight: `1px solid ${G200}`,
      }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 12px', borderBottom: `1px solid ${G200}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: G900 }}>المحادثات</span>
              {totalUnread > 0 && (
                <span style={{
                  background: P, color: '#fff', fontSize: 10, fontWeight: 700,
                  borderRadius: 99, padding: '2px 7px',
                }}>
                  {totalUnread}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                background: P, color: '#fff', border: 'none', cursor: 'pointer',
                borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>+</span> جديدة
            </button>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: G400, pointerEvents: 'none',
            }}>🔍</span>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="بحث في المحادثات..."
              style={{
                width: '100%', padding: '8px 34px 8px 12px', borderRadius: 10,
                border: `1px solid ${G200}`, fontSize: 13, outline: 'none',
                color: G800, background: 'var(--bg-page, #F8FAFC)',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
              dir="rtl"
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 8px', alignItems: 'center' }}>
                <Skeleton width={38} height={38} style={{ borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <Skeleton width={120} height={13} style={{ marginBottom: 6, borderRadius: 6 }} />
                  <Skeleton width={160} height={11} style={{ borderRadius: 6 }} />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: G400 }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>💬</div>
              <div style={{ fontSize: 13 }}>
                {searchQ ? 'لا توجد نتائج' : 'لا توجد محادثات بعد'}
              </div>
            </div>
          ) : (
            filtered.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                onClick={() => selectConv(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: Chat Window or Empty State ── */}
      <div style={{ flex: 1, background: 'var(--bg-page, #F8FAFC)', display: 'flex', flexDirection: 'column' }}>
        {activeConvId && activeConv ? (
          <ChatWindow
            conversationId={activeConvId}
            otherUser={activeConv.other_participant}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: G400,
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: G700, marginBottom: 8 }}>
              مركز المحادثات
            </div>
            <div style={{ fontSize: 14, color: G500, textAlign: 'center', maxWidth: 280, lineHeight: 1.7 }}>
              اختر محادثة من القائمة على اليسار أو ابدأ محادثة جديدة مع أي مستخدم
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                marginTop: 24, background: P, color: '#fff', border: 'none',
                cursor: 'pointer', borderRadius: 12, padding: '12px 28px',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                boxShadow: tokens.shadows.sm,
              }}
            >
              + محادثة جديدة
            </button>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <NewConvModal
          onClose={() => setShowNewModal(false)}
          onStart={handleNewConvStarted}
        />
      )}
    </div>
  );
}
