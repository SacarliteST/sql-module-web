import { NavLink, useLocation } from 'react-router-dom';
import './TeacherContourTabs.css';

const teacherTabs = [
  { value: 'overview', label: 'Обзор', to: '/teacher' },
  { value: 'topics', label: 'Темы', to: '/teacher/topics' },
  { value: 'databases', label: 'Учебные базы', to: '/teacher/databases' },
  { value: 'attempts', label: 'Попытки', to: '/teacher/attempts' },
  { value: 'dbms', label: 'СУБД', to: '/teacher/dbms' },
] as const;

function getActiveTab(pathname: string) {
  if (pathname.startsWith('/teacher/databases')) {
    return 'databases';
  }

  if (pathname.startsWith('/teacher/attempts')) {
    return 'attempts';
  }

  if (pathname.startsWith('/teacher/dbms')) {
    return 'dbms';
  }

  if (pathname === '/teacher') {
    return 'overview';
  }

  return 'topics';
}

export function TeacherContourTabs() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  return (
    <nav className="teacher-contour-tabs" aria-label="Навигация преподавателя">
      {teacherTabs.map((tab) => (
        <NavLink
          key={tab.value}
          to={tab.to}
          className={
            tab.value === activeTab
              ? 'teacher-contour-tabs__item teacher-contour-tabs__item--active'
              : 'teacher-contour-tabs__item'
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
