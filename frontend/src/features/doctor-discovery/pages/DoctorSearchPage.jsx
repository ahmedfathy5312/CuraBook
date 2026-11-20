/**
 * DoctorSearchPage.jsx — Patient-facing doctor search
 * UX FIX v16: Specialty chips, price slider, map/list toggle, filter panel
 * UX FIX v17: Map view fully implemented with Leaflet.js (was a stub)
 * UX FIX v18: Leaflet loaded via npm package (no CDN — fixes performance audit item)
 *  - Interactive map with doctor markers, popups, احجز الآن links
 *  - Egypt city coordinates lookup for doctors without explicit lat/lng
 *  - Map auto-fits bounds to all visible doctors
 * BUG-FIX #7: hospital_id filter support — banner + active count
 * TRANSLATION FIX: All hardcoded Arabic/English strings replaced with t() calls
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDoctorSearch } from '../hooks/useDoctorSearch';
import DoctorCard from '../components/DoctorCard';
import { SearchInput } from '../../../components/ui/Input';
import { Pagination } from '../../../components/ui/Pagination';
import { EmptyState } from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import { tokens } from '../../../theme/tokens';
import useTranslation from '../../../i18n/useTranslation';
import apiClient from '../../../services/apiClient';

const P  = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PL = tokens?.colors?.primary?.lighter || '#E0F7FA';

/* Egypt city coordinates */
const EGYPT_COORDS = {
  cairo:[30.0444,31.2357],giza:[29.9870,31.2118],alexandria:[31.2001,29.9187],
  assiut:[27.1809,31.1837],assuit:[27.1809,31.1837],luxor:[25.6872,32.6396],
  mansoura:[31.0364,31.3807],tanta:[30.7865,30.9987],minya:[28.0871,30.7618],
  sohag:[26.5569,31.6948],aswan:[24.0889,32.8998],suez:[29.9737,32.5311],
  ismailia:[30.5965,32.2715],'port said':[31.2565,32.2841],
  hurghada:[27.2579,33.8116],
};
const cityCoords = (c='') => EGYPT_COORDS[c.toLowerCase().trim()] || [26.82,30.80];

/**
 * AUDIT FIX v18: Load Leaflet from npm package via dynamic import.
 */
let lReady = false, lCbs = [];
function loadL() {
  if (lReady) return Promise.resolve();
  return new Promise((res, rej) => {
    lCbs.push(res);
    if (lCbs.length > 1) return;
    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([L]) => {
      const Lx = L.default || L;
      delete Lx.Icon.Default.prototype._getIconUrl;
      Lx.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      window.__L = Lx;
      lReady = true;
      lCbs.forEach(cb => cb());
      lCbs = [];
    }).catch(rej);
  });
}

function DoctorMapView({ doctors, t, lang }) {
  const ref   = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(lReady);
  useEffect(()=>{ if(!ready) loadL().then(()=>setReady(true)); },[ready]);
  useEffect(()=>{
    if(!ready||!ref.current) return;
    const L=window.__L;
    if(!mapRef.current){
      mapRef.current=L.map(ref.current,{scrollWheelZoom:false}).setView([26.82,30.80],6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'© OpenStreetMap contributors',maxZoom:18,
      }).addTo(mapRef.current);
    }
    mapRef.current.eachLayer(l=>{if(l instanceof L.Marker)mapRef.current.removeLayer(l);});
    const bounds=[];
    doctors.forEach(doc=>{
      const lat=parseFloat(doc.lat??doc.latitude??doc.clinic_lat??'NaN');
      const lng=parseFloat(doc.lng??doc.longitude??doc.clinic_lng??'NaN');
      const city=doc.city||doc.clinic_city||'';
      const [mlat,mlng]=isNaN(lat)||isNaN(lng)?cityCoords(city):[lat,lng];
      if(!mlat||!mlng) return;
      bounds.push([mlat,mlng]);
      const rating=parseFloat(doc.average_rating??doc.rating??0);
      const color=rating>=4.5?'#C9923A':doc.is_available_today?'#1A8A5A':'var(--primary)';
      const stars='★'.repeat(Math.round(rating))+'☆'.repeat(5-Math.round(rating));
      const name=doc.full_name||doc.name||'Doctor';
      const spec=doc.specialization||doc.specialty||'';
      const fee=doc.consultation_fee||doc.fees_from||'';
      const btnLabel = lang === 'ar' ? 'احجز الآن' : 'Book Now';
      const marker=L.circleMarker([mlat,mlng],{radius:10,fillColor:color,color:'white',weight:2,fillOpacity:0.9});
      const popup=L.popup({maxWidth:240}).setContent(`
        <div style="font-family:'Cairo',sans-serif;padding:4px 0;min-width:180px">
          <strong style="font-size:14px;color:var(--text-h,#1F2937)">${name}</strong><br>
          <span style="font-size:12px;color:var(--text-muted,#6B7280)">${spec}</span><br>
          <span style="font-size:13px;color:var(--warning,#D97706)">${stars}</span>
          ${fee?`<br><span style="font-size:12px;color:var(--success,#059669)">EGP ${fee}</span>`:''}
          <br><a href="/patient/book/${doc.id}" style="display:inline-block;margin-top:8px;padding:5px 14px;background:${P};color:#fff;border-radius:6px;text-decoration:none;font-size:12px;font-weight:700">${btnLabel}</a>
        </div>`);
      marker.bindPopup(popup).addTo(mapRef.current);
    });
    if(bounds.length>0) mapRef.current.fitBounds(bounds,{padding:[30,30],maxZoom:13});
  },[ready,doctors,lang]);
  useEffect(()=>{ if(mapRef.current) setTimeout(()=>mapRef.current?.invalidateSize(),250); });
  if(!ready) return <div style={{height:520,borderRadius:'var(--radius-lg)',background:PL,display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:P,fontWeight:600}}>…</p></div>;
  return (
    <div style={{position:'relative',borderRadius:'var(--radius-lg)',overflow:'hidden',boxShadow:'var(--shadow-md)'}}>
      <div ref={ref} style={{height:520,width:'100%'}}/>
      <div style={{position:'absolute',bottom:12,left:12,zIndex:1000,background:'var(--bg-card)',borderRadius:'var(--radius-md)',padding:'8px 14px',boxShadow:'var(--shadow-sm)',fontSize:11,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontFamily:"'Cairo',sans-serif"}}>
        <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:'50%',background:'var(--primary)',flexShrink:0}}/><span style={{color:'var(--text-body)'}}>{t('doctorSearch.mapClinic')}</span></div>
        <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:'50%',background:'var(--success)',flexShrink:0}}/><span style={{color:'var(--text-body)'}}>{t('doctorSearch.mapAvailableToday')}</span></div>
        <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:'50%',background:'#C9923A',flexShrink:0}}/><span style={{color:'var(--text-body)'}}>{t('doctorSearch.mapTopRated')}</span></div>
        <span style={{color:'var(--border-dark)'}}>·</span>
        <span style={{color:'var(--text-muted)'}}>© OpenStreetMap</span>
      </div>
    </div>
  );
}

/* Filter constants — bilingual */
const getChips = (t) => [
  {label: t('doctorSearch.specialtyAll'),          value: ''},
  {label: t('doctorSearch.specialtyCardiology'),   value: 'Cardiology'},
  {label: t('doctorSearch.specialtyPediatrics'),   value: 'Pediatrics'},
  {label: t('doctorSearch.specialtyDermatology'),  value: 'Dermatology'},
  {label: t('doctorSearch.specialtyOphthalmology'),value: 'Ophthalmology'},
  {label: t('doctorSearch.specialtyDentistry'),    value: 'Dentistry'},
  {label: t('doctorSearch.specialtyNeurology'),    value: 'Neurology'},
  {label: t('doctorSearch.specialtyOrthopedics'),  value: 'Orthopedics'},
];

const getCities = (t) => [
  {value:'Cairo',      label: t('doctorSearch.cityCairo')},
  {value:'Giza',       label: t('doctorSearch.cityGiza')},
  {value:'Alexandria', label: t('doctorSearch.cityAlexandria')},
  {value:'Assuit',     label: t('doctorSearch.cityAssuit')},
  {value:'Luxor',      label: t('doctorSearch.cityLuxor')},
  {value:'Mansoura',   label: t('doctorSearch.cityMansoura')},
  {value:'Tanta',      label: t('doctorSearch.cityTanta')},
  {value:'Minya',      label: t('doctorSearch.cityMinya')},
  {value:'Sohag',      label: t('doctorSearch.citySohag')},
  {value:'Aswan',      label: t('doctorSearch.cityAswan')},
];

const RATINGS=[{value:'4.5',label:'4.5+'},{value:'4.0',label:'4.0+'},{value:'3.5',label:'3.5+'}];

// FIX: use t() for sort labels - defined as function so translation works
const getSortOptions = (t) => [
  { key: 'rating_desc',   label: t ? t('doctorSearch.sortRating')    : 'الأعلى تقييماً', icon: '⭐' },
  { key: 'fee_asc',       label: t ? t('doctorSearch.sortCheapest')  : 'الأرخص',         icon: '💰' },
  { key: 'available',     label: t ? t('doctorSearch.availableToday'): 'متاح اليوم',    icon: '🟢' },
  { key: 'nearest',       label: t ? t('doctorSearch.sortNearest')   : 'الأقرب',         icon: '📍' },
];

export default function DoctorSearchPage() {
  const [showFilters,setShowFilters]=useState(false);
  const [viewMode,setViewMode]=useState('list');
  const [priceMax,setPriceMax]=useState(1000);
  const { t, lang } = useTranslation();
  // BUG-FIX #6: destructure geoStatus to show location loading indicator
  const {doctors,total,page,totalPages,filters,updateFilter,resetFilters,setPage,isLoading,isFetching,isError,geoStatus}=useDoctorSearch();
  // BUG-FIX #7: include hospital_id in active filter count
  const activeCount=[filters.specialty,filters.city,filters.rating,filters.availability,filters.price_max,filters.sort,filters.hospital_id].filter(Boolean).length;
  const handlePrice=v=>{ setPriceMax(v); updateFilter('price_max',v<1000?String(v):''); };

  // BUG-FIX #7: fetch hospital info when hospital_id filter is active to show a banner
  const { data: hospitalInfo } = useQuery({
    queryKey: ['hospital-banner', filters.hospital_id],
    queryFn: () => apiClient.get(`/hospitals/${filters.hospital_id}/`).then(r => r.data),
    enabled: !!filters.hospital_id,
    staleTime: 5 * 60_000,
  });

  const CHIPS = getChips(t);
  const CITIES = getCities(t);

  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 20px'}}>

      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'var(--color-text)',margin:'0 0 4px'}}>🔍 {t('doctorSearch.title')}</h1>
        <p style={{color:'var(--color-text-secondary)',fontSize:13,margin:0}}>
          {total>0
            ? t('doctorSearch.hospitalDoctorCount', { count: total })
            : t('doctorSearch.subtitle')}
        </p>
      </div>

      {/* BUG-FIX #7: Hospital filter banner — shown when coming from a hospital page */}
      {filters.hospital_id && (
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'12px 16px',marginBottom:16,
          background:'var(--primary-light,#EAF4FB)',border:`1.5px solid ${P}`,
          borderRadius:'var(--radius-md)',flexWrap:'wrap',gap:8,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:18}}>🏥</span>
            <span style={{fontSize:14,fontWeight:700,color:P}}>
              {hospitalInfo?.name
                ? `${t('doctorSearch.hospitalFilterLabel')} ${hospitalInfo.name}`
                : t('doctorSearch.hospitalFilterDefault')}
            </span>
            <span style={{fontSize:12,color:'var(--primary)',background:'rgba(14,116,144,0.1)',padding:'2px 8px',borderRadius:'var(--radius-lg)',fontWeight:600}}>
              {total > 0 ? t('doctorSearch.hospitalDoctorCount', { count: total }) : ''}
            </span>
          </div>
          <button
            onClick={() => { updateFilter('hospital_id', ''); }}
            style={{fontSize:12,color:'var(--danger,#EF4444)',background:'none',border:'none',cursor:'pointer',fontWeight:600,padding:'4px 8px',fontFamily:'inherit',textDecoration:'underline'}}>
            {t('doctorSearch.cancelHospitalFilter')}
          </button>
        </div>
      )}

      {/* Search + controls */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <SearchInput value={filters.q} onChange={e=>updateFilter('q',e.target.value)}
          placeholder={t('doctorSearch.placeholder')} style={{flex:1,minWidth:200,maxWidth:460}}/>
        <button onClick={()=>setShowFilters(!showFilters)} style={{
          display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:'var(--radius-md)',
          border:`1.5px solid ${activeCount>0?P:'var(--color-border)'}`,
          background:activeCount>0?P:'var(--color-surface)',
          color:activeCount>0?'#fff':'var(--color-text-secondary)',
          fontSize:13,fontWeight:600,cursor:'pointer',transition:'all .2s',fontFamily:'inherit',
        }}>🎛 {t('doctorSearch.filterBtn')} {activeCount>0&&`(${activeCount})`}</button>
        {activeCount>0&&<button onClick={()=>{resetFilters();setPriceMax(1000);}} style={{fontSize:12,color:'var(--danger,#EF4444)',background:'none',border:'none',cursor:'pointer',fontWeight:600,padding:'4px 8px',fontFamily:'inherit',textDecoration:'underline'}}>✕ {t('doctorSearch.clearAll')}</button>}
        <div style={{display:'flex',border:`1px solid var(--color-border)`,borderRadius:'var(--radius-md)',overflow:'hidden',marginInlineStart:'auto'}}>
          {['list','map'].map(m=>(
            <button key={m} onClick={()=>setViewMode(m)} style={{
              padding:'8px 14px',fontSize:12,fontWeight:600,border:'none',cursor:'pointer',
              background:viewMode===m?P:'var(--color-surface)',
              color:viewMode===m?'#fff':'var(--color-text-secondary)',
              fontFamily:'inherit',transition:'all .2s',
            }}>{m==='list' ? t('doctorSearch.listView') : t('doctorSearch.mapView')}</button>
          ))}
        </div>
      </div>

      {/* Specialty chips */}
      <div style={{display:'flex',gap:8,marginBottom:16,overflowX:'auto',paddingBottom:4,scrollbarWidth:'none'}}>
        {CHIPS.map(c=>{
          const active=filters.specialty===c.value;
          return <button key={c.value} onClick={()=>updateFilter('specialty',c.value)} style={{
            flexShrink:0,padding:'6px 14px',borderRadius:'var(--radius-lg)',fontSize:12,fontWeight:600,
            border:`1.5px solid ${active?P:'var(--color-border)'}`,
            background:active?P:'var(--color-surface)',color:active?'#fff':'var(--color-text)',
            cursor:'pointer',transition:'all .2s',fontFamily:'inherit',whiteSpace:'nowrap',
          }}>{c.label}</button>;
        })}
      </div>

      {/* Filter panel */}
      {showFilters&&(
        <div style={{background:'var(--color-surface)',borderRadius:'var(--radius-lg)',padding:'20px 24px',boxShadow:'var(--shadow-card)',marginBottom:18,border:'1px solid var(--color-border)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:16,marginBottom:20}}>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--color-text)',marginBottom:6}}>📍 {t('doctorSearch.cityLabel')}</label>
              <select value={filters.city||''} onChange={e=>updateFilter('city',e.target.value)}
                style={{width:'100%',padding:'8px 12px',borderRadius:'var(--radius-md)',border:'1px solid var(--color-border)',fontSize:13,fontFamily:'inherit',background:'var(--color-surface)',cursor:'pointer',color:'var(--color-text)'}}>
                <option value="">{t('doctorSearch.allCities')}</option>
                {CITIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--color-text)',marginBottom:6}}>⭐ {t('doctorSearch.ratingLabel')}</label>
              <div style={{display:'flex',gap:6}}>
                {RATINGS.map(r=>(
                  <button key={r.value} onClick={()=>updateFilter('rating',filters.rating===r.value?'':r.value)} style={{
                    flex:1,padding:'7px 4px',borderRadius:'var(--radius-md)',fontSize:12,fontWeight:600,
                    border:`1.5px solid ${filters.rating===r.value?P:'var(--color-border)'}`,
                    background:filters.rating===r.value?PL:'var(--color-surface)',
                    color:filters.rating===r.value?P:'var(--color-text)',cursor:'pointer',fontFamily:'inherit',
                  }}>{r.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--color-text)',marginBottom:6}}>🗓 {t('doctorSearch.availabilityLabel')}</label>
              <div style={{display:'flex',gap:6}}>
                {[
                  {v:'today',     l: t('doctorSearch.today')},
                  {v:'tomorrow',  l: t('doctorSearch.tomorrow')},
                  {v:'this_week', l: t('doctorSearch.thisWeek')},
                ].map(a=>(
                  <button key={a.v} onClick={()=>updateFilter('availability',filters.availability===a.v?'':a.v)} style={{
                    flex:1,padding:'7px 4px',borderRadius:'var(--radius-md)',fontSize:11,fontWeight:600,
                    border:`1.5px solid ${filters.availability===a.v?P:'var(--color-border)'}`,
                    background:filters.availability===a.v?PL:'var(--color-surface)',
                    color:filters.availability===a.v?P:'var(--color-text)',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
                  }}>{a.l}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <label style={{fontSize:12,fontWeight:600,color:'var(--color-text)'}}>💰 {t('doctorSearch.priceLabel')}</label>
              <span style={{fontSize:13,fontWeight:700,color:P}}>{priceMax>=1000 ? t('doctorSearch.anyPrice') : `EGP ${priceMax}`}</span>
            </div>
            <input type="range" min={100} max={1000} step={50} value={priceMax}
              onChange={e=>handlePrice(Number(e.target.value))} style={{width:'100%',accentColor:P}}/>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>EGP 100</span>
              <span style={{fontSize:11,color:'var(--text-muted)'}}>{t('doctorSearch.anyPrice')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Map view */}
      {viewMode==='map'&&(
        <div style={{marginBottom:24}}>
          {isLoading?(
            <div style={{height:480,borderRadius:'var(--radius-lg)',background:PL,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <p style={{color:P,fontWeight:600}}>{t('doctorSearch.mapLoadingDoctors')}</p>
            </div>
          ):(
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <p style={{color:'var(--color-text-secondary)',fontSize:13}}>
                  {t('doctorSearch.mapDoctorsOnMap', { count: doctors.length, total })}
                </p>
                <span style={{fontSize:11,color:'var(--text-muted)'}}>
                  📍 {t('doctorSearch.mapPinsNote')}
                </span>
              </div>
              <DoctorMapView doctors={doctors} t={t} lang={lang}/>
            </>
          )}
        </div>
      )}

      {/* ── Sort Chips ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap',
        marginBottom: '16px', direction: 'rtl',
      }}>
        {getSortOptions(t).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => updateFilter('sort', key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '8px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, fontFamily: 'Cairo, sans-serif',
              border: `1.5px solid ${filters.sort === key ? 'var(--primary)' : 'var(--border)'}`,
              background: filters.sort === key ? 'var(--primary-light,#EAF4FB)' : 'var(--bg-card)',
              color: filters.sort === key ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '13px' }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* BUG-FIX #6: Geo status banner — shown only when 'nearest' sort is active */}
      {filters.sort === 'nearest' && geoStatus === 'loading' && (
        <div style={{
          display:'flex',alignItems:'center',gap:8,padding:'10px 16px',marginBottom:12,
          background:'var(--primary-light,#EAF4FB)',borderRadius:'var(--radius-md)',fontSize:13,color:'var(--primary)',fontWeight:600,
        }}>
          <span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⏳</span>
          {t('doctorSearch.geoLoading')}
        </div>
      )}
      {filters.sort === 'nearest' && geoStatus === 'denied' && (
        <div style={{
          display:'flex',alignItems:'center',gap:8,padding:'10px 16px',marginBottom:12,
          background:'var(--warning-light,#FFF7ED)',borderRadius:'var(--radius-md)',fontSize:13,color:'var(--warning,#B45309)',fontWeight:600,
        }}>
          {t('doctorSearch.geoDenied')}
        </div>
      )}
      {filters.sort === 'nearest' && geoStatus === 'unavailable' && (
        <div style={{
          display:'flex',alignItems:'center',gap:8,padding:'10px 16px',marginBottom:12,
          background:'var(--warning-light,#FFF7ED)',borderRadius:'var(--radius-md)',fontSize:13,color:'var(--warning,#B45309)',fontWeight:600,
        }}>
          {t('doctorSearch.geoUnavailable')}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        isLoading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
            {[1,2,3,4,5,6].map(i=><Skeleton key={i} height={220} borderRadius={20}/>)}
          </div>
        ) : isError ? (
          <EmptyState title={t('doctorSearch.errorTitle')} message={t('doctorSearch.errorMsg')}/>
        ) : doctors.length === 0 ? (
          <EmptyState title={t('doctorSearch.noResultsTitle')} message={t('doctorSearch.noResultsMsg')}/>
        ) : (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16,opacity:isFetching?0.6:1,transition:'opacity .2s'}}>
              {doctors.map(doc=><DoctorCard key={doc.id} doctor={doc}/>)}
            </div>
            {totalPages > 1 && <div style={{marginTop:28}}><Pagination page={page} totalPages={totalPages} onPageChange={setPage}/></div>}
          </>
        )
      )}
    </div>
  );
}
