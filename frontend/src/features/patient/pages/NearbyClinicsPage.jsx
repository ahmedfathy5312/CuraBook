/**
 * NearbyClinicsPage.jsx — i18n FIXED (Sprint 3)
 * All strings via useTranslation — bilingual AR/EN
 * Route: /nearby
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { tokens } from '../../../theme/tokens';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';
import { useTranslation } from '../../../i18n/useTranslation';

const P  = tokens?.colors?.primary?.DEFAULT  || '#0E7490';
const PL = tokens?.colors?.primary?.lighter  || '#E0F7FA';
const PD = tokens?.colors?.primary?.dark     || '#0C6478';

let leafletReady = false, leafletCbs = [];
function loadLeaflet() {
  if (leafletReady) return Promise.resolve();
  return new Promise((res, rej) => {
    leafletCbs.push(res);
    if (leafletCbs.length > 1) return;
    if (!document.querySelector('link[href*="leaflet"]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => { leafletReady = true; leafletCbs.forEach(f => f()); leafletCbs = []; };
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

function DoctorNearbyCard({ doctor, distance, t }) {
  const navigate = useNavigate();
  const name = doctor.full_name || doctor.name || t('nearbyClinics.defaultDoctor');
  const prefix = t('common.doctorPrefix');

  let distLabel = '';
  if (distance !== null && distance !== undefined) {
    distLabel = distance < 1
      ? t('nearbyClinics.distanceM', { dist: Math.round(distance * 1000) })
      : t('nearbyClinics.distanceKm', { dist: distance.toFixed(1) });
  }

  return (
    <div
      style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: tokens.shadows.sm, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', transition: 'box-shadow .15s', marginBottom: 10 }}
      onClick={() => navigate(`/doctors/${doctor.id}`)}
      onMouseOver={e => e.currentTarget.style.boxShadow = tokens.shadows.hover}
      onMouseOut={e => e.currentTarget.style.boxShadow = tokens.shadows.sm}
    >
      <Avatar name={name} src={doctor.avatar} size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: tokens.colors.gray[800], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {prefix} {name}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: P, fontWeight: 600 }}>
          {doctor.specialty || doctor.specialization || ''}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {doctor.consultation_fee && (
            <span style={{ fontSize: 11, color: tokens?.colors?.warning?.DEFAULT || '#F59E0B', fontWeight: 700 }}>
              EGP {doctor.consultation_fee}
            </span>
          )}
          {distLabel && (
            <span style={{ fontSize: 11, color: tokens.colors.gray[400] }}>
              📍 {distLabel}
            </span>
          )}
          {doctor.rating && (
            <span style={{ fontSize: 11, color: tokens.colors.gray[500] }}>⭐ {Number(doctor.rating).toFixed(1)}</span>
          )}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); navigate(`/book/${doctor.id}`); }}
        style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 'var(--radius-md)', border: 'none', background: P, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {t('nearbyClinicsPage.bookBtn')}
      </button>
    </div>
  );
}

function calcDist(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbyClinicsPage() {
  const { t, isRTL } = useTranslation();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const markers = useRef([]);

  const [userPos, setUserPos]       = useState(null);
  const [geoError, setGeoError]     = useState(false);
  const [geoLoading, setGeoLoading] = useState(true);
  const [mapReady, setMapReady]     = useState(false);
  const [radius, setRadius]         = useState(5);
  const [specialty, setSpecialty]   = useState('');

  useEffect(() => {
    if (!navigator.geolocation) { setGeoError(true); setGeoLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
      ()  => { setGeoError(true); setGeoLoading(false); setUserPos({ lat: 30.0444, lng: 31.2357 }); }
    );
  }, []);

  const { data: doctors, isLoading: docLoading } = useQuery({
    queryKey: ['nearby-doctors', userPos?.lat, userPos?.lng, radius, specialty],
    queryFn: async () => {
      const params = { lat: userPos.lat, lng: userPos.lng, radius, page_size: 30 };
      if (specialty) params.specialty = specialty;
      try {
        const { data } = await apiClient.get(API.DOCTORS.NEARBY, { params });
        return Array.isArray(data) ? data : (data?.results || data?.data?.results || []);
      } catch {
        const fallbackParams = { page_size: 40 };
        if (specialty) fallbackParams.specialty = specialty;
        const { data } = await apiClient.get('/search/doctors/', { params: fallbackParams });
        return Array.isArray(data) ? data : (data?.results || data?.data?.results || []);
      }
    },
    enabled: !!userPos,
  });

  useEffect(() => {
    loadLeaflet().then(() => setMapReady(true));
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !userPos) return;
    const L = window.L;
    if (!mapInst.current) {
      mapInst.current = L.map(mapRef.current).setView([userPos.lat, userPos.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18,
      }).addTo(mapInst.current);
      L.circleMarker([userPos.lat, userPos.lng], { radius: 10, fillColor: P, color: '#fff', weight: 3, fillOpacity: 1 })
        .addTo(mapInst.current)
        .bindPopup(`<b>${t('nearbyClinics.yourLocation')}</b>`);
    }
    markers.current.forEach(m => m.remove());
    markers.current = [];
    const prefix = t('common.doctorPrefix');
    (doctors || []).forEach(doc => {
      const lat = parseFloat(doc.lat || doc.latitude || doc.clinic_lat || 'NaN');
      const lng = parseFloat(doc.lng || doc.longitude || doc.clinic_lng || 'NaN');
      if (isNaN(lat) || isNaN(lng)) return;
      const name = doc.full_name || doc.name || t('nearbyClinics.defaultDoctor');
      const m = L.marker([lat, lng])
        .bindPopup(`<b>${prefix} ${name}</b><br/>${doc.specialty || ''}<br/>EGP ${doc.consultation_fee || '?'}`)
        .addTo(mapInst.current);
      markers.current.push(m);
    });
  }, [mapReady, userPos, doctors]);

  const doctorsWithDist = (doctors || []).map(doc => {
    const lat = parseFloat(doc.lat || doc.latitude || 'NaN');
    const lng = parseFloat(doc.lng || doc.longitude || 'NaN');
    const dist = (userPos && !isNaN(lat)) ? calcDist(userPos.lat, userPos.lng, lat, lng) : null;
    return { ...doc, dist };
  }).sort((a, b) => (a.dist ?? 999) - (b.dist ?? 999));

  const SPECIALTIES = [
    { value: '', label: t('nearbyClinicsPage.allSpecialties') },
    { value: 'Cardiology',   label: t('nearbyClinicsPage.specialties.Cardiology') },
    { value: 'Pediatrics',   label: t('nearbyClinicsPage.specialties.Pediatrics') },
    { value: 'Dermatology',  label: t('nearbyClinicsPage.specialties.Dermatology') },
    { value: 'Orthopedics',  label: t('nearbyClinicsPage.specialties.Orthopedics') },
    { value: 'ENT',          label: t('nearbyClinicsPage.specialties.ENT') },
    { value: 'Gynecology',   label: t('nearbyClinicsPage.specialties.Gynecology') },
    { value: 'General',      label: t('nearbyClinicsPage.specialties.General') },
  ];

  const RADII = [1, 2, 5, 10, 20];
  const subtitleKey = geoError ? 'subtitleError' : geoLoading ? 'subtitleLoading' : 'subtitleReady';

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: tokens.colors.gray[800], margin: '0 0 4px' }}>
          {t('nearbyClinicsPage.title')}
        </h1>
        <p style={{ fontSize: 14, color: tokens.colors.gray[500], margin: 0 }}>
          {t(`nearbyClinicsPage.${subtitleKey}`)}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.gray[600] }}>{t('nearbyClinicsPage.radiusLabel')}</label>
          <select
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            style={{ borderRadius: 'var(--radius-md)', border: `1px solid ${tokens.colors.gray[200]}`, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit', color: tokens.colors.gray[800], outline: 'none' }}
          >
            {RADII.map(r => (
              <option key={r} value={r}>{t('nearbyClinics.radiusKm', { r })}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.gray[600] }}>{t('nearbyClinicsPage.specialtyLabel')}</label>
          <select
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
            style={{ borderRadius: 'var(--radius-md)', border: `1px solid ${tokens.colors.gray[200]}`, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit', color: tokens.colors.gray[800], outline: 'none' }}
          >
            {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {doctorsWithDist.length > 0 && (
          <span style={{ fontSize: 13, color: tokens.colors.gray[400], marginInlineStart: 'auto' }}>
            {t('nearbyClinicsPage.resultsCount', { count: doctorsWithDist.length })}
          </span>
        )}
      </div>

      {/* Layout: map + list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>

        {/* Map */}
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: tokens.shadows.card, height: 520, background: '#E6F1FB' }}>
          {(geoLoading || !userPos) ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${P}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ color: tokens.colors.gray[500], fontSize: 14, margin: 0 }}>{t('nearbyClinicsPage.mapLoading')}</p>
            </div>
          ) : (
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          )}
        </div>

        {/* List */}
        <div style={{ height: 520, overflowY: 'auto', paddingInlineEnd: 4 }}>
          {(geoLoading || docLoading) ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={80} borderRadius={16} style={{ marginBottom: 10 }} />)
          ) : doctorsWithDist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: tokens.colors.gray[400] }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <p style={{ fontSize: 14, margin: 0 }}>{t('nearbyClinicsPage.listEmpty')}</p>
              <p style={{ fontSize: 12, margin: '6px 0 0', color: tokens.colors.gray[300] }}>{t('nearbyClinicsPage.listEmptyHint')}</p>
            </div>
          ) : (
            doctorsWithDist.map(doc => (
              <DoctorNearbyCard key={doc.id} doctor={doc} distance={doc.dist} t={t} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
