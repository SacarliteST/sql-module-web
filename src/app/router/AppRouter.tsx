import { Route, Routes } from 'react-router-dom';
import { LoginPage, RequireAuth, RequireRole } from '../../session';
import {
  AdminEventsPage,
  AdminHomePage,
  AdminSettingsPage,
  AdminUserDetailsPage,
  AdminUsersPage,
  HomePage,
  NotFoundPage,
  StudentHomePage,
  TeacherDatabasesPage,
  TeacherHomePage,
  TeacherTopicDetailsPage,
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
          path="admin/users/:userId"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Admin']}>
                <AdminUserDetailsPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="admin/events"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Admin']}>
                <AdminEventsPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="admin/settings"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Admin']}>
                <AdminSettingsPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="teacher"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Teacher']}>
                <TeacherHomePage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="teacher/topics"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Teacher']}>
                <TeacherTopicsPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="teacher/topics/:topicId"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Teacher']}>
                <TeacherTopicDetailsPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="teacher/databases"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Teacher']}>
                <TeacherDatabasesPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="student"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Student']}>
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
