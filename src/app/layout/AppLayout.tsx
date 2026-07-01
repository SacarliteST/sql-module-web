import { Button } from '@mantine/core';
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
      label: 'Home',
      visible: status === 'authenticated',
    },
    { to: '/login', label: 'Login', visible: status === 'anonymous' },
    { to: '/admin', label: 'Admin', visible: canSeeAdmin(userRoles) },
    { to: '/teacher', label: 'Teacher', visible: canSeeTeacher(userRoles) },
    { to: '/student', label: 'Student', visible: canSeeStudent(userRoles) },
  ];

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <h1 className="app-shell__title">SQLModule</h1>
        </div>
        <nav className="app-shell__nav" aria-label="Primary navigation">
          {navigationItems
            .filter((item) => item.visible)
            .map((item) => (
              <NavLink key={`${item.label}:${item.to}`} to={item.to} className="app-shell__nav-link">
                {item.label}
              </NavLink>
            ))}
          {status === 'authenticated' ? (
            <Button size="xs" variant="subtle" onClick={handleLogout}>
              Logout
            </Button>
          ) : null}
        </nav>
      </header>
      <main className="app-shell__main">
        <div className="app-shell__panel">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
