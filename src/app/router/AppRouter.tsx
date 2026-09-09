import { Loader } from '@mantine/core';
import { lazy, Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import { LaunchPage, LoginPage, RequireAuth, RequireRole } from '../../session';
import {
  AdminEventsPage,
  AdminHomePage,
  AdminSettingsPage,
  AdminUserDetailsPage,
  AdminUsersPage,
  HomePage,
  NotFoundPage,
  TeacherAttemptsPage,
  TeacherDatabaseCreatePage,
  TeacherDatabaseDataPage,
  TeacherDatabaseDetailsPage,
  TeacherDatabaseSchemaPage,
  TeacherDatabasesPage,
  TeacherDbmsPage,
  TeacherHomePage,
  TeacherTaskDetailsPage,
  TeacherTopicDetailsPage,
  TeacherTopicsPage,
} from '../../pages';
import { AppLayout } from '../layout/AppLayout';

const StudentHomePage = lazy(() => import('../../pages/student-home').then((module) => ({ default: module.StudentHomePage })));
const StudentTasksPage = lazy(() => import('../../pages/student-tasks').then((module) => ({ default: module.StudentTasksPage })));
const StudentTaskPage = lazy(() => import('../../pages/student-task').then((module) => ({ default: module.StudentTaskPage })));
const StudentAttemptsPage = lazy(() => import('../../pages/student-attempts').then((module) => ({ default: module.StudentAttemptsPage })));

function StudentRouteLayout() {
  return (
    <RequireAuth>
      <RequireRole allowedRoles={['Student']}>
        <Suspense fallback={<div style={{ display: 'grid', minHeight: 240, placeItems: 'center' }}><Loader aria-label="Загрузка раздела студента" /></div>}>
          <Outlet />
        </Suspense>
      </RequireRole>
    </RequireAuth>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="launch" element={<LaunchPage />} />
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
          path="teacher/topics/:topicId/tasks/:taskId"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['Teacher']}>
                <TeacherTaskDetailsPage />
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
        <Route path="teacher/databases/new" element={<RequireAuth><RequireRole allowedRoles={['Teacher']}><TeacherDatabaseCreatePage /></RequireRole></RequireAuth>} />
        <Route path="teacher/databases/:targetDbId" element={<RequireAuth><RequireRole allowedRoles={['Teacher']}><TeacherDatabaseDetailsPage /></RequireRole></RequireAuth>} />
        <Route path="teacher/databases/:targetDbId/schema" element={<RequireAuth><RequireRole allowedRoles={['Teacher']}><TeacherDatabaseSchemaPage /></RequireRole></RequireAuth>} />
        <Route path="teacher/databases/:targetDbId/data" element={<RequireAuth><RequireRole allowedRoles={['Teacher']}><TeacherDatabaseDataPage /></RequireRole></RequireAuth>} />
        <Route path="teacher/attempts" element={<RequireAuth><RequireRole allowedRoles={['Teacher']}><TeacherAttemptsPage /></RequireRole></RequireAuth>} />
        <Route path="teacher/dbms" element={<RequireAuth><RequireRole allowedRoles={['Teacher']}><TeacherDbmsPage /></RequireRole></RequireAuth>} />
        <Route path="student" element={<StudentRouteLayout />}>
          <Route index element={<StudentHomePage />} />
          <Route path="tasks" element={<StudentTasksPage />} />
          <Route path="tasks/:taskId" element={<StudentTaskPage />} />
          <Route path="attempts" element={<StudentAttemptsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
