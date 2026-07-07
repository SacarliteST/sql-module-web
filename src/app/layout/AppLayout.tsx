import { Badge, Button, Group, Text } from '@mantine/core';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../session';
import './AppLayout.css';

function canSeeTeacher(roles: string[]): boolean {
  return roles.includes('Teacher') || roles.includes('Admin');
}

function canSeeStudent(roles: string[]): boolean {
  return roles.includes('Student') || roles.includes('Admin');
}

function canSeeAdmin(roles: string[]): boolean {
  return roles.includes('Admin');
}

export function AppLayout() {
  const navigate = useNavigate();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clearSession);
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

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <Group gap="md">
            <h1 className="app-shell__title">SQL Module</h1>
            {status === 'authenticated' && user ? (
              <Text c="gray.4" size="sm">
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
        <div className="app-shell__nav-row">
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
            <Button color="gray" size="xs" variant="outline" onClick={handleLogout}>
              Выйти
            </Button>
          ) : null}
        </div>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
