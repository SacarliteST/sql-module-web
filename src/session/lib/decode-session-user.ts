import { jwtDecode } from 'jwt-decode';
import type { SessionUser, UserRole } from '../model';

type JwtRoleClaim = UserRole | UserRole[] | string | string[] | undefined;

type SessionJwtPayload = {
  sub?: string;
  role?: JwtRoleClaim;
  roles?: JwtRoleClaim;
  name?: string;
  email?: string;
};

const knownRoles = new Set<UserRole>(['Teacher', 'Student', 'Admin']);

function normalizeRoles(roleClaim: JwtRoleClaim): UserRole[] {
  const values = Array.isArray(roleClaim) ? roleClaim : roleClaim ? [roleClaim] : [];

  return values.filter((role): role is UserRole => knownRoles.has(role as UserRole));
}

export function decodeSessionUser(accessToken: string): SessionUser | null {
  try {
    const payload = jwtDecode<SessionJwtPayload>(accessToken);
    const roles = normalizeRoles(payload.role ?? payload.roles);

    if (!payload.sub) {
      return null;
    }

    return {
      id: payload.sub,
      roles,
      name: payload.name,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
