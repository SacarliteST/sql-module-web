import { Route, Routes } from 'react-router-dom';
import { LoginPage, RequireAuth, RequireRole } from '../../session';
import { AppLayout } from '../layout/AppLayout';

function HomePage() {
  return (
    <>
      <h2>Start page</h2>
      <p>The base application shell is ready for the next phases.</p>
    </>
  );
}

function TeacherPage() {
  return (
    <>
      <h2>Teacher workspace</h2>
      <p>DBMS catalog, schema builder, datasets, and tasks will appear here.</p>
    </>
  );
}

function StudentPage() {
  return (
    <>
      <h2>Student workspace</h2>
      <p>Tasks, SQL editor, solution checks, and attempt history will appear here.</p>
    </>
  );
}

function NotFoundPage() {
  return (
    <>
      <h2>Page not found</h2>
      <p>Check the address or return to the start page.</p>
    </>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="teacher"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Teacher', 'Admin']}>
                <TeacherPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="student"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Student', 'Admin']}>
                <StudentPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
