import type { AuthTokens, TokenProvider } from '../model';

export const HANDOFF_ACCESS_TOKEN_STORAGE_KEY = 'sql-module-handoff-token';

export function createHandoffTokenProvider(
  storage: Storage = sessionStorage,
): TokenProvider {
  return {
    getAccessToken: () => storage.getItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY),
    setTokens: ({ accessToken }: AuthTokens) => {
      storage.setItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY, accessToken);
    },
    clear: () => {
      storage.removeItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY);
    },
  };
}
