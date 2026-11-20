/**
 * DoctorEmptyState.jsx
 * ====================
 * Sprint 3 · P2-UX-3
 *
 * Context-aware empty state with CTA buttons.
 * Supports every major empty scenario in the doctor dashboard.
 *
 * Usage:
 *   <DoctorEmptyState context="appointments" isRTL={isRTL} onAction={() => navigate('/doctor-schedule')} />
 *   <DoctorEmptyState context="patients"     isRTL={isRTL} />
 *   <DoctorEmptyState context="schedule"     isRTL={isRTL} onAction={() => navigate('/doctor-schedule')} />
 *
 * context values:
 *   "appointments" | "patients" | "schedule" | "analytics"
 *   | "notifications" | "messages" | "prescriptions"
 *   | "video_calls" | "alerts" | "search" | "generic"
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import tokens from '../../theme/tokens';

// ── Module-level safe constants ───────────────────────────────────────────────
const P   = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PT  = tokens?.colors?.primary?.lighter || '#E0F7FA';
const PD  = tokens?.colors?.primary?.dark    || '#0C6478';

// ── Content map ───────────────────────────────────────────────────────────────
const CONTENT = {
  appointments: {
    icon: '📅',
    title_ar:  'لا توجد مواعيد بعد',
    title_en:  'No Appointments Yet',
    desc_ar:   'لم يقم أي مريض بالحجز حتى الآن. تأكد من أن جدول مواعيدك محدَّث وأنك تقبل الحجوزات.',
    desc_en:   'No patients have booked yet. Make sure your schedule is up-to-date and you\'re accepting bookings.',
    action_ar: '➕ إضافة مواعيد متاحة',
    action_en: '➕ Add Available Slots',
    route:     '/doctor-schedule',
  },
  patients: {
    icon: '👥',
    title_ar:  'قائمة المرضى فارغة',
    title_en:  'No Patients Yet',
    desc_ar:   'ستظهر هنا قائمة مرضاك بعد أول حجز ناجح.',
    desc_en:   'Your patient list will appear here after the first successful appointment.',
    action_ar: '📅 إدارة الجدول',
    action_en: '📅 Manage Schedule',
    route:     '/doctor-schedule',
  },
  schedule: {
    icon: '🗓',
    title_ar:  'لا توجد مواعيد اليوم',
    title_en:  'Nothing Scheduled Today',
    desc_ar:   'جدولك اليوم فارغ. أضف مواعيد متاحة أو استرح!',
    desc_en:   'Your schedule is clear today. Add available slots or take a break!',
    action_ar: '🗓 ضبط الجدول',
    action_en: '🗓 Set Up Schedule',
    route:     '/doctor-schedule',
  },
  analytics: {
    icon: '📊',
    title_ar:  'لا توجد بيانات كافية',
    title_en:  'Not Enough Data Yet',
    desc_ar:   'تحتاج إلى مواعيد مكتملة لعرض التحليلات. تابع عملك ستظهر إحصاءاتك قريباً.',
    desc_en:   'You need completed appointments for analytics to appear. Keep going — your stats will show soon.',
    action_ar: null,
    action_en: null,
    route:     null,
  },
  notifications: {
    icon: '🔔',
    title_ar:  'لا توجد إشعارات',
    title_en:  'No Notifications',
    desc_ar:   'أنت على اطلاع كامل! ستظهر هنا الإشعارات الجديدة فور وصولها.',
    desc_en:   'You\'re all caught up! New notifications will appear here as they arrive.',
    action_ar: null,
    action_en: null,
    route:     null,
  },
  messages: {
    icon: '💬',
    title_ar:  'لا توجد رسائل',
    title_en:  'No Messages Yet',
    desc_ar:   'لم تبدأ أي محادثة بعد. يمكنك التواصل مع مرضاك من هنا.',
    desc_en:   'No conversations started yet. You can reach out to your patients from here.',
    action_ar: null,
    action_en: null,
    route:     null,
  },
  prescriptions: {
    icon: '💊',
    title_ar:  'لا توجد روشتات',
    title_en:  'No Prescriptions Yet',
    desc_ar:   'الروشتات التي تكتبها للمرضى ستظهر هنا.',
    desc_en:   'Prescriptions you write for patients will appear here.',
    action_ar: null,
    action_en: null,
    route:     null,
  },
  video_calls: {
    icon: '📹',
    title_ar:  'لا توجد مكالمات فيديو قادمة',
    title_en:  'No Upcoming Video Calls',
    desc_ar:   'مكالمات الفيديو المؤكدة ستظهر هنا قبل موعدها.',
    desc_en:   'Confirmed video calls will appear here before their scheduled time.',
    action_ar: '📅 عرض جميع المواعيد',
    action_en: '📅 View All Appointments',
    route:     '/patient-appointments',
  },
  alerts: {
    icon: '✅',
    title_ar:  'لا توجد تنبيهات',
    title_en:  'All Clear!',
    desc_ar:   'لا توجد مواعيد عاجلة أو ملغاة تحتاج انتباهك الآن.',
    desc_en:   'No urgent or cancelled appointments need your attention right now.',
    action_ar: null,
    action_en: null,
    route:     null,
  },
  search: {
    icon: '🔍',
    title_ar:  'لا توجد نتائج',
    title_en:  'No Results Found',
    desc_ar:   'لم نجد ما يطابق بحثك. جرب كلمات مختلفة.',
    desc_en:   'Nothing matched your search. Try different keywords.',
    action_ar: null,
    action_en: null,
    route:     null,
  },
  clinic: {
    icon: '🏥',
    title_ar:  'لم يتم إنشاء عيادة بعد',
    title_en:  'No Clinic Created Yet',
    desc_ar:   'أنشئ عيادتك الآن حتى تظهر مواعيدك وبياناتك بشكل صحيح.',
    desc_en:   'Create your clinic now so your appointments and data display correctly.',
    action_ar: '🏥 إنشاء العيادة',
    action_en: '🏥 Create Clinic',
    route:     '/doctor-settings',
  },
  generic: {
    icon: '📋',
    title_ar:  'لا توجد بيانات',
    title_en:  'Nothing Here Yet',
    desc_ar:   'ستظهر البيانات هنا بمجرد توفرها.',
    desc_en:   'Data will appear here once it\'s available.',
    action_ar: null,
    action_en: null,
    route:     null,
  },
};

// ── Main component ────────────────────────────────────────────────────────────
export default function DoctorEmptyState({
  context   = 'generic',
  isRTL     = false,
  onAction,               // optional callback override
  actionLabel,            // optional label override
  style     = {},
}) {
  const navigate = useNavigate();
  const cfg = CONTENT[context] || CONTENT.generic;

  const handleClick = () => {
    if (onAction) { onAction(); return; }
    if (cfg.route) navigate(cfg.route);
  };

  const hasAction = onAction || cfg.route;
  const btnLabel  = actionLabel || (isRTL ? cfg.action_ar : cfg.action_en);

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       '56px 32px',
      direction:     isRTL ? 'rtl' : 'ltr',
      ...style,
    }}>
      {/* Icon circle */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: PT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 20,
        boxShadow: `0 4px 16px ${P}20`,
      }}>
        {cfg.icon}
      </div>

      {/* Title */}
      <h3 style={{
        margin: '0 0 10px',
        fontSize: 18, fontWeight: 700,
        color: 'var(--text-h, #111827)',
      }}>
        {isRTL ? cfg.title_ar : cfg.title_en}
      </h3>

      {/* Description */}
      <p style={{
        margin:   '0 0 24px',
        fontSize: 14,
        color:    'var(--text-muted, #6B7280)',
        maxWidth:  340,
        lineHeight: 1.65,
      }}>
        {isRTL ? cfg.desc_ar : cfg.desc_en}
      </p>

      {/* CTA */}
      {hasAction && btnLabel && (
        <button
          onClick={handleClick}
          style={{
            padding:       '10px 28px',
            background:    P,
            color:         '#fff',
            border:        'none',
            borderRadius:  10,
            cursor:        'pointer',
            fontSize:      14,
            fontWeight:    700,
            letterSpacing: '0.3px',
            boxShadow:     `0 4px 14px ${P}30`,
            transition:    'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = PD; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = P;  e.currentTarget.style.transform = 'none'; }}
        >
          {btnLabel}
        </button>
      )}
    </div>
  );
}
