import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningEpisodeStatusResponse, type SubmitAttemptResponse } from '../../../api/sqlmodule/model';
import { useStudentEpisode } from './use-student-episode';

const api = vi.hoisted(() => ({
  finalize: vi.fn(),
  heartbeat: vi.fn(),
  start: vi.fn(),
}));

vi.mock('../../../api/sqlmodule/student-episodes/student-episodes', () => ({
  finalizeLearningEpisode: api.finalize,
  heartbeatLearningEpisode: api.heartbeat,
  startLearningEpisode: api.start,
}));

const activeEpisode = {
  episodeId: 'episode-1',
  status: LearningEpisodeStatusResponse.Active,
  taskId: 'task-1',
};
const finalizedEpisode = { ...activeEpisode, status: LearningEpisodeStatusResponse.Finalized };
const attempt = (overrides: Partial<SubmitAttemptResponse> = {}) => ({
  attemptId: 'attempt-1',
  status: 'Completed',
  isCorrect: false,
  reason: 'ValueMismatch',
  rowCount: 1,
  durationMs: 1,
  publicError: null,
  actualColumns: [],
  actualRows: [],
  isResultTruncated: false,
  resultSnapshotState: 'Available',
  returnedRowCount: 0,
  resultRowLimit: 100,
  resultSnapshotCreatedAt: null,
  resultSnapshotExpiresAt: null,
  validationVersionId: 'validation-1',
  attemptNumber: 1,
  score: 40,
  bestScore: 40,
  passingScore: 70,
  isPassed: false,
  attemptsUsed: 1,
  attemptsRemaining: 2,
  canSubmit: true,
  canFinalize: true,
  checks: [],
  hints: [],
  ...overrides,
} as SubmitAttemptResponse);

describe('useStudentEpisode', () => {
  beforeEach(() => {
    vi.useRealTimers();
    api.start.mockReset().mockResolvedValue({ status: 200, data: activeEpisode });
    api.heartbeat.mockReset().mockResolvedValue({ status: 200, data: activeEpisode });
    api.finalize.mockReset().mockResolvedValue({ status: 200, data: finalizedEpisode });
  });

  afterEach(() => vi.useRealTimers());

  it('блокирует отправку до ответа start и использует episode id backend', async () => {
    let resolveStart!: (value: unknown) => void;
    api.start.mockReturnValue(new Promise((resolve) => { resolveStart = resolve; }));
    const { result } = renderHook(() => useStudentEpisode({ mode: 'standalone', taskId: 'task-1' }));

    expect(result.current.isReadyForSubmission).toBe(false);
    await act(async () => resolveStart({ status: 200, data: activeEpisode }));
    await waitFor(() => expect(result.current.isReadyForSubmission).toBe(true));
    expect(result.current.episode?.episodeId).toBe('episode-1');
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it('не запускает второй start при повторном render', async () => {
    const { rerender, result } = renderHook(() => useStudentEpisode({ mode: 'standalone', taskId: 'task-1' }));
    rerender();
    await waitFor(() => expect(result.current.phase).toBe('active'));
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it('отправляет heartbeat раз в 30 секунд и при возврате видимости', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStudentEpisode({ mode: 'standalone', taskId: 'task-1' }));
    await act(async () => Promise.resolve());
    expect(result.current.phase).toBe('active');

    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(api.heartbeat).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(api.heartbeat).toHaveBeenCalledTimes(2);
  });

  it('не запускает параллельный heartbeat и прекращает его после unmount', async () => {
    vi.useFakeTimers();
    let resolveHeartbeat!: (value: unknown) => void;
    api.heartbeat.mockReturnValue(new Promise((resolve) => { resolveHeartbeat = resolve; }));
    const { result, unmount } = renderHook(() => useStudentEpisode({ mode: 'standalone', taskId: 'task-1' }));
    await act(async () => Promise.resolve());
    expect(result.current.phase).toBe('active');

    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(api.heartbeat).toHaveBeenCalledTimes(1);
    unmount();
    resolveHeartbeat({ status: 200, data: activeEpisode });
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(api.heartbeat).toHaveBeenCalledTimes(1);
  });

  it('запрещает partial без попытки и передаёт разные mode', async () => {
    const { result } = renderHook(() => useStudentEpisode({ mode: 'standalone', taskId: 'task-1' }));
    await waitFor(() => expect(result.current.phase).toBe('active'));
    await act(async () => expect(result.current.acceptPartialResult()).resolves.toBe(false));
    expect(api.finalize).not.toHaveBeenCalled();

    act(() => result.current.recordAttempt(attempt()));
    await act(async () => expect(result.current.acceptPartialResult()).resolves.toBe(true));
    expect(api.finalize.mock.calls[0][1]).toEqual({ mode: 'AcceptPartialResult' });

    const second = renderHook(() => useStudentEpisode({ mode: 'standalone', taskId: 'task-2' }));
    await waitFor(() => expect(second.result.current.phase).toBe('active'));
    await act(async () => expect(second.result.current.abandon()).resolves.toBe(true));
    expect(api.finalize.mock.calls[1][1]).toEqual({ mode: 'Abandon' });
    second.unmount();
  });

  it('повторяет неизвестную финализацию с прежним Idempotency-Key', async () => {
    api.finalize.mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce({ status: 200, data: finalizedEpisode });
    const { result } = renderHook(() => useStudentEpisode({ mode: 'standalone', taskId: 'task-1' }));
    await waitFor(() => expect(result.current.phase).toBe('active'));
    act(() => result.current.recordAttempt(attempt()));

    await act(async () => expect(result.current.acceptPartialResult()).resolves.toBe(false));
    await act(async () => expect(result.current.acceptPartialResult()).resolves.toBe(true));
    expect(api.finalize.mock.calls[0][2]['Idempotency-Key']).toBe(api.finalize.mock.calls[1][2]['Idempotency-Key']);
  });

  it('останавливает submit и heartbeat по серверному canSubmit=false', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStudentEpisode({ mode: 'standalone', taskId: 'task-1' }));
    await act(async () => Promise.resolve());
    act(() => result.current.recordAttempt(attempt({ canSubmit: false, isPassed: true, score: 100 })));
    expect(result.current.phase).toBe('finalized');
    expect(result.current.isReadyForSubmission).toBe(false);
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(api.heartbeat).not.toHaveBeenCalled();
  });
});
