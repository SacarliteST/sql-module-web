import type { PropsWithChildren } from 'react';
import type { UserRole } from '../model';
import { useSessionStore } from '../store';

type RequireRoleProps = PropsWithChildren<{
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}>;

function hasAllowedRole(userRoles: UserRole[], allowedRoles: UserRole[]): boolean {
  return userRoles.some((role) => allowedRoles.includes(role));
}

export function RequireRole({ allowedRoles, children, fallback }: RequireRoleProps) {
  const user = useSessionStore((state) => state.user);

  if (!user || !hasAllowedRole(user.roles, allowedRoles)) {
    return fallback ?? <AccessDeniedPage />;
  }

  return children;
}

export function AccessDeniedPage() {
  return (
    <>
      <h2>Нет доступа</h2>
      <p>У вашей роли нет прав для просмотра этого раздела.</p>
    </>
  );
}
