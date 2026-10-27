import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setRuntimeConfig } from '../../app/config/runtime-config-registry';
import { RequireAuth, useSessionStore } from '../../session';
import {
  isTrainingLaunch,
  markTrainingLaunch,
  readPlatformReturnPath,
  savePlatformReturnPath,
} from '../../session/launch';
import { StudentAccessExpiredPage } from './StudentAccessExpiredPage';

const originalLocation = window.location;
const assign = vi.fn();

describe('доступ в банк заданий истёк', () => {
  beforeEach(() => {
    assign.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign },
    });
    setRuntimeConfig({ sqlModuleApiUrl: 'http://api.test', basePath: '/modules/sql', mode: 'standalone' });
    useSessionStore.setState({ status: 'anonymous', mode: null, handoffKind: null, user: null, sessionIssue: null });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('кнопка возвращает на платформу с relaunch и сбрасывает вход', async () => {
    markTrainingLaunch();
    savePlatformReturnPath('/student/training');
    useSessionStore.setState({ sessionIssue: 'handoff-expired' });
    render(<MantineProvider><StudentAccessExpiredPage /></MantineProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Вернуться на платформу' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/student/training?relaunch=sql'));
    expect(isTrainingLaunch()).toBe(false);
    expect(readPlatformReturnPath()).toBeNull();
    expect(useSessionStore.getState().sessionIssue).toBeNull();
  });

  it('без пути возврата уходит на главную платформы', async () => {
    markTrainingLaunch();
    render(<MantineProvider><StudentAccessExpiredPage /></MantineProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Вернуться на платформу' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
  });

  describe('перенаправление после 401', () => {
    function renderAt(path: string) {
      render(
        <MantineProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/student/*" element={<RequireAuth><div>student-area</div></RequireAuth>} />
              <Route path="/teacher/*" element={<RequireAuth><div>teacher-area</div></RequireAuth>} />
              <Route path="/student/access-expired" element={<div>expired-page</div>} />
              <Route path="/teacher/session-expired" element={<div>teacher-expired</div>} />
              <Route path="/login" element={<div>login-page</div>} />
            </Routes>
          </MemoryRouter>
        </MantineProvider>,
      );
    }

    it('студент из банка попадает на «Доступ истёк», а не на логин модуля', () => {
      markTrainingLaunch();
      useSessionStore.setState({ status: 'anonymous', sessionIssue: 'handoff-expired' });

      renderAt('/student/tasks');

      expect(screen.getByText('expired-page')).toBeInTheDocument();
    });

    it('без метки входа в банк поведение прежнее: страница логина', () => {
      useSessionStore.setState({ status: 'anonymous', sessionIssue: 'handoff-expired' });

      renderAt('/student/tasks');

      expect(screen.getByText('login-page')).toBeInTheDocument();
    });

    it('преподавательский вход по-прежнему ведёт на свою страницу истечения', () => {
      useSessionStore.setState({ status: 'anonymous', sessionIssue: 'handoff-expired' });

      renderAt('/teacher/topics');

      expect(screen.getByText('teacher-expired')).toBeInTheDocument();
    });
  });
});
