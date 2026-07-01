import { Navigate, Route, Routes } from 'react-router-dom';
import {
  LoginPage,
  RequireAuth,
  RequireRole,
  getDefaultSessionRoute,
  useSessionStore,
} from '../../session';
import { AppLayout } from '../layout/AppLayout';

function EntryRedirect() {
  const user = useSessionStore((state) => state.user);

  return <Navigate to={getDefaultSessionRoute(user)} replace />;
}

function TeacherPage() {
  return (
    <>
      <h2>Teacher workspace</h2>
      <p>DBMS catalog, schema builder, datasets, and tasks will appear here.</p>
    </>
  );
}

function AdminPage() {
  return (
    <>
      <h2>Admin workspace</h2>
      <p>User management and platform administration are handled outside SQLModule.</p>
      <p>This placeholder confirms that the Admin role was recognized successfully.</p>
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
        <Route index element={<EntryRedirect />} />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="admin"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Admin']}>
                <AdminPage />
              </RequireRole>
            </RequireAuth>
          }
        />
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
