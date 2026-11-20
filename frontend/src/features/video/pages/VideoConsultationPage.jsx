/**
 * CuraBook — Video Consultation Page
 * UX FIX v16:
 *  - Added proper Waiting Room screen when doctor hasn't joined yet
 *  - Shows appointment info, doctor name, countdown
 *  - Cancel / leave waiting room option
 *  - Pulse animation while waiting
 */
import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useVideoSession from '../hooks/useVideoSession';
import useTranslation from '../../../i18n/useTranslation';
import { useAuth } from '../../../context/AuthContext';
import { tokens } from '../../../theme/tokens';

const P  = 'var(--primary)';
const PD = 'var(--primary-dark)';

/* ── Waiting Room ─────────────────────────────────────────────────────────── */
function WaitingRoom({ session, onStart, isStarting, onLeave, isDoctor, isRTL }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = String(elapsed % 60).padStart(2, '0');

  const doctorName = session?.doctor_name || session?.appointment?.doctor_name || (isRTL ? 'الطبيب' : 'the doctor');
  const patientName = session?.patient_name || session?.appointment?.patient_name || (isRTL ? 'المريض' : 'the patient');
  const apptTime   = session?.scheduled_time || session?.appointment?.time || '';
  const apptDate   = session?.scheduled_date || session?.appointment?.date || '';

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-page)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'inherit',
    }}>
      {/* Pulse avatar */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: `linear-gradient(135deg, ${P}, ${PD})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 42,
        }}>
          👨‍⚕️
        </div>
        {/* Animated rings */}
        <div style={{
          position: 'absolute', inset: -8, borderRadius: '50%',
          border: `2px solid ${P}60`,
          animation: 'ping 1.5s cubic-bezier(0,0,.2,1) infinite',
        }} />
        <div style={{
          position: 'absolute', inset: -16, borderRadius: '50%',
          border: `2px solid ${P}30`,
          animation: 'ping 1.5s cubic-bezier(0,0,.2,1) infinite .3s',
        }} />
        <style>{`
          @keyframes ping {
            0%   { transform: scale(1);   opacity: 1; }
            75%, 100% { transform: scale(1.4); opacity: 0; }
          }
        `}</style>
      </div>

      <h1 style={{ color: 'var(--txt-heading)', fontSize: 22, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
        {isDoctor
          ? (isRTL ? `في انتظار المريض ${patientName}` : `Waiting for patient ${patientName}`)
          : (isRTL ? `في انتظار د. ${doctorName}` : `Waiting for Dr. ${doctorName}`)}
      </h1>
      <p style={{ color: 'var(--text-hint)', fontSize: 14, margin: '0 0 24px', textAlign: 'center' }}>
        {isDoctor
          ? (isRTL ? 'يمكنك بدء الاستشارة الآن، وسينضم المريض عند جاهزيته.' : 'You can start the consultation now. The patient will join when ready.')
          : (isRTL ? 'ابقَ في هذه الصفحة، سينضم الطبيب قريبًا.' : 'Please stay on this page. The doctor will join shortly.')}
      </p>

      {/* Session info card */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px 28px',
        border: '1px solid var(--border-base)', marginBottom: 28,
        display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {apptDate && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>Date</p>
            <p style={{ color: 'var(--txt-body)', fontSize: 14, fontWeight: 600, margin: 0 }}>{apptDate}</p>
          </div>
        )}
        {apptTime && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>Time</p>
            <p style={{ color: 'var(--txt-body)', fontSize: 14, fontWeight: 600, margin: 0 }}>{apptTime}</p>
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>Waiting</p>
          <p style={{ color: P, fontSize: 14, fontWeight: 700, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {mins > 0 ? `${mins}m ` : ''}{secs}s
          </p>
        </div>
      </div>

      {/* Tips */}
      <div style={{
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '14px 20px',
        border: '1px solid var(--border-base)', marginBottom: 28, maxWidth: 400, width: '100%',
      }}>
        <p style={{ color: 'var(--text-hint)', fontSize: 12, margin: 0, lineHeight: 1.8 }}>
          💡 <strong style={{ color: 'var(--txt-heading)' }}>Tips:</strong> Make sure your camera & mic are enabled.
          Find a quiet, well-lit space. Have your medical records ready if needed.
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onStart}
          disabled={isStarting}
          style={{
            background: P, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
            padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', opacity: isStarting ? .6 : 1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {isStarting ? (
            <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> Joining...</>
          ) : (
            <> 🎥 Join Call Now</>
          )}
        </button>
        <button
          onClick={onLeave}
          style={{
            background: 'transparent', color: 'var(--text-muted)',
            border: '1px solid var(--border-base)', borderRadius: 'var(--radius-md)',
            padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {isRTL ? 'مغادرة صفحة الانتظار' : 'Leave Waiting Room'}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Call Ended Screen ────────────────────────────────────────────────────── */
function CallEndedScreen({ session, navigate, t }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>📹</div>
      <h1 style={{ color: 'var(--txt-heading)', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Call Ended</h1>
      {session?.duration_minutes && (
        <p style={{ color: 'var(--text-hint)', fontSize: 14, margin: '0 0 28px' }}>
          Duration: {session.duration_minutes} minutes
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/appointments')}
          style={{
            background: P, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
            padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          My Appointments
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'var(--bg-elevated)', color: 'var(--txt-body)', border: '1px solid var(--border-base)',
            borderRadius: 'var(--radius-md)', padding: '12px 24px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function VideoConsultationPage() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const { t, isRTL } = useTranslation();
  const { role } = useAuth();
  const isDoctor = role === 'doctor';
  const iframeRef     = useRef(null);

  const {
    session, isLoading, callActive, formattedTime,
    handleStart, handleEnd, isStarting, isEnding, joinUrl,
  } = useVideoSession(sessionId, navigate);

  /* Loading */
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: `4px solid ${P}40`, borderTopColor: P,
            animation: 'spin .7s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ color: '#94a3b8', fontSize: 14 }}>{t('common.loading')}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* Not found */
  if (!session) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <p style={{ color: '#ef4444', fontSize: 16, fontWeight: 600 }}>Session not found</p>
          <button onClick={() => navigate(-1)}
            style={{ marginTop: 16, background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 'var(--radius-md)', padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /* Call ended */
  if (session.status === 'ended') {
    return <CallEndedScreen session={session} navigate={navigate}
        isDoctor={isDoctor}
        isRTL={isRTL}
      />;
  }

  /* Waiting room — show when session exists but call isn't active yet */
  if (!callActive) {
    return (
      <WaitingRoom
        session={session}
        onStart={handleStart}
        isStarting={isStarting}
        onLeave={() => navigate(-1)}
        isDoctor={isDoctor}
        isRTL={isRTL}
      />
    );
  }

  /* Active call */
  // joinUrl comes fresh from /token/ endpoint (never stored in DB)

  return (
    <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', flexDirection: 'column' }}
      dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Top bar */}
      <div style={{
        background: 'var(--bg-elevated)', padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-base)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
          <span style={{ color: 'var(--txt-heading)', fontWeight: 600, fontSize: 14 }}>Live Consultation</span>
          <span style={{ color: tokens?.colors?.success?.DEFAULT || '#31A870', fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>
            {formattedTime}
          </span>
        </div>
        <button
          onClick={handleEnd}
          disabled={isEnding}
          style={{
            background: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
            padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            opacity: isEnding ? .6 : 1,
          }}
        >
          📵 End Call
        </button>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>

      {/* Video iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        {joinUrl ? (
          <iframe
            ref={iframeRef}
            src={joinUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ width: '100%', height: '100%', border: 'none', minHeight: 'calc(100vh - 54px)' }}
            title="Video Consultation"
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
            <p style={{ color: '#9ca3af', fontSize: 15 }}>No video room URL available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
