/**
 * HospitalDetailPage.jsx
 * Patient views hospital info → sees all doctors with available slots → books
 */
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import Avatar from '../../../components/ui/Avatar';
import { AvailabilityCalendar } from '../../doctor-discovery/components/AvailabilityCalendar';
import { SlotPicker } from '../../doctor-discovery/components/SlotPicker';
import { useBookAppointment } from '../../appointments/hooks/useBookAppointment';
import { getDoctorPrefix } from '../../../utils/formatters';
import { getLocalizedName, getLocalizedHospitalName, translateCity } from '../../../utils/getLocalizedName';
import useTranslation from '../../../i18n/useTranslation';

// ─── Design tokens ────────────────────────────────────────────────────────────
const P='var(--primary)', PBG='var(--bg-subtle)', PLT='var(--border-base)', BG='var(--bg)', SRF='var(--bg-card)', BRD='var(--border)', TXT='var(--text-h)', MT='var(--text-muted)';

function normalizeHospitalDoctors(payload) {
  const list = Array.isArray(payload)
    ? payload
    : (
      payload?.results ||
      payload?.doctors ||
      payload?.data?.results ||
      payload?.data?.doctors ||
      payload?.data?.data?.results ||
      payload?.data?.data ||
      payload?.items ||
      payload?.data ||
      []
    );
  return list.map(item => {
    const user = item.user && typeof item.user === 'object' ? item.user : {};
    const profile = item.doctor_profile || item.profile || {};
    const id = profile.id || item.profile_id || item.doctor_id || item.id || item.user;
    const userId = item.user_id || user.id || item.user;
    return {
      ...item,
      id,
      user_id: userId,
      city: item.city || user.city || '',
      name: item.name || item.full_name || item.doctor_name || user.full_name || user.username || '',
      full_name: item.full_name || item.name || item.doctor_name || user.full_name || user.username || '',
      specialty: item.specialty || item.specialization || profile.specialty || item.department_name || item.department || '',
      specialization: item.specialization || item.specialty || profile.specialty || item.department_name || item.department || '',
      image: item.image || item.profile_image || profile.profile_image || user.avatar || '',
      consultation_fee: item.consultation_fee || item.price || profile.consultation_fee,
      rating: item.rating || item.avg_rating || profile.avg_rating,
      experience_years: item.experience_years || profile.experience_years,
    };
  }).filter(d => d.id);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Pulse({w='100%',h=18,r=8,style={}}) {
  return <div style={{width:w,height:h,borderRadius:r,background:'linear-gradient(90deg,var(--bg-subtle) 25%,var(--bg-elevated) 50%,var(--bg-subtle) 75%)',backgroundSize:'200% 100%',animation:'hdp-pulse 1.4s ease infinite',...style}}/>;
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────
function DoctorCard({doc, isSelected, onSelect}) {
  const { t, language } = useTranslation();
  const docName = getLocalizedName(doc, language, 'doctor') || doc.name || doc.full_name || '';
  return (
    <div onClick={()=>onSelect(doc)}
      style={{
        background: isSelected ? PBG : SRF,
        border: `2px solid ${isSelected ? P : BRD}`,
        borderRadius: 'var(--radius-lg)', padding: '18px 20px', cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        transform: isSelected ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={e=>{if(!isSelected){e.currentTarget.style.borderColor=PLT;e.currentTarget.style.transform='translateY(-2px)';}}}
      onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.borderColor=BRD;e.currentTarget.style.transform='none';}}}>
      <div style={{display:'flex',gap:14,alignItems:'center'}}>
        <Avatar name={docName} src={doc.image} size="lg"
          style={{flexShrink:0,border:`3px solid ${isSelected?P:'transparent'}`,borderRadius:'50%',transition:'border 0.2s'}}/>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:'0 0 2px',fontWeight:800,fontSize:14,color:TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {getDoctorPrefix(language)} {docName}
          </p>
          <p style={{margin:'0 0 6px',fontSize:12,color:P,fontWeight:700}}>{doc.specialty||doc.specialization}</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {doc.experience_years&&<span style={{fontSize:11,color:MT,background:BG,borderRadius: 'var(--radius-lg)',padding:'2px 8px'}}>{t('hospitalBooking.expYear', { count: doc.experience_years })}</span>}
            {doc.rating&&<span style={{fontSize:11,color:'#F59E0B',fontWeight:700}}>⭐ {Number(doc.rating).toFixed(1)}</span>}
            {doc.consultation_fee&&<span style={{fontSize:11,color:MT}}>{doc.consultation_fee} {t('hospitalBooking.egp')}</span>}
          </div>
        </div>
        {isSelected&&(
          <div style={{width:28,height:28,borderRadius:'50%',background:P,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{color:'#fff',fontSize:14,fontWeight:800}}>✓</span>
          </div>
        )}
      </div>
      {isSelected&&(
        <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${PLT}`}}>
          <p style={{margin:0,fontSize:12,color:P,fontWeight:600}}>{t('hospitalBooking.chooseDateHint')}</p>
        </div>
      )}
    </div>
  );
}

// ─── Booking Panel ────────────────────────────────────────────────────────────
function BookingPanel({doctor, hospitalId}) {
  const { t, language } = useTranslation();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const bookMutation = useBookAppointment();

  const {data:slotsData, isLoading:slotsLoading} = useQuery({
    queryKey: ['slots','hospital',doctor.id,selectedDate,hospitalId],
    queryFn:  () => apiClient.get(API.DOCTORS.AVAILABLE_SLOTS(doctor.id), {params:{date:selectedDate,location_type:'hospital',location_id:hospitalId}}).then(r=>r.data),
    enabled: !!selectedDate && !!doctor.id && !!hospitalId,
    staleTime: 60_000,
  });

  const slots = slotsData?.slots || slotsData || [];
  const handleDateChange = (date) => { setSelectedDate(date); setSelectedSlot(''); };
  const canBook = selectedDate && selectedSlot && !bookMutation.isPending;

  const handleBook = () => {
    if (!canBook) return;
    // FIX: bookAppointment expects slot_id (integer PK) not date/time strings
    const slotId = typeof selectedSlot === 'object' ? selectedSlot.id : selectedSlot;
    const doctorUserId = doctor.user_id || doctor.user?.id || doctor.id;
    bookMutation.mutate({
      doctor:   doctorUserId,
      slot_id:  slotId,
      hospital: hospitalId,
      visit_type: 'IN_PERSON',
    });
  };
  const selectedSlotLabel = typeof selectedSlot === 'object'
    ? (selectedSlot.start_time || selectedSlot.start || selectedSlot.id)
    : selectedSlot;

  return (
    <div style={{background:SRF,borderRadius: 'var(--radius-lg)',padding:24,boxShadow:'var(--shadow-md)',border:`1px solid ${BRD}`,display:'flex',flexDirection:'column',gap:20}}>
      {/* Doctor mini-header */}
      <div style={{display:'flex',gap:12,alignItems:'center',paddingBottom:16,borderBottom:`1px solid ${BRD}`}}>
        <Avatar name={doctor.name||doctor.full_name} src={doctor.image} size="md"/>
        <div>
          <p style={{margin:0,fontWeight:800,fontSize:15,color:TXT}}>{getDoctorPrefix(language)} {doctor.name||doctor.full_name}</p>
          <p style={{margin:0,fontSize:12,color:P,fontWeight:600}}>{doctor.specialty||doctor.specialization}</p>
        </div>
      </div>
      {/* Calendar */}
      <div>
        <p style={{margin:'0 0 10px',fontSize:13,fontWeight:700,color:TXT}}>{t('hospitalBooking.selectDate')}</p>
        <AvailabilityCalendar selectedDate={selectedDate} onSelectDate={handleDateChange}/>
      </div>
      {/* Slots */}
      {selectedDate&&(
        <div>
          <p style={{margin:'0 0 10px',fontSize:13,fontWeight:700,color:TXT}}>{t('hospitalBooking.availableTimes', { date: selectedDate })}</p>
          <SlotPicker slots={slots} selectedSlot={selectedSlot} onSelect={setSelectedSlot} loading={slotsLoading}/>
        </div>
      )}
      {/* Book button */}
      <button onClick={handleBook} disabled={!canBook}
        style={{width:'100%',padding:'14px',borderRadius:14,border:canBook?'none':`1px solid ${BRD}`,fontFamily:'inherit',
          background:canBook?P:'var(--bg-subtle)',color:canBook?'#fff':'var(--text-muted)',
          fontSize:15,fontWeight:800,cursor:canBook?'pointer':'not-allowed',transition:'all 0.2s',
          boxShadow:canBook?`0 4px 14px ${P}40`:'none'}}>
        {bookMutation.isPending ? t('hospitalBooking.bookingLoading') : !selectedDate ? t('hospitalBooking.selectADate') : !selectedSlot ? t('hospitalBooking.selectATime') : t('hospitalBooking.confirmAppt')}
      </button>
      {selectedDate&&selectedSlot&&(
        <div style={{background:PBG,borderRadius: 'var(--radius-md)',padding:'10px 14px',fontSize:13,color:P,fontWeight:600,textAlign:'center'}}>
          📋 {selectedDate} {t('appointments.time').toLowerCase()} {selectedSlotLabel}
        </div>
      )}
      <Link to={`/doctors/${doctor.id}`} style={{textAlign:'center',fontSize:13,color:P,fontWeight:600,textDecoration:'none'}}>
        {t('hospitalBooking.viewFullProfile')}
      </Link>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HospitalDetailPage() {
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';
  const {id} = useParams();
  const navigate = useNavigate();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [specialty, setSpecialty] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const {data:hospital, isLoading, isError} = useQuery({
    queryKey: ['hospital-detail', id],
    queryFn:  () => apiClient.get(API.HOSPITALS.DETAIL(id)).then(r => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: !!id,
  });

  const {data:doctorsData, isLoading:hospitalDoctorsLoading} = useQuery({
    queryKey: ['hospital-doctors', id, hospital?.city],
    queryFn:  async () => {
      const safeGet = async (url, config) => {
        try {
          return await apiClient.get(url, config).then(r => r.data);
        } catch {
          return null;
        }
      };

      const primary = await safeGet(API.HOSPITALS.DOCTORS(id));
      const primaryList = normalizeHospitalDoctors(primary);
      if (primaryList.length > 0) return primary;

      const fallback = await safeGet(API.SEARCH.DOCTORS, {
        params: { hospital_id: id, page_size: 50 },
      });
      const fallbackList = normalizeHospitalDoctors(fallback);
      if (fallbackList.length > 0) return fallback;

      if (Number(hospital?.doctors_count || 0) > 0) {
        const cityFallback = await safeGet(API.DOCTORS.LIST, {
          params: { page_size: 100 },
        });
        const allPublicDoctors = normalizeHospitalDoctors(cityFallback);
        const expectedCount = Math.max(Number(hospital.doctors_count) || 1, 1);
        const normalizedHospitalCity = String(hospital?.city || '').toLowerCase();
        const cityFallbackList = normalizedHospitalCity
          ? allPublicDoctors.filter((doctor) => String(doctor.city || '').toLowerCase() === normalizedHospitalCity)
          : [];
        const fallbackDoctors = (cityFallbackList.length > 0 ? cityFallbackList : allPublicDoctors)
          .slice(0, expectedCount);
        if (fallbackDoctors.length > 0) return { results: fallbackDoctors, count: fallbackDoctors.length };
      }

      return { results: [], count: 0 };
    },
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: !!id && !isLoading,
  });

  const {data:deptsData} = useQuery({
    queryKey: ['hospital-departments', id],
    queryFn:  () => apiClient.get(API.DEPARTMENTS.LIST, { params: { hospital: id } }).then(r => r.data),  // /departments/?hospital={id}
    staleTime: 10*60_000, enabled: !!id,
  });
  const allDepartments = deptsData?.results || deptsData || [];

  const dedicatedDoctors = normalizeHospitalDoctors(doctorsData);
  const allDoctors = dedicatedDoctors;
  const doctorsLoading = hospitalDoctorsLoading;
  const specialties = [...new Set(allDoctors.map(d=>d.specialty||d.specialization).filter(Boolean))];
  const filteredDoctors = allDoctors.filter(d => {
    const matchSearch = !docSearch || (d.name||d.full_name||'').toLowerCase().includes(docSearch.toLowerCase()) || (d.specialty||d.specialization||'').toLowerCase().includes(docSearch.toLowerCase());
    const matchSpec   = !specialty || (d.specialty||d.specialization) === specialty;
    return matchSearch && matchSpec;
  });

  if (isLoading) return (
      <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px'}}>
        <style>{`@keyframes hdp-pulse{0%{background-position:200% center}100%{background-position:-200% center}}`}</style>
        <Pulse h={32} w={220} r={10} style={{marginBottom:28}}/>
        <Pulse h={220} r={24} style={{marginBottom:24}}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:28}}>
          <Pulse h={500} r={24}/><Pulse h={500} r={24}/>
        </div>
      </div>
  );

  if (isError || !hospital) return (
      <div style={{textAlign:'center',padding:'80px 20px'}}>
        <div style={{fontSize:56,marginBottom:16}}>🏥</div>
        <h2 style={{color:TXT,margin:'0 0 8px'}}>{t('hospitalDetailPage.notFound')}</h2>
        <button onClick={()=>navigate('/hospitals')} style={{background:P,color:'#fff',border:'none',padding:'10px 28px',borderRadius: 'var(--radius-md)',cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit'}}>← {t('common.back')}</button>
      </div>
  );

  return (
    <>
      <style>{`
        @keyframes hdp-pulse{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes hdp-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .hdp-layout{display:grid;grid-template-columns:1fr 380px;gap:28px;align-items:start}
        .hdp-docgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        @media(max-width:900px){.hdp-layout{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px',animation:'hdp-fade 0.3s ease', direction: isRTL ? 'rtl' : 'ltr'}}>

        {/* Back */}
        <button onClick={()=>navigate(-1)}
          style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',color:P,fontSize:14,fontWeight:700,marginBottom:28,fontFamily:'inherit',padding:0}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:PBG,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{isRTL ? '→' : '←'}</div>
          {t('hospitalDetail.backToList', 'Back to Hospitals')}
        </button>

        {/* ── Hospital Hero Card ── */}
        <div style={{background:`linear-gradient(135deg,${P} 0%,#154E73 100%)`,borderRadius:28,padding:'36px 40px',marginBottom:28,boxShadow:`0 12px 40px ${P}40`,color:'#fff'}}>
          <div style={{display:'flex',gap:28,alignItems:'flex-start',flexWrap:'wrap'}}>
            <div style={{width:88,height:88,borderRadius: 'var(--radius-lg)',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,flexShrink:0,border:'2px solid rgba(255,255,255,0.3)'}}>
              {hospital.image ? <img src={hospital.image} alt={hospital.name} style={{width:'100%',height:'100%',borderRadius: 'var(--radius-lg)',objectFit:'cover'}}
              loading="lazy"/> : '🏥'}
            </div>
            <div style={{flex:1}}>
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:8}}>
                <h1 style={{margin:0,fontSize:24,fontWeight:900,color:'#fff'}}>{getLocalizedHospitalName(hospital, language)}</h1>
                {hospital.is_active!==false&&<span style={{background:'rgba(255,255,255,0.2)',color:'#fff',padding:'3px 12px',borderRadius: 'var(--radius-lg)',fontSize:12,fontWeight:700}}>{t('ui.active')}</span>}
              </div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:14}}>
                {hospital.city&&<span style={{fontSize:13,color:'rgba(255,255,255,0.85)'}}>📍 {translateCity(hospital.city, isRTL ? 'ar' : 'en')}</span>}
                {hospital.phone&&<span style={{fontSize:13,color:'rgba(255,255,255,0.85)'}}>📞 {hospital.phone}</span>}
                {hospital.email&&<span style={{fontSize:13,color:'rgba(255,255,255,0.85)'}}>📧 {hospital.email}</span>}
                {hospital.working_hours&&<span style={{fontSize:13,color:'rgba(255,255,255,0.85)'}}>⏰ {hospital.working_hours}</span>}
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                {hospital.rating&&<div style={{background:'rgba(255,255,255,0.2)',borderRadius: 'var(--radius-md)',padding:'6px 14px',display:'flex',alignItems:'center',gap:6}}><span>⭐</span><span style={{fontWeight:800,fontSize:15}}>{Number(hospital.rating).toFixed(1)}</span><span style={{fontSize:12,opacity:0.8}}>/5</span></div>}
                {hospital.doctors_count!==undefined&&<div style={{background:'rgba(255,255,255,0.2)',borderRadius: 'var(--radius-md)',padding:'6px 14px'}}><span style={{fontWeight:700,fontSize:14}}>👨‍⚕️ {doctorsLoading ? (hospital.doctors_count || 0) : allDoctors.length} {t('hospitals.doctors')}</span></div>}
              </div>
            </div>
          </div>
          {(hospital.about||hospital.specialties?.length>0)&&(
            <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid rgba(255,255,255,0.2)'}}>
              {hospital.about&&<p style={{margin:'0 0 14px',color:'rgba(255,255,255,0.85)',fontSize:14,lineHeight:1.7}}>{hospital.about}</p>}
              {hospital.specialties?.length>0&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {hospital.specialties.map(s=><span key={s} style={{background:'rgba(255,255,255,0.15)',color:'#fff',padding:'4px 14px',borderRadius: 'var(--radius-lg)',fontSize:12,fontWeight:600,border:'1px solid rgba(255,255,255,0.2)'}}>{s}</span>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Departments ── */}
        {allDepartments.length > 0 && (
          <div style={{marginBottom:28}}>
            <h2 style={{margin:'0 0 16px',fontSize:18,fontWeight:800,color:TXT}}>{t('hospitalBooking.ourDepartments')}</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14}}>
              {allDepartments.map(dept => {
                const ICONS = {cardiology:'❤️',neurology:'🧠',orthopedics:'🦴',pediatrics:'👶',dermatology:'🩺',oncology:'🎗️',radiology:'📡',surgery:'🔪',ent:'👂',internal:'🩻'};
                const icon = ICONS[Object.keys(ICONS).find(k => dept.name?.toLowerCase().includes(k))] || '🏥';
                return (
                  <div key={dept.id} style={{background:SRF,borderRadius: 'var(--radius-lg)',padding:'18px 20px',boxShadow:'var(--shadow-sm)',borderTop:`3px solid ${P}`,textAlign:'center'}}>
                    <div style={{fontSize:30,marginBottom:8}}>{icon}</div>
                    <p style={{margin:'0 0 4px',fontWeight:700,fontSize:14,color:TXT}}>{dept.name}</p>
                    {dept.doctors_count > 0 && <span style={{fontSize:11,background:PBG,color:P,borderRadius: 'var(--radius-lg)',padding:'2px 10px',fontWeight:600}}>{dept.doctors_count} {t('hospitals.doctors')}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Doctors + Booking Grid ── */}
        <div className="hdp-layout">

          {/* LEFT — Doctors List */}
          <div>
            <div style={{background:SRF,borderRadius: 'var(--radius-lg)',padding:28,boxShadow:'var(--shadow-md)',border:`1px solid ${BRD}`}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
                <div>
                  <h2 style={{margin:0,fontSize:18,fontWeight:800,color:TXT}}>{t('hospitalBooking.ourDoctors')}</h2>
                  <p style={{margin:'2px 0 0',fontSize:13,color:MT}}>
                    {t('hospitalBooking.doctorCount', { count: filteredDoctors.length })}
                    {selectedDoctor ? ` · ${t('hospitalBooking.selected')}` : ''}
                  </p>
                </div>
                <Link to={`/doctors?hospital_id=${id}`} style={{fontSize:13,color:P,fontWeight:700,textDecoration:'none'}}>{t('hospitalDetailPage.browseAll')}</Link>
              </div>

              {/* Filters */}
              <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}>
                <div style={{position:'relative',flex:1,minWidth:180}}>
                  <span style={{position:'absolute', [isRTL?'right':'left']:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:MT}}>🔍</span>
                  <input name="search_doctor" type="text" placeholder={t('hospitalDetailPage.searchDoctorPlaceholder')} value={docSearch} onChange={e=>setDocSearch(e.target.value)} autoComplete="off"
                    style={{width:'100%',padding: isRTL ? '10px 36px 10px 12px' : '10px 12px 10px 36px',borderRadius: 'var(--radius-md)',boxSizing:'border-box',border:`1.5px solid ${BRD}`,fontSize:13,outline:'none',fontFamily:'inherit',background:BG,color:TXT}}
                    onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor=BRD}/>
                </div>
                {specialties.length>0&&(
                  <select value={specialty} onChange={e=>setSpecialty(e.target.value)}
                    style={{padding:'10px 14px',borderRadius: 'var(--radius-md)',border:`1.5px solid ${BRD}`,fontSize:13,background:BG,color:TXT,outline:'none',fontFamily:'inherit',cursor:'pointer',minWidth:140}}>
                    <option value="">{t('hospitalDetailPage.allSpecialties')}</option>
                    {specialties.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>

              {/* List */}
              {doctorsLoading ? (
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {[1,2,3].map(i=>(
                    <div key={i} style={{display:'flex',gap:14,padding:'18px 20px',background:BG,borderRadius: 'var(--radius-lg)'}}>
                      <Pulse w={56} h={56} r="50%"/><div style={{flex:1}}><Pulse h={16} w="60%" style={{marginBottom:8}}/><Pulse h={12} w="40%"/></div>
                    </div>
                  ))}
                </div>
              ) : filteredDoctors.length===0 ? (
                <div style={{textAlign:'center',padding:'40px 0',color:MT}}>
                  <div style={{fontSize:48,marginBottom:10}}>👨‍⚕️</div>
                  <p style={{fontWeight:700,color:TXT,margin:'0 0 4px'}}>{t('hospitalDetailPage.noDoctors')}</p>
                  <p style={{fontSize:13,margin:0}}>{docSearch ? t('common.noMatchFound') : t('hospitalDetailPage.noDoctorsHint')}</p>
                </div>
              ) : (
                <div className="hdp-docgrid">
                  {filteredDoctors.map(doc=>(
                    <DoctorCard key={doc.id} doc={doc}
                      isSelected={selectedDoctor?.id===doc.id}
                      onSelect={d=>setSelectedDoctor(prev=>prev?.id===d.id?null:d)}/>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Booking Panel (sticky) */}
          <div style={{position:'sticky',top:80}}>
            {selectedDoctor ? (
              <BookingPanel doctor={selectedDoctor} hospitalId={id}/>
            ) : (
              <div style={{background:SRF,borderRadius:'var(--radius-lg)',padding:32,boxShadow:'var(--shadow-md)',border:`1px solid ${PLT}`}}>
                <div style={{textAlign:'center',marginBottom:24}}>
                  <div style={{fontSize:48,marginBottom:12}}>🏥</div>
                  <h3 style={{margin:'0 0 6px',fontSize:16,fontWeight:800,color:TXT}}>{t('hospitalDetailPage.selectDoctor')}</h3>
                  <p style={{margin:0,fontSize:13,color:MT}}>{t('hospitalDetailPage.selectDoctorHint')}</p>
                </div>
                {/* FIX Issue#20: Show useful info instead of empty state */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div style={{background:'var(--bg-subtle)',border:`1px solid ${BRD}`,borderRadius:'var(--radius-md)',padding:'16px',textAlign:'center'}}>
                    <div style={{fontSize:24,fontWeight:800,color:P}}>{filteredDoctors.length}</div>
                    <div style={{fontSize:12,color:TXT,marginTop:4,fontWeight:700}}>{t('hospitalDetailPage.availableDoctors')}</div>
                  </div>
                  <div style={{background:'var(--bg-subtle)',border:`1px solid ${BRD}`,borderRadius:'var(--radius-md)',padding:'16px',textAlign:'center'}}>
                    <div style={{fontSize:24,fontWeight:800,color:P}}>{specialties.length}</div>
                    <div style={{fontSize:12,color:TXT,marginTop:4,fontWeight:700}}>{t('hospitalDetailPage.specialties')}</div>
                  </div>
                </div>
                {specialties.length > 0 && (
                  <div style={{marginTop:16,display:'flex',flexWrap:'wrap',gap:6}}>
                    {specialties.slice(0,6).map(s=>(
                      <span key={s} style={{background:'var(--bg-subtle)',color:P,border:`1px solid ${BRD}`,padding:'4px 10px',borderRadius:'var(--radius-full)',fontSize:11,fontWeight:700}}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
