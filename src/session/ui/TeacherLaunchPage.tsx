import { Alert, Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSqlTaskById } from '../../api/sqlmodule/training/training';
import {
  clearActiveLaunchContext,
  clearPlatformReturnPath,
  consumeLaunchToken,
  parsePlatformReturnPath,
  parseTaskRef,
  savePlatformReturnPath,
} from '../launch';
import { decodeSessionUser } from '../lib';
import {
  createHandoffTokenProvider,
  resetActiveTokenProvider,
  setActiveTokenProvider,
} from '../providers';
import { useSessionStore } from '../store';

type LaunchState = 'loading' | 'invalid-link';

const DEFAULT_TEACHER_ROUTE = '/teacher/topics';

/** Открывает сразу задание из ссылки платформы; при любой неудаче — обычная стартовая страница. */
async function resolveTeacherRoute(taskRef: string | null): Promise<string> {
  if (!taskRef) return DEFAULT_TEACHER_ROUTE;
  try {
    const response = await getSqlTaskById(taskRef);
    if (response.status === 200 && response.data.topicId) {
      return `/teacher/topics/${encodeURIComponent(response.data.topicId)}/tasks/${encodeURIComponent(taskRef)}`;
    }
  } catch {
    // задание недоступно — не блокируем вход
  }
  return DEFAULT_TEACHER_ROUTE;
}

export function TeacherLaunchPage() {
  const navigate = useNavigate();
  const setTransientSession = useSessionStore((state) => state.setTransientSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [state, setState] = useState<LaunchState>('loading');

  useEffect(() => {
    async function launch() {
      const provider = createHandoffTokenProvider();
      const accessToken = consumeLaunchToken() ?? await provider.getAccessToken();
      const user = accessToken ? decodeSessionUser(accessToken) : null;

      clearActiveLaunchContext();

      if (!accessToken || !user || !user.roles.some((role) => role === 'Teacher' || role === 'Admin')) {
        await provider.clear?.();
        if (useSessionStore.getState().mode === 'handoff') clearSession();
        resetActiveTokenProvider();
        setState('invalid-link');
        return;
      }

      await provider.setTokens?.({ accessToken });
      setActiveTokenProvider(provider);
      setTransientSession({ accessToken, user, kind: 'teacher' });

      const params = new URLSearchParams(window.location.search);
      const returnPath = parsePlatformReturnPath(params.get('return'));
      if (returnPath) {
        savePlatformReturnPath(returnPath);
      } else {
        clearPlatformReturnPath();
      }

      navigate(await resolveTeacherRoute(parseTaskRef(params.get('task'))), { replace: true });
    }

    void launch();
  }, [clearSession, navigate, setTransientSession]);

  if (state === 'loading') {
    return (
      <Center mih={320}>
        <Stack align="center" gap="sm">
          <Loader aria-label="Открытие редактора заданий" />
          <Text c="dimmed">Открываем редактор заданий…</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Center mih={320}>
      <Stack maw={520} gap="md">
        <Title order={2}>Ссылка недействительна</Title>
        <Alert color="orange">
          Ссылка отсутствует, устарела или не даёт доступа к редактору заданий. Вернитесь на платформу и откройте модуль ещё раз.
        </Alert>
        <Button component="a" href="/" variant="light">На главную</Button>
      </Stack>
    </Center>
  );
}

export function TeacherSessionExpiredPage() {
  const navigate = useNavigate();
  const setSessionIssue = useSessionStore((state) => state.setSessionIssue);

  const goHome = () => {
    setSessionIssue(null);
    navigate('/', { replace: true });
  };

  return (
    <Center mih={320}>
      <Stack maw={520} gap="md">
        <Title order={2}>Сессия истекла</Title>
        <Alert color="orange">
          Вернитесь на платформу и откройте редактор заданий ещё раз. Несохранённые изменения формы могут быть потеряны.
        </Alert>
        <Button variant="light" onClick={goHome}>На главную</Button>
      </Stack>
    </Center>
  );
}
