/**
 * AdminUsersPage.jsx — Platform User Management
 * Admins can view, activate, deactivate, and manage all platform users.
 */
import { useState } from 'react';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import useTranslation from '../../../i18n/useTranslation';

const P = 'var(--primary)', PL = '#E6F1FB', ROLES = ['all', 'patient', 'doctor', 'hospital', 'assistant'];

const ROLE_COLORS = {
  patient:   { bg: '#dbeafe', color: '#1d4ed8' },
  doctor:    { bg: PL,        color: P },
  hospital:  { bg: '#f3e8ff', color: '#7c3aed' },
  assistant: { bg: '#fef3c7', color: '#d97706' },
  admin:     { bg: '#fee2e2', color: '#dc2626' },
};

function RoleBadge({ role }) {
  const s = ROLE_COLORS[role] || { bg: 'var(--border-base)', color: 'var(--text-muted)' };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: 'var(--radius-lg)', textTransform: 'capitalize' }}>
      {role || 'unknown'}
    </span>
  );
}

function StatusDot({ active }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: active ? '#16a34a' : '#dc2626' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: active ? '#16a34a' : '#dc2626', display: 'inline-block' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [confirmAction, setConfirmAction] = useState(null); // { userId, action: 'activate'|'deactivate', userName }
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, roleFilter, page],
    queryFn: async () => {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      const { data } = await apiClient.get(API.ADMIN.PATIENTS, { params });
      return data;
    },
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => apiClient.patch(API.ADMIN.USER_DETAIL(id), { is_active }),
    onSuccess: () => qc.invalidateQueries(['admin', 'users']),
  });

  const users = data?.results || data || [];
  const total = data?.count || users.length;
  const totalPages = Math.ceil(total / 20);

  const handleToggleConfirm = () => {
    if (!confirmAction) return;
    const { userId, action } = confirmAction;
    toggleActive.mutate({ id: userId, is_active: action === 'activate' }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin','users'] }); setConfirmAction(null); },
      onError:   () => setConfirmAction(null),
    });
  };

  return (
    <>
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-h)', margin: '0 0 4px' }}>
            👥 User Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            {total.toLocaleString()} total users on the platform
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name, email or username…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, minWidth: '240px', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', fontSize: '14px', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ROLES.map(r => (
              <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', textTransform: 'capitalize', background: roleFilter === r ? P : 'var(--border-base)', color: roleFilter === r ? '#fff' : 'var(--text-muted)' }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-base)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {isLoading ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: '52px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-pulse 1.4s ease infinite' }} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-hint)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
              <p style={{ fontWeight: 600, color: 'var(--text-body)' }}>No users found</p>
              <p style={{ fontSize: '14px' }}>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-base)' }}>
                  {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => {
                  const role = user.is_doctor ? 'doctor' : user.is_hospital ? 'hospital' : user.is_assistant ? 'assistant' : user.is_admin ? 'admin' : 'patient';
                  return (
                    <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border-base)' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: PL, color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                            {(user.full_name || user.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, color: 'var(--text-h)', margin: 0, fontSize: '14px' }}>{user.full_name || user.username}</p>
                            <p style={{ color: 'var(--text-hint)', margin: 0, fontSize: '12px' }}>@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{user.email}</td>
                      <td style={{ padding: '14px 16px' }}><RoleBadge role={role} /></td>
                      <td style={{ padding: '14px 16px' }}><StatusDot active={user.is_active} /></td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-hint)' }}>
                        {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => setConfirmAction({ userId: user.id, action: user.is_active ? 'deactivate' : 'activate', userName: user.full_name || user.username })}
                          style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none',
                            background: user.is_active ? '#fee2e2' : '#dcfce7',
                            color: user.is_active ? '#dc2626' : '#16a34a',
                          }}
                        >
                          {user.is_active ? '🔒 Deactivate' : '✅ Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', background: 'var(--bg-card)', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#9CA3AF' : 'var(--text-body)', fontWeight: 600, fontSize: '14px' }}>
              ← Prev
            </button>
            <span style={{ padding: '8px 16px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Page {page} of {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)', background: 'var(--bg-card)', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#9CA3AF' : 'var(--text-body)', fontWeight: 600, fontSize: '14px' }}>
              Next →
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.action === 'activate' ? 'Activate User' : 'Deactivate User'}
        message={`Are you sure you want to ${confirmAction?.action || ''} ${confirmAction?.userName || 'this user'}? This will ${confirmAction?.action === 'activate' ? 'restore their access' : 'block their access to the platform'}.`}
        confirmLabel={confirmAction?.action === 'activate' ? 'Activate' : 'Deactivate'}
        variant={confirmAction?.action === 'activate' ? 'default' : 'warning'}
        loading={toggleActive?.isPending}
        onConfirm={handleToggleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}