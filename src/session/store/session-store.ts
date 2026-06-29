import { create } from 'zustand';
import type { SessionStatus, SessionUser } from '../model';

type SetSessionPayload = {
  accessToken: string;
  user: SessionUser;
};

type SessionState = {
  accessToken: string | null;
  user: SessionUser | null;
  status: SessionStatus;
  setSession(payload: SetSessionPayload): void;
  clearSession(): void;
};

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  user: null,
  status: 'anonymous',
  setSession: ({ accessToken, user }) =>
    set({
      accessToken,
      user,
      status: 'authenticated',
    }),
  clearSession: () =>
    set({
      accessToken: null,
      user: null,
      status: 'anonymous',
    }),
}));
