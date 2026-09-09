import { NavLink, useLocation } from 'react-router-dom';
import styles from './StudentContourTabs.module.css';

const tabs = [
  { label: 'Обзор', to: '/student', exact: true },
  { label: 'Задания', to: '/student/tasks', exact: false },
  { label: 'Мои попытки', to: '/student/attempts', exact: false },
] as const;

export function StudentContourTabs() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Навигация студента" className={styles.tabs}>
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
        return (
          <NavLink className={`${styles.item} ${active ? styles.active : ''}`} key={tab.to} to={tab.to}>
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
