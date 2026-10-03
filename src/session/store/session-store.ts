import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { decodeSessionUser } from '../lib/decode-session-user';
import { getActiveLaunchContext } from '../launch/launch-context';
import { HANDOFF_ACCESS_TOKEN_STORAGE_KEY } from '../providers/handoff-token-provider';
import type { SessionStatus, SessionUser } from '../model';

type SetSessionPayload = {
  accessToken: string;
  refreshToken?: string | null;
  user: SessionUser;
};

type SetTransientSessionPayload = SetSessionPayload & {
  kind: 'student' | 'teacher';
};

type SessionState = {
  accessToken: string | null;
  user: SessionUser | null;
  status: SessionStatus;
  mode: 'standalone' | 'handoff' | null;
  handoffKind: 'student' | 'teacher' | null;
  standaloneAccessToken: string | null;
  standaloneUser: SessionUser | null;
  standaloneRefreshToken: string | null;
  sessionIssue: 'handoff-expired' | null;
  setSession(payload: SetSessionPayload): void;
  setStandaloneTokens(payload: { accessToken: string; refreshToken: string; user?: SessionUser }): void;
  setTransientSession(payload: SetTransientSessionPayload): void;
  setSessionIssue(issue: SessionState['sessionIssue']): void;
  clearSession(): void;
};

type PersistedSessionState = Pick<SessionState, 'accessToken' | 'user'> & { refreshToken: string | null };

const restoreSessionState = (
  persistedState: unknown,
  currentState: SessionState,
): SessionState => {
  const handoffToken = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY)
    : null;
  const handoffUser = handoffToken ? decodeSessionUser(handoffToken) : null;
  const handoffContext = typeof sessionStorage !== 'undefined' ? getActiveLaunchContext() : null;
  const isStudentHandoff = handoffUser?.roles.includes('Student') && Boolean(handoffContext);
  const isTeacherHandoff = handoffUser?.roles.some((role) => role === 'Teacher' || role === 'Admin') ?? false;

  if (handoffToken && handoffUser && (isStudentHandoff || isTeacherHandoff)) {
    return {
      ...currentState,
      accessToken: handoffToken,
      user: handoffUser,
      status: 'authenticated',
      mode: 'handoff',
      handoffKind: isStudentHandoff ? 'student' : 'teacher',
    };
  }

  const persistedSession = persistedState as Partial<PersistedSessionState> | null;

  if (!persistedSession?.accessToken || !persistedSession.user) {
    return currentState;
  }

  const refreshToken = persistedSession.refreshToken ?? null;
  const decodedUser = decodeSessionUser(persistedSession.accessToken);

  if (!decodedUser) {
    // Access-токен истёк, но есть refresh — сессию не теряем: первый же запрос обновит токены.
    if (refreshToken) {
      return {
        ...currentState,
        accessToken: persistedSession.accessToken,
        user: persistedSession.user,
        status: 'authenticated',
        mode: 'standalone',
        handoffKind: null,
        standaloneAccessToken: persistedSession.accessToken,
        standaloneUser: persistedSession.user,
        standaloneRefreshToken: refreshToken,
      };
    }
    return currentState;
  }

  return {
    ...currentState,
    accessToken: persistedSession.accessToken,
    user: {
      ...decodedUser,
      email: decodedUser.email ?? persistedSession.user.email,
      name: decodedUser.name ?? persistedSession.user.name,
      roles: decodedUser.roles.length > 0 ? decodedUser.roles : persistedSession.user.roles,
    },
    status: 'authenticated',
    mode: 'standalone',
    handoffKind: null,
    standaloneAccessToken: persistedSession.accessToken,
    standaloneUser: persistedSession.user,
    standaloneRefreshToken: refreshToken,
  };
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      status: 'anonymous',
      mode: null,
      handoffKind: null,
      standaloneAccessToken: null,
      standaloneUser: null,
      standaloneRefreshToken: null,
      sessionIssue: null,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          user,
          status: 'authenticated',
          mode: 'standalone',
          handoffKind: null,
          standaloneAccessToken: accessToken,
          standaloneUser: user,
          standaloneRefreshToken: refreshToken ?? null,
          sessionIssue: null,
        }),
      setStandaloneTokens: ({ accessToken, refreshToken, user }) =>
        set((state) => ({
          standaloneAccessToken: accessToken,
          standaloneRefreshToken: refreshToken,
          standaloneUser: user ?? state.standaloneUser,
          ...(state.mode === 'standalone' ? { accessToken, user: user ?? state.user } : {}),
        })),
      setTransientSession: ({ accessToken, user, kind }) =>
        set({
          accessToken,
          user,
          status: 'authenticated',
          mode: 'handoff',
          handoffKind: kind,
          sessionIssue: null,
        }),
      setSessionIssue: (sessionIssue) => set({ sessionIssue }),
      clearSession: () =>
        set((state) => {
          const restoreStandalone = state.mode === 'handoff' && state.standaloneAccessToken && state.standaloneUser;

          return {
            accessToken: restoreStandalone ? state.standaloneAccessToken : null,
            user: restoreStandalone ? state.standaloneUser : null,
            status: restoreStandalone ? 'authenticated' : 'anonymous',
            mode: restoreStandalone ? 'standalone' : null,
            handoffKind: null,
            standaloneAccessToken: state.mode === 'standalone' ? null : state.standaloneAccessToken,
            standaloneUser: state.mode === 'standalone' ? null : state.standaloneUser,
            standaloneRefreshToken: state.mode === 'standalone' ? null : state.standaloneRefreshToken,
          };
        }),
    }),
    {
      name: 'sql-module-session',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ standaloneAccessToken, standaloneUser, standaloneRefreshToken }) => ({
        accessToken: standaloneAccessToken,
        user: standaloneUser,
        refreshToken: standaloneRefreshToken,
      }),
      merge: restoreSessionState,
    },
  ),
);
