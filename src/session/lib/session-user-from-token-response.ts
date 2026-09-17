import type { SessionUser, UserRole } from '../model';
import { decodeSessionUser } from './decode-session-user';

const knownRoles = new Set<UserRole>(['Teacher', 'Student', 'Admin']);

function normalizeRoles(roles?: string[] | null): UserRole[] {
  return (roles ?? []).filter((role): role is UserRole => knownRoles.has(role as UserRole));
}

/**
 * Минимальный общий контур ответа логина: и IdentityService (прямой логин), и
 * standalone-прокси SqlModule (логин + обмен) возвращают как минимум accessToken —
 * остальные поля декодируются из самого JWT, а не из тела ответа.
 */
export type LoginTokenResponse = {
  accessToken?: string | null;
  userId?: string | null;
  email?: string | null;
  roles?: string[] | null;
};

export function createSessionUserFromTokenResponse(response: LoginTokenResponse): SessionUser | null {
  if (response.accessToken) {
    const userFromToken = decodeSessionUser(response.accessToken);

    if (userFromToken) {
      const responseRoles = normalizeRoles(response.roles);

      return {
        ...userFromToken,
        email: userFromToken.email ?? response.email ?? undefined,
        roles: userFromToken.roles.length > 0 ? userFromToken.roles : responseRoles,
      };
    }
  }

  if (!response.userId) {
    return null;
  }

  return {
    id: response.userId,
    email: response.email ?? undefined,
    roles: normalizeRoles(response.roles),
  };
}
