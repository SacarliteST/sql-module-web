import { Badge, Button, Group, Text } from '@mantine/core';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  clearActiveLaunchContext,
  clearActiveTokens,
  getDefaultSessionRoute,
  RequireHandoffScope,
  resetActiveTokenProvider,
  useSessionStore,
} from '../../session';
import './AppLayout.css';

function canSeeTeacher(roles: string[]): boolean {
  return roles.includes('Teacher') || roles.includes('Admin');
}

function canSeeStudent(roles: string[]): boolean {
  return roles.includes('Student');
}

function canSeeAdmin(roles: string[]): boolean {
  return roles.includes('Admin');
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clearSession);
  const mode = useSessionStore((state) => state.mode);
  const handoffKind = useSessionStore((state) => state.handoffKind);
  const isStudentHandoff = mode === 'handoff' && handoffKind === 'student';
  const userRoles = user?.roles ?? [];
  const navigationItems = [
    {
      to: '/',
      label: 'Главная',
      visible: status === 'authenticated',
    },
    { to: '/admin', label: 'Администратор', visible: canSeeAdmin(userRoles) },
    { to: '/teacher', label: 'Преподаватель', visible: canSeeTeacher(userRoles) },
    { to: '/student', label: 'Студент', visible: canSeeStudent(userRoles) },
  ];
  const isLoginPage = location.pathname === '/login';

  const handleLogout = async () => {
    await clearActiveTokens();
    clearActiveLaunchContext();
    clearSession();
    resetActiveTokenProvider();
    const restoredUser = useSessionStore.getState().user;
    navigate(restoredUser ? getDefaultSessionRoute(restoredUser) : '/login');
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <Group gap="sm" wrap="nowrap">
            <div className="app-shell__logo-placeholder" aria-label="Место под логотип">
              LOGO
            </div>
            <div>
              <h1 className="app-shell__title">SQL Module</h1>
              <Text c="gray.4" size="xs">
                Учебный SQL-модуль
              </Text>
            </div>
            {status === 'authenticated' && user ? (
              <Text className="app-shell__user-name" c="gray.4" size="sm">
                {user.name ?? user.email ?? user.id}
              </Text>
            ) : null}
          </Group>
          {status === 'authenticated' ? (
            <Group gap={6}>
              {userRoles.map((role) => (
                <Badge color="blue" key={role} radius="sm" variant="light">
                  {role}
                </Badge>
              ))}
            </Group>
          ) : null}
        </div>
        {!isStudentHandoff ? <div className="app-shell__nav-row">
          <nav className="app-shell__nav" aria-label="Primary navigation">
            {navigationItems
              .filter((item) => item.visible)
              .map((item) => (
                <NavLink key={`${item.label}:${item.to}`} to={item.to} className="app-shell__nav-link">
                  {item.label}
                </NavLink>
              ))}
          </nav>
          {status === 'authenticated' ? (
            <Button
              color="gray"
              size="xs"
              variant="outline"
              onClick={() => void handleLogout()}
            >
              Выйти
            </Button>
          ) : !isLoginPage ? (
            <Button color="blue" size="xs" variant="filled" onClick={() => navigate('/login')}>
              Войти
            </Button>
          ) : null}
        </div> : <div className="app-shell__nav-row"><Text c="gray.4" size="sm">Платформенное задание · доступ ограничен текущей сессией</Text></div>}
      </header>
      <main className="app-shell__main">
        <RequireHandoffScope><Outlet /></RequireHandoffScope>
      </main>
    </div>
  );
}
