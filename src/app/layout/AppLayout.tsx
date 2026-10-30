import { Badge, Button, Group, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { standaloneLogout } from '../../api/sqlmodule/auth/auth';
import sqlModuleLogoUrl from '../../assets/sqlmodule-logo.png';
import { TeacherSidebar } from '../../features/teacher-contour';
import {
  clearActiveLaunchContext,
  clearActiveTokens,
  clearPlatformReturnPath,
  clearTrainingLaunch,
  getDefaultSessionRoute,
  readPlatformReturnPath,
  RequireHandoffScope,
  resetActiveTokenProvider,
  useSessionStore,
} from '../../session';
import './AppLayout.css';

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
  const [teacherSidebarCollapsed, setTeacherSidebarCollapsed] = useState(false);
  const [teacherSidebarMobileOpened, setTeacherSidebarMobileOpened] = useState(false);
  const isStudentHandoff = mode === 'handoff' && handoffKind === 'student';
  const isTrainingHandoff = mode === 'handoff' && handoffKind === 'student-training';
  const platformReturnPath = mode === 'handoff' && handoffKind === 'teacher' ? readPlatformReturnPath() : null;
  const userRoles = user?.roles ?? [];
  const navigationItems = [
    { to: '/admin', label: 'Администратор', visible: canSeeAdmin(userRoles) },
    { to: '/student', label: 'Студент', visible: canSeeStudent(userRoles) },
  ];
  const isLoginPage = location.pathname === '/login';
  const isTeacherWorkspace = status === 'authenticated' && location.pathname.startsWith('/teacher') &&
    location.pathname !== '/teacher/launch' && location.pathname !== '/teacher/session-expired';

  useEffect(() => setTeacherSidebarMobileOpened(false), [location.pathname]);

  const handleLogout = async () => {
    const { mode, standaloneRefreshToken } = useSessionStore.getState();
    await clearActiveTokens();
    clearActiveLaunchContext();
    clearPlatformReturnPath();
    clearTrainingLaunch();
    clearSession();
    resetActiveTokenProvider();
    if (mode === 'standalone' && standaloneRefreshToken) {
      // Отзываем refresh-токен на сервере; сбой сети выходу не мешает.
      void standaloneLogout({ refreshToken: standaloneRefreshToken }).catch(() => undefined);
    }
    const restoredUser = useSessionStore.getState().user;
    navigate(restoredUser ? getDefaultSessionRoute(restoredUser) : '/login');
  };

  /** Выход из банка на платформу: вход в банк сбрасывается, возврат идёт по пути из ссылки входа. */
  const handleLeaveTraining = async () => {
    const target = readPlatformReturnPath() ?? '/';
    await clearActiveTokens();
    clearActiveLaunchContext();
    clearPlatformReturnPath();
    clearTrainingLaunch();
    clearSession();
    resetActiveTokenProvider();
    window.location.assign(target);
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <Group gap="sm" wrap="nowrap">
            {isTeacherWorkspace ? <Button
              aria-label="Открыть разделы преподавателя"
              className="app-shell__teacher-menu-button"
              color="gray"
              size="xs"
              variant="outline"
              onClick={() => setTeacherSidebarMobileOpened(true)}
            >
              Меню
            </Button> : null}
            <img
              alt="SQLModule"
              className="app-shell__brand-logo"
              src={sqlModuleLogoUrl}
            />
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
        {isTrainingHandoff ? <div className="app-shell__nav-row">
          <nav className="app-shell__nav" aria-label="Навигация банка заданий">
            <NavLink to="/student/tasks" className="app-shell__nav-link">Банк заданий</NavLink>
            <NavLink to="/student/attempts" className="app-shell__nav-link">Мои попытки</NavLink>
          </nav>
          <Button color="gray" size="xs" variant="default" onClick={() => void handleLeaveTraining()}>
            На платформу
          </Button>
        </div> : !isStudentHandoff ? <div className="app-shell__nav-row">
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
            <Group gap="xs">
              {platformReturnPath ? (
                <Button
                  color="gray"
                  size="xs"
                  variant="default"
                  onClick={() => window.location.assign(platformReturnPath)}
                >
                  Вернуться на платформу
                </Button>
              ) : null}
              {!platformReturnPath ? (
                <Button
                  color="gray"
                  size="xs"
                  variant="outline"
                  onClick={() => void handleLogout()}
                >
                  Выйти
                </Button>
              ) : null}
            </Group>
          ) : !isLoginPage ? (
            <Button color="blue" size="xs" variant="filled" onClick={() => navigate('/login')}>
              Войти
            </Button>
          ) : null}
        </div> : <div className="app-shell__nav-row"><Text c="gray.4" size="sm">Платформенное задание · доступ ограничен текущей сессией</Text></div>}
      </header>
      <div className="app-shell__body">
        {isTeacherWorkspace ? <TeacherSidebar
          collapsed={teacherSidebarCollapsed}
          mobileOpened={teacherSidebarMobileOpened}
          onCollapse={() => setTeacherSidebarCollapsed((value) => !value)}
          onNavigate={() => setTeacherSidebarMobileOpened(false)}
        /> : null}
        <main className="app-shell__main">
          <RequireHandoffScope><Outlet /></RequireHandoffScope>
        </main>
      </div>
    </div>
  );
}
