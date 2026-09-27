import { NavLink } from 'react-router-dom';
import './TeacherSidebar.css';

const items = [
  { to: '/teacher/topics', label: 'Темы', shortLabel: 'Т' },
  { to: '/teacher/databases', label: 'Учебные базы', shortLabel: 'БД' },
  { to: '/teacher/attempts', label: 'Попытки', shortLabel: 'П' },
  { to: '/teacher/dbms', label: 'СУБД', shortLabel: 'SQL' },
] as const;

type Props = { collapsed: boolean; mobileOpened: boolean; onCollapse: () => void; onNavigate: () => void };

export function TeacherSidebar({ collapsed, mobileOpened, onCollapse, onNavigate }: Props) {
  return <>
    <button aria-label="Закрыть меню преподавателя" className={`teacher-sidebar__overlay${mobileOpened ? ' teacher-sidebar__overlay--opened' : ''}`} onClick={onNavigate} type="button" />
    <aside className={`teacher-sidebar${collapsed ? ' teacher-sidebar--collapsed' : ''}${mobileOpened ? ' teacher-sidebar--mobile-opened' : ''}`}>
      <div className="teacher-sidebar__heading"><span className="teacher-sidebar__heading-label">Контур преподавателя</span></div>
      <nav aria-label="Разделы преподавателя" className="teacher-sidebar__nav">
        {items.map((item) => <NavLink
          className={({ isActive }) => `teacher-sidebar__item${isActive ? ' teacher-sidebar__item--active' : ''}`}
          key={item.to}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          to={item.to}
        >
          <span aria-hidden="true" className="teacher-sidebar__icon">{item.shortLabel}</span>
          <span className="teacher-sidebar__label">{item.label}</span>
        </NavLink>)}
      </nav>
      <button className="teacher-sidebar__collapse" onClick={onCollapse} type="button">
        <span aria-hidden="true">{collapsed ? '›' : '‹'}</span><span className="teacher-sidebar__label">Свернуть</span>
      </button>
    </aside>
  </>;
}
