import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expiresIn, makeJwt } from '../../test/jwt';
import { markTrainingLaunch } from '../launch/training-launch';
import { HANDOFF_ACCESS_TOKEN_STORAGE_KEY } from './handoff-token-provider';

const studentToken = () => makeJwt({ sub: 'student-1', role: 'Student', exp: expiresIn(900) });

/** Реестр выбирает провайдер при загрузке модуля, поэтому «обновление страницы» — повторный импорт. */
async function loadRegistry() {
  vi.resetModules();
  return await import('./token-provider-registry');
}

describe('провайдер токена после обновления страницы', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('вход в банк заданий продолжает слать токен входа и умеет его очистить', async () => {
    const token = studentToken();
    window.sessionStorage.setItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY, token);
    markTrainingLaunch();

    const registry = await loadRegistry();

    expect(await registry.getActiveAccessToken()).toBe(token);
    await registry.clearActiveTokens();
    expect(window.sessionStorage.getItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('токен студента без метки входа и без контекста платформы не подхватывается', async () => {
    window.sessionStorage.setItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY, studentToken());

    const registry = await loadRegistry();

    expect(await registry.getActiveAccessToken()).toBeNull();
  });
});
