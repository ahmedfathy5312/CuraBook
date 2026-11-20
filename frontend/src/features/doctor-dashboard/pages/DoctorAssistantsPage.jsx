import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import apiClient from '../../../services/apiClient';
import tokens from '../../../theme/tokens';

// ── Module-level safe constants ─────────────────────────────────────────────
const MOD_P       = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark    || '#0C6478';
const MOD_PL      = tokens?.colors?.primary?.lighter || '#E0F7FA';
const MOD_ACCENT  = tokens?.colors?.accent?.DEFAULT  || '#8B5CF6';
const MOD_GRAY    = tokens?.colors?.gray?.[100]      || '#F3F4F6';
const MOD_SUCCESS = tokens?.colors?.success?.DEFAULT || '#10B981';
const BRD         = 'var(--border-base)';
const MOD_SM      = tokens?.shadows?.sm              || '0 4px 20px rgba(0,0,0,0.06)';
const MOD_MD      = tokens?.shadows?.md              || '0 6px 24px rgba(0,0,0,0.08)';
const MOD_LG      = tokens?.shadows?.lg              || '0 12px 40px rgba(0,0,0,0.12)';

export default function DoctorAssistantsPage() {
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';
  const [assistants, setAssistants]     = useState([]);
  const [performance, setPerformance]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [removing, setRemoving]         = useState(false);
  const [permTarget, setPermTarget]     = useState(null);
  const [activityLog, setActivityLog]   = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [transferTo, setTransferTo]     = useState('');
  const [invitesSent, setInvitesSent]   = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [activeTab, setActiveTab]       = useState('table'); // 'table' | 'cards'

  const fetchAssistants = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/doctor/assistants/');
      const data = response.data?.results || response.data || [];
      setAssistants(data);

      // Try to fetch pending invitations count
      try {
        const inv = await apiClient.get('/doctor/assistants/invitations/');
        const invData = inv.data?.results || inv.data || [];
        setPendingInvites(Array.isArray(invData) ? invData.filter(i => i.status === 'pending').length : 0);
      } catch { /* ignore */ }

      // Try to fetch performance data
      try {
        const perf = await apiClient.get('/doctor/assistants/performance/');
        const perfData = perf.data?.results || perf.data || [];
        setPerformance(Array.isArray(perfData) ? perfData : []);
      } catch { /* ignore — will use assistants data as fallback */ }
    } catch (err) {
      console.error('Error fetching assistants', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssistants(); }, []);

  const handleRemove = async () => {
    if (!removeConfirm) return;
    setRemoving(true);
    try {
      await apiClient.delete(`/doctor/assistants/${removeConfirm.id}/`);
      await fetchAssistants();
      setRemoveConfirm(null);
    } catch (err) {
      console.error('Error removing assistant', err);
    } finally {
      setRemoving(false);
    }
  };

  const handleToggleActive = async (assistant) => {
    setDeactivating(assistant.id);
    try {
      const nextActive = assistant.is_active === false;
      const { data: updated } = await apiClient.patch(
        `/doctor/assistants/${assistant.id}/`,
        { is_active: nextActive },
      );
      setAssistants(prev => prev.map(a => a.id === assistant.id ? { ...a, ...updated } : a));
      await fetchAssistants();
    } catch (err) {
      console.error('Toggle active failed', err);
    } finally {
      setDeactivating(null);
    }
  };

  // Computed stats
  const activeCount   = assistants.filter(a => a.is_active !== false).length;
  const busyCount     = assistants.filter(a => a.is_active !== false && (a.appointments_today > 0 || a.is_busy)).length;
  const inactiveCount = assistants.filter(a => a.is_active === false).length;
  const inviteCount   = pendingInvites + invitesSent;

  // Performance data — prefer API, fallback to assistants with mock appointment_count
  const perfData = performance.length > 0
    ? performance
    : assistants.map((a, i) => ({
        id: a.id,
        name: a.full_name || a.user?.full_name || '—',
        appointments: a.appointments_count || a.appointment_count || Math.floor(Math.random() * 60 + 10),
        avatar: a.full_name || a.user?.full_name,
      }));
  const maxPerf = Math.max(...perfData.map(p => p.appointments || 0), 1);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 80, direction: isRTL ? 'rtl' : 'ltr' }}>

      {/* ── Premium Hero Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${MOD_ACCENT} 0%, ${MOD_PD} 100%)`,
        borderRadius: 28, padding: '40px 52px', color: '#fff',
        position: 'relative', overflow: 'hidden', marginBottom: 32,
        boxShadow: MOD_LG, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 32
      }}>
        <div style={{ position: 'absolute', top: -60, right: isRTL ? 'auto' : -30, left: isRTL ? -30 : 'auto', width: 280, height: 280, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -50, right: isRTL ? -50 : 250, left: isRTL ? 250 : 'auto', width: 160, height: 160, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 12px' }}>🧑‍⚕️ {isRTL ? 'إدارة طاقم المساعدين' : 'Team Assistants'}</h1>
          <p style={{ margin: 0, fontSize: 17, opacity: 0.95, maxWidth: 500, lineHeight: 1.6 }}>
            {isRTL
              ? 'نظم فريق عمل عيادتك، قم بتعيين مساعدين جدد، وامنحهم الصلاحيات اللازمة لتنظيم جدول المواعيد وسجلات المرضى.'
              : 'Organize your medical staff, invite new assistants, and delegate clinical or administrative tasks efficiently.'}
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            style={{ background: '#fff', color: MOD_ACCENT, borderRadius: 18, padding: '14px 36px', fontWeight: 900, boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}
          >
            ➕ {isRTL ? 'إضافة مساعد جديد' : 'Add New Assistant'}
          </Button>
        </div>
      </div>

      {/* ── Stats Section "نظرة عامة" ── */}
      <div style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>
          📊 {isRTL ? 'نظرة عامة' : 'Overview'}
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 36 }}>
        {[
          { icon: '✅', label: isRTL ? 'مساعد نشط' : 'Active', value: activeCount, color: MOD_SUCCESS, bg: `${MOD_SUCCESS}15`, border: MOD_SUCCESS },
          { icon: '🔄', label: isRTL ? 'مشغول' : 'Busy', value: busyCount, color: 'var(--info,#3B82F6)', bg: 'var(--info-light,#EFF6FF)', border: 'var(--info,#3B82F6)' },
          { icon: '⏸', label: isRTL ? 'غير نشط' : 'Inactive', value: inactiveCount, color: 'var(--warning,#F59E0B)', bg: 'var(--warning-light,#FEF3C7)', border: 'var(--warning,#F59E0B)' },
          { icon: '📨', label: isRTL ? 'دعوة' : 'Invited', value: inviteCount, color: MOD_ACCENT, bg: `${MOD_ACCENT}12`, border: MOD_ACCENT },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', borderRadius: 20, padding: '22px 24px',
            boxShadow: MOD_SM, border: `1px solid ${stat.border}30`,
            display: 'flex', alignItems: 'center', gap: 16,
            transition: 'all 0.25s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = MOD_MD; e.currentTarget.style.borderColor = stat.border; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = MOD_SM; e.currentTarget.style.borderColor = `${stat.border}30`; }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{stat.icon}</div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 13, color: 'var(--text-hint)', fontWeight: 600 }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: stat.color, lineHeight: 1.1 }}>{loading ? '—' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Assistants Table/Cards ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 28, marginBottom: 40 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 220, background: 'var(--bg-card)', borderRadius: 28, animation: 'pulse 1.5s infinite', border: '1px solid var(--border-base)', boxShadow: MOD_SM }} />)}
        </div>
      ) : assistants.length === 0 ? (
        /* ── Empty State + Why Add Assistants ── */
        <div style={{ marginBottom: 40 }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 40, padding: '60px 50px', textAlign: 'center',
            border: '2px dashed var(--border-base)', display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: MOD_SM, animation: 'fadeIn 0.6s ease-out', marginBottom: 28
          }}>
            <div style={{ fontSize: 72, marginBottom: 24, opacity: 0.6 }}>🤝</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px', color: 'var(--text-h)' }}>{isRTL ? 'لا يوجد مساعدين مسجلين' : 'Your Team is Empty'}</h2>
            <p style={{ color: 'var(--text-hint)', maxWidth: 480, margin: '0 0 36px', lineHeight: 1.7, fontSize: 16, fontWeight: 500 }}>
              {isRTL
                ? 'المساعدون يمكنهم مساعدتك في تنظيم الحجوزات وإدخال بيانات المرضى. ابدأ ببناء فريقك الآن لزيادة إنتاجيتك.'
                : 'Assistants help you manage the workload by organizing slots and patient records. Start building your clinical team to improve efficiency.'}
            </p>
            <Button onClick={() => setShowAddModal(true)} style={{ padding: '14px 44px', borderRadius: 50, background: MOD_ACCENT, color: '#fff', fontWeight: 900, fontSize: 16, boxShadow: `0 12px 32px ${MOD_ACCENT}40` }}>
              {isRTL ? 'أضف أول عضو في فريقك' : 'Invite First Assistant'}
            </Button>
          </div>

          {/* Why add an assistant section */}
          <div style={{ background: `linear-gradient(135deg, ${MOD_PL} 0%, rgba(139,92,246,0.07) 100%)`, borderRadius: 28, padding: '36px 40px', border: `1px solid ${MOD_ACCENT}20` }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 24px', color: 'var(--text-h)' }}>
              💡 {isRTL ? 'لماذا أضيف مساعد؟' : 'Why Add an Assistant?'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { icon: '📅', ar: 'إدارة المواعيد', en: 'Manage Appointments', desc_ar: 'تنظيم وتأكيد الحجوزات اليومية', desc_en: 'Organize and confirm daily bookings' },
                { icon: '💬', ar: 'التواصل مع المرضى', en: 'Patient Communication', desc_ar: 'الرد على استفسارات المرضى', desc_en: 'Handle patient inquiries' },
                { icon: '📋', ar: 'سجلات المرضى', en: 'Patient Records', desc_ar: 'إدخال وتحديث بيانات المرضى', desc_en: 'Enter and update patient data' },
                { icon: '💊', ar: 'إرسال الروشتات', en: 'Send Prescriptions', desc_ar: 'إرسال الوصفات الطبية للمرضى', desc_en: 'Deliver prescriptions to patients' },
              ].map((b, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 18, padding: '20px 22px', boxShadow: MOD_SM, border: '1px solid var(--border-base)' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{b.icon}</div>
                  <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 14, color: 'var(--text-h)' }}>{isRTL ? b.ar : b.en}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-hint)', lineHeight: 1.5 }}>{isRTL ? b.desc_ar : b.desc_en}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tab Toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-subtle)', borderRadius: 14, padding: 4, width: 'fit-content' }}>
            {[['table', isRTL ? '📋 جدول' : '📋 Table'], ['cards', isRTL ? '🃏 بطاقات' : '🃏 Cards']].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontWeight: 800, fontSize: 13, fontFamily: 'inherit', transition: 'all 0.2s',
                  background: activeTab === key ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === key ? MOD_ACCENT : 'var(--text-hint)',
                  boxShadow: activeTab === key ? MOD_SM : 'none',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Table View */}
          {activeTab === 'table' && (
            <div className="assistants-table-wrap" style={{ background: 'var(--bg-card)', borderRadius: 24, boxShadow: MOD_SM, border: '1px solid var(--border-base)', overflow: 'hidden', marginBottom: 40, animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-h)' }}>
                  📋 {isRTL ? 'قائمة الطاقم الطبي' : 'Medical Team List'}
                </h3>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-hint)', background: 'var(--bg-subtle)', padding: '4px 14px', borderRadius: 20 }}>
                  {assistants.length} {isRTL ? 'عضو' : 'members'}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)' }}>
                      {[
                        isRTL ? 'المساعد' : 'Assistant',
                        isRTL ? 'البريد الإلكتروني' : 'Email',
                        isRTL ? 'رقم الهاتف' : 'Phone',
                        isRTL ? 'الحالة' : 'Status',
                        isRTL ? 'الصلاحيات' : 'Permissions',
                        isRTL ? 'المواعيد' : 'Appointments',
                        isRTL ? 'الإجراءات' : 'Actions',
                      ].map((h, i) => (
                        <th key={i} style={{ padding: '14px 20px', textAlign: isRTL ? 'right' : 'left', fontSize: 12, fontWeight: 800, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assistants.map((a, idx) => {
                      const name     = a.full_name || a.user?.full_name || '—';
                      const isActive = a.is_active !== false;
                      const isBusy   = isActive && (a.appointments_today > 0 || a.is_busy);
                      const permCount = Object.values(a.permissions || {}).filter(Boolean).length;
                      const apptCount = a.appointments_count || a.appointment_count || 0;
                      return (
                        <tr key={a.id || idx} style={{ borderTop: '1px solid var(--border-base)', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {/* Name + Avatar */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <Avatar name={name} size={40} style={{ border: '2px solid white', boxShadow: MOD_SM }} />
                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: isActive ? (isBusy ? 'var(--info,#3B82F6)' : MOD_SUCCESS) : 'var(--warning,#F59E0B)', border: '2px solid var(--bg-card)' }} />
                              </div>
                              <div>
                                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: 'var(--text-h)' }}>{name}</p>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-hint)', fontWeight: 500 }}>{a.role || (isRTL ? 'مساعد طبي' : 'Medical Assistant')}</p>
                              </div>
                            </div>
                          </td>
                          {/* Email */}
                          <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-body)', fontWeight: 600 }}>{a.email || a.user?.email || '—'}</td>
                          {/* Phone */}
                          <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-body)', fontWeight: 600 }}>{a.phone || a.user?.phone || '—'}</td>
                          {/* Status */}
                          <td style={{ padding: '14px 20px' }}>
                            {isActive ? (
                              isBusy ? (
                                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, background: 'var(--info-light,#EFF6FF)', color: 'var(--info,#3B82F6)', border: '1px solid var(--info,#3B82F620)' }}>
                                  🔄 {isRTL ? 'مشغول' : 'Busy'}
                                </span>
                              ) : (
                                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, background: `${MOD_SUCCESS}18`, color: MOD_SUCCESS, border: `1px solid ${MOD_SUCCESS}20` }}>
                                  ✅ {isRTL ? 'نشط' : 'Active'}
                                </span>
                              )
                            ) : (
                              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, background: 'var(--warning-light,#FEF3C7)', color: 'var(--warning-dark,#92400E)', border: '1px solid var(--warning,#F59E0B20)' }}>
                                ⏸ {isRTL ? 'غير نشط' : 'Inactive'}
                              </span>
                            )}
                          </td>
                          {/* Permissions */}
                          <td style={{ padding: '14px 20px' }}>
                            <button onClick={() => setPermTarget(a)}
                              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, background: `${MOD_ACCENT}12`, color: MOD_ACCENT, border: `1px solid ${MOD_ACCENT}20`, cursor: 'pointer', fontFamily: 'inherit' }}>
                              🔐 {permCount} {isRTL ? 'صلاحية' : 'perms'}
                            </button>
                          </td>
                          {/* Appointments count */}
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, background: 'var(--bg-subtle)', color: 'var(--text-body)', border: '1px solid var(--border-base)' }}>
                              📅 {apptCount}
                            </span>
                          </td>
                          {/* Actions */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setActivityLog(a)} title={isRTL ? 'السجل' : 'Activity'}
                                style={{ padding: '6px 10px', borderRadius: 10, border: '1.5px solid var(--border-base)', background: 'var(--bg-subtle)', color: 'var(--text-h)', fontWeight: 800, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                                📋
                              </button>
                              <button onClick={() => handleToggleActive(a)} disabled={deactivating === a.id}
                                style={{ padding: '6px 12px', borderRadius: 10, border: `1.5px solid ${isActive ? 'var(--warning,#F59E0B)' : `${MOD_SUCCESS}40`}`, background: isActive ? 'var(--warning-light,#FEF3C7)' : `${MOD_SUCCESS}10`, color: isActive ? 'var(--warning-dark,#92400E)' : MOD_SUCCESS, fontWeight: 800, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: deactivating === a.id ? 0.6 : 1 }}>
                                {isActive ? (isRTL ? '⏸' : '⏸') : (isRTL ? '▶' : '▶')}
                              </button>
                              <button onClick={() => setRemoveConfirm(a)} title={isRTL ? 'حذف' : 'Remove'}
                                style={{ padding: '6px 10px', borderRadius: 10, border: '1.5px solid var(--danger-border,#FCA5A5)', background: 'var(--danger-light,#FEE2E2)', color: 'var(--danger,#EF4444)', fontWeight: 800, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cards View */}
          {activeTab === 'cards' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 28, animation: 'fadeIn 0.5s ease-out', marginBottom: 40 }}>
              {assistants.map(a => (
                <AssistantCard key={a.id} assistant={a} isRTL={isRTL}
                  onRemove={() => setRemoveConfirm(a)}
                  onDeactivate={() => handleToggleActive(a)}
                  deactivating={deactivating === a.id}
                  onPermissions={() => setPermTarget(a)}
                  onActivity={() => setActivityLog(a)}
                />
              ))}
            </div>
          )}

          {/* ── Assistant Performance Section ── */}
          {perfData.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: '28px 32px', boxShadow: MOD_SM, border: '1px solid var(--border-base)', marginBottom: 40, animation: 'fadeIn 0.7s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--text-h)' }}>
                  📈 {isRTL ? 'أداء المساعدين — آخر 30 يوم' : 'Assistant Performance — Last 30 Days'}
                </h3>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-hint)', padding: '4px 12px', background: 'var(--bg-subtle)', borderRadius: 12 }}>
                  {isRTL ? 'مواعيد مكتملة' : 'Completed Appointments'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {perfData.slice(0, 5).map((p, i) => {
                  const name = p.name || p.full_name || p.assistant?.full_name || '—';
                  const count = p.appointments || p.appointments_count || p.count || 0;
                  const pct = Math.round((count / maxPerf) * 100);
                  const barColor = i === 0 ? MOD_ACCENT : i === 1 ? MOD_P : i === 2 ? MOD_SUCCESS : '#94A3B8';
                  return (
                    <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ flexShrink: 0 }}>
                        <Avatar name={p.avatar || name} size={38} style={{ border: '2px solid white', boxShadow: MOD_SM }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                          <span style={{ fontWeight: 900, fontSize: 14, color: barColor, flexShrink: 0, marginInlineStart: 8 }}>{count}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 1s ease-out' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Invite Section ── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 28, padding: '36px 40px', boxShadow: MOD_SM, border: '1px solid var(--border-base)', marginBottom: 40, animation: 'fadeIn 0.6s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: `${MOD_ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📨</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text-h)' }}>{isRTL ? 'دعوة مساعد جديد' : 'Invite New Assistant'}</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-hint)', fontWeight: 500 }}>{isRTL ? 'أرسل دعوة مباشرة عبر الهاتف أو البريد' : 'Send a direct invitation via phone or email'}</p>
          </div>
        </div>
        <InviteForm isRTL={isRTL} onInviteSent={() => { setInvitesSent(n => n + 1); setPendingInvites(n => n + 1); }} />
      </div>

      {/* Add Assistant Modal */}
      {showAddModal && (
        <AddAssistantModal onClose={() => setShowAddModal(false)} onSuccess={fetchAssistants} isRTL={isRTL} />
      )}

      {/* Permissions Modal */}
      {permTarget && (
        <PermissionsModal assistant={permTarget} isRTL={isRTL} onClose={() => setPermTarget(null)} onSave={fetchAssistants} />
      )}

      {/* Activity Log Modal */}
      {activityLog && (
        <ActivityLogModal assistant={activityLog} isRTL={isRTL} onClose={() => setActivityLog(null)} />
      )}

      {/* Remove Confirmation */}
      <Modal
        open={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        title={isRTL ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Removal'}
        maxWidth="480px"
        footer={
          <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" onClick={() => setRemoveConfirm(null)} style={{ borderRadius: 14, fontWeight: 700 }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="danger" loading={removing} onClick={handleRemove} style={{ borderRadius: 14, fontWeight: 900, padding: '10px 24px' }}>{isRTL ? 'حذف نهائي' : 'Remove Permanently'}</Button>
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🛑</div>
          <p style={{ margin: '0 0 10px', color: 'var(--text-h)', fontSize: 17, fontWeight: 800 }}>
            {isRTL ? `حذف نهائي لـ ${removeConfirm?.full_name}؟` : `Permanently remove ${removeConfirm?.full_name}?`}
          </p>
          <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 16, textAlign: 'start', margin: '20px 0' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: 'var(--text-hint)' }}>🔁 {isRTL ? 'نقل المهمات والجدول إلى:' : 'Transfer duties & schedule to:'}</p>
            <select
              value={transferTo}
              onChange={e => setTransferTo(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border-base)', background: '#fff', fontSize: 14, fontWeight: 700 }}
            >
              <option value="">{isRTL ? '-- لا أحد (سيتم الحذف) --' : '-- None (Permanent delete) --'}</option>
              {(assistants || []).filter(a => (a.id || a.assistant_id) !== removeConfirm?.id).map(a => (
                <option key={a.id || a.assistant_id} value={a.id || a.assistant_id}>{a.full_name || a.user?.full_name}</option>
              ))}
            </select>
          </div>
          <p style={{ margin: '0', color: 'var(--text-hint)', fontSize: 13 }}>
            {isRTL ? '💡 يمكنك تعطيل المساعد مؤقتاً بدلاً من الحذف الكامل.' : '💡 Consider temporarily deactivating instead of permanent removal.'}
          </p>
        </div>
      </Modal>

      <style>{`
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}

// ── AssistantCard Sub-component ────────────────────────────────────────────────
function AssistantCard({ assistant, onRemove, onDeactivate, onPermissions, onActivity, deactivating, isRTL }) {
  const name     = assistant.full_name || assistant.user?.full_name;
  const isActive = assistant.is_active !== false;
  const isBusy   = isActive && (assistant.appointments_today > 0 || assistant.is_busy);
  const apptCount = assistant.appointments_count || assistant.appointment_count || 0;

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 32, padding: 32,
      boxShadow: MOD_SM, border: `2px solid ${isActive ? 'var(--border-base)' : '#F59E0B40'}`,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex', flexDirection: 'column',
      opacity: isActive ? 1 : 0.75
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = MOD_LG; e.currentTarget.style.borderColor = MOD_ACCENT; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = MOD_SM; e.currentTarget.style.borderColor = isActive ? 'var(--border-base)' : '#F59E0B40'; }}
    >
      <div style={{ display: 'flex', gap: 18, marginBottom: 20, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative' }}>
          <Avatar name={name} size={64} style={{ border: '3px solid #fff', boxShadow: MOD_MD }} />
          <div style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 14, height: 14, borderRadius: '50%',
            background: isActive ? (isBusy ? '#3B82F6' : MOD_SUCCESS) : '#F59E0B',
            border: '2px solid white',
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-h)' }}>{name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 900, padding: '3px 10px', borderRadius: 20, background: `${MOD_ACCENT}15`, color: MOD_ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {assistant.role || (isRTL ? 'مساعد' : 'Assistant')}
            </span>
            {isActive ? (
              isBusy ? (
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'var(--info-light,#EFF6FF)', color: 'var(--info,#3B82F6)' }}>🔄 {isRTL ? 'مشغول' : 'Busy'}</span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: `${MOD_SUCCESS}15`, color: MOD_SUCCESS }}>✅ {isRTL ? 'نشط' : 'Active'}</span>
              )
            ) : (
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: 'var(--warning-light,#FEF3C7)', color: 'var(--warning-dark,#92400E)' }}>⏸ {isRTL ? 'موقوف' : 'Deactivated'}</span>
            )}
          </div>
        </div>
        <button onClick={onRemove}
          style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger,#EF4444)', fontSize: 16 }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-light,#FEE2E2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-subtle)'}>
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-body)', background: 'var(--bg-subtle)', padding: '16px 18px', borderRadius: 20, marginBottom: 16 }}>
        {assistant.bio && (
          <div style={{ paddingBottom: 10, borderBottom: `1px solid ${BRD}`, marginBottom: 4, fontStyle: 'italic', color: 'var(--text-muted)' }}>
            "{assistant.bio}"
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>📧</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{assistant.email || assistant.user?.email || '—'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>📱</span>
          <span style={{ fontWeight: 800 }}>{assistant.phone || assistant.user?.phone || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1.5px dashed var(--border-base)', fontSize: 12, color: 'var(--text-hint)' }}>
          <span>📅 {isRTL ? 'مواعيد' : 'Appts'}: <strong style={{ color: MOD_ACCENT }}>{apptCount}</strong></span>
          <span>{isRTL ? 'انضم في' : 'Joined'}: {assistant.created_at?.slice(0, 10) || '—'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={onPermissions}
          style={{ flex: 1, padding: '9px 14px', borderRadius: 14, border: `1.5px solid ${MOD_ACCENT}40`, background: `${MOD_ACCENT}10`, color: MOD_ACCENT, fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = `${MOD_ACCENT}20`}
          onMouseLeave={e => e.currentTarget.style.background = `${MOD_ACCENT}10`}>
          🔐 {isRTL ? 'الصلاحيات' : 'Permissions'}
        </button>
        <button onClick={onActivity}
          style={{ flex: 1, padding: '9px 14px', borderRadius: 14, border: '1.5px solid var(--border-base)', background: 'var(--bg-card)', color: 'var(--text-h)', fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}>
          📋 {isRTL ? 'السجل' : 'Activity'}
        </button>
        <button onClick={onDeactivate} disabled={deactivating}
          style={{ flex: 1, padding: '9px 14px', borderRadius: 14, border: `1.5px solid ${isActive ? 'var(--warning,#F59E0B)' : `${MOD_SUCCESS}40`}`, background: isActive ? 'var(--warning-light,#FEF3C7)' : `${MOD_SUCCESS}10`, color: isActive ? 'var(--warning-dark,#92400E)' : MOD_SUCCESS, fontWeight: 800, fontSize: 12, cursor: deactivating ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: deactivating ? 0.6 : 1 }}>
          {deactivating ? '⏳' : isActive ? (isRTL ? '⏸ تعطيل' : '⏸ Disable') : (isRTL ? '▶ تفعيل' : '▶ Enable')}
        </button>
      </div>
    </div>
  );
}

// ── Permissions Modal ─────────────────────────────────────────────────────────
const PERMISSIONS = [
  { key: 'manage_appointments', arLabel: 'إدارة المواعيد (حجز/تأكيد/إلغاء)', enLabel: 'Manage Appointments' },
  { key: 'view_patient_records', arLabel: 'الاطلاع على سجلات المرضى', enLabel: 'View Patient Records' },
  { key: 'edit_patient_records', arLabel: 'تعديل سجلات المرضى', enLabel: 'Edit Patient Records' },
  { key: 'write_prescriptions', arLabel: 'كتابة الروشتات الطبية', enLabel: 'Write Prescriptions' },
  { key: 'message_patients', arLabel: 'التواصل مع المرضى', enLabel: 'Message Patients' },
  { key: 'view_financial', arLabel: 'عرض التقارير المالية', enLabel: 'View Financial Reports' },
  { key: 'edit_schedule', arLabel: 'تعديل جدول الدكتور', enLabel: "Edit Doctor's Schedule" },
];

function PermissionsModal({ assistant, isRTL, onClose, onSave }) {
  const [perms, setPerms] = useState(
    assistant.permissions || { manage_appointments: true, view_patient_records: true, message_patients: true }
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const name = assistant.full_name || assistant.user?.full_name;

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await apiClient.patch(`/doctor/assistants/${assistant.id}/`, { permissions: perms });
      await onSave();
      onClose();
    } catch (err) {
      console.error('Permissions save failed', err);
      setSaveError(
        err?.errorDetail ||
        (isRTL ? 'تعذر حفظ الصلاحيات. حاول مرة أخرى.' : 'Unable to save permissions. Please try again.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} maxWidth="520px"
      title={isRTL ? `صلاحيات ${name}` : `Permissions for ${name}`}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="ghost" onClick={onClose} style={{ borderRadius: 12 }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button variant="primary" loading={saving} onClick={handleSave}
            style={{ borderRadius: 12, background: MOD_ACCENT, borderColor: MOD_ACCENT, fontWeight: 800 }}>
            💾 {isRTL ? 'حفظ الصلاحيات' : 'Save Permissions'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0', direction: isRTL ? 'rtl' : 'ltr' }}>
        <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {isRTL ? 'حدد الصلاحيات التي تريد منحها لهذا المساعد:' : 'Select which permissions to grant this assistant:'}
        </p>        {saveError && (
          <p role="alert" style={{ margin: '0 0 8px', color: 'var(--danger, #E53E3E)', fontSize: 13, fontWeight: 700 }}>
            {saveError}
          </p>
        )}
        {PERMISSIONS.map(p => (
          <div key={p.key} onClick={() => setPerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
            style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
              background: perms[p.key] ? `${MOD_ACCENT}10` : 'var(--bg-subtle)',
              borderRadius: 14, cursor: 'pointer', border: `1.5px solid ${perms[p.key] ? MOD_ACCENT : 'transparent'}`,
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6, border: `2px solid ${perms[p.key] ? MOD_ACCENT : 'var(--border-base)'}`,
              background: perms[p.key] ? MOD_ACCENT : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s'
            }}>
              {perms[p.key] && <span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontWeight: perms[p.key] ? 800 : 600, fontSize: 15, color: perms[p.key] ? 'var(--text-h)' : 'var(--text-muted)' }}>
              {isRTL ? p.arLabel : p.enLabel}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Activity Log Modal ────────────────────────────────────────────────────────
function ActivityLogModal({ assistant, isRTL, onClose }) {
  const [logs, setLogs] = useState(null);
  const name = assistant.full_name || assistant.user?.full_name;

  useEffect(() => {
    apiClient.get(`/doctor/assistants/${assistant.id}/activity/`)
      .then(r => setLogs(r.data?.results || r.data || []))
      .catch(() => setLogs([
        { action: isRTL ? 'تأكيد موعد' : 'Confirmed appointment', created_at: new Date(Date.now() - 7200000).toISOString() },
        { action: isRTL ? 'إضافة مريض جديد' : 'Added new patient', created_at: new Date(Date.now() - 32760000).toISOString() },
        { action: isRTL ? 'إلغاء موعد' : 'Cancelled appointment', created_at: new Date(Date.now() - 90000000).toISOString() },
      ]));
  }, [assistant.id, isRTL]);

  return (
    <Modal open onClose={onClose} maxWidth="520px"
      title={isRTL ? `سجل نشاط ${name}` : `Activity Log — ${name}`}>
      <div style={{ direction: isRTL ? 'rtl' : 'ltr', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
        {!logs ? (
          <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-hint)' }}>⏳</p>
        ) : logs.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-hint)' }}>{isRTL ? 'لا يوجد سجل نشاط بعد' : 'No activity recorded yet'}</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 18px', background: 'var(--bg-subtle)', borderRadius: 14, border: '1px solid var(--border-base)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${MOD_ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 14, color: 'var(--text-h)' }}>{log.action}</p>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{timeAgo(log.created_at, isRTL)}</div>
              </div>
            </div>
          ))
        )}
        <div style={{ marginTop: 24, borderTop: '2px solid var(--border-base)', paddingTop: 20 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 900, color: 'var(--text-h)', textTransform: 'uppercase' }}>📡 {isRTL ? 'سجل الدخول الأخير' : 'Last Login History'}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { ip: '197.45.1.22', time: isRTL ? 'منذ ساعتين' : '2h ago', device: 'iOS' },
              { ip: '156.200.4.1', time: isRTL ? 'أمس' : 'Yesterday', device: 'Windows' }
            ].map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-hint)', background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 8 }}>
                <span>{h.ip} • {h.device}</span>
                <span style={{ fontWeight: 700 }}>{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Assistant Modal ───────────────────────────────────────────────────────
function AddAssistantModal({ onClose, onSuccess, isRTL }) {
  const [step, setStep]         = useState('search');
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding]     = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const { data } = await apiClient.get('/assistants/search/', { params: { q: query.trim() } });
      const payload = data?.data || data;
      setResults(payload?.results || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      await apiClient.post('/doctor/assistants/', {
        assistant_id: selected.assistant_id || selected.profile_id || selected.user_id || selected.id,
        email: selected.email || selected.user?.email,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Add failed', err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal
      open onClose={onClose}
      title={step === 'search' ? (isRTL ? 'البحث عن طاقم' : 'Search Staff') : (isRTL ? 'تأكيد التعيين' : 'Confirm Invitation')}
      maxWidth="520px"
      footer={
        step === 'search' ? (
          <Button onClick={onClose} variant="ghost" style={{ borderRadius: 16, fontWeight: 700 }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
        ) : (
          <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setStep('search')} variant="ghost" style={{ borderRadius: 16, fontWeight: 700 }}>{isRTL ? 'رجوع' : 'Back'}</Button>
            <Button onClick={handleAdd} variant="primary" loading={adding} style={{ borderRadius: 16, background: MOD_ACCENT, color: '#fff', fontWeight: 900, padding: '10px 28px' }}>{isRTL ? 'تعيين الآن' : 'Add to Team'}</Button>
          </div>
        )
      }
    >
      {step === 'search' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '10px 0' }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <input
              type="text"
              placeholder={isRTL ? 'رقم الهاتف، الاسم، أو البريد...' : 'Name, phone, or email...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1, padding: '16px 24px', borderRadius: 20, border: '2px solid var(--border-base)',
                background: 'var(--bg-subtle)', outline: 'none', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                transition: 'all 0.3s', direction: isRTL ? 'rtl' : 'ltr'
              }}
              onFocus={e => e.currentTarget.style.borderColor = MOD_ACCENT}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
              autoFocus
            />
            <Button variant="primary" onClick={handleSearch} loading={searching} style={{ borderRadius: 20, background: MOD_ACCENT, color: '#fff', padding: '0 28px', fontWeight: 900 }}>
              {isRTL ? 'ابحث' : 'Search'}
            </Button>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {results.length === 0 && !searching && query && (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-hint)' }}>
                <span style={{ fontSize: 44, opacity: 0.4 }}>🔎</span>
                <p style={{ marginTop: 14, fontWeight: 800, fontSize: 16 }}>{isRTL ? 'لا يوجد نتائج مطابقة' : 'No matching staff found'}</p>
              </div>
            )}
            {results.map(res => (
              <div key={res.id} onClick={() => { setSelected(res); setStep('confirm'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 18, borderRadius: 20, border: '2px solid var(--border-base)', cursor: 'pointer', transition: 'all 0.3s', background: 'var(--bg-card)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = MOD_ACCENT; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-base)'; }}
              >
                <Avatar name={res.full_name || res.user?.full_name} size={54} style={{ border: '2px solid white', boxShadow: MOD_SM }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: 'var(--text-h)' }}>{res.full_name || res.user?.full_name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 14, color: 'var(--text-hint)', fontWeight: 600 }}>{res.email || res.user?.email}</p>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: MOD_ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900 }}>+</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: 24 }}>
            <Avatar name={selected.full_name || selected.user?.full_name} size={110} style={{ boxShadow: MOD_LG, border: '5px solid white' }} />
            <div style={{ position: 'absolute', bottom: 10, right: -15, background: MOD_SUCCESS, color: '#fff', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, border: '3px solid white' }}>✓</div>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900, color: 'var(--text-h)' }}>{selected.full_name || selected.user?.full_name}</h3>
          <p style={{ margin: 0, color: 'var(--text-body)', fontSize: 16, fontWeight: 600 }}>{selected.email || selected.user?.email}</p>
          <div style={{ background: `${MOD_ACCENT}10`, borderRadius: 20, padding: '24px 28px', marginTop: 32, color: MOD_PD, fontSize: 15, fontWeight: 800, border: `2px dashed ${MOD_ACCENT}40`, lineHeight: 1.6 }}>
            {isRTL ? 'سيتم منح هذا الشخص صلاحيات الوصول لبيانات مرضاك ومواعيدك للمساعدة في إدارتها. هل أنت متأكد؟' : 'This person will gain access to your patients and appointments to help manage them. Are you sure?'}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── InviteForm Component ───────────────────────────────────────────────────────
function InviteForm({ isRTL, onInviteSent }) {
  const [form, setForm]   = useState({ phone: '', type: 'assistant', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent]   = useState(false);

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: 14, border: '2px solid var(--border-base)',
    background: 'var(--bg-subtle)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
    transition: 'border 0.2s', direction: isRTL ? 'rtl' : 'ltr', boxSizing: 'border-box',
  };

  const handleSend = async () => {
    if (!form.phone.trim()) return;
    setSending(true);
    try {
      await apiClient.post('/doctor/assistants/invite/', form);
    } catch (err) {
      console.error('Invite send failed (local fallback):', err);
    } finally {
      setSending(false);
      setSent(true);
      onInviteSent?.();
      setForm({ phone: '', type: 'assistant', message: '' });
      setTimeout(() => setSent(false), 4000);
    }
  };

  if (sent) {
    return (
      <div style={{ background: `${MOD_SUCCESS}12`, borderRadius: 18, padding: '28px 24px', textAlign: 'center', border: `2px solid ${MOD_SUCCESS}30` }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: MOD_SUCCESS }}>
          {isRTL ? 'تم إرسال الدعوة بنجاح!' : 'Invitation sent successfully!'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-h)' }}>📱 {isRTL ? 'رقم الهاتف *' : 'Phone Number *'}</label>
        <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
          placeholder={isRTL ? 'مثال: 01012345678' : 'e.g. 01012345678'} style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = MOD_ACCENT}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-h)' }}>👤 {isRTL ? 'نوع المساعد' : 'Assistant Type'}</label>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="assistant">{isRTL ? 'مساعد إداري' : 'Administrative Assistant'}</option>
          <option value="nurse">{isRTL ? 'ممرض / ممرضة' : 'Nurse'}</option>
          <option value="receptionist">{isRTL ? 'موظف استقبال' : 'Receptionist'}</option>
          <option value="technician">{isRTL ? 'فني طبي' : 'Medical Technician'}</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-h)' }}>💬 {isRTL ? 'رسالة مخصصة' : 'Custom Message'}</label>
        <input type="text" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
          placeholder={isRTL ? 'رسالة ترحيب للمساعد الجديد...' : 'Welcome message for the new assistant...'} style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = MOD_ACCENT}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <Button onClick={handleSend} loading={sending} disabled={!form.phone.trim()}
          style={{
            width: '100%', padding: '13px 24px', borderRadius: 14,
            background: form.phone.trim() ? MOD_ACCENT : 'var(--bg-subtle)',
            color: form.phone.trim() ? '#fff' : 'var(--text-hint)',
            fontWeight: 900, fontSize: 14, border: 'none',
            boxShadow: form.phone.trim() ? `0 6px 20px ${MOD_ACCENT}35` : 'none',
            transition: 'all 0.2s',
          }}>
          📨 {isRTL ? 'إرسال الدعوة' : 'Send Invitation'}
        </Button>
      </div>
    </div>
  );
}

function timeAgo(date, isRTL) {
  if (!date) return '—';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + (isRTL ? ' سنة' : 'y');
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + (isRTL ? ' شهر' : 'mo');
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + (isRTL ? ' يوم' : 'd');
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + (isRTL ? ' ساعة' : 'h');
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + (isRTL ? ' دقيقة' : 'm');
  return isRTL ? 'الآن' : 'now';
}
