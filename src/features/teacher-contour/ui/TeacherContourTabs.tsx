import { NavLink, useLocation } from 'react-router-dom';
import './TeacherContourTabs.css';

const teacherTabs = [
  { value: 'topics', label: 'Темы', to: '/teacher/topics' },
  { value: 'databases', label: 'Учебные базы', to: '/teacher/databases' },
] as const;

function getActiveTab(pathname: string) {
  if (pathname.startsWith('/teacher/databases')) {
    return 'databases';
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
