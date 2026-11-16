import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expiresIn, makeJwt } from '../../test/jwt';
import { getActiveLaunchContext, setActiveLaunchContext } from '../launch';
import { HANDOFF_ACCESS_TOKEN_STORAGE_KEY, resetActiveTokenProvider } from '../providers';
import { useSessionStore } from '../store';
import { LaunchPage } from './LaunchPage';

const getCurrentSession = vi.hoisted(() => vi.fn());
vi.mock('../../api/sqlmodule/module-integration/module-integration', () => ({
  getCurrentModuleSession: getCurrentSession,
}));

const platformToken = (sessionId: string) => makeJwt({
  sub: 'student-1',
  email: 'student@scoodle.local',
  role: 'Student',
  session_id: sessionId,
  exp: expiresIn(900),
});

function openLaunch(sessionId: string, token: string | null) {
  window.history.replaceState(null, '', `/launch?session=${sessionId}${token ? `#access_token=${token}` : ''}`);
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/launch']}>
        <Routes>
          <Route path="/launch" element={<LaunchPage />} />
          <Route path="/student/tasks/:taskId" element={<div>session-task</div>} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('LaunchPage platform session binding', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.sessionStorage.clear();
    resetActiveTokenProvider();
    useSessionStore.setState({
      accessToken: null,
      user: null,
      status: 'anonymous',
      mode: null,
      handoffKind: null,
    });
    getCurrentSession.mockReset().mockResolvedValue({
      status: 200,
      data: {
        taskId: 'task-current',
        returnUrl: '/student/practices/session-current',
      },
    });
  });

  it('открывает задание при совпадении query session и свежего token claim', async () => {
    setActiveLaunchContext({ sessionId: 'old-session', taskId: 'old-task', returnUrl: '/old' });

    openLaunch('session-current', platformToken('session-current'));

    expect(await screen.findByText('session-task')).toBeInTheDocument();
    expect(getCurrentSession).toHaveBeenCalledTimes(1);
    expect(getActiveLaunchContext()).toEqual({
      sessionId: 'session-current',
      taskId: 'task-current',
      returnUrl: '/student/practices/session-current',
    });
  });

  it('не принимает кешированный токен другой сессии без фрагмента', async () => {
    window.sessionStorage.setItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY, platformToken('old-session'));

    openLaunch('session-current', null);

    expect(await screen.findByText('Ссылка недействительна')).toBeInTheDocument();
    expect(getCurrentSession).not.toHaveBeenCalled();
    expect(screen.queryByText('session-task')).not.toBeInTheDocument();
  });

  it('не принимает свежий токен с session_id другой сессии', async () => {
    openLaunch('session-current', platformToken('other-session'));

    expect(await screen.findByText('Ссылка недействительна')).toBeInTheDocument();
    expect(getCurrentSession).not.toHaveBeenCalled();
  });

  it('повторно открывает ту же практику из истории с валидным фрагментом', async () => {
    window.sessionStorage.setItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY, platformToken('stale-session'));
    const freshToken = platformToken('session-current');

    openLaunch('session-current', freshToken);

    expect(await screen.findByText('session-task')).toBeInTheDocument();
    expect(getCurrentSession).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY)).toBe(freshToken);
  });
});
