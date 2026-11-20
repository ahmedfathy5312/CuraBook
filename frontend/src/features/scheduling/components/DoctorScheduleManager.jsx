/**
 * DoctorScheduleManager.jsx — i18n fix (Sprint 3)
 * كل النصوص عبر useTranslation: DAYS، SlotBadge، كل buttons
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useDoctorLocationSchedule, useSaveDoctorSchedule, useUpsertSchedule,
  useGenerateSlots, useDeleteSlot, useToggleBlockSlot, useAddManualSlot,
} from '../hooks/useSchedule';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { scheduleKeys } from '../../../services/api/scheduleApi';
import { useTranslation } from '../../../i18n/useTranslation';
import { useToast } from '../../../context/ToastContext';
import tokens from '../../../theme/tokens';

// ─── Design tokens ────────────────────────────────────────────────────────────
const MOD_P       = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const MOD_PD      = tokens?.colors?.primary?.dark    || '#0C6478';
const MOD_PL      = tokens?.colors?.primary?.lighter || '#E0F7FA';
const MOD_SUCCESS = tokens?.colors?.success?.DEFAULT || '#10B981';
const MOD_DANGER  = tokens?.colors?.danger?.DEFAULT  || '#EF4444';
const MOD_SM      = tokens?.shadows?.sm              || '0 4px 20px rgba(0,0,0,0.06)';
const MOD_MD      = tokens?.shadows?.md              || '0 6px 24px rgba(0,0,0,0.08)';
const MOD_LG      = tokens?.shadows?.lg              || '0 8px 32px rgba(0,0,0,0.10)';
const MOD_XL      = tokens?.shadows?.xl              || '0 12px 48px rgba(0,0,0,0.15)'; // FIX P2-1: was undefined, caused ReferenceError on modal render

const BRD = 'var(--border-base)';
const TXT = 'var(--text-h)';
const MT  = 'var(--text-hint)';
const SRF = 'var(--bg-card)';

// Day keys map to backend day-of-week indices (0=Saturday in most Arabic systems)
const DAY_KEYS = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
const DURATIONS  = [15,20,30,45,60,90];
const BREAK_OPTS = [0,5,10,15,20,30];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant='primary', size='md', disabled=false, loading=false, style={} }) {
  const base = { 
    border:'none', borderRadius: 16, fontWeight: 900, cursor:disabled||loading?'not-allowed':'pointer',
    fontFamily:'inherit', transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, ...style 
  };
  
  const variants = {
    primary: { 
      background: disabled?'#E5E7EB':MOD_P, color: '#fff', 
      padding: size==='sm'?'8px 20px':'12px 28px', fontSize: size==='sm'?13:15,
      boxShadow: disabled?'none':`0 8px 20px ${MOD_P}30`
    },
    outline: { 
      background: 'transparent', color: MOD_P, border:`2px solid ${MOD_P}`, 
      padding: size==='sm'?'7px 18px':'11px 26px', fontSize: size==='sm'?13:15 
    },
    ghost: { 
      background: 'transparent', color: MT, 
      padding: size==='sm'?'8px 20px':'12px 28px', fontSize: size==='sm'?13:15 
    },
    danger: { 
      background: '#FEE2E2', color: MOD_DANGER, 
      padding: size==='sm'?'8px 20px':'12px 28px', fontSize: size==='sm'?13:15 
    },
  };

  return (
    <button onClick={onClick} disabled={disabled||loading} style={{ ...base, ...variants[variant] }}
      onMouseEnter={e => { if(!disabled) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { if(!disabled) e.currentTarget.style.transform = 'none'; }}
    >
      {loading ? <span style={{ width:16, height:16, borderRadius:'50%', border:`3px solid currentColor`, borderTopColor:'transparent', animation:'dsm-spin 0.7s linear infinite' }} /> : null}
      {children}
    </button>
  );
}

function SlotBadge({ status, t }) {
  const map = {
    booked:    { bg:'#DBEAFE', color:'#1E3A5F', key:'booked', border: '#93C5FD' },
    blocked:   { bg:'var(--bg-subtle)', color:MT, key:'blocked', border: BRD },
    available: { bg:MOD_PL, color:MOD_P, key:'available', border: `${MOD_P}30` },
  };
  const s = map[status] || map.available;
  return (
    <span style={{ 
      background:s.bg, color:s.color, padding:'4px 12px', borderRadius: 12, 
      fontSize:11, fontWeight:900, border: `1.5px solid ${s.border}`, textTransform: 'uppercase' 
    }}>
      {t(`scheduleManager.slot.${s.key}`)}
    </span>
  );
}

function TimeInput({ value, onChange, label, isRTL, id }) {
  const inputId = id || `time-input-${Math.random().toString(36).slice(2,8)}`;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, flex:1 }}>
      <label htmlFor={inputId} style={{ fontSize:12, fontWeight:800, color:MT, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</label>
      <input id={inputId} name={inputId} type="time" value={value} onChange={e=>onChange(e.target.value)} autoComplete="off"
        style={{ 
          padding:'12px 16px', borderRadius: 14, border:`2px solid ${BRD}`, fontSize:15, fontWeight: 700,
          outline:'none', fontFamily:'inherit', color:TXT, background: 'var(--bg-subtle)',
          transition: 'all 0.2s', textAlign: isRTL ? 'right' : 'left'
        }}
        onFocus={e=>e.target.style.borderColor=MOD_P} onBlur={e=>e.target.style.borderColor=BRD} />
    </div>
  );
}

// ─── Preview slot generator (client-side) ─────────────────────────────────────
function generatePreview(start, end, duration, breakTime) {
  if (!start || !end) return [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cur = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const step = duration + breakTime;
  const slots = [];
  while (cur + duration <= endMins) {
    const h = Math.floor(cur / 60), m = cur % 60;
    const endH = Math.floor((cur + duration) / 60), endM = (cur + duration) % 60;
    slots.push({ start: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, end: `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}` });
    cur += step;
  }
  return slots;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DoctorScheduleManager({ locations = [] }) {
  const { t, language } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isRTL = language === 'ar';
  const [activeLoc, setActiveLoc] = useState(locations[0] || { type:'clinic', id:null });

  // FIX: When locations prop loads asynchronously (profile API), update activeLoc
  // so it reflects the real clinic/hospital id instead of staying {id:null}.
  // Without this, handleSave sends no clinic/hospital → backend returns "This field is required".
  useEffect(() => {
    if (!locations.length) return;
    const stillAvailable = locations.some(loc => loc.type === activeLoc.type && String(loc.id) === String(activeLoc.id));
    if (!activeLoc.id || !stillAvailable) {
      const preferred = locations.find(loc => loc.type === 'clinic') || locations[0];
      setActiveLoc(preferred);
    }
  }, [locations, activeLoc.id, activeLoc.type]);

  // Localized day labels
  const DAY_LABELS = {
    Saturday:  t('scheduleManager.days.saturday', isRTL ? 'السبت' : 'Saturday'),
    Sunday:    t('scheduleManager.days.sunday', isRTL ? 'الأحد' : 'Sunday'),
    Monday:    t('scheduleManager.days.monday', isRTL ? 'الاثنين' : 'Monday'),
    Tuesday:   t('scheduleManager.days.tuesday', isRTL ? 'الثلاثاء' : 'Tuesday'),
    Wednesday: t('scheduleManager.days.wednesday', isRTL ? 'الأربعاء' : 'Wednesday'),
    Thursday:  t('scheduleManager.days.thursday', isRTL ? 'الخميس' : 'Thursday'),
    Friday:    t('scheduleManager.days.friday', isRTL ? 'الجمعة' : 'Friday'),
  };

  // Form state
  const [workingDays,    setWorkingDays]    = useState([]);
  const [workingHours,   setWorkingHours]   = useState({});
  const [sessionDur,     setSessionDur]     = useState(30);
  const [breakDur,       setBreakDur]       = useState(5);
  const [previewDay,     setPreviewDay]     = useState('');
  const [genFrom,        setGenFrom]        = useState('');
  const [genTo,          setGenTo]          = useState('');
  const [showManualAdd,  setShowManualAdd]  = useState(false);
  const [manualDate,     setManualDate]     = useState('');
  const [manualStart,    setManualStart]    = useState('');
  const [manualEnd,      setManualEnd]      = useState('');
  const [slotsDate,      setSlotsDate]      = useState('');

  // Hooks
  const { data: scheduleList, isLoading: schedLoading } = useDoctorLocationSchedule(activeLoc.type, activeLoc.id);
  const saveMut    = useUpsertSchedule();
  const genMut     = useGenerateSlots();
  const deleteMut  = useDeleteSlot();
  const blockMut   = useToggleBlockSlot();
  const addMut     = useAddManualSlot();

  // FIX: If activeLoc.id is still null after profile loads, try to recover
  // the location id from existing saved schedules (clinic_id or hospital_id).
  useEffect(() => {
    if (activeLoc.id) return; // already resolved
    const list = scheduleList?.results || scheduleList || [];
    if (!list.length) return;
    const s = list[0];
    if (s?.clinic) {
      setActiveLoc({ type: 'clinic', id: s.clinic, name: 'My Clinic' });
    } else if (s?.hospital) {
      setActiveLoc({ type: 'hospital', id: s.hospital, name: 'My Hospital' });
    }
  }, [scheduleList, activeLoc.id]);

  // FIX Problem 3: Track existing schedule IDs for upsert logic
  const [scheduleIds, setScheduleIds] = useState({});
  const [hasSavedSchedule, setHasSavedSchedule] = useState(false);

  useEffect(() => {
    const list = scheduleList?.results || scheduleList || [];
    setHasSavedSchedule(list.length > 0);
    if (list.length > 0) {
      const days   = list.map(s => String(s.day_of_week_name || DAY_KEYS[s.day_of_week]));
      const hours  = {};
      const ids    = {};  // FIX Problem 3: map day key → schedule ID
      list.forEach(s => {
        const dKey = s.day_of_week_name || DAY_KEYS[s.day_of_week];
        hours[String(dKey)] = {
          start:    s.start_time?.slice(0, 5) || '09:00',
          end:      s.end_time?.slice(0, 5)   || '17:00',
          duration: s.slot_duration || 30,
        };
        ids[String(dKey)] = s.id;  // Store backend schedule ID
      });
      setWorkingDays(days.filter(Boolean));
      setWorkingHours(hours);
      setScheduleIds(ids);  // Persist for handleSave upsert
      setSessionDur(list[0]?.slot_duration || 30);
    }
  }, [scheduleList]);

  const { data: savedSlotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', 'saved', activeLoc.type, activeLoc.id, slotsDate],
    queryFn:  () => apiClient.get(API.SLOTS.MANAGE, { params: { location_type: activeLoc.type, location_id: activeLoc.id, date: slotsDate } }).then(r => r.data),
    enabled:  !!activeLoc.id && !!slotsDate,
    staleTime: 60_000,
  });
  const savedSlots = savedSlotsData?.results || savedSlotsData || [];

  const toggleDay = (day) => setWorkingDays(prev =>
    prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
  );

  const setDayHours = (day, field, val) =>
    setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: val } }));

  const handleSave = async () => {
    // CRITICAL FIX (Problem 8 – "This field is required"):
    // Guard: location must be selected with a valid id before saving.
    if (!activeLoc.id) {
      toast?.error(isRTL ? 'يرجى تحديد موقع عمل صالح أولاً (عيادة أو مستشفى) من الإعدادات.' : 'Please add a valid work location (clinic or hospital) in Settings first.');
      return;
    }
    if (workingDays.length === 0) return;

    const promises = workingDays.map(day => {
      const dayIdx = DAY_KEYS.indexOf(day);
      if (dayIdx === -1) return Promise.resolve(); // skip unknown day keys
      const hours = workingHours[day] || { start: '09:00', end: '17:00' };
      const payload = {
        day_of_week:   dayIdx,
        start_time:    hours.start || '09:00',
        end_time:      hours.end   || '17:00',
        slot_duration: hours.duration || sessionDur,
        suppressToast: true,
      };
      // Only add location key when id is a real value (non-null, non-zero)
      if (activeLoc.type === 'clinic' && activeLoc.id) {
        payload.clinic = activeLoc.id;
      } else if (activeLoc.type === 'hospital' && activeLoc.id) {
        payload.hospital = activeLoc.id;
      }
      // FIX Problem 2 + 3: Use existing schedule ID for PUT, omit for POST
      const existingId = scheduleIds[day];
      if (existingId) {
        payload.id = existingId;
      }
      return saveMut.mutateAsync(payload);
    }).filter(Boolean);
    try {
      const savedSchedules = await Promise.all(promises);
      const savedIds = {};
      savedSchedules.filter(Boolean).forEach(schedule => {
        const dayKey = DAY_KEYS[schedule.day_of_week];
        if (dayKey && schedule.id) savedIds[dayKey] = schedule.id;
      });
      const savedList = savedSchedules.filter(Boolean);
      if (savedList.length) {
        queryClient.setQueryData(
          scheduleKeys.doctorSchedule(activeLoc.type, activeLoc.id),
          previous => {
            const previousList = previous?.results || previous || [];
            const merged = [...previousList];
            savedList.forEach(savedSchedule => {
              const index = merged.findIndex(item => item.id === savedSchedule.id);
              if (index >= 0) merged[index] = savedSchedule;
              else merged.push(savedSchedule);
            });
            return Array.isArray(previous) ? merged : { ...(previous || {}), results: merged };
          }
        );
        setHasSavedSchedule(true);
      }
      if (Object.keys(savedIds).length) {
        setScheduleIds(prev => ({ ...prev, ...savedIds }));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schedules'] }),
        queryClient.invalidateQueries({ queryKey: ['schedule'] }),
        queryClient.invalidateQueries({ queryKey: ['doctor', 'schedule', 'grouped'] }),
        queryClient.invalidateQueries({ queryKey: ['slots'] }),
      ]);
      if (promises.length) {
        toast?.success(isRTL ? 'تم حفظ الجدول بنجاح ✓' : 'Schedule saved successfully.');
      }
    } catch (e) {
      console.error(e);
      toast?.error(e?.errorDetail || e?.message || (isRTL ? 'فشل حفظ الجدول. تأكد من بيانات موقع العمل والأوقات.' : 'Failed to save schedule. Check the work location and hours.'));
    }
  };

  const handleGenerate = () => {
    if (!genFrom || !genTo) return;
    // v26 Fix: Guard — لو activeLoc.id فارغ يعني الدكتور ما أضاف موقع عمل بعد.
    // بدون هذا الـ guard، الـ payload يُرسل بدون clinic/hospital
    // فـ backend يولد slots على كل schedules الدكتور بدون فلترة بالموقع.
    if (!activeLoc.id) {
      alert(isRTL
        ? 'يجب تحديد موقع عمل (عيادة أو مستشفى) أولاً. يرجى إضافة بيانات عيادتك من صفحة الإعدادات.'
        : 'A work location (clinic or hospital) must be selected first. Please add your clinic details in Profile Settings.');
      return;
    }
    // GENERATE-FIX (v34): Check that at least one schedule has been saved.
    const savedSchedules = (scheduleList?.results || scheduleList || []);
    const hasSchedule = hasSavedSchedule || savedSchedules.length > 0 || Object.keys(scheduleIds).length > 0;
    if (!hasSchedule || schedLoading) {
      alert(isRTL
        ? schedLoading
          ? 'جارٍ تحميل بيانات الجدول، يرجى الانتظار ثم المحاولة مجددًا.'
          : 'يجب حفظ الجدول أولاً قبل توليد المواعيد. اختر أيام العمل واضغط "حفظ الجدول".'
        : schedLoading
          ? 'Schedule data is loading, please wait and try again.'
          : 'Please save your schedule first before generating slots. Select working days and press "Save Schedule".');
      return;
    }
    // GENERATE-FIX (v35): Include location so backend finds the correct schedules.
    const payload = { start_date: genFrom, end_date: genTo };
    if (activeLoc.type === 'clinic'   && activeLoc.id) payload.clinic   = activeLoc.id;
    if (activeLoc.type === 'hospital' && activeLoc.id) payload.hospital = activeLoc.id;
    genMut.mutate(payload);
  };

  const handleAddManual = () => {
    if (!manualDate || !manualStart || !manualEnd) return;
    // Build ISO-format datetime strings the backend accepts (YYYY-MM-DDTHH:MM:SS)
    const startISO = `${manualDate}T${manualStart}:00`;
    const endISO   = `${manualDate}T${manualEnd}:00`;
    const payload = {
      start: startISO,
      end:   endISO,
    };
    if (activeLoc.type === 'clinic' && activeLoc.id) {
      payload.clinic = activeLoc.id;
    } else if (activeLoc.type === 'hospital' && activeLoc.id) {
      payload.hospital = activeLoc.id;
    }
    addMut.mutate(payload);
    setShowManualAdd(false); setManualDate(''); setManualStart(''); setManualEnd('');
  };

  const previewSlots = previewDay && workingHours[previewDay]
    ? generatePreview(workingHours[previewDay].start, workingHours[previewDay].end, sessionDur, breakDur)
    : [];

  // LP-6 FIX: Print Schedule to PDF
  const handlePrint = (slots, date) => {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text(`Schedule: ${date}`, 20, 20);
      doc.setFontSize(12);
      doc.text('Slot Status Report', 20, 30);
      doc.line(20, 35, 190, 35);

      slots.forEach((s, i) => {
        const y = 45 + (i * 10);
        doc.text(`${s.start_time?.slice(0,5)} - ${s.status.toUpperCase()}`, 25, y);
      });
      doc.save(`Schedule_${date}.pdf`);
    });
  };

  if (!activeLoc.id) return (
    <div style={{ background:SRF, borderRadius: 28, padding: 60, textAlign:'center', border:`3px dashed ${BRD}`, animation: 'dsm-fade 0.5s ease' }}>
      <div style={{ fontSize:72, marginBottom:20 }}>🗓️</div>
      <p style={{ fontWeight:900, fontSize: 20, color:TXT, margin:'0 0 8px' }}>{t('scheduleManager.noLocation', isRTL ? 'لم يتم العثور على مقر عمل' : 'No Work Location Selected')}</p>
      <p style={{ fontSize:15, color:MT, margin:'0 0 24px', fontWeight: 600 }}>{t('scheduleManager.noLocationHint', isRTL ? 'يجب عليك إضافة بيانات عيادتك أولاً لضبط المواعيد.' : 'You must add your clinic details first to manage your time slots.')}</p>
      <button onClick={() => window.location.href='/profile-settings?section=clinic'} style={{ padding: '12px 32px', background: MOD_P, color: '#fff', border: 'none', borderRadius: 16, fontWeight: 800, cursor: 'pointer', boxShadow: `0 8px 20px ${MOD_P}40` }}>
         ⚙️ {isRTL ? 'الإعدادات: ربط العيادة' : 'Settings: Link Clinic'}
      </button>
    </div>
  );

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display:'flex', flexDirection:'column', gap:32 }}>
      <style>{`
        @keyframes dsm-spin{to{transform:rotate(360deg)}}
        @keyframes dsm-fade{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:none}}
        .day-pill:hover { border-color: ${MOD_P} !important; background: ${MOD_PL} !important; color: ${MOD_P} !important; }
      `}</style>

      {/* ── SECTION 1: Working Days & Hours ── */}
      <div style={{ background:SRF, borderRadius: 32, padding: 40, boxShadow: MOD_MD, border:`1px solid ${BRD}`, animation:'dsm-fade 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
           <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: TXT }}>🚀 {t('scheduleManager.section1.title', isRTL ? 'ضبط أوقات العمل الأسبوعية' : 'Weekly Working Hours')}</h3>
           <div style={{ background: MOD_PL, padding: '8px 16px', borderRadius: 14, fontSize: 13, fontWeight: 800, color: MOD_P }}>
             {t('scheduleManager.location', isRTL ? 'مقر العمل الحالي: ' : 'Active Location: ')} {t(`scheduleManager.${activeLoc.type}`, isRTL ? (activeLoc.type === 'clinic' ? 'عيادة' : 'مستشفى') : activeLoc.type)}
           </div>
        </div>

        {locations.length > 1 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, margin:'-16px 0 24px' }}>
            {locations.map(loc => {
              const isActive = activeLoc.type === loc.type && String(activeLoc.id) === String(loc.id);
              return (
                <button
                  key={`${loc.type}-${loc.id}`}
                  type="button"
                  onClick={() => setActiveLoc(loc)}
                  style={{
                    padding:'8px 14px',
                    borderRadius: 12,
                    border:`2px solid ${isActive ? MOD_P : BRD}`,
                    background: isActive ? MOD_P : 'var(--bg-subtle)',
                    color: isActive ? '#fff' : TXT,
                    fontSize:12,
                    fontWeight:900,
                    cursor:'pointer',
                    fontFamily:'inherit',
                  }}
                >
                  {loc.type === 'clinic' ? (isRTL ? 'عيادة' : 'Clinic') : (isRTL ? 'مستشفى' : 'Hospital')}
                  {loc.name ? ` - ${loc.name}` : ''}
                </button>
              );
            })}
          </div>
        )}

        {schedLoading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height:60, background: 'var(--bg-subtle)', borderRadius: 18, animation: 'pulse 1s infinite' }} />)}
          </div>
        ) : (
          <>
            <p style={{ margin:'0 0 14px', fontSize:13, fontWeight:800, color:MT, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('scheduleManager.section1.workingDays', isRTL ? 'أيام العمل' : 'Working Days')}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:32 }}>
              {DAY_KEYS.map(day => {
                const isOn = workingDays.includes(day);
                return (
                  <button key={day}
                    onClick={() => toggleDay(day)}
                    className="day-pill"
                    style={{
                      padding:'12px 24px', borderRadius: 16, border:`2px solid ${isOn?MOD_P:BRD}`,
                      background: isOn ? MOD_P : SRF, color: isOn ? '#fff' : MT,
                      fontWeight:900, fontSize:14, cursor: 'pointer',
                      fontFamily:'inherit', transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display:'flex', alignItems:'center', gap:8, boxShadow: isOn ? `0 6px 16px ${MOD_P}40` : 'none'
                    }}
                  >
                    {DAY_LABELS[day]}
                    {isOn && <span style={{ fontSize: 10 }}>●</span>}
                  </button>
                );
              })}
            </div>

            {workingDays.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:32 }}>
                <p style={{ margin:'0 0 10px', fontSize:13, fontWeight:800, color:MT, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('scheduleManager.section1.workingHours', isRTL ? 'تفاصيل الساعات' : 'Specific Hours')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {workingDays.map(day => (
                    <div key={day} style={{ display:'flex', flexDirection: 'column', gap:16, padding: 24, background: 'var(--bg-page)', borderRadius: 24, border: `2px solid ${BRD}` }}>
                      <span style={{ fontWeight:900, fontSize:16, color:TXT, borderBottom: `2px solid ${MOD_P}20`, pb: 8, marginBottom: 4 }}>{DAY_LABELS[day]}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <TimeInput isRTL={isRTL} label={t('scheduleManager.timeStart', isRTL ? 'من' : 'From')} value={workingHours[day]?.start || '09:00'} onChange={v => setDayHours(day,'start',v)} />
                        <TimeInput isRTL={isRTL} label={t('scheduleManager.timeEnd', isRTL ? 'إلى' : 'To')} value={workingHours[day]?.end || '17:00'} onChange={v => setDayHours(day,'end',v)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:32, marginBottom:32, background: 'var(--bg-subtle)', padding: 32, borderRadius: 24 }}>
              <div>
                <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:800, color:MT, textTransform:'uppercase' }}>{t('scheduleManager.section1.sessionDur', isRTL ? 'مدة الكشف (دقائق)' : 'Session Duration (mins)')}</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {DURATIONS.map(d => (
                    <button key={d} onClick={() => setSessionDur(d)}
                      style={{ padding:'10px 18px', borderRadius: 12, border:`2px solid ${sessionDur===d?MOD_P:BRD}`,
                        background: sessionDur===d?MOD_P:SRF, color: sessionDur===d?'#fff':TXT,
                        fontWeight:900, fontSize:13, cursor:'pointer', transition:'all 0.2s' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:800, color:MT, textTransform:'uppercase' }}>{t('scheduleManager.section1.breakBetween', isRTL ? 'وقت الراحة بين المواعيد' : 'Break Duration')}</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {BREAK_OPTS.map(b => (
                    <button key={b} onClick={() => setBreakDur(b)}
                      style={{ padding:'10px 18px', borderRadius: 12, border:`2px solid ${breakDur===b?MOD_P:BRD}`,
                        background: breakDur===b?MOD_P:SRF, color: breakDur===b?'#fff':TXT,
                        fontWeight:900, fontSize:13, cursor:'pointer', transition:'all 0.2s' }}>
                      {b===0 ? (isRTL ? 'بدون' : 'None') : b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Btn onClick={handleSave} loading={saveMut.isPending} disabled={workingDays.length===0} style={{ width: '100%', borderRadius: 20 }}>
              {t('scheduleManager.section1.saveBtn', isRTL ? '💾 حفظ إعدادات جدول العمل' : '💾 Save Work Schedule Settings')}
            </Btn>
          </>
        )}
      </div>

      {/* ── SECTION 3: Generate Slots ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, flexWrap: 'wrap' }}>
        
        <div style={{ background:SRF, borderRadius: 32, padding: 32, boxShadow: MOD_MD, border:`1px solid ${BRD}` }}>
          <h3 style={{ margin:'0 0 14px', fontSize: 18, fontWeight: 900, color: TXT }}>🏗️ {t('scheduleManager.section3.title', isRTL ? 'توليد المواعيد آلياً' : 'Generate Slots')}</h3>
          <p style={{ margin:'0 0 24px', fontSize:14, color:MT, fontWeight: 500, lineHeight: 1.6 }}>{t('scheduleManager.section3.subtitle', isRTL ? 'سيقوم النظام بإنشاء المواعيد المتاحة لكل مريض بناءً على ساعات العمل التي قمت بتحديدها.' : 'Automatically create available slots for patients based on your defined working hours.')}</p>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:8, flex: 1 }}>
              <label htmlFor="gen-from-date" style={{ fontSize:12, fontWeight:800, color:MT }}>{t('scheduleManager.section3.from', isRTL ? 'من تاريخ' : 'Start Date')}</label>
              <input id="gen-from-date" name="gen_from_date" type="date" value={genFrom} onChange={e=>setGenFrom(e.target.value)}
                style={{ padding:'12px 16px', borderRadius: 14, border:`2px solid ${BRD}`, fontSize:14, fontWeight: 700, background: 'var(--bg-subtle)' }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, flex: 1 }}>
              <label htmlFor="gen-to-date" style={{ fontSize:12, fontWeight:800, color:MT }}>{t('scheduleManager.section3.to', isRTL ? 'إلى تاريخ' : 'End Date')}</label>
              <input id="gen-to-date" name="gen_to_date" type="date" value={genTo} onChange={e=>setGenTo(e.target.value)}
                style={{ padding:'12px 16px', borderRadius: 14, border:`2px solid ${BRD}`, fontSize:14, fontWeight: 700, background: 'var(--bg-subtle)' }} />
            </div>
          </div>
          <Btn onClick={handleGenerate} loading={genMut.isPending || schedLoading} disabled={!genFrom||!genTo||schedLoading} style={{ width: '100%', marginTop: 24 }}>
            ⚡ {t('scheduleManager.section3.generateBtn', isRTL ? 'توليد المواعيد الآن' : 'Generate Slots Now')}
          </Btn>
        </div>

        {/* Preview Section */}
        <div style={{ background:SRF, borderRadius: 32, padding: 32, boxShadow: MOD_MD, border:`1px solid ${BRD}`, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin:'0 0 14px', fontSize: 18, fontWeight: 900, color: TXT }}>🔍 {t('scheduleManager.section2.title', isRTL ? 'معاينة يوم افتراضي' : 'Day Preview')}</h3>
          <div style={{ marginBottom: 20 }}>
            <select id="preview-day-select" name="preview_day" value={previewDay} onChange={e=>setPreviewDay(e.target.value)}
              style={{ padding:'12px 20px', borderRadius: 16, border:`2px solid ${BRD}`, fontSize:14, fontWeight: 800,
                background:'var(--bg-subtle)', color:TXT, outline:'none', cursor:'pointer', width: '100%' }}>
              <option value="">{t('scheduleManager.section2.selectDay', isRTL ? 'اختر يوماً للمعاينة' : 'Select a day to preview')}</option>
              {workingDays.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, maxHeight: 220, overflowY: 'auto', display:'flex', flexWrap:'wrap', gap:10, padding: 10, background: 'var(--bg-subtle)', borderRadius: 20 }}>
            {previewDay && previewSlots.map((s,i) => (
              <span key={i} style={{ background:MOD_PL, color:MOD_P, padding:'8px 16px', borderRadius: 14, fontSize:13, fontWeight:900, border:`2px solid ${MOD_P}20`, animation: 'dsm-fade 0.3s' }}>
                {s.start} – {s.end}
              </span>
            ))}
            {!previewDay && <div style={{ margin: 'auto', color: MT, fontSize: 14, fontWeight: 600 }}>{isRTL ? 'اختر يوماً لرؤية كيف سيتم تقسيم المواعيد' : 'Select a day to see how slots will be generated'}</div>}
          </div>
        </div>
      </div>

      {/* ── SECTION 4: Saved Slots ── */}
      <div style={{ background:SRF, borderRadius: 32, padding: 40, boxShadow: MOD_LG, border:`1px solid ${BRD}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:20 }}>
          <h3 style={{ margin:0, fontSize: 22, fontWeight: 900, color: TXT }}>✅ {t('scheduleManager.section4.title', isRTL ? 'المواعيد الفعلية في النظام' : 'Manage Existing Slots')}</h3>
          <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
            <input id="slots-date-filter" name="slots_date" type="date" value={slotsDate} onChange={e=>setSlotsDate(e.target.value)}
              aria-label={isRTL ? 'تاريخ عرض المواعيد' : 'Slots date filter'}
              style={{ padding:'10px 18px', borderRadius: 16, border:`2px solid ${BRD}`, fontSize:14, fontWeight: 800, background: 'var(--bg-subtle)' }} />
            
            {/* LP-6 FIX: Print Button */}
            <Btn variant="outline" size="sm" onClick={() => handlePrint(savedSlots, slotsDate)} disabled={!slotsDate || savedSlots.length === 0} style={{ borderRadius: 16 }}>
              🖨️ {isRTL ? 'طباعة' : 'Print'}
            </Btn>

            <Btn variant="outline" size="sm" onClick={() => setShowManualAdd(true)} style={{ borderRadius: 16 }}>
              ➕ {t('scheduleManager.section4.addSlot', isRTL ? 'إضافة موعد مخصص' : 'Manual Slot')}
            </Btn>
          </div>
        </div>

        {!slotsDate ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:MT, background: 'var(--bg-subtle)', borderRadius: 28 }}>
            <div style={{ fontSize:56, marginBottom:20 }}>📅</div>
             <p style={{ fontSize:16, fontWeight: 800 }}>{t('scheduleManager.section4.selectDate', isRTL ? 'يرجى اختيار تاريخ لعرض المواعيد المسجلة' : 'Please select a date to manage slots')}</p>
          </div>
        ) : slotsLoading ? (
          <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ width:120, height:44, background:'var(--bg-subtle)', borderRadius: 16, animation: 'pulse 1s infinite' }} />)}
          </div>
        ) : savedSlots.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:MT, background: 'var(--bg-subtle)', borderRadius: 28 }}>
            <div style={{ fontSize:56, marginBottom:20 }}>📭</div>
            <p style={{ fontSize:16, fontWeight: 800 }}>{t('scheduleManager.section4.noSlots', isRTL ? 'لا توجد مواعيد لهذا التاريخ' : 'No slots generated for this date')}</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap:16 }}>
            {savedSlots.map(slot => (
              <div key={slot.id} style={{
                display:'flex', flexDirection: 'column', gap:12, padding: 20,
                background: slot.status==='booked'?'#EFF6FF': slot.status==='blocked'?'var(--bg-page)':SRF,
                borderRadius: 24, border:`2px solid ${slot.status==='booked'?'#93C5FD':slot.status==='blocked'?BRD:MOD_PL}`,
                boxShadow: MOD_SM, transition: 'all 0.2s',
                cursor: 'grab'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize:16, fontWeight:900, color: slot.status==='booked'?'#1E40AF':TXT }}>
                    {slot.start_time?.slice(0,5)}
                  </span>
                  <SlotBadge status={slot.status} t={t} />
                </div>
                
                {slot.status !== 'booked' && (
                  <div style={{ display:'flex', gap:8, borderTop: `1.5px dashed ${BRD}`, paddingTop: 12 }}>
                    <button onClick={() => blockMut.mutate(slot.id)}
                      style={{ flex: 1, height:36, borderRadius: 12, border:'none', background: slot.status==='blocked'?MOD_SUCCESS:'#F1F5F9', cursor:'pointer', fontSize:13, fontWeight: 900, color: slot.status==='blocked'?'#fff':TXT, display:'flex', alignItems:'center', justifyContent:'center', gap: 6 }}>
                      {slot.status==='blocked'?'✓' : '🚫'}
                    </button>
                    <button onClick={() => deleteMut.mutate(slot.id)}
                      style={{ flex: 1, height:36, borderRadius: 12, border:'none', background:'#FEE2E2', cursor:'pointer', fontSize:13, fontWeight: 900, color: MOD_DANGER, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      ✕
                    </button>
                  </div>
                )}
                {slot.status === 'booked' && <div style={{ fontSize: 12, fontWeight: 800, color: '#1E40AF', background: '#DBEAFE', padding: '6px 12px', borderRadius: 8, textAlign: 'center' }}>{isRTL ? 'محجوز بالفعل' : 'Already Booked'}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Manual Modal - Overhaul to match */}
        {showManualAdd && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }} onClick={() => setShowManualAdd(false)}>
            <div style={{ background:SRF, borderRadius: 32, padding: 36, width:'100%', maxWidth: 420, boxShadow: MOD_XL, border: `2px solid ${BRD}`, animation: 'dsm-fade 0.3s' }} onClick={e=>e.stopPropagation()}>
              <h3 style={{ margin:'0 0 24px', fontSize:20, fontWeight:900, color:TXT }}>➕ {isRTL ? 'إضافة موعد يدوي' : 'Manual Slot'}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <label htmlFor="manual-slot-date" style={{ fontSize:13, fontWeight:800, color:MT }}>{t('scheduleManager.manualModal.date', isRTL ? 'التاريخ' : 'Date')}</label>
                  <input id="manual-slot-date" name="manual_date" type="date" value={manualDate} onChange={e=>setManualDate(e.target.value)}
                    style={{ padding:'12px 16px', borderRadius: 16, border:`2px solid ${BRD}`, fontSize:15, fontWeight: 700, background: 'var(--bg-subtle)' }} />
                </div>
                <div style={{ display:'flex', gap:16 }}>
                  <TimeInput id="manual-slot-start" isRTL={isRTL} label={t('scheduleManager.manualModal.startTime', isRTL ? 'البداية' : 'Start')} value={manualStart} onChange={setManualStart} />
                  <TimeInput id="manual-slot-end" isRTL={isRTL} label={t('scheduleManager.manualModal.endTime', isRTL ? 'النهاية' : 'End')}   value={manualEnd}   onChange={setManualEnd} />
                </div>
                <div style={{ display:'flex', gap:12, marginTop:12 }}>
                  <Btn variant="ghost" onClick={() => setShowManualAdd(false)} style={{ flex:1 }}>{isRTL ? 'رجوع' : 'Back'}</Btn>
                  <Btn onClick={handleAddManual} loading={addMut.isPending} disabled={!manualDate||!manualStart||!manualEnd} style={{ flex:2 }}>{isRTL ? 'إضافة الموعد' : 'Add Slot'}</Btn>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
