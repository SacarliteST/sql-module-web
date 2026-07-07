import { Navigate, Route, Routes } from 'react-router-dom';
import {
  LoginPage,
  RequireAuth,
  RequireRole,
  getDefaultSessionRoute,
  useSessionStore,
} from '../../session';
import { AdminHomePage, NotFoundPage, StudentHomePage, TeacherHomePage } from '../../pages';
import { AppLayout } from '../layout/AppLayout';

function EntryRedirect() {
  const user = useSessionStore((state) => state.user);

  return <Navigate to={getDefaultSessionRoute(user)} replace />;
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
                <AdminHomePage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="teacher"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Teacher', 'Admin']}>
                <TeacherHomePage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="student"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Student', 'Admin']}>
                <StudentHomePage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
