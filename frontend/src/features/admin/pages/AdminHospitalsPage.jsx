/**
 * AdminHospitalsPage.jsx — Platform Hospitals Management
 * Admins can view, verify, and manage all hospitals on the platform.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import useTranslation from '../../../i18n/useTranslation';
import { EGYPT_GOVERNORATES } from '../../../constants/GOVERNORATES'; // ISSUE-009

const P = 'var(--primary)', PL = '#E6F1FB', PD = 'var(--primary-dark)';

export default function AdminHospitalsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | verified | unverified | inactive
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'hospitals', search, filter, page],
    queryFn: async () => {
      const params = { page, page_size: 15 };
      if (search) params.search = search;
      if (filter === 'verified')   params.is_verified = true;
      if (filter === 'unverified') params.is_verified = false;
      if (filter === 'inactive')   params.is_active = false;
      const { data } = await apiClient.get(API.HOSPITALS.LIST, { params });
      return data;
    },
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const toggleVerify = useMutation({
    mutationFn: ({ id, is_verified }) => apiClient.patch(API.ADMIN.HOSPITAL_DETAIL(id), { is_verified }),
    onSuccess: () => qc.invalidateQueries(['admin', 'hospitals']),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => apiClient.patch(API.ADMIN.HOSPITAL_DETAIL(id), { is_active }),
    onSuccess: () => qc.invalidateQueries(['admin', 'hospitals']),
  });

  const hospitals = data?.results || data || [];
  const total = data?.count || hospitals.length;
  const totalPages = Math.ceil(total / 15);

  const FILTERS = [
    { val: 'all',        label: 'All' },
    { val: 'verified',   label: '✅ Verified' },
    { val: 'unverified', label: '⚠️ Unverified' },
    { val: 'inactive',   label: '🔴 Inactive' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px' }}>
            🏥 Hospitals Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            {total.toLocaleString()} hospitals registered on the platform
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search hospitals by name or city…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, minWidth: '240px', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', fontSize: '14px', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {FILTERS.map(f => (
              <button key={f.val} onClick={() => { setFilter(f.val); setPage(1); }}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === f.val ? P : 'var(--border-base)', color: filter === f.val ? '#fff' : 'var(--text-muted)' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Hospitals', value: total, icon: '🏥' },
            { label: 'Verified',        value: hospitals.filter(h => h.is_verified).length, icon: '✅' },
            { label: 'Pending Review',  value: hospitals.filter(h => !h.is_verified && h.is_active).length, icon: '⏳' },
            { label: 'Inactive',        value: hospitals.filter(h => !h.is_active).length, icon: '🔴' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
              <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px' }}>{s.icon} {s.value}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Hospitals grid */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: '220px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-pulse 1.4s ease infinite' }} />
            ))}
          </div>
        ) : hospitals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-hint)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-base)' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏥</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-body)', marginBottom: '8px' }}>No hospitals found</h3>
            <p style={{ fontSize: '14px' }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {hospitals.map(hospital => (
              <div key={hospital.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                {/* Card top */}
                <div style={{ background: PL, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {hospital.logo ? (
                    <img src={hospital.logo} alt={hospital.name} style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: P, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px' }}>
                      🏥
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 700, color: PD, margin: '0 0 2px', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {hospital.name}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>📍 {hospital.city ? (EGYPT_GOVERNORATES.find(g => g.value === hospital.city || g.en?.toLowerCase() === hospital.city?.toLowerCase() || g.ar === hospital.city)?.ar || hospital.city) : 'N/A'}</p>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <span style={{ background: hospital.is_verified ? '#dcfce7' : '#fef3c7', color: hospital.is_verified ? '#16a34a' : '#d97706', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-lg)' }}>
                      {hospital.is_verified ? '✅ Verified' : '⚠️ Unverified'}
                    </span>
                    <span style={{ background: hospital.is_active ? PL : '#fee2e2', color: hospital.is_active ? P : '#dc2626', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-lg)' }}>
                      {hospital.is_active ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>👨‍⚕️ {hospital.doctors_count ?? '—'} Doctors</span>
                    <span>⭐ {hospital.rating ? Number(hospital.rating).toFixed(1) : '—'} Rating</span>
                    <span>📅 {hospital.created_at ? new Date(hospital.created_at).toLocaleDateString() : '—'}</span>
                    <span>💊 {hospital.departments_count ?? '—'} Depts</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleVerify.mutate({ id: hospital.id, is_verified: !hospital.is_verified })}
                      style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: hospital.is_verified ? '#fef3c7' : '#dcfce7', color: hospital.is_verified ? '#d97706' : '#16a34a' }}
                    >
                      {hospital.is_verified ? '⚠️ Unverify' : '✅ Verify'}
                    </button>
                    <button
                      onClick={() => toggleActive.mutate({ id: hospital.id, is_active: !hospital.is_active })}
                      style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: hospital.is_active ? '#fee2e2' : '#dcfce7', color: hospital.is_active ? '#dc2626' : '#16a34a' }}
                    >
                      {hospital.is_active ? '🔒 Deactivate' : '✅ Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', background: 'var(--bg-card)', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#9CA3AF' : 'var(--text-body)', fontWeight: 600, fontSize: '14px' }}>
              ← Prev
            </button>
            <span style={{ padding: '8px 16px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', background: 'var(--bg-card)', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#9CA3AF' : 'var(--text-body)', fontWeight: 600, fontSize: '14px' }}>
              Next →
            </button>
          </div>
        )}
      </div>
    );
}
