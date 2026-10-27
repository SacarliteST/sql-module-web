import { beforeEach, describe, expect, it } from 'vitest';
import { expiresIn, makeJwt } from '../../test/jwt';
import { markTrainingLaunch, setActiveLaunchContext } from '../launch';
import { HANDOFF_ACCESS_TOKEN_STORAGE_KEY } from '../providers';
import { useSessionStore } from './session-store';

const studentToken = () => makeJwt({ sub: 'student-1', role: 'Student', exp: expiresIn(900) });

async function restore() {
  await useSessionStore.persist.rehydrate();
  return useSessionStore.getState();
}

describe('восстановление входа после обновления страницы', () => {
  beforeEach(() => {
    useSessionStore.setState({ accessToken: null, user: null, status: 'anonymous', mode: null, handoffKind: null });
  });

  it('вход в банк заданий восстанавливается как student-training', async () => {
    window.sessionStorage.setItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY, studentToken());
    markTrainingLaunch();

    const state = await restore();

    expect(state.mode).toBe('handoff');
    expect(state.handoffKind).toBe('student-training');
    expect(state.status).toBe('authenticated');
  });

  it('токен студента без метки входа и без контекста платформы не создаёт сессию', async () => {
    window.sessionStorage.setItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY, studentToken());

    const state = await restore();

    expect(state.mode).toBeNull();
    expect(state.status).toBe('anonymous');
  });

  it('при контексте платформенного задания остаётся режим student, а не банк', async () => {
    window.sessionStorage.setItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY, studentToken());
    setActiveLaunchContext({ sessionId: 's1', taskId: 't1', returnUrl: 'https://platform.example/return' });
    markTrainingLaunch();

    const state = await restore();

    expect(state.handoffKind).toBe('student');
  });
});
