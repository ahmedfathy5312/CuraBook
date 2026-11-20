/**
 * HospitalHomePatches.jsx — Bug #14 Fix + Navbar Profile Menu
 * ─────────────────────────────────────────────────────────────────
 * PROBLEMS FIXED:
 *
 *   Bug #14 — حذف بطاقات الإحصائيات من الصفحة الرئيسية
 *      Before: الصفحة الرئيسية للمستشفى تعرض 4 بطاقات إحصائية:
 *              (بانتظار الموافقة / إجمالي المواعيد / إجمالي المرضى / إجمالي الأطباء)
 *              هذه المعلومات متوفرة بشكل أفضل في صفحة التحليلات.
 *      After:  البطاقات محذوفة بالكامل من الصفحة الرئيسية.
 *              الصفحة تعرض فقط: WelcomeBanner + Quick Access + Charts/Recent.
 *
 *   Bug #18 (Enhancement) — قائمة الإعدادات / الملف الشخصي في الـ Navbar
 *      Before: الـ Navbar لا يحتوي على Dropdown للإعدادات والملف الشخصي.
 *      After:  Dropdown Avatar يحتوي على: تعديل الملف، تغيير كلمة المرور، تسجيل الخروج.
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * HOW TO USE — Bug #14: حذف بطاقات الإحصائيات
 * ──────────────────────────────────────────────
 *
 * Option A — Quick Patch (الأسرع):
 *   ابحث في HospitalHomePage (أو ما يعادلها) عن أي من هذه الأنماط
 *   واحذفها كلياً من الـ JSX:
 *
 *   Pattern A — StatCards في Home:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  <div className="stats-grid">                                │
 *   │    <StatCard label="بانتظار الموافقة" ... />                │
 *   │    <StatCard label="إجمالي المواعيد" ... />                 │
 *   │    <StatCard label="إجمالي المرضى" ... />                   │
 *   │    <StatCard label="إجمالي الأطباء" ... />                  │
 *   │  </div>                                                      │
 *   └──────────────────────────────────────────────────────────────┘
 *   → احذف هذا الـ block بالكامل.
 *
 *   Pattern B — Component مستقل:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  <HospitalStatsSection stats={dashboardStats} />            │
 *   │  // أو                                                       │
 *   │  <HospitalDashboardStats data={stats} />                    │
 *   └──────────────────────────────────────────────────────────────┘
 *   → احذف هذا السطر.
 *
 *   Pattern C — Stats في useEffect:
 *   يمكنك الإبقاء على الـ fetch لأن التحليلات قد تحتاجها،
 *   لكن احذف فقط عرض البطاقات في الـ JSX.
 *
 * Option B — استخدم HospitalHomeLayout Component (أدناه):
 *   يُقدّم Template جاهز للصفحة الرئيسية بدون Stats.
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * HOW TO USE — Navbar Profile Menu (Enhancement #18):
 * ─────────────────────────────────────────────────────
 *
 *   import { HospitalNavbarProfileMenu } from
 *     '../../components/hospital/HospitalHomePatches';
 *
 *   // في الـ Navbar — استبدل Avatar/username الحالي بـ:
 *   <HospitalNavbarProfileMenu
 *     user={currentUser}
 *     language={currentLanguage}
 *     onEditProfile={() => navigate('/hospital/profile')}
 *     onChangePassword={() => navigate('/hospital/change-password')}
 *     onLogout={handleLogout}
 *   />
 *
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from 'react';

// ══════════════════════════════════════════════════════════════════
// ── Bug #14 — HospitalHomeLayout
// ── Template للصفحة الرئيسية بدون Stats Cards
// ══════════════════════════════════════════════════════════════════
/**
 * HospitalHomeLayout
 * ───────────────────
 * Bug #14 Fix — layout wrapper يُرشد إلى الهيكل الصحيح للـ Home Page.
 * يمكن استخدامه كمرجع أو كـ Component فعلي.
 *
 * الهيكل الصحيح:
 *   1. WelcomeBanner         ← موجود ✅
 *   2. Quick Access Section  ← Bug #11 fix
 *   3. Charts / Recent Data  ← موجود (اختياري)
 *   ✖️ Stats Cards           ← محذوفة (Bug #14)
 */
export function HospitalHomeLayout({ welcomeBanner, quickAccess, charts, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 1. Welcome Banner */}
      {welcomeBanner}

      {/* 2. Quick Access — Bug #11 fix */}
      {quickAccess}

      {/* ✖️ Stats Cards محذوفة — Bug #14 */}
      {/* لا تضع StatCards هنا */}

      {/* 3. Charts / Recent Activity (اختياري) */}
      {charts}

      {/* أي محتوى آخر */}
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Enhancement #18 — HospitalNavbarProfileMenu
// ── Dropdown قائمة الإعدادات في الـ Navbar
// ══════════════════════════════════════════════════════════════════

// Avatar fallback
function UserAvatar({ user, size = 36 }) {
  const initials = (() => {
    const name = user?.full_name || user?.name || user?.username || '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  if (user?.profile_picture || user?.avatar) {
    return (
      <img
        src={user.profile_picture || user.avatar}
        alt={user.full_name || 'User'}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid var(--border-base, #e5e7eb)',
          flexShrink: 0,
        }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--primary, #0E7490) 0%, #0C6478 100%)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.38,
      fontWeight: 800,
      fontFamily: "'Cairo', sans-serif",
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

// Dropdown Menu Item
function MenuItem({ icon, label, onClick, color = 'var(--text-primary, #1F2937)', danger = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 14px',
        border: 'none',
        background: hovered ? (danger ? '#FEF2F2' : 'var(--bg-muted, #F9FAFB)') : 'transparent',
        color: danger ? '#DC2626' : color,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "'Cairo', sans-serif",
        cursor: 'pointer',
        textAlign: 'start',
        borderRadius: 8,
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
      {label}
    </button>
  );
}

/**
 * HospitalNavbarProfileMenu
 * ──────────────────────────
 * Enhancement #18 — Avatar + Dropdown في الـ Navbar للإعدادات والخروج.
 *
 * Props:
 *   user             {object}   — بيانات المستخدم (full_name, username, profile_picture...)
 *   language         {string}   — 'ar' | 'en'
 *   onEditProfile    {function} — callback لصفحة تعديل الملف الشخصي
 *   onChangePassword {function} — callback لصفحة تغيير كلمة المرور
 *   onLogout         {function} — callback لتسجيل الخروج
 */
export function HospitalNavbarProfileMenu({
  user = {},
  language = 'ar',
  onEditProfile = () => {},
  onChangePassword = () => {},
  onLogout = () => {},
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isAr = language === 'ar';

  // إغلاق الـ Dropdown عند الضغط خارجه
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayName = user?.full_name?.split(' ')[0] || user?.username || (isAr ? 'المستخدم' : 'User');
  const subLabel    = user?.username || user?.email || '';

  return (
    <div ref={ref} style={{ position: 'relative', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={isAr ? 'قائمة الملف الشخصي' : 'Profile menu'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          border: `1px solid ${open ? 'var(--primary, #0E7490)' : 'var(--border-base, #e5e7eb)'}`,
          borderRadius: 40,
          background: open ? 'var(--bg-muted, #F0FDFA)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.18s',
          outline: 'none',
        }}
      >
        <UserAvatar user={user} size={30} />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isAr ? 'flex-end' : 'flex-start',
          lineHeight: 1.2,
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary, #1F2937)',
            fontFamily: "'Cairo', sans-serif",
            maxWidth: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayName}
          </span>
          {subLabel && (
            <span style={{
              fontSize: 10,
              color: 'var(--text-muted, #6B7280)',
              fontFamily: "'Cairo', sans-serif",
              maxWidth: 100,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {subLabel}
            </span>
          )}
        </div>
        {/* Chevron */}
        <svg
          width={14} height={14}
          viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted, #6B7280)"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [isAr ? 'right' : 'left']: 0,
            minWidth: 200,
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border-base, #e5e7eb)',
            borderRadius: 14,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            zIndex: 9999,
            overflow: 'hidden',
            padding: '6px',
            animation: 'dropdownFade 0.15s ease',
          }}
        >
          {/* User info header */}
          <div style={{
            padding: '10px 14px 8px',
            borderBottom: '1px solid var(--border-base, #e5e7eb)',
            marginBottom: 4,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #1F2937)', fontFamily: "'Cairo', sans-serif" }}>
              {user?.full_name || displayName}
            </p>
            {subLabel && (
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted, #6B7280)', fontFamily: "'Cairo', sans-serif" }}>
                {subLabel}
              </p>
            )}
          </div>

          {/* Menu Items */}
          <MenuItem
            icon="✏️"
            label={isAr ? 'تعديل الملف الشخصي' : 'Edit Profile'}
            onClick={() => { setOpen(false); onEditProfile(); }}
          />
          <MenuItem
            icon="🔒"
            label={isAr ? 'تغيير كلمة المرور' : 'Change Password'}
            onClick={() => { setOpen(false); onChangePassword(); }}
          />

          <div style={{ height: 1, background: 'var(--border-base, #e5e7eb)', margin: '4px 0' }} />

          <MenuItem
            icon="🚪"
            label={isAr ? 'تسجيل الخروج' : 'Log Out'}
            onClick={() => { setOpen(false); onLogout(); }}
            danger
          />
        </div>
      )}

      <style>{`
        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Default export — للاستخدام السريع
export default HospitalHomeLayout;
