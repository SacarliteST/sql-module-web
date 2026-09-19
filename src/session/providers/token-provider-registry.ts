import type { TokenProvider } from '../model';
import { getActiveLaunchContext } from '../launch/launch-context';
import { createHandoffTokenProvider, HANDOFF_ACCESS_TOKEN_STORAGE_KEY } from './handoff-token-provider';
import { createStandaloneTokenProvider } from './standalone-token-provider';

const standaloneTokenProvider = createStandaloneTokenProvider();
const handoffTokenProvider = createHandoffTokenProvider();
let activeTokenProvider: TokenProvider = typeof sessionStorage !== 'undefined' &&
  sessionStorage.getItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY) && getActiveLaunchContext()
  ? handoffTokenProvider
  : standaloneTokenProvider;

export function getActiveTokenProvider(): TokenProvider {
  return activeTokenProvider;
}

export function setActiveTokenProvider(tokenProvider: TokenProvider): void {
  activeTokenProvider = tokenProvider;
}

export function resetActiveTokenProvider(): void {
  activeTokenProvider = standaloneTokenProvider;
}

export async function getActiveAccessToken(): Promise<string | null> {
  return await activeTokenProvider.getAccessToken();
}

export async function clearActiveTokens(): Promise<void> {
  await activeTokenProvider.clear?.();
}
