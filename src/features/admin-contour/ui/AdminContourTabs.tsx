import { NavLink, useLocation } from 'react-router-dom';
import './AdminContourTabs.css';

const adminTabs = [
  { value: 'overview', label: 'Обзор', to: '/admin' },
  { value: 'users', label: 'Пользователи', to: '/admin/users' },
  { value: 'events', label: 'Аудит', to: '/admin/events' },
  { value: 'settings', label: 'Настройки', to: '/admin/settings' },
  { value: 'dictionaries', label: 'Справочники', to: '/admin/dictionaries' },
] as const;

function getActiveTab(pathname: string) {
  if (pathname.startsWith('/admin/users')) {
    return 'users';
  }

  if (pathname.startsWith('/admin/settings')) {
    return 'settings';
  }

  if (pathname.startsWith('/admin/events')) {
    return 'events';
  }

  if (pathname.startsWith('/admin/dictionaries')) {
    return 'dictionaries';
  }

  return 'overview';
}

export function AdminContourTabs() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  return (
    <nav className="admin-contour-tabs" aria-label="Навигация администратора">
      {adminTabs.map((tab) => (
        <NavLink
          key={tab.value}
          to={tab.to}
          className={
            tab.value === activeTab
              ? 'admin-contour-tabs__item admin-contour-tabs__item--active'
              : 'admin-contour-tabs__item'
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
