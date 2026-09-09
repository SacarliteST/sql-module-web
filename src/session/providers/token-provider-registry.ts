import type { TokenProvider } from '../model';
import { createStandaloneTokenProvider } from './standalone-token-provider';

const standaloneTokenProvider = createStandaloneTokenProvider();
let activeTokenProvider: TokenProvider = standaloneTokenProvider;

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
