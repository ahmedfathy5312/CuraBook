/**
 * NotificationsTab.jsx — Notification preferences tab
 * Extracted from AssistantProfilePage.jsx (Sprint 3 split)
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../../../context/ToastContext';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { useTranslation } from '../../../i18n/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import { Bell, Mail, Save, CheckCircle } from 'lucide-react';
import { SectionCard, ToggleSwitch, PrimaryBtn, COLORS } from '../components/AssistantUI';

const getProfile = () => apiClient.get(API.USERS.ME).then(r => r.data);

export default function NotificationsTab() {
  const { t }           = useTranslation();
  const { user: auth }  = useAuth();
  const toast           = useToast();

  const { data: profile } = useQuery({ queryKey: ['assistant', 'profile'], queryFn: getProfile });

  const [prefs, setPrefs] = useState({
    new_appointment: true,
    approved:        true,
    rejected:        true,
    reminder:        true,
    email_notif:     false,
  });

  const set = (key) => (val) => setPrefs(p => ({ ...p, [key]: val }));

  const handleSave = () => toast.success(t('assistantProfilePage.notifications.savedMsg'));

  return (
    <div style={{ maxWidth: 860, margin: '24px auto', padding: '0 24px 40px' }}>
      {/* In-app notifications */}
      <SectionCard
        title={t('assistantProfilePage.notifications.inAppTitle')}
        subtitle={t('assistantProfilePage.notifications.inAppSubtitle')}
        icon={<Bell size={18} />}
      >
        <ToggleSwitch
          checked={prefs.new_appointment} onChange={set('new_appointment')}
          label={t('assistantProfilePage.notifications.toggles.newAppointment')}
          desc={t('assistantProfilePage.notifications.toggles.newAppointmentDesc')}
        />
        <ToggleSwitch
          checked={prefs.approved} onChange={set('approved')}
          label={t('assistantProfilePage.notifications.toggles.approved')}
          desc={t('assistantProfilePage.notifications.toggles.approvedDesc')}
        />
        <ToggleSwitch
          checked={prefs.rejected} onChange={set('rejected')}
          label={t('assistantProfilePage.notifications.toggles.rejected')}
          desc={t('assistantProfilePage.notifications.toggles.rejectedDesc')}
        />
        <ToggleSwitch
          checked={prefs.reminder} onChange={set('reminder')}
          label={t('assistantProfilePage.notifications.toggles.reminder')}
          desc={t('assistantProfilePage.notifications.toggles.reminderDesc')}
        />
      </SectionCard>

      {/* Email notifications */}
      <SectionCard
        title={t('assistantProfilePage.notifications.emailTitle')}
        subtitle={t('assistantProfilePage.notifications.emailSubtitle')}
        icon={<Mail size={18} />}
      >
        <ToggleSwitch
          checked={prefs.email_notif} onChange={set('email_notif')}
          label={t('assistantProfilePage.notifications.toggles.emailNotif')}
          desc={t('assistantProfilePage.notifications.toggles.emailNotifDesc', {
            email: profile?.email || auth?.email || '',
          })}
        />
        {prefs.email_notif && (
          <div style={{
            marginTop: 14, padding: '12px 16px', background: '#F0FDF4',
            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
            gap: 8, fontSize: 13, color: '#065F46',
          }}>
            <CheckCircle size={15} /> {t('assistantProfilePage.notifications.emailEnabled')}
          </div>
        )}
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PrimaryBtn onClick={handleSave} icon={<Save size={14} />}>
          {t('assistantProfilePage.notifications.saveBtn')}
        </PrimaryBtn>
      </div>
    </div>
  );
}
