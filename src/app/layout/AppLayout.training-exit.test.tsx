import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createHandoffTokenProvider,
  HANDOFF_ACCESS_TOKEN_STORAGE_KEY,
  isTrainingLaunch,
  readPlatformReturnPath,
  setActiveLaunchContext,
  setActiveTokenProvider,
  useSessionStore,
} from '../../session';
import { ACTIVE_LAUNCH_CONTEXT_STORAGE_KEY } from '../../session/launch/launch-context';
import { savePlatformReturnPath } from '../../session/launch/platform-return';
import { markTrainingLaunch } from '../../session/launch/training-launch';
import { AppLayout } from './AppLayout';

describe('AppLayout training exit', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/student/tasks');
    window.sessionStorage.clear();
    useSessionStore.setState({
      accessToken: 'training-token',
      user: { id: 'student-1', roles: ['Student'] },
      status: 'authenticated',
      mode: 'handoff',
      handoffKind: 'student-training',
      standaloneAccessToken: null,
      standaloneUser: null,
      standaloneRefreshToken: null,
    });
    window.sessionStorage.setItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY, 'training-token');
    markTrainingLaunch();
    savePlatformReturnPath('/student/tasks#platform');
    setActiveLaunchContext({ sessionId: 'stale', taskId: 'stale', returnUrl: '/stale' });
    setActiveTokenProvider(createHandoffTokenProvider());
  });

  it('очищает весь контур банка перед возвратом на платформу', async () => {
    render(
      <MantineProvider>
        <MemoryRouter initialEntries={['/student/tasks']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/student/tasks" element={<div>bank</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'На платформу' }));

    await waitFor(() => {
      expect(isTrainingLaunch()).toBe(false);
      expect(readPlatformReturnPath()).toBeNull();
      expect(window.sessionStorage.getItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    });
    expect(window.sessionStorage.getItem(ACTIVE_LAUNCH_CONTEXT_STORAGE_KEY)).toBeNull();
  });
});
