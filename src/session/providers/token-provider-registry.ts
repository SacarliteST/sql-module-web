import type { TokenProvider } from '../model';
import { getActiveLaunchContext } from '../launch/launch-context';
import { decodeSessionUser } from '../lib/decode-session-user';
import { createHandoffTokenProvider, HANDOFF_ACCESS_TOKEN_STORAGE_KEY } from './handoff-token-provider';
import { createStandaloneTokenProvider } from './standalone-token-provider';

const standaloneTokenProvider = createStandaloneTokenProvider();
const handoffTokenProvider = createHandoffTokenProvider();
const storedHandoffToken = typeof sessionStorage !== 'undefined'
  ? sessionStorage.getItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY)
  : null;
const storedHandoffUser = storedHandoffToken ? decodeSessionUser(storedHandoffToken) : null;
const canRestoreStudentHandoff = storedHandoffUser?.roles.includes('Student') && Boolean(getActiveLaunchContext());
const canRestoreTeacherHandoff = storedHandoffUser?.roles.some((role) => role === 'Teacher' || role === 'Admin') ?? false;
let activeTokenProvider: TokenProvider = storedHandoffToken && (canRestoreStudentHandoff || canRestoreTeacherHandoff)
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
