import { jwtDecode } from 'jwt-decode';
import type { StandaloneLoginResponse } from '../../api/sqlmodule/model';
import { getRuntimeConfig } from '../../app/config/runtime-config-registry';
import { createSessionUserFromTokenResponse } from '../../session/lib';
import { useSessionStore } from '../../session/store';
import { buildApiUrl } from './build-api-url';

// Путь совпадает с getStandaloneRefreshUrl() из сгенерированного клиента; сам клиент не импортируем:
// он тянет sqlmoduleFetch → create-runtime-fetch → этот модуль (цикл).
const REFRESH_PATH = '/api/v1/auth/refresh';
const LOCK_NAME = 'sql-module-web-refresh-session';
const EXPIRY_LEEWAY_SECONDS = 30;

let inFlight: Promise<boolean> | null = null;

export function accessTokenExpiresWithin(
  accessToken: string | null | undefined,
  seconds: number,
): boolean {
  if (!accessToken) {
    return true;
  }
  try {
    const { exp } = jwtDecode<{ exp?: number }>(accessToken);
    return exp !== undefined && exp * 1000 - Date.now() <= seconds * 1000;
  } catch {
    return true;
  }
}

/** Обновляется только standalone-сессия: handoff-токен платформы refresh-токена не имеет. */
export function canRefreshActiveSession(): boolean {
  const { mode, standaloneRefreshToken } = useSessionStore.getState();
  return mode === 'standalone' && Boolean(standaloneRefreshToken);
}

async function performRefresh(staleAccessToken: string | null): Promise<boolean> {
  // Refresh-токен одноразовый (сервер отзывает все сессии при повторном использовании),
  // а localStorage общий для вкладок: под локом сверяемся с тем, что уже записала другая вкладка.
  await useSessionStore.persist.rehydrate();

  const state = useSessionStore.getState();
  if (state.mode !== 'standalone' || !state.standaloneRefreshToken) {
    return false;
  }
  if (
    state.accessToken !== staleAccessToken &&
    !accessTokenExpiresWithin(state.accessToken, EXPIRY_LEEWAY_SECONDS)
  ) {
    return true;
  }

  const { sqlModuleApiUrl } = getRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(buildApiUrl(sqlModuleApiUrl, REFRESH_PATH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: state.standaloneRefreshToken }),
    });
  } catch {
    // Сеть недоступна — refresh-токен цел, сессию не трогаем.
    return false;
  }

  if (response.status === 401 || response.status === 422) {
    state.clearSession();
    return false;
  }
  if (!response.ok) {
    return false;
  }

  const body = (await response.json().catch(() => null)) as StandaloneLoginResponse | null;
  if (!body?.accessToken || !body.refreshToken) {
    return false;
  }

  state.setStandaloneTokens({
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    user: createSessionUserFromTokenResponse({ accessToken: body.accessToken }) ?? undefined,
  });
  return true;
}

/** Обновляет токены по refresh-токену. Параллельные вызовы делят один запрос; между вкладками — Web Locks. */
export function refreshSession(staleAccessToken?: string | null): Promise<boolean> {
  if (!inFlight) {
    const stale = staleAccessToken === undefined ? useSessionStore.getState().accessToken : staleAccessToken;
    const run = async (): Promise<boolean> =>
      navigator.locks
        ? await navigator.locks.request(LOCK_NAME, () => performRefresh(stale))
        : await performRefresh(stale);
    inFlight = run().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Перед запросом: если access-токен standalone-сессии истёк или вот-вот истечёт — тихо обновляем его. */
export async function ensureFreshAccessToken(): Promise<void> {
  if (
    canRefreshActiveSession() &&
    accessTokenExpiresWithin(useSessionStore.getState().accessToken, EXPIRY_LEEWAY_SECONDS)
  ) {
    await refreshSession();
  }
}
