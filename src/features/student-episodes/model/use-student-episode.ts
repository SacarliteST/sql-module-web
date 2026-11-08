import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  LearningEpisodeFinalizationMode,
  LearningEpisodeStatusResponse,
  type LearningEpisodeResponse,
  type SubmitAttemptResponse,
} from '../../../api/sqlmodule/model';
import {
  finalizeLearningEpisode,
  heartbeatLearningEpisode,
  startLearningEpisode,
  type startLearningEpisodeResponse,
} from '../../../api/sqlmodule/student-episodes/student-episodes';
import { mapStudentApiError, problemCode, type StudentErrorView } from '../../student-errors';

export type StudentEpisodeMode = 'standalone' | 'platform';
export type StudentEpisodePhase =
  | 'idle'
  | 'starting'
  | 'active'
  | 'finalizing'
  | 'finalized'
  | 'expired'
  | 'error';

const HEARTBEAT_INTERVAL_MS = 30_000;

type StudentEpisodeState = {
  attemptsUsed: number;
  bestScore: number | null;
  error: StudentErrorView | null;
  episode: LearningEpisodeResponse | null;
  finalizationMode: LearningEpisodeFinalizationMode | null;
  mode: StudentEpisodeMode;
  phase: StudentEpisodePhase;
  taskId: string;
};

type StudentEpisodeAction =
  | { type: 'reset'; taskId: string; mode: StudentEpisodeMode }
  | { type: 'start-requested' }
  | { type: 'episode-received'; episode: LearningEpisodeResponse }
  | { type: 'finalization-requested'; mode: LearningEpisodeFinalizationMode }
  | { type: 'attempt-received'; result: SubmitAttemptResponse }
  | { type: 'finalization-failed'; error: StudentErrorView }
  | { type: 'terminal-episode-received'; episode: LearningEpisodeResponse }
  | { type: 'finalized'; error?: StudentErrorView }
  | { type: 'expired'; episode?: LearningEpisodeResponse; error?: StudentErrorView }
  | { type: 'failed'; error: StudentErrorView };

function initialState(taskId: string, mode: StudentEpisodeMode): StudentEpisodeState {
  return {
    attemptsUsed: 0,
    bestScore: null,
    error: null,
    episode: null,
    finalizationMode: null,
    mode,
    phase: 'idle',
    taskId,
  };
}

function episodePhase(episode: LearningEpisodeResponse): StudentEpisodePhase {
  return episode.status === LearningEpisodeStatusResponse.Finalized ? 'finalized' : 'active';
}

function isTerminal(phase: StudentEpisodePhase) {
  return phase === 'finalized' || phase === 'expired';
}

function studentEpisodeReducer(state: StudentEpisodeState, action: StudentEpisodeAction): StudentEpisodeState {
  switch (action.type) {
    case 'reset':
      return initialState(action.taskId, action.mode);
    case 'start-requested':
      return { ...state, episode: null, error: null, finalizationMode: null, phase: 'starting' };
    case 'episode-received': {
      const nextPhase = episodePhase(action.episode);
      if (isTerminal(state.phase) && nextPhase === 'active') return state;
      return { ...state, episode: action.episode, error: null, phase: nextPhase };
    }
    case 'finalization-requested':
      if (state.phase !== 'active') return state;
      return { ...state, error: null, finalizationMode: action.mode, phase: 'finalizing' };
    case 'attempt-received':
      return {
        ...state,
        attemptsUsed: action.result.attemptsUsed ?? state.attemptsUsed,
        bestScore: action.result.bestScore ?? state.bestScore,
      };
    case 'finalization-failed':
      return { ...state, error: action.error, phase: 'active' };
    case 'terminal-episode-received':
      if (action.episode.status !== LearningEpisodeStatusResponse.Finalized) return state;
      return { ...state, episode: action.episode, error: null, phase: 'finalized' };
    case 'finalized':
      return { ...state, error: action.error ?? null, phase: 'finalized' };
    case 'expired':
      return { ...state, episode: action.episode ?? state.episode, error: action.error ?? null, phase: 'expired' };
    case 'failed':
      if (isTerminal(state.phase)) return state;
      return { ...state, error: action.error, phase: 'error' };
  }
}

type Options = {
  enabled?: boolean;
  mode: StudentEpisodeMode;
  taskId: string;
};

const pendingStarts = new Map<string, Promise<startLearningEpisodeResponse>>();

function startEpisodeOnce(taskId: string, mode: StudentEpisodeMode) {
  const key = `${mode}:${taskId}`;
  const pending = pendingStarts.get(key);
  if (pending) return pending;

  const request = startLearningEpisode(taskId).finally(() => pendingStarts.delete(key));
  pendingStarts.set(key, request);
  return request;
}

export function useStudentEpisode({ enabled = true, mode, taskId }: Options) {
  const [state, dispatch] = useReducer(studentEpisodeReducer, undefined, () => initialState(taskId, mode));
  const currentState = state.taskId === taskId && state.mode === mode ? state : initialState(taskId, mode);
  const activeContext = useRef({ mode, taskId });
  const heartbeatInFlight = useRef(false);
  const finalizationInFlight = useRef(false);
  const pendingFinalization = useRef<{ key: string; mode: LearningEpisodeFinalizationMode } | null>(null);
  activeContext.current = { mode, taskId };

  useEffect(() => {
    if (state.taskId === taskId && state.mode === mode) return;
    dispatch({ type: 'reset', taskId, mode });
  }, [mode, state.mode, state.taskId, taskId]);

  const retryStart = useCallback(async () => {
    if (!enabled || !taskId) return;
    dispatch({ type: 'start-requested' });

    try {
      const response = await startEpisodeOnce(taskId, mode);
      if (activeContext.current.taskId !== taskId || activeContext.current.mode !== mode) return;
      if (response.status === 200) {
        dispatch({ type: 'episode-received', episode: response.data });
        return;
      }

      const error = mapStudentApiError(response.status, response.data);
      const code = problemCode(response.data);
      if (code === 'LearningEpisode.Finalized') {
        dispatch({ type: 'finalized', error });
      } else if (code === 'LearningEpisode.HeartbeatExpired') {
        dispatch({ type: 'expired', error });
      } else {
        dispatch({ type: 'failed', error });
      }
    } catch (error) {
      if (activeContext.current.taskId !== taskId || activeContext.current.mode !== mode) return;
      dispatch({ type: 'failed', error: mapStudentApiError(undefined, error) });
    }
  }, [enabled, mode, taskId]);
  const finalizeStandalone = useCallback(async (finalizationMode: LearningEpisodeFinalizationMode) => {
    const episodeId = currentState.episode?.episodeId;
    if (mode !== 'standalone' || !episodeId || currentState.phase !== 'active' || finalizationInFlight.current) return false;
    if (finalizationMode === LearningEpisodeFinalizationMode.AcceptPartialResult && currentState.attemptsUsed === 0) return false;

    const pending = pendingFinalization.current?.mode === finalizationMode
      ? pendingFinalization.current
      : { key: crypto.randomUUID(), mode: finalizationMode };
    pendingFinalization.current = pending;
    finalizationInFlight.current = true;
    dispatch({ type: 'finalization-requested', mode: finalizationMode });

    try {
      const response = await finalizeLearningEpisode(
        episodeId,
        { mode: finalizationMode },
        { 'Idempotency-Key': pending.key },
      );
      if (activeContext.current.taskId !== taskId || activeContext.current.mode !== mode) return false;
      if (response.status === 200) {
        pendingFinalization.current = null;
        dispatch({ type: 'terminal-episode-received', episode: response.data });
        return true;
      }

      pendingFinalization.current = null;
      dispatch({ type: 'finalization-failed', error: mapStudentApiError(response.status, response.data) });
      return false;
    } catch (error) {
      dispatch({ type: 'finalization-failed', error: mapStudentApiError(undefined, error) });
      return false;
    } finally {
      finalizationInFlight.current = false;
    }
  }, [currentState.attemptsUsed, currentState.episode?.episodeId, currentState.phase, mode, taskId]);
  const acceptPartialResult = useCallback(
    () => finalizeStandalone(LearningEpisodeFinalizationMode.AcceptPartialResult),
    [finalizeStandalone],
  );
  const abandon = useCallback(
    () => finalizeStandalone(LearningEpisodeFinalizationMode.Abandon),
    [finalizeStandalone],
  );
  const recordAttempt = useCallback((result: SubmitAttemptResponse) => dispatch({ type: 'attempt-received', result }), []);
  const applyEpisode = useCallback((episode: LearningEpisodeResponse) => dispatch({ type: 'episode-received', episode }), []);
  const applyTerminalEpisode = useCallback((episode: LearningEpisodeResponse) => dispatch({ type: 'terminal-episode-received', episode }), []);
  const markExpired = useCallback((episode?: LearningEpisodeResponse) => dispatch({ type: 'expired', episode }), []);
  const setError = useCallback((error: StudentErrorView) => dispatch({ type: 'failed', error }), []);

  useEffect(() => {
    if (!enabled || currentState.phase !== 'idle') return;
    void retryStart();
  }, [currentState.phase, enabled, retryStart]);

  const episodeId = currentState.episode?.episodeId;
  const heartbeatEnabled = currentState.phase === 'active' && Boolean(episodeId);

  useEffect(() => {
    if (!heartbeatEnabled || !episodeId) return;
    let disposed = false;

    const sendHeartbeat = async () => {
      if (heartbeatInFlight.current) return;
      heartbeatInFlight.current = true;

      try {
        const response = await heartbeatLearningEpisode(episodeId);
        if (disposed || activeContext.current.taskId !== taskId || activeContext.current.mode !== mode) return;
        if (response.status === 200) {
          dispatch({ type: 'episode-received', episode: response.data });
          return;
        }

        const code = problemCode(response.data);
        const error = mapStudentApiError(response.status, response.data);
        if (code === 'LearningEpisode.Finalized') {
          dispatch({ type: 'finalized', error });
        } else if (code === 'LearningEpisode.HeartbeatExpired') {
          dispatch({ type: 'expired', error });
        } else if (response.status < 500) {
          dispatch({ type: 'failed', error });
        }
      } catch {
        // Сетевой сбой не завершает эпизод: следующий плановый heartbeat повторит запрос.
      } finally {
        heartbeatInFlight.current = false;
      }
    };

    const intervalId = window.setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void sendHeartbeat();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [episodeId, heartbeatEnabled, mode, taskId]);

  return {
    abandon,
    acceptPartialResult,
    attemptsUsed: currentState.attemptsUsed,
    applyEpisode,
    applyTerminalEpisode,
    bestScore: currentState.bestScore,
    episode: currentState.episode,
    error: currentState.error,
    finalizationMode: currentState.finalizationMode,
    isHeartbeatEnabled: heartbeatEnabled,
    isReadyForSubmission: currentState.phase === 'active',
    markExpired,
    mode: currentState.mode,
    phase: currentState.phase,
    recordAttempt,
    retryStart,
    setError,
  };
}
