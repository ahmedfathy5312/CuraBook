/**
 * HospitalScheduleManager.jsx
 * Hospital admin sets framework schedule for each doctor
 * Design: consistent with CuraBook design system
 */
import { useState, useEffect } from 'react';
import { useHospitalDoctors } from '../../hospital/hooks/useHospitalData';
import { useHospitalDoctorSchedule, useSaveHospitalDoctorSchedule, useDeleteHospitalDoctorSchedule, useGenerateSlots } from '../hooks/useSchedule';
import Avatar from '../../../components/ui/Avatar';
import { useToast } from '../../../context/ToastContext';
import useTranslation from '../../../i18n/useTranslation';
import { getDoctorPrefix } from '../../../utils/formatters';

// â”€â”€ Bug #3 Fix: Date normalization â€” prevents year 0026 browser bug â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function normalizeDateValue(rawValue) {
  if (!rawValue) return '';
  try {
    const d = new Date(rawValue);
    if (isNaN(d.getTime())) return rawValue;
    let year = d.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > 2040) {
      year = currentYear;
      d.setFullYear(year);
    }
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  } catch {
    return rawValue;
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const P='var(--primary)', PBG='#E6F1FB', PLT='#B8D9EF', BG='var(--bg)', SRF='var(--bg-card)', BRD='var(--border)', TXT='var(--text-h)', BODY='var(--text-body)', MT='var(--text-muted)';
const DAYS=['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
const DAY_KEYS=['saturday','sunday','monday','tuesday','wednesday','thursday','friday'];
const DURATIONS=[15,20,30,45,60,90];
const BREAK_OPTS=[0,5,10,15,20,30];

function getDoctorUserId(doc) {
  if (!doc) return null;
  if (doc.user_id) return doc.user_id;
  if (typeof doc.user === 'number' || typeof doc.user === 'string') return doc.user;
  if (doc.user && typeof doc.user === 'object' && doc.user.id) return doc.user.id;
  return doc.doctor_user_id || null;
}

function getDoctorHospitalId(doc) {
  if (!doc) return null;
  if (doc.hospital_id) return doc.hospital_id;
  if (typeof doc.hospital === 'number' || typeof doc.hospital === 'string') return doc.hospital;
  if (doc.hospital && typeof doc.hospital === 'object' && doc.hospital.id) return doc.hospital.id;
  return null;
}

function normalizeDayKey(day) {
  if (day === null || day === undefined || day === '') return null;
  if (typeof day === 'number') return String(day);
  const raw = String(day);
  if (/^\d+$/.test(raw)) return raw;
  const index = DAYS.indexOf(raw);
  return index >= 0 ? String(index) : raw;
}

function normalizeScheduleList(data) {
  if (!data) return [];
  const list = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
      ? data
      : [];

  const byDay = new Map();
  [...list]
    .filter(item => item && typeof item === 'object')
    .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
    .forEach(item => {
      const dayKey = normalizeDayKey(item.day_of_week);
      if (!isValidDayKey(dayKey) || byDay.has(dayKey)) return;
      byDay.set(dayKey, item);
    });

  return Array.from(byDay.values());
}

function isValidDayKey(dayKey) {
  const dayNumber = Number(dayKey);
  return Number.isInteger(dayNumber) && dayNumber >= 0 && dayNumber < DAYS.length;
}

function Btn({children,onClick,variant='primary',size='md',disabled=false,loading=false,style={}}) {
  const base={border:'none',borderRadius: 'var(--radius-md)',fontWeight:700,cursor:disabled||loading?'not-allowed':'pointer',fontFamily:'inherit',transition:'all 0.2s',display:'inline-flex',alignItems:'center',gap:6,...style};
  const variants={
    primary:{background:disabled?'var(--bg-elevated)':P,color:disabled?'var(--text-body)':'#fff',border:disabled?`1.5px solid ${BRD}`:'none',padding:size==='sm'?'7px 14px':'10px 22px',fontSize:size==='sm'?12:14},
    outline:{background:'transparent',color:P,border:`2px solid ${P}`,padding:size==='sm'?'6px 13px':'9px 21px',fontSize:size==='sm'?12:14},
    ghost:{background:'transparent',color:BODY,padding:size==='sm'?'6px 13px':'9px 21px',fontSize:size==='sm'?12:14},
  };
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{...base,...variants[variant]}}>
      {loading&&<span style={{width:14,height:14,borderRadius:'50%',border:`2px solid currentColor`,borderTopColor:'transparent',animation:'hsm-spin 0.7s linear infinite'}}/>}
      {children}
    </button>
  );
}

function TimeInput({value,onChange,label,disabled=false}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4,flex:1}}>
      <label style={{fontSize:11,fontWeight:700,color:'var(--text-body)',textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</label>
      <input type="time" value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} autoComplete="off"
        style={{padding:'9px 12px',borderRadius: 'var(--radius-md)',border:`1.5px solid ${BRD}`,fontSize:14,outline:'none',
          fontFamily:'inherit',color:disabled?'var(--text-muted)':'var(--text-h)',background:disabled?BG:'var(--bg-elevated)',cursor:disabled?'not-allowed':'text'}}
        onFocus={e=>{if(!disabled)e.target.style.borderColor=P;}} onBlur={e=>e.target.style.borderColor=BRD} />
    </div>
  );
}

export default function HospitalScheduleManager({ hospitalId }) {
  const { t, lang, isRTL } = useTranslation();
  const toast = useToast();
  const [selectedDoc,  setSelectedDoc]  = useState(null);
  const [docSearch,    setDocSearch]    = useState('');
  const [workingDays,  setWorkingDays]  = useState([]);
  const [workingHours, setWorkingHours] = useState({});
  const [sessionDur,   setSessionDur]   = useState(30);
  const [breakDur,     setBreakDur]     = useState(5);
  const [lockHours,    setLockHours]    = useState(false);
  const [genFrom,      setGenFrom]      = useState('');
  const [genTo,        setGenTo]        = useState('');

  const { data: doctorsData, isLoading: doctorsLoading } = useHospitalDoctors();
  const allDoctors = doctorsData?.results || doctorsData || [];
  // Backend HospitalDoctorSerializer returns doctor_name (not full_name)
  const getDoctorName = (d) => d.doctor_name || d.full_name || d.name || 'Unknown';
  const filteredDoctors = allDoctors.filter(d =>
    !docSearch || getDoctorName(d).toLowerCase().includes(docSearch.toLowerCase()) ||
    (d.specialty||'').toLowerCase().includes(docSearch.toLowerCase())
  );

  const selectedDoctorUserId = getDoctorUserId(selectedDoc);
  const effectiveHospitalId = hospitalId || getDoctorHospitalId(selectedDoc);
  const hasHospitalContext = !!effectiveHospitalId;
  const { data: scheduleList, isLoading: schedLoading } = useHospitalDoctorSchedule(effectiveHospitalId, selectedDoctorUserId);
  const saveMut = useSaveHospitalDoctorSchedule(effectiveHospitalId);
  const deleteMut = useDeleteHospitalDoctorSchedule(effectiveHospitalId);
  const genMut  = useGenerateSlots();
  const savedSchedules = normalizeScheduleList(scheduleList);

  useEffect(() => {
    const list = savedSchedules;
    if (list.length > 0 && selectedDoc) {
      const days  = list
        .map(s => normalizeDayKey(s.day_of_week))
        .filter(isValidDayKey);
      const hours = {};
      list.forEach(s => {
        const dayKey = normalizeDayKey(s.day_of_week);
        if (!isValidDayKey(dayKey)) return;
        hours[dayKey] = {
          id:       s.id,
          start:    s.start_time?.slice(0, 5) || '09:00',
          end:      s.end_time?.slice(0, 5)   || '17:00',
          duration: s.slot_duration || 30,
        };
      });
      setWorkingDays(days);
      setWorkingHours(hours);
      setSessionDur(list[0]?.slot_duration || 30);
      setBreakDur(5);
      setLockHours(false);
    } else if (selectedDoc) {
      setWorkingDays([]); setWorkingHours({}); setSessionDur(30); setBreakDur(5); setLockHours(false);
    }
  }, [scheduleList, selectedDoc]);

  const toggleDay = (day) => setWorkingDays(prev => prev.includes(day) ? prev.filter(d=>d!==day) : [...prev, day]);
  const setDayHours = (day, field, val) => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: val } }));

  const handleSave = async () => {
    if (!selectedDoc || !hasHospitalContext) return;
    // BUG-2 FIX: use selectedDoc.user (User.id) not selectedDoc.id (HospitalDoctor link id).
    // HospitalDoctorSerializer returns id = HospitalDoctor.id and user = User.id.
    // The scheduling backend resolves the doctor via User.objects.get(pk=doctor_id),
    // so we must send the User.id. Sending HospitalDoctor.id causes a User.DoesNotExist
    // error (different id space) which surfaces as "This operation is available to
    // doctors only" because perform_create falls through to the permission check.
    const doctorUserId = getDoctorUserId(selectedDoc);
    if (!doctorUserId) return;
    const validDays = [...new Set(workingDays
      .map(normalizeDayKey)
      .filter(isValidDayKey))];
    if (validDays.length === 0) return;
    const validDaySet = new Set(validDays);
    const existingByDay = new Map(
      savedSchedules.map(s => [normalizeDayKey(s.day_of_week), s])
    );

    const savePromises = validDays.map(day => {
      const dayKey = normalizeDayKey(day);
      const hours = workingHours[dayKey] || { start: '09:00', end: '17:00' };
      const existing = existingByDay.get(dayKey);
      const startTime = hours.start || '09:00';
      const endTime = hours.end || '17:00';
      return saveMut.mutateAsync({
        id:           existing?.id,
        doctorId:     doctorUserId,
        day_of_week:  parseInt(dayKey, 10),
        start_time:   startTime,
        end_time:     endTime,
        slot_duration: hours.duration || sessionDur,
        hospital:     effectiveHospitalId,
        suppressToast: true,
      });
    });
    const deletePromises = savedSchedules
      .filter(s => !validDaySet.has(normalizeDayKey(s.day_of_week)))
      .map(s => deleteMut.mutateAsync(s.id));

    try {
      await Promise.all([...savePromises, ...deletePromises]);
      toast.success(t('hospitalSchedule.saved'));
    } catch (e) { /* handled by mutation */ }
  };

  const handleGenerate = () => {
    if (!genFrom || !genTo || !selectedDoc || !hasHospitalContext) return;
    const list = savedSchedules;
    // BUG-2 FIX: use User.id (selectedDoc.user) not HospitalDoctor.id (selectedDoc.id)
    const doctorUserId = getDoctorUserId(selectedDoc);
    if (!doctorUserId) return;

    if (list.length > 0) {
      // Per-schedule generation â€” works for both doctors and hospital admins.
      // Bug #3 Fix: pass doctor_id so the backend resolves the correct doctor
      // when the caller is a hospital admin (not a doctor themselves).
      genMut.mutate({
        start_date: normalizeDateValue(genFrom),
        end_date:   normalizeDateValue(genTo),
        doctor_id:  doctorUserId,
        hospital:   effectiveHospitalId,
      });
    } else {
      // No saved schedules yet â€” tell the user
      import('../../../context/ToastContext').then(m => {
        // noop â€” toast is not directly importable here; the save mutation already shows error
      });
    }
  };

  const summary = selectedDoc && workingDays.length > 0
    ? t('hospitalSchedule.summary', {
        doctor: `${getDoctorPrefix(lang)} ${getDoctorName(selectedDoc)}`,
        days: workingDays.length,
        duration: sessionDur,
      })
    : null;

  const dayLabel = (dayKey, short = false) => {
    const key = DAY_KEYS[Number(dayKey)];
    if (!key) return dayKey;
    const label = t(`scheduleManager.days.${key}`);
    return short && !isRTL ? label.slice(0, 3) : label;
  };

  return (
    <div style={{ display:'flex', gap:24, minHeight:600, fontFamily:"'Cairo',sans-serif" }}>
      <style>{`@keyframes hsm-spin{to{transform:rotate(360deg)}}@keyframes hsm-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      {/* â”€â”€ Doctor Sidebar â”€â”€ */}
      <div style={{ width:280, flexShrink:0, background:SRF, borderRadius: 'var(--radius-lg)', padding:20, boxShadow:"var(--shadow-md)", border:`1px solid ${BRD}`, display:'flex', flexDirection:'column', gap:14 }}>
        <h3 style={{ margin:0, fontSize:14, fontWeight:800, color:TXT }}>👨‍⚕️ {t('hospitalSchedule.doctors')}</h3>
        <div style={{ position:'relative' }}>
          <input name="search" type="text" placeholder={t('hospitalSchedule.search')} value={docSearch} onChange={e=>setDocSearch(e.target.value)} autoComplete="off"
            style={{ width:'100%', padding:'8px 12px', borderRadius: 'var(--radius-md)', border:`1.5px solid ${BRD}`,
              fontSize:13, outline:'none', fontFamily:'inherit', color:TXT, background:'var(--bg-elevated)', boxSizing:'border-box' }}
            onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor=BRD} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto', flex:1 }}>
          {doctorsLoading ? (
            [1,2,3,4].map(i => (
              <div key={i} style={{ display:'flex', gap:10, padding:10, background:BG, borderRadius: 'var(--radius-md)' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--border)' }} />
                <div style={{ flex:1 }}>
                  <div style={{ height:12, background:'var(--border)', borderRadius: 'var(--radius-sm)', marginBottom:6, width:'70%' }} />
                  <div style={{ height:10, background:'var(--border)', borderRadius: 'var(--radius-sm)', width:'50%' }} />
                </div>
              </div>
            ))
          ) : filteredDoctors.length === 0 ? (
            <p style={{ fontSize:13, color:BODY, textAlign:'center', padding:'16px 0' }}>{t('hospitalSchedule.noDoctors')}</p>
          ) : (
            filteredDoctors.map(doc => {
              const isSel = selectedDoc?.id === doc.id;
              return (
                <button key={doc.id} onClick={() => setSelectedDoc(doc)}
                  style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', borderRadius: 'var(--radius-md)',
                    border:`2px solid ${isSel?P:BRD}`, background: isSel?'rgba(34, 211, 238, 0.18)':SRF,
                    boxShadow: isSel?`0 0 0 1px ${P}55, 0 10px 22px rgba(8,145,178,0.16)`:'none',
                    cursor:'pointer', fontFamily:'inherit', transition:'all 0.18s', textAlign:'left' }}>
                  <Avatar name={getDoctorName(doc)} src={doc.image} size="sm" style={{ flexShrink:0 }} />
                  <div style={{ overflow:'hidden', flex:1 }}>
                    <p style={{ margin:0, fontWeight:800, fontSize:13, color:isSel?'#F8FAFC':TXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {getDoctorPrefix(lang)} {getDoctorName(doc)}
                    </p>
                    <p style={{ margin:0, fontSize:11, color:isSel?'#67E8F9':P, fontWeight:700 }}>{doc.specialty}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* â”€â”€ Right panel â”€â”€ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:20, animation:'hsm-fade 0.3s ease' }}>

        {!selectedDoc ? (
          <div style={{ flex:1, background:SRF, borderRadius: 'var(--radius-lg)', padding:60, textAlign:'center', border:`2px dashed ${BRD}` }}>
            <h3 style={{ margin:'0 0 8px', fontSize:17, fontWeight:800, color:TXT }}>{t('hospitalSchedule.selectDoctor')}</h3>
            <p style={{ margin:0, fontSize:13, color:BODY }}>{t('hospitalSchedule.selectDoctorHint')}</p>
          </div>
        ) : (
          <>
            {/* Doctor header */}
            <div style={{ background:`linear-gradient(135deg,${P} 0%,#154E73 100%)`, borderRadius: 'var(--radius-lg)', padding:'20px 24px',
              display:'flex', gap:16, alignItems:'center', boxShadow:`0 8px 28px ${P}30` }}>
              <Avatar name={getDoctorName(selectedDoc)} src={selectedDoc.image} size="lg"
                style={{ border:'3px solid rgba(255,255,255,0.4)', flexShrink:0 }} />
              <div>
                <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:'#fff' }}>{getDoctorPrefix(lang)} {getDoctorName(selectedDoc)}</h3>
                <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,0.8)' }}>{selectedDoc.specialty}</p>
                {summary && <p style={{ margin:'6px 0 0', fontSize:12, color:'rgba(255,255,255,0.7)' }}>{summary}</p>}
              </div>
            </div>

            {schedLoading ? (
              <div style={{ background:SRF, borderRadius: 'var(--radius-lg)', padding:24, boxShadow:"var(--shadow-md)" }}>
                {[1,2,3].map(i => <div key={i} style={{ height:44, background:BG, borderRadius: 'var(--radius-md)', marginBottom:10 }} />)}
              </div>
            ) : (
              <>
                {/* Working Days */}
                <div style={{ background:SRF, borderRadius: 'var(--radius-lg)', padding:24, boxShadow:"var(--shadow-md)", border:`1px solid ${BRD}` }}>
                  <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800, color:TXT }}>{t('hospitalSchedule.settings')}</h3>
                  <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:700, color:BODY, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('scheduleManager.section1.workingDays')}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
                    {DAYS.map(day => {
                      const dayKey = normalizeDayKey(day);
                      const isOn = workingDays.includes(dayKey);
                      return (
                        <button key={day} onClick={() => toggleDay(dayKey)}
                          style={{ padding:'8px 16px', borderRadius: 'var(--radius-lg)', border:`2px solid ${isOn?P:BRD}`,
                            background: isOn?P:SRF, color: isOn?'#fff':'var(--text-body)',
                            fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all 0.18s' }}>
                          {dayLabel(dayKey, true)}
                        </button>
                      );
                    })}
                  </div>

                  {workingDays.length > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                      <p style={{ margin:'0 0 6px', fontSize:12, fontWeight:700, color:BODY, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('scheduleManager.section1.workingHours')}</p>
                      {workingDays.filter(isValidDayKey).map(day => (
                        <div key={day} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px', background:'var(--bg-elevated)', borderRadius: 'var(--radius-md)', flexWrap:'wrap' }}>
                          <span style={{ minWidth:90, fontWeight:800, fontSize:13, color:TXT }}>{dayLabel(day)}</span>
                          <TimeInput label={t('hospitalSchedule.start')} value={workingHours[day]?.start||''} onChange={v=>setDayHours(day,'start',v)} />
                          <TimeInput label={t('hospitalSchedule.end')}   value={workingHours[day]?.end||''}   onChange={v=>setDayHours(day,'end',v)} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                    <div>
                      <p style={{ margin:'0 0 8px', fontSize:12, fontWeight:700, color:BODY, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('scheduleManager.section1.sessionDur')}</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {DURATIONS.map(d => (
                          <button key={d} onClick={() => setSessionDur(d)}
                            style={{ padding:'7px 14px', borderRadius: 'var(--radius-md)', border:`2px solid ${sessionDur===d?P:BRD}`,
                              background:sessionDur===d?P:SRF, color:sessionDur===d?'#fff':'var(--text-body)',
                              fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
                            {d}{t('hospitalSchedule.minutesSuffix')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p style={{ margin:'0 0 8px', fontSize:12, fontWeight:700, color:BODY, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('scheduleManager.section1.breakBetween')}</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {BREAK_OPTS.map(b => (
                          <button key={b} onClick={() => setBreakDur(b)}
                            style={{ padding:'7px 14px', borderRadius: 'var(--radius-md)', border:`2px solid ${breakDur===b?P:BRD}`,
                              background:breakDur===b?P:SRF, color:breakDur===b?'#fff':'var(--text-body)',
                              fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
                            {b===0 ? t('scheduleManager.section1.noneBreak') : `${b}${t('hospitalSchedule.minutesSuffix')}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Lock hours toggle */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:lockHours?'#FEF3C7':BG, borderRadius: 'var(--radius-md)', border:`1px solid ${lockHours?'#F59E0B20':BRD}`, marginBottom:20 }}>
                    <button onClick={() => setLockHours(p=>!p)}
                      style={{ width:44, height:24, borderRadius: 'var(--radius-md)', border:'none', cursor:'pointer',
                        background: lockHours?P:'#D1D5DB', transition:'all 0.2s', position:'relative', flexShrink:0 }}>
                      <span style={{ position:'absolute', top:2, left: lockHours?22:2, width:20, height:20,
                        borderRadius:'50%', background:'var(--bg-card)', transition:'all 0.2s',
                        boxShadow:'var(--shadow-sm)' }} />
                    </button>
                    <div>
                      <p style={{ margin:0, fontWeight:700, fontSize:13, color: lockHours?'#92400E':TXT }}>🔒 {t('hospitalSchedule.lockHours')}</p>
                      <p style={{ margin:0, fontSize:11, color:'var(--text-body)' }}>{t('hospitalSchedule.lockHint')}</p>
                    </div>
                  </div>

                  <Btn onClick={handleSave} loading={saveMut.isPending} disabled={!hasHospitalContext || !selectedDoctorUserId || workingDays.length===0}>
💾 {t('hospitalSchedule.saveDoctorSchedule')}
                  </Btn>
                </div>

                {/* Generate Slots */}
                <div style={{ background:SRF, borderRadius: 'var(--radius-lg)', padding:24, boxShadow:"var(--shadow-md)", border:`1px solid ${BRD}` }}>
                  <h3 style={{ margin:'0 0 14px', fontSize:15, fontWeight:800, color:TXT }}>⚡ {t('hospitalSchedule.generateSlots')}</h3>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
                    {[{label:t('scheduleManager.section3.from'),val:genFrom,set:setGenFrom},{label:t('scheduleManager.section3.to'),val:genTo,set:setGenTo}].map(({label,val,set})=>(
                      <div key={label} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <label style={{ fontSize:11, fontWeight:700, color:BODY, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</label>
                        <input type="date" value={val}
                          onChange={e => set(normalizeDateValue(e.target.value))}
                          autoComplete="off"
                          min={todayStr()}
                          max={(() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().slice(0,10); })()}
                          style={{ padding:'9px 12px', borderRadius: 'var(--radius-md)', border:`1.5px solid ${BRD}`, fontSize:14, outline:'none', fontFamily:'inherit', color:TXT, background:'var(--bg-elevated)' }}
                          onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor=BRD} />
                      </div>
                    ))}
                    <Btn onClick={handleGenerate} loading={genMut.isPending} disabled={!hasHospitalContext || !selectedDoctorUserId || !genFrom||!genTo}>
                      ⚡ {t('scheduleManager.section3.generateBtn').replace('⚡ ', '')}
                    </Btn>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
