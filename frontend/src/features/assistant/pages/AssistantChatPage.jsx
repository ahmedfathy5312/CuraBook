/**
 * AssistantChatPage.jsx — Sprint 3
 * Chat system for assistant ↔ doctor communication.
 * Reuses chatApi (same endpoints, same websocket via socketManager).
 * Route: /assistant-chat
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../../chat/api/chatApi';
import { useAuth } from '../../../context/AuthContext';
import socketManager from '../../../services/socketManager';

const P = 'var(--primary)';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  if (now - d < 86400000) return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}
function fmtMsgTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}
function getInitials(name) {
  return (name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${P}, #06b6d4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.38, fontWeight: 800, flexShrink: 0 }}>
      {getInitials(name)}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMe }) {
  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
      {!isMe && <Avatar name={msg.sender_name || '?'} size={30} />}
      <div style={{ maxWidth: '70%' }}>
        <div style={{
          padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isMe ? P : 'var(--bg-card)',
          color: isMe ? '#fff' : 'var(--text-body)',
          fontSize: 14, lineHeight: 1.5,
          border: isMe ? 'none' : '1px solid var(--border-base)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        }}>
          {msg.content}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4, textAlign: isMe ? 'left' : 'right', paddingInline: 4 }}>
          {fmtMsgTime(msg.created_at)} {isMe && (msg.is_read ? '✓✓' : '✓')}
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AssistantChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  // Conversations list
  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['assistant', 'chat', 'conversations'],
    queryFn: chatApi.getConversations,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const conversations = convsData?.results || convsData || [];

  // Messages for active conversation
  const { data: msgsData, isLoading: msgsLoading } = useQuery({
    queryKey: ['assistant', 'chat', 'messages', activeConvId],
    queryFn: () => chatApi.getMessages(activeConvId),
    enabled: !!activeConvId,
    staleTime: 5_000,
    refetchInterval: 8_000,
  });

  const messages = msgsData?.results || msgsData || [];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark as read when conv opened
  useEffect(() => {
    if (activeConvId) {
      chatApi.markAsRead(activeConvId).catch(() => {});
      qc.invalidateQueries({ queryKey: ['assistant', 'chat', 'conversations'] });
    }
  }, [activeConvId]);

  // LOW-04 FIX: WebSocket — chat messages via the global socket connection
  // The socketManager maintains ONE WS connection (established via AuthContext on login).
  // Chat subscribes to 'chat_message' events; we do NOT call socketManager.connect()
  // here because that would attempt a second connection bypassing ticket auth.
  // The global connection handles ticket-based auth (SEC-01) automatically.
  useEffect(() => {
    if (!activeConvId || !user?.id) return;
    const unsub = socketManager.subscribe('chat_message', (data) => {
      if (data?.conversation_id === activeConvId || data?.type === 'chat_message') {
        qc.invalidateQueries({ queryKey: ['assistant', 'chat', 'messages', activeConvId] });
        qc.invalidateQueries({ queryKey: ['assistant', 'chat', 'conversations'] });
      }
    });
    // Also subscribe to the conversation-specific channel for targeted events
    const unsubConv = socketManager.subscribe(`chat_${activeConvId}`, (data) => {
      if (data?.type === 'chat_message') {
        qc.invalidateQueries({ queryKey: ['assistant', 'chat', 'messages', activeConvId] });
        qc.invalidateQueries({ queryKey: ['assistant', 'chat', 'conversations'] });
      }
    });
    return () => { unsub?.(); unsubConv?.(); };
  }, [activeConvId, user?.id]);

  const sendMsg = useMutation({
    mutationFn: () => chatApi.sendMessage(activeConvId, inputText.trim()),
    onSuccess: () => {
      setInputText('');
      qc.invalidateQueries({ queryKey: ['assistant', 'chat', 'messages', activeConvId] });
      qc.invalidateQueries({ queryKey: ['assistant', 'chat', 'conversations'] });
    },
  });

  const handleSend = () => {
    if (!inputText.trim() || !activeConvId || sendMsg.isPending) return;
    sendMsg.mutate();
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', fontFamily: 'Cairo,sans-serif', direction: 'rtl', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 280 : 0, minWidth: sidebarOpen ? 280 : 0, transition: 'all 0.25s', overflow: 'hidden', borderLeft: '1px solid var(--border-base)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-base)' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-h)' }}>💬 المحادثات</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {convsLoading ? (
            <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>جارٍ التحميل...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>لا توجد محادثات بعد</p>
              <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 6 }}>سيتم ربطك تلقائياً مع الدكتور</p>
            </div>
          ) : conversations.map(conv => {
            const other = conv.participants?.find(p => p.id !== user?.id) || conv.other_participant;
            const name  = other ? `${other.first_name || ''} ${other.last_name || ''}`.trim() || 'دكتور' : 'محادثة';
            const unread= conv.unread_count || 0;
            const isActive = conv.id === activeConvId;
            return (
              <div key={conv.id} onClick={() => setActiveConvId(conv.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: isActive ? '#f0f9ff' : 'transparent', borderBottom: '1px solid var(--border-base)', transition: 'background 0.15s' }}>
                <Avatar name={name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 600, color: isActive ? P : 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    {unread > 0 && <span style={{ background: P, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 'var(--radius-lg)', flexShrink: 0 }}>{unread}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.last_message?.content || 'لا توجد رسائل بعد'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-base)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', background: 'var(--bg-page)', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>
            ☰
          </button>
          {activeConv ? (() => {
            const other = activeConv.participants?.find(p => p.id !== user?.id) || activeConv.other_participant;
            const name  = other ? `${other.first_name||''} ${other.last_name||''}`.trim() : 'دكتور';
            return (
              <>
                <Avatar name={name} size={36} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)' }}>{name}</div>
                  <div style={{ fontSize: 12, color: '#22c55e' }}>● متصل</div>
                </div>
              </>
            );
          })() : (
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>اختر محادثة من القائمة</div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--bg-page)' }}>
          {!activeConvId ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 64 }}>💬</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)' }}>اختر محادثة لتبدأ</p>
              <p style={{ fontSize: 13, color: 'var(--text-hint)' }}>يمكنك التواصل مع الأطباء المرتبطين بك</p>
            </div>
          ) : msgsLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 40 }}>جارٍ التحميل...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>لا توجد رسائل بعد. ابدأ المحادثة!</p>
            </div>
          ) : (
            messages.map(msg => (
              <Bubble key={msg.id} msg={msg} isMe={msg.sender === user?.id || msg.sender_id === user?.id} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeConvId && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-base)', background: 'var(--bg-card)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="اكتب رسالتك..."
              rows={1}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-base)', fontSize: 14, color: 'var(--text-body)', background: 'var(--bg-page)', resize: 'none', fontFamily: 'Cairo,sans-serif', direction: 'rtl', outline: 'none', maxHeight: 120, overflowY: 'auto' }}
            />
            <button onClick={handleSend} disabled={!inputText.trim() || sendMsg.isPending}
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: !inputText.trim() ? 'var(--border-base)' : P, color: '#fff', cursor: !inputText.trim() ? 'default' : 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
              ↑
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
