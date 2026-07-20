import { Route, Routes } from 'react-router-dom';
import { LoginPage, RequireAuth, RequireRole } from '../../session';
import {
  AdminHomePage,
  AdminUsersPage,
  HomePage,
  NotFoundPage,
  StudentHomePage,
  TeacherDatabasesPage,
  TeacherHomePage,
  TeacherTopicsPage,
} from '../../pages';
import { AppLayout } from '../layout/AppLayout';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
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
          path="admin/users"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Admin']}>
                <AdminUsersPage />
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
          path="teacher/topics"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Teacher', 'Admin']}>
                <TeacherTopicsPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="teacher/databases"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Teacher', 'Admin']}>
                <TeacherDatabasesPage />
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
