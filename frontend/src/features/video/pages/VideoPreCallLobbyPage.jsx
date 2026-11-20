/**
 * VideoPreCallLobbyPage.jsx
 * شاشة ما قبل المكالمة — camera/mic test قبل الدخول للـ session
 * Route: /video/lobby/:sessionId
 */
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/apiClient';
import { API } from '../../../constants/apiRoutes';
import { tokens } from '../../../theme/tokens';
import { useTranslation } from '../../../i18n/useTranslation';
import { useAuth } from '../../../context/AuthContext';

const P  = tokens?.colors?.primary?.DEFAULT || '#0E7490';
const PD = tokens?.colors?.primary?.dark || '#0C6478';
const PL = tokens?.colors?.primary?.lighter || '#E0F7FA';

export default function VideoPreCallLobbyPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();
  const { role } = useAuth();
  const isDoctor = role === 'doctor';

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [micOn,    setMicOn]    = useState(true);
  const [camOn,    setCamOn]    = useState(true);
  const [camErr,   setCamErr]   = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [joining,  setJoining]  = useState(false);

  // Fetch session info
  const { data: session } = useQuery({
    queryKey: ['video-session', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get(API.VIDEO.SESSION(sessionId));
      return data;
    },
    enabled: !!sessionId,
  });

  // Start camera preview
  useEffect(() => {
    let animFrame;
    let analyser;

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Mic level visualizer
        const ctx = new AudioContext();
        analyser = ctx.createAnalyser();
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setMicLevel(Math.min(100, Math.round(avg * 2)));
          animFrame = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setCamErr(true);
      }
    }
    startMedia();
    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Toggle tracks
  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach(t => { t.enabled = camOn; });
  }, [camOn]);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach(t => { t.enabled = micOn; });
  }, [micOn]);

  const handleJoin = () => {
    setJoining(true);
    // Stop preview stream before navigating
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    navigate(`/video/${sessionId}`, { state: { micOn, camOn } });
  };

  const doctorName = session?.doctor_name || (isRTL ? 'الطبيب' : 'the doctor');
  const patientName = session?.patient_name || (isRTL ? 'المريض' : 'the patient');
  const apptTime   = session?.scheduled_time || session?.appointment?.time || '';

  return (
    /* Intentional: video pre-call UI is always dark for better camera preview visibility */
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: tokens.typography.fontFamily }}>

      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase' }}>
            {t('videoLobby.onlineConsult')}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
            {isDoctor
              ? (isRTL ? 'استعد لبدء الاستشارة' : 'Get ready to start the consultation')
              : t('videoLobby.welcomeTitle')}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            {isDoctor
              ? (isRTL ? `مع المريض ${patientName}` : `With patient ${patientName}`)
              : `${t('videoLobby.with')} ${doctorName}`} {apptTime && `· ${apptTime}`}
          </p>
        </div>

        {/* Camera preview — intentionally dark background for better contrast */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#1e293b', marginBottom: 20 }}>
          {camErr ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📵</div>
              <p style={{ fontSize: 13, margin: 0 }}>{t('videoLobby.camError')}</p>
              <p style={{ fontSize: 12, margin: '4px 0 0', color: 'rgba(255,255,255,0.3)' }}>{t('videoLobby.camErrorHint')}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: camOn ? 'block' : 'none' }}
            />
          )}
          {!camOn && !camErr && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 8 }}>👤</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>{t('videoLobby.camOff')}</p>
            </div>
          )}
          {/* Status badges */}
          <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 6 }}>
            {!micOn && (
              <span style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', borderRadius: 'var(--radius-lg)', padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                🔇 {t('videoLobby.micOff')}
              </span>
            )}
            {!camOn && (
              <span style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', borderRadius: 'var(--radius-lg)', padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                {t('videoLobby.camOffBadge')}
              </span>
            )}
          </div>
        </div>

        {/* Mic level */}
        {micOn && !camErr && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{t('videoLobby.soundLevel')}</span>
              <span style={{ fontSize: 11, color: micLevel > 10 ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                {micLevel > 10 ? t('videoLobby.working') : t('videoLobby.silent')}
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${micLevel}%`, background: micLevel > 60 ? '#f59e0b' : '#4ade80', borderRadius: 3, transition: 'width 0.1s' }} />
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, justifyContent: 'center' }}>
          <button
            onClick={() => setMicOn(m => !m)}
            style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 22, transition: 'all .15s', background: micOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.8)', color: '#fff' }}
            title={micOn ? t('videoLobby.micOnTitle') : t('videoLobby.micOffTitle')}
          >
            {micOn ? '🎙' : '🔇'}
          </button>
          <button
            onClick={() => setCamOn(c => !c)}
            style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 22, transition: 'all .15s', background: camOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.8)', color: '#fff' }}
            title={camOn ? t('videoLobby.camOnTitle') : t('videoLobby.camOffTitle')}
          >
            {camOn ? '📷' : '📵'}
          </button>
        </div>

        {/* Status list */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px', marginBottom: 20 }}>
          {[
            { icon: camErr ? '❌' : camOn ? '✅' : '⚠️', label: t('videoLobby.camera'),     status: camErr ? t('videoLobby.error') : camOn ? t('videoLobby.camWorking') : t('videoLobby.camOffStatus') },
            { icon: camErr ? '❌' : micOn ? '✅' : '⚠️', label: t('videoLobby.microphone'), status: camErr ? t('videoLobby.error') : micOn ? t('videoLobby.micWorking') : t('videoLobby.micOffStatus') },
            { icon: '✅', label: t('videoLobby.internet'), status: t('videoLobby.good') },
          ].map(({ icon, label, status }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{icon} {status}</span>
            </div>
          ))}
        </div>

        {/* Join button */}
        <button
          onClick={handleJoin}
          disabled={joining}
          style={{ width: '100%', padding: '16px', borderRadius: 'var(--radius-lg)', border: 'none', background: `linear-gradient(135deg, ${P}, ${PD})`, color: '#fff', fontSize: 16, fontWeight: 800, cursor: joining ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: joining ? 0.7 : 1, transition: 'opacity .2s' }}
        >
          {joining
            ? t('videoLobby.joining')
            : isDoctor
              ? (isRTL ? '🎥 ابدأ الاستشارة' : '🎥 Start Consultation')
              : t('videoLobby.joinNow')}
        </button>

        <button
          onClick={() => navigate(-1)}
          style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {t('videoLobby.back')}
        </button>
      </div>
    </div>
  );

}
