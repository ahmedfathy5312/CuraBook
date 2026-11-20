/**
 * AssistantPrescriptionsPage.jsx — Sprint 3
 *
 * Read-only prescription viewer for medical assistants.
 * Assistants can VIEW prescriptions written for patients in their workplaces.
 * They CANNOT create, edit, or delete prescriptions (doctor-only actions).
 *
 * Features:
 *  - List all accessible prescriptions with patient + doctor info
 *  - Search by patient name, doctor, or diagnosis
 *  - Filter by status (DRAFT / SENT / all)
 *  - Prescription detail drawer with full medication list
 *  - Print-friendly view per prescription
 *  - Permission notice (read-only guard)
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import {
  COLORS, StatusBadge, Avatar, SectionCard, EmptyState,
  Spinner, InfoBanner, formatDate, formatTime, GhostBtn,
} from '../components/AssistantUI';
import {
  FileText, Search, X, Pill, Stethoscope,
  User, Clock, Printer, ChevronLeft, ChevronRight,
} from 'lucide-react';

/* ─── API ────────────────────────────────────────────────────────────────────── */
const getPrescriptions = (params) =>
  apiClient.get(API.PRESCRIPTIONS?.LIST || '/prescriptions/', { params }).then(r => r.data);

/* ─── Frequency label map ────────────────────────────────────────────────────── */
const FREQ = {
  ONCE_DAILY:  'مرة واحدة يومياً',
  TWICE_DAILY: 'مرتين يومياً',
  THREE_DAILY: 'ثلاث مرات يومياً',
  FOUR_DAILY:  'أربع مرات يومياً',
  AS_NEEDED:   'عند الحاجة',
  OTHER:       'أخرى',
};

/* ─── Prescription card ──────────────────────────────────────────────────────── */
function PrescriptionCard({ rx, onClick }) {
  const [hover, setHover] = useState(false);
  const patientName = rx.patient_name || `مريض #${rx.patient}`;
  const doctorName  = rx.doctor_name  || `د. #${rx.doctor}`;
  const medCount    = rx.medications?.length || 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 20px',
        borderBottom: `1px solid ${COLORS.border}`,
        cursor: 'pointer',
        background: hover ? COLORS.primaryL : 'transparent',
        transition: 'background .15s',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-md)',
        background: rx.status === 'SENT' ? COLORS.successL : '#FEF3C7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: rx.status === 'SENT' ? COLORS.success : '#92400E',
        flexShrink: 0, fontSize: 22,
      }}>
        💊
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>
            {patientName}
          </span>
          <StatusBadge status={rx.status} />
        </div>
        <p style={{ margin: 0, fontSize: 12, color: COLORS.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {rx.diagnosis || 'لا يوجد تشخيص مكتوب'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: COLORS.muted }}>👨‍⚕️ {doctorName}</span>
          <span style={{ fontSize: 11, color: COLORS.muted }}>💊 {medCount} دواء</span>
          <span style={{ fontSize: 11, color: COLORS.muted }}>📅 {formatDate(rx.created_at)}</span>
        </div>
      </div>

      <ChevronLeft size={16} style={{ color: COLORS.muted, flexShrink: 0 }} />
    </div>
  );
}

/* ─── Medication row ─────────────────────────────────────────────────────────── */
function MedRow({ med, index }) {
  return (
    <div style={{
      padding: '14px 0', borderBottom: `1px solid var(--bg-page)`,
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--radius-md)',
        background: COLORS.primaryL, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 14, flexShrink: 0, color: COLORS.primary,
        fontWeight: 800,
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>
          {med.name} — <span style={{ color: COLORS.primary }}>{med.dosage}</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
          {med.frequency && (
            <span style={{ fontSize: 12, color: COLORS.muted }}>
              🔄 {FREQ[med.frequency] || med.frequency}
            </span>
          )}
          {med.duration && (
            <span style={{ fontSize: 12, color: COLORS.muted }}>⏱ {med.duration}</span>
          )}
        </div>
        {med.notes && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: COLORS.muted, fontStyle: 'italic' }}>
            📝 {med.notes}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Prescription detail drawer ─────────────────────────────────────────────── */
function PrescriptionDrawer({ rx, onClose }) {
  if (!rx) return null;

  const patientName = rx.patient_name || `مريض #${rx.patient}`;
  const doctorName  = rx.doctor_name  || `د. #${rx.doctor}`;

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const meds = (rx.medications || []).map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${m.name}</strong></td>
        <td>${m.dosage}</td>
        <td>${FREQ[m.frequency] || m.frequency || '—'}</td>
        <td>${m.duration || '—'}</td>
        <td>${m.notes || '—'}</td>
      </tr>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>وصفة طبية — ${patientName}</title>
        <style>
          body { font-family: 'Cairo', Arial, sans-serif; padding: 40px; color: #1F2937; direction: rtl; }
          h1 { color: #1B5E8A; font-size: 20px; margin: 0 0 4px; }
          .meta { color: #6B7280; font-size: 12px; margin-bottom: 30px; }
          .section { margin: 20px 0; }
          .label { font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; margin-bottom: 6px; }
          .value { font-size: 14px; color: #1F2937; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #E6F1FB; padding: 10px; text-align: right; font-size: 12px; color: #1B5E8A; }
          td { padding: 10px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
          .footer { margin-top: 60px; text-align: center; color: #9CA3AF; font-size: 11px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>CuraBook — وصفة طبية</h1>
        <p class="meta">رقم الوصفة: #${rx.id} · الحالة: ${rx.status === 'SENT' ? 'مُرسلة' : 'مسودة'}</p>
        <div class="section"><div class="label">اسم المريض</div><div class="value">${patientName}</div></div>
        <div class="section"><div class="label">الطبيب</div><div class="value">${doctorName}</div></div>
        <div class="section"><div class="label">تاريخ الإصدار</div><div class="value">${formatDate(rx.created_at)}</div></div>
        <div class="section"><div class="label">التشخيص</div><div class="value">${rx.diagnosis || '—'}</div></div>
        ${rx.notes ? `<div class="section"><div class="label">ملاحظات</div><div class="value">${rx.notes}</div></div>` : ''}
        <div class="section">
          <div class="label">الأدوية (${rx.medications?.length || 0})</div>
          <table>
            <thead><tr><th>#</th><th>الدواء</th><th>الجرعة</th><th>التكرار</th><th>المدة</th><th>ملاحظات</th></tr></thead>
            <tbody>${meds}</tbody>
          </table>
        </div>
        <div class="footer">تم إنشاء هذه الوصفة عبر نظام CuraBook الطبي · ${new Date().toLocaleDateString('ar-EG')}</div>
        <script>window.print(); window.close();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, insetInlineStart: 0, bottom: 0,
        width: 460, background: 'var(--bg-card)',
        boxShadow: '4px 0 32px rgba(0,0,0,0.18)', zIndex: 201,
        display: 'flex', flexDirection: 'column',
        animation: 'rxSlideIn 0.22s ease',
      }}>
        {/* Drawer header */}
        <div style={{
          padding: '20px 24px 16px',
          background: 'linear-gradient(135deg,#1B5E8A 0%,#1a6b65 100%)',
          color: '#fff', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 11, opacity: 0.75, fontWeight: 600 }}>
                وصفة طبية #{rx.id}
              </p>
              <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>{patientName}</h2>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>
                👨‍⚕️ {doctorName} · {formatDate(rx.created_at)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handlePrint}
                title="طباعة"
                style={{
                  width: 34, height: 34, borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  cursor: 'pointer', color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Printer size={16} />
              </button>
              <button
                onClick={onClose}
                style={{
                  width: 34, height: 34, borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  cursor: 'pointer', color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Status badge in header */}
          <div style={{ marginTop: 12 }}>
            <StatusBadge status={rx.status} size="md" />
            {rx.sent_at && (
              <span style={{ fontSize: 11, opacity: 0.8, marginInlineStart: 8 }}>
                أُرسلت {formatDate(rx.sent_at)}
              </span>
            )}
          </div>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Diagnosis */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              التشخيص
            </p>
            <p style={{
              margin: 0, fontSize: 14, color: 'var(--text-h)', lineHeight: 1.6,
              background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', padding: '12px 14px',
            }}>
              {rx.diagnosis || 'لم يُذكر تشخيص'}
            </p>
          </div>

          {/* Notes */}
          {rx.notes && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ملاحظات إضافية
              </p>
              <p style={{
                margin: 0, fontSize: 13, color: 'var(--text-body)', lineHeight: 1.7,
                background: '#FEF3C7', borderRadius: 'var(--radius-md)', padding: '12px 14px',
              }}>
                📝 {rx.notes}
              </p>
            </div>
          )}

          {/* Medications list */}
          <div>
            <p style={{
              margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: COLORS.muted,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              الأدوية ({rx.medications?.length || 0})
            </p>

            {(!rx.medications || rx.medications.length === 0) ? (
              <p style={{ color: COLORS.muted, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                لا توجد أدوية مسجلة
              </p>
            ) : (
              rx.medications.map((med, i) => (
                <MedRow key={med.id || i} med={med} index={i} />
              ))
            )}
          </div>

          {/* Read-only notice */}
          <div style={{ marginTop: 24 }}>
            <InfoBanner type="info" icon="🔒">
              هذه الوصفة للعرض فقط — التعديل والإنشاء من صلاحيات الطبيب
            </InfoBanner>
          </div>
        </div>
      </div>

      <style>{`@keyframes rxSlideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

/* ─── Filter pill ────────────────────────────────────────────────────────────── */
function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px', borderRadius: 99, border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
        background: active ? COLORS.primary : 'var(--bg-page)',
        color: active ? '#fff' : COLORS.muted,
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────────── */
export default function AssistantPrescriptionsPage() {
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [selected, setSelected]   = useState(null);
  const [searchFocus, setFocus]   = useState(false);

  const { data: rxData, isLoading, isError } = useQuery({
    queryKey: ['assistant', 'prescriptions'],
    queryFn: () => getPrescriptions({ page_size: 200 }),
    staleTime: 60_000,
  });

  const allRx = Array.isArray(rxData)
    ? rxData
    : (rxData?.results || []);

  const filtered = useMemo(() => {
    let list = allRx;

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(rx => rx.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(rx =>
        (rx.patient_name || '').toLowerCase().includes(q) ||
        (rx.doctor_name  || '').toLowerCase().includes(q) ||
        (rx.diagnosis    || '').toLowerCase().includes(q) ||
        String(rx.id).includes(q)
      );
    }

    return list;
  }, [allRx, statusFilter, search]);

  const counts = useMemo(() => ({
    all:   allRx.length,
    DRAFT: allRx.filter(r => r.status === 'DRAFT').length,
    SENT:  allRx.filter(r => r.status === 'SENT').length,
  }), [allRx]);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px', fontFamily: "'Cairo',sans-serif" }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-lg)',
            background: COLORS.primaryL, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22,
          }}>
            💊
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-h)' }}>الوصفات الطبية</h1>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.muted }}>عرض وصفات مرضى مواعيدك</p>
          </div>
        </div>
        {allRx.length > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: COLORS.muted,
            background: 'var(--bg-page)', borderRadius: 99, padding: '4px 12px',
          }}>
            {allRx.length} وصفة
          </span>
        )}
      </div>

      {/* Permission notice */}
      <div style={{ marginBottom: 16 }}>
        <InfoBanner type="info" icon="ℹ️">
          تعرض هذه الصفحة وصفات مرضى مواعيدك فقط — إنشاء الوصفات من صلاحيات الطبيب حصراً
        </InfoBanner>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{
          position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: COLORS.muted, pointerEvents: 'none',
        }}>
          🔍
        </span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder="ابحث بالمريض أو الطبيب أو التشخيص..."
          style={{
            width: '100%', padding: '11px 44px 11px 14px', boxSizing: 'border-box',
            borderRadius: 'var(--radius-lg)',
            border: `1.5px solid ${searchFocus ? COLORS.primary : COLORS.border}`,
            fontSize: 13, outline: 'none', fontFamily: 'Cairo,sans-serif',
            background: 'var(--bg-card)', color: 'var(--text-h)',
            boxShadow: searchFocus ? `0 0 0 3px ${COLORS.primaryL}` : 'none',
            transition: 'all 0.15s',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)',
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 16, color: COLORS.muted, padding: 0,
            }}
          >✕</button>
        )}
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        <FilterPill active={statusFilter === 'all'} onClick={() => setStatus('all')}>
          الكل ({counts.all})
        </FilterPill>
        <FilterPill active={statusFilter === 'SENT'} onClick={() => setStatus('SENT')}>
          مُرسلة ({counts.SENT})
        </FilterPill>
        <FilterPill active={statusFilter === 'DRAFT'} onClick={() => setStatus('DRAFT')}>
          مسودة ({counts.DRAFT})
        </FilterPill>
      </div>

      {/* List card */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        overflow: 'hidden',
      }}>
        {isLoading && (
          <div style={{ padding: '50px 24px', textAlign: 'center' }}>
            <Spinner />
            <p style={{ marginTop: 12, color: COLORS.muted, fontSize: 13 }}>
              جاري تحميل الوصفات...
            </p>
          </div>
        )}

        {isError && !isLoading && (
          <div style={{ padding: '50px 24px', textAlign: 'center', color: COLORS.danger }}>
            ⚠️ فشل تحميل الوصفات. تحقق من الاتصال.
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            emoji={search || statusFilter !== 'all' ? '🔍' : '💊'}
            title={search || statusFilter !== 'all' ? 'لا توجد نتائج' : 'لا توجد وصفات'}
            description={
              search
                ? 'جرب البحث بكلمات مختلفة'
                : statusFilter !== 'all'
                ? `لا توجد وصفات بحالة "${statusFilter}"`
                : 'ستظهر هنا وصفات مرضى الذين لهم مواعيد في أماكن عملك'
            }
          />
        )}

        {!isLoading && !isError && filtered.map(rx => (
          <PrescriptionCard key={rx.id} rx={rx} onClick={() => setSelected(rx)} />
        ))}
      </div>

      {/* Detail drawer */}
      <PrescriptionDrawer rx={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
