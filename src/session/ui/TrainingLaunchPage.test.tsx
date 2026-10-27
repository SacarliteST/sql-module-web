import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { expiresIn, makeJwt } from '../../test/jwt';
import { HANDOFF_ACCESS_TOKEN_STORAGE_KEY } from '../providers';
import { isTrainingLaunch, readPlatformReturnPath } from '../launch';
import { useSessionStore } from '../store';
import { TrainingLaunchPage } from './TrainingLaunchPage';

const studentToken = () => makeJwt({ sub: 'student-1', role: 'Student', exp: expiresIn(900) });

function openLaunch(search: string, token: string | null) {
  window.history.replaceState(null, '', `/student/launch${search}${token ? `#access_token=${token}` : ''}`);
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/student/launch']}>
        <Routes>
          <Route path="/student/launch" element={<TrainingLaunchPage />} />
          <Route path="/student/tasks" element={<div>bank-catalog</div>} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('TrainingLaunchPage', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    useSessionStore.setState({
      accessToken: null,
      user: null,
      status: 'anonymous',
      mode: null,
      handoffKind: null,
    });
  });

  it('принимает токен студента без платформенной сессии и открывает банк', async () => {
    openLaunch('?return=%2Fstudent%2Ftraining', studentToken());

    expect(await screen.findByText('bank-catalog')).toBeInTheDocument();
    const state = useSessionStore.getState();
    expect(state.mode).toBe('handoff');
    expect(state.handoffKind).toBe('student-training');
    expect(state.user?.id).toBe('student-1');
    expect(isTrainingLaunch()).toBe(true);
    expect(readPlatformReturnPath()).toBe('/student/training');
    expect(window.sessionStorage.getItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY)).not.toBeNull();
  });

  it('стирает токен из адресной строки', async () => {
    openLaunch('?return=%2Fstudent%2Ftraining', studentToken());

    await screen.findByText('bank-catalog');
    expect(window.location.hash).toBe('');
    expect(window.location.href).not.toContain('access_token');
  });

  it.each(['//evil.example/x', 'https://evil.example/x', '/ok\\..\\evil', 'student/training'])(
    'не принимает небезопасный путь возврата: %s',
    async (unsafe) => {
      openLaunch(`?return=${encodeURIComponent(unsafe)}`, studentToken());

      await screen.findByText('bank-catalog');
      expect(readPlatformReturnPath()).toBeNull();
    },
  );

  it('открывает банк и без пути возврата', async () => {
    openLaunch('', studentToken());

    await screen.findByText('bank-catalog');
    expect(readPlatformReturnPath()).toBeNull();
    expect(useSessionStore.getState().handoffKind).toBe('student-training');
  });

  it('не пускает преподавателя и администратора: вход только для студентов', async () => {
    openLaunch('?return=%2Fstudent%2Ftraining', makeJwt({ sub: 'teacher-1', role: 'Teacher', exp: expiresIn(900) }));

    expect(await screen.findByText('Вход только для студентов')).toBeInTheDocument();
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(isTrainingLaunch()).toBe(false);
    expect(window.sessionStorage.getItem(HANDOFF_ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('отклоняет токен платформенной сессии: он открывает только одно задание', async () => {
    openLaunch('', makeJwt({ sub: 'student-1', role: 'Student', session_id: 'session-1', exp: expiresIn(900) }));

    expect(await screen.findByText('Ссылка недействительна')).toBeInTheDocument();
    expect(useSessionStore.getState().status).toBe('anonymous');
    expect(isTrainingLaunch()).toBe(false);
  });

  it('отклоняет ссылку без токена и просроченный токен', async () => {
    openLaunch('', null);
    expect(await screen.findByText('Ссылка недействительна')).toBeInTheDocument();
  });

  it('просроченный токен — ссылка недействительна', async () => {
    openLaunch('', makeJwt({ sub: 'student-1', role: 'Student', exp: expiresIn(-60) }));

    await waitFor(() => expect(screen.getByText('Ссылка недействительна')).toBeInTheDocument());
    expect(useSessionStore.getState().status).toBe('anonymous');
  });
});
