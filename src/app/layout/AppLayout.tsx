import { NavLink, Outlet } from 'react-router-dom';
import { normalizeBasePath } from '../config/base-path';
import { useRuntimeConfig } from '../providers/runtime-config-store';
import './AppLayout.css';

const navigationItems = [
  { to: '/', label: 'Главная' },
  { to: '/teacher', label: 'Teacher' },
  { to: '/student', label: 'Student' },
];

export function AppLayout() {
  const config = useRuntimeConfig();
  const basePath = normalizeBasePath(config.basePath);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <h1 className="app-shell__title">SQLModule</h1>
          <div className="app-shell__meta" aria-label="Runtime config">
            <span>mode: {config.mode}</span>
            <span>base path: {basePath}</span>
          </div>
        </div>
        <nav className="app-shell__nav" aria-label="Основная навигация">
          {navigationItems.map((item) => (
            <NavLink key={item.to} to={item.to} className="app-shell__nav-link">
              {item.label}
            </NavLink>
          ))}
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
