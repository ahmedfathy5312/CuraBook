/**
 * CuraBook — useVideoSession hook
 * FIX V10: Encapsulates all react-query logic for video consultations,
 * keeping VideoConsultationPage lean and consistent with other feature hooks.
 *
 * Usage:
 *   const { session, isLoading, callActive, elapsed, handleStart, handleEnd } =
 *     useVideoSession(sessionId, navigate);
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchSession, fetchToken, startSession, endSession } from '../api/videoApi';

/**
 * @param {string} sessionId  — from useParams()
 * @param {Function} navigate — from useNavigate()
 */
export default function useVideoSession(sessionId, navigate) {
  const [callActive, setCallActive] = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [joinUrl, setJoinUrl]       = useState(null);

  // ── Data fetching ─────────────────────────────────────────────
  const { data: session, isLoading } = useQuery({
    queryKey: ['video-session', sessionId],
    queryFn:  () => fetchSession(sessionId),
    // Poll every 5 s while waiting for the other party; stop once in-call.
    refetchInterval: callActive ? false : 5000,
    enabled: !!sessionId,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const startMutation = useMutation({
    mutationFn: () => startSession(sessionId),
  });

  const endMutation = useMutation({
    mutationFn: () => endSession(sessionId),
    onSuccess:  () => navigate(-1),
  });

  // ── Elapsed timer (ticks while call is active) ────────────────
  useEffect(() => {
    if (!callActive) return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [callActive]);

  // ── Actions ───────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    await startMutation.mutateAsync();
    // Fetch a fresh short-lived token from the backend (never stored in DB)
    const tokenData = await fetchToken(sessionId);
    setJoinUrl(tokenData.join_url);
    setCallActive(true);
    setElapsed(0);
  }, [startMutation, sessionId]);

  const handleEnd = useCallback(async () => {
    setCallActive(false);
    setJoinUrl(null);
    await endMutation.mutateAsync();
  }, [endMutation]);

  // ── Helpers ───────────────────────────────────────────────────
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return {
    session,
    isLoading,
    callActive,
    elapsed,
    joinUrl,
    formattedTime: formatTime(elapsed),
    handleStart,
    handleEnd,
    isStarting: startMutation.isPending,
    isEnding:   endMutation.isPending,
  };
}
