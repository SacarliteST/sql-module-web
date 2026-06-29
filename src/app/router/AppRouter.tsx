import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';

function HomePage() {
  return (
    <>
      <h2>Стартовая страница</h2>
      <p>Базовый каркас приложения готов к подключению следующих фаз.</p>
    </>
  );
}

function TeacherPage() {
  return (
    <>
      <h2>Контур преподавателя</h2>
      <p>Здесь появятся каталог СУБД, конструктор схемы, данные и задания.</p>
    </>
  );
}

function StudentPage() {
  return (
    <>
      <h2>Контур студента</h2>
      <p>Здесь появятся задания, SQL-редактор, проверка решений и история попыток.</p>
    </>
  );
}

function NotFoundPage() {
  return (
    <>
      <h2>Страница не найдена</h2>
      <p>Проверьте адрес или вернитесь на стартовую страницу.</p>
    </>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="teacher" element={<TeacherPage />} />
        <Route path="student" element={<StudentPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
