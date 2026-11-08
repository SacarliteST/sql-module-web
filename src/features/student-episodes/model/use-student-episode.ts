import { useCallback, useEffect, useReducer } from 'react';
import {
  LearningEpisodeFinalizationMode,
  LearningEpisodeStatusResponse,
  type LearningEpisodeResponse,
} from '../../../api/sqlmodule/model';
import type { StudentErrorView } from '../../student-errors';

export type StudentEpisodeMode = 'standalone' | 'platform';
export type StudentEpisodePhase =
  | 'idle'
  | 'starting'
  | 'active'
  | 'finalizing'
  | 'finalized'
  | 'expired'
  | 'error';

type StudentEpisodeState = {
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
  | { type: 'terminal-episode-received'; episode: LearningEpisodeResponse }
  | { type: 'expired'; episode?: LearningEpisodeResponse }
  | { type: 'failed'; error: StudentErrorView };

function initialState(taskId: string, mode: StudentEpisodeMode): StudentEpisodeState {
  return {
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
      if (isTerminal(state.phase)) return state;
      return { ...state, error: null, phase: 'starting' };
    case 'episode-received': {
      const nextPhase = episodePhase(action.episode);
      if (isTerminal(state.phase) && nextPhase === 'active') return state;
      return { ...state, episode: action.episode, error: null, phase: nextPhase };
    }
    case 'finalization-requested':
      if (state.phase !== 'active') return state;
      return { ...state, error: null, finalizationMode: action.mode, phase: 'finalizing' };
    case 'terminal-episode-received':
      if (action.episode.status !== LearningEpisodeStatusResponse.Finalized) return state;
      return { ...state, episode: action.episode, error: null, phase: 'finalized' };
    case 'expired':
      return { ...state, episode: action.episode ?? state.episode, error: null, phase: 'expired' };
    case 'failed':
      if (isTerminal(state.phase)) return state;
      return { ...state, error: action.error, phase: 'error' };
  }
}

type Options = {
  mode: StudentEpisodeMode;
  taskId: string;
};

export function useStudentEpisode({ mode, taskId }: Options) {
  const [state, dispatch] = useReducer(studentEpisodeReducer, undefined, () => initialState(taskId, mode));
  const currentState = state.taskId === taskId && state.mode === mode ? state : initialState(taskId, mode);

  useEffect(() => {
    if (state.taskId === taskId && state.mode === mode) return;
    dispatch({ type: 'reset', taskId, mode });
  }, [mode, state.mode, state.taskId, taskId]);

  const retryStart = useCallback(() => dispatch({ type: 'start-requested' }), []);
  const acceptPartialResult = useCallback(() => dispatch({
    type: 'finalization-requested',
    mode: LearningEpisodeFinalizationMode.AcceptPartialResult,
  }), []);
  const abandon = useCallback(() => dispatch({
    type: 'finalization-requested',
    mode: LearningEpisodeFinalizationMode.Abandon,
  }), []);
  const applyEpisode = useCallback((episode: LearningEpisodeResponse) => dispatch({ type: 'episode-received', episode }), []);
  const applyTerminalEpisode = useCallback((episode: LearningEpisodeResponse) => dispatch({ type: 'terminal-episode-received', episode }), []);
  const markExpired = useCallback((episode?: LearningEpisodeResponse) => dispatch({ type: 'expired', episode }), []);
  const setError = useCallback((error: StudentErrorView) => dispatch({ type: 'failed', error }), []);

  return {
    abandon,
    acceptPartialResult,
    applyEpisode,
    applyTerminalEpisode,
    episode: currentState.episode,
    error: currentState.error,
    finalizationMode: currentState.finalizationMode,
    isHeartbeatEnabled: currentState.phase === 'active',
    isReadyForSubmission: currentState.phase === 'active',
    markExpired,
    mode: currentState.mode,
    phase: currentState.phase,
    retryStart,
    setError,
  };
}

