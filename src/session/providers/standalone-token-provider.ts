import type { TokenProvider } from '../model';
import { useSessionStore } from '../store';

export function createStandaloneTokenProvider(): TokenProvider {
  return {
    getAccessToken: () => useSessionStore.getState().accessToken,
    clear: () => useSessionStore.getState().clearSession(),
  };
}
