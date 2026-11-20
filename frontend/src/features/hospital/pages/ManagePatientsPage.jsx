/**
 * ManagePatientsPage.jsx — i18n fix (Sprint 3)
 * كل النصوص عبر useTranslation
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Search, X, Mail, Phone, MapPin, Calendar, ChevronRight } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import Avatar from '../../../components/ui/Avatar';
import { formatDate } from '../../../utils/formatters';
import { tokens } from '../../../theme/tokens';
import PatientDetailModal from '../components/PatientDetailModal';
import { useTranslation } from '../../../i18n/useTranslation';

const getName = (p) => p?.full_name || p?.name || p?.patient_name || 'Unknown';
const GENDER_COLORS = { male: '#3B82F6', female: '#E97D61', other: 'var(--text-muted)' };
const P = tokens?.colors?.primary?.DEFAULT || '#0E7490';

function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5,6].map(i => (
        <td key={i} style={{ padding:'14px 18px' }}>
          <div style={{ height: i===1?36:14, borderRadius: 'var(--radius-md)', background:'var(--border-base)' }} />
        </td>
      ))}
    </tr>
  );
}

function MiniStat({ icon, label, value, color = P }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding:'18px 20px', boxShadow:'var(--shadow-sm)', borderLeft:`4px solid ${color}`, display:'flex', alignItems:'center', gap:'14px' }}>
      <span style={{ fontSize:'22px' }} aria-hidden="true">{icon}</span>
      <div>
        <p style={{ margin:0, fontSize:'22px', fontWeight:800, color, lineHeight:1 }}>{value}</p>
        <p style={{ margin:'4px 0 0', fontSize:'12px', color:'var(--text-muted)', fontWeight:500 }}>{label}</p>
      </div>
    </div>
  );
}

export default function ManagePatients() {
  const { t, isRTL } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [patients,   setPatients]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [isError,    setIsError]    = useState(false);
  const [selected,   setSelected]   = useState(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true); setIsError(false);
    try {
      const { data } = await apiClient.get(API.HOSPITAL.PATIENTS, { params: { page_size: 100 } });
      const raw = data?.results || data || [];
      setPatients(raw.map(p => ({
        ...p,
        full_name: p.full_name || p.user?.full_name || p.user?.username || 'Unknown',
        email:     p.email     || p.user?.email,
        phone:     p.phone     || p.user?.phone,
        city:      p.city      || p.user?.city,
      })));
    } catch { setPatients([]); setIsError(true); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const cities   = [...new Set(patients.map(p => p.city).filter(Boolean))].sort();
  const filtered = patients.filter(p => {
    const name = getName(p).toLowerCase();
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) ||
      (p.email||'').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone||'').includes(searchTerm);
    const matchCity = !cityFilter || p.city === cityFilter;
    return matchSearch && matchCity;
  });

  const totalMale   = patients.filter(p => p.gender?.toLowerCase() === 'male').length;
  const totalFemale = patients.filter(p => p.gender?.toLowerCase() === 'female').length;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ padding:'28px 24px', fontFamily:"'Cairo', sans-serif", maxWidth:'1200px', margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ margin:'0 0 4px', fontSize:'24px', fontWeight:800, color:'var(--text-h)' }}>{t('managePatients.title')}</h1>
        <p style={{ margin:0, fontSize:'13px', color:'var(--text-muted)' }}>{t('managePatients.subtitle')}</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'14px', marginBottom:'24px' }}>
        <MiniStat icon="👥" label={t('managePatients.stats.total')}  value={loading?'—':patients.length} color={P} />
        <MiniStat icon="👨" label={t('managePatients.stats.male')}   value={loading?'—':totalMale}        color="#3B82F6" />
        <MiniStat icon="👩" label={t('managePatients.stats.female')} value={loading?'—':totalFemale}      color="#E97D61" />
        <MiniStat icon="🏙️" label={t('managePatients.stats.cities')} value={loading?'—':cities.length}    color="#F59E0B" />
      </div>

      {/* Search & Filter */}
      <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'20px', alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1', minWidth:'220px', maxWidth:'400px' }}>
          <Search size={15} aria-hidden="true" style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
          <input
            type="text"
            placeholder={t('managePatients.searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label={t('managePatients.searchPlaceholder')}
            style={{ width:'100%', paddingInlineStart:'38px', paddingInlineEnd:'14px', paddingTop:'10px', paddingBottom:'10px', border:'1.5px solid var(--border-base)', borderRadius: 'var(--radius-md)', fontSize:'13px', outline:'none', fontFamily:'inherit', background:'var(--bg-card)', boxSizing:'border-box', transition:'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = P}
            onBlur={e  => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} aria-label={t('managePatients.allCities')}
          style={{ padding:'10px 14px', border:'1.5px solid var(--border-base)', borderRadius: 'var(--radius-md)', fontSize:'13px', outline:'none', fontFamily:'inherit', background:'var(--bg-card)', cursor:'pointer', color:cityFilter?'var(--text-h)':'var(--text-muted)', transition:'border-color 0.2s', minWidth:'140px' }}
          onFocus={e => e.target.style.borderColor = P}
          onBlur={e  => e.target.style.borderColor = 'var(--border)'}>
          <option value="">{t('managePatients.allCities')}</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {(searchTerm || cityFilter) && (
          <button onClick={() => { setSearchTerm(''); setCityFilter(''); }} aria-label={t('managePatients.clearFilters')}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 14px', border:'1.5px solid var(--danger)', borderRadius: 'var(--radius-md)', background:'var(--danger-light)', color:'var(--danger)', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
            <X size={13} aria-hidden="true" /> {t('managePatients.clearFilters')}
          </button>
        )}

        {!loading && (
          <span style={{ fontSize:'13px', color:'var(--text-muted)', marginInlineStart:'auto', fontWeight:500 }}>
            {t('managePatients.countLabel', { filtered: filtered.length, total: patients.length })}
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow:'var(--shadow-md)', overflow:'hidden' }}>
        {isError ? (
          <div style={{ textAlign:'center', padding:'64px 24px', color:'var(--text-muted)' }}>
            <p style={{ fontSize:'40px', margin:'0 0 12px' }}>⚠️</p>
            <p style={{ fontSize:'15px', fontWeight:600, color:'var(--text-h)', margin:'0 0 6px' }}>{t('managePatients.error')}</p>
            <p style={{ fontSize:'13px', margin:'0 0 20px' }}>{t('managePatients.errorHint')}</p>
            <button onClick={fetchPatients} style={{ padding:'10px 28px', background:P, color:'#fff', border:'none', borderRadius: 'var(--radius-md)', fontWeight:600, fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
              {t('managePatients.retry')}
            </button>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'640px' }} role="grid" aria-label={t('managePatients.title')}>
              <thead>
                <tr style={{ background:'var(--bg-page)', borderBottom:'2px solid var(--border-base)' }}>
                  {[
                    t('managePatients.tableHeaders.patient'),
                    t('managePatients.tableHeaders.contact'),
                    t('managePatients.tableHeaders.age'),
                    t('managePatients.tableHeaders.city'),
                    t('managePatients.tableHeaders.lastVisit'),
                    '',
                  ].map((h, i) => (
                    <th key={i} scope="col" style={{ padding:'13px 18px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1,2,3,4,5].map(i => <SkeletonRow key={i} />)
                  : filtered.length === 0
                  ? (
                    <tr><td colSpan={6} style={{ textAlign:'center', padding:'64px 24px' }}>
                      <p style={{ fontSize:'36px', margin:'0 0 10px' }}>🔍</p>
                      <p style={{ fontSize:'14px', fontWeight:600, color:'var(--text-h)', margin:'0 0 4px' }}>{t('managePatients.noPatients')}</p>
                      <p style={{ fontSize:'13px', color:'var(--text-muted)', margin:0 }}>
                        {searchTerm||cityFilter ? t('managePatients.noResults') : t('managePatients.noRegistered')}
                      </p>
                    </td></tr>
                  )
                  : filtered.map((patient, idx) => {
                    const name   = getName(patient);
                    const gColor = GENDER_COLORS[patient.gender?.toLowerCase()] || 'var(--text-muted)';
                    return (
                      <tr key={patient.id||idx}
                        style={{ borderBottom: idx < filtered.length-1 ? '1px solid var(--bg-page)' : 'none', transition:'background 0.15s', cursor:'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                        onClick={() => setSelected(patient)}
                        tabIndex={0}
                        aria-label={`View details for ${name}`}
                        onKeyDown={e => { if (e.key==='Enter'||e.key===' ') setSelected(patient); }}
                      >
                        <td style={{ padding:'14px 18px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                            <Avatar name={name} size="sm" src={patient.profile_image} />
                            <div>
                              <p style={{ margin:'0 0 2px', fontWeight:700, fontSize:'13px', color:'var(--text-h)' }}>{name}</p>
                              {patient.gender && (
                                <span style={{ background:gColor+'18', color:gColor, borderRadius: 'var(--radius-full)', padding:'1px 8px', fontSize:'10px', fontWeight:600 }}>
                                  {patient.gender}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'14px 18px' }}>
                          {patient.email && <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'var(--text-muted)', marginBottom:'3px' }}><Mail size={11} aria-hidden="true" color="var(--text-muted)" /> {patient.email}</div>}
                          {patient.phone && <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'var(--text-muted)' }}><Phone size={11} aria-hidden="true" color="var(--text-muted)" /> {patient.phone}</div>}
                          {!patient.email && !patient.phone && <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding:'14px 18px', fontSize:'13px', color:'var(--text-muted)', fontWeight:500 }}>
                          {patient.age ? t('managePatients.ageUnit', { age: patient.age }) : '—'}
                        </td>
                        <td style={{ padding:'14px 18px' }}>
                          {patient.city
                            ? <span style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'12px', color:'var(--text-muted)' }}><MapPin size={11} aria-hidden="true" color="var(--text-muted)" /> {patient.city}</span>
                            : <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding:'14px 18px', fontSize:'13px', color:'var(--text-muted)' }}>
                          {patient.last_appointment
                            ? <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><Calendar size={11} aria-hidden="true" color="var(--text-muted)" /> {formatDate(patient.last_appointment)}</span>
                            : '—'}
                        </td>
                        <td style={{ padding:'14px 18px' }}>
                          <span style={{ display:'flex', justifyContent:'flex-end' }}>
                            <ChevronRight size={18} aria-hidden="true" color={P} />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      <PatientDetailModal patient={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
