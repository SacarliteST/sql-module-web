import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { decodeSessionUser } from '../lib/decode-session-user';
import type { SessionStatus, SessionUser } from '../model';

type SetSessionPayload = {
  accessToken: string;
  user: SessionUser;
};

type SessionState = {
  accessToken: string | null;
  user: SessionUser | null;
  status: SessionStatus;
  mode: 'standalone' | 'handoff' | null;
  standaloneAccessToken: string | null;
  standaloneUser: SessionUser | null;
  sessionIssue: 'handoff-expired' | null;
  setSession(payload: SetSessionPayload): void;
  setTransientSession(payload: SetSessionPayload): void;
  setSessionIssue(issue: SessionState['sessionIssue']): void;
  clearSession(): void;
};

type PersistedSessionState = Pick<SessionState, 'accessToken' | 'user'>;

const restoreSessionState = (
  persistedState: unknown,
  currentState: SessionState,
): SessionState => {
  const persistedSession = persistedState as Partial<PersistedSessionState> | null;

  if (!persistedSession?.accessToken || !persistedSession.user) {
    return currentState;
  }

  const decodedUser = decodeSessionUser(persistedSession.accessToken);

  if (!decodedUser) {
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
    standaloneAccessToken: persistedSession.accessToken,
    standaloneUser: persistedSession.user,
  };
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      status: 'anonymous',
      mode: null,
      standaloneAccessToken: null,
      standaloneUser: null,
      sessionIssue: null,
      setSession: ({ accessToken, user }) =>
        set({
          accessToken,
          user,
          status: 'authenticated',
          mode: 'standalone',
          standaloneAccessToken: accessToken,
          standaloneUser: user,
          sessionIssue: null,
        }),
      setTransientSession: ({ accessToken, user }) =>
        set({
          accessToken,
          user,
          status: 'authenticated',
          mode: 'handoff',
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
            standaloneAccessToken: state.mode === 'standalone' ? null : state.standaloneAccessToken,
            standaloneUser: state.mode === 'standalone' ? null : state.standaloneUser,
          };
        }),
    }),
    {
      name: 'sql-module-session',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ standaloneAccessToken, standaloneUser }) => ({
        accessToken: standaloneAccessToken,
        user: standaloneUser,
      }),
      merge: restoreSessionState,
    },
  ),
);
