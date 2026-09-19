import { Alert, Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentModuleSession } from '../../api/sqlmodule/module-integration/module-integration';
import {
  clearActiveLaunchContext,
  consumeLaunchToken,
  setActiveLaunchContext,
} from '../launch';
import { decodeSessionUser } from '../lib';
import {
  createHandoffTokenProvider,
  resetActiveTokenProvider,
  setActiveTokenProvider,
} from '../providers';
import { useSessionStore } from '../store';

type LaunchState = 'loading' | 'invalid-link' | 'unavailable';

export function LaunchPage() {
  const navigate = useNavigate();
  const setTransientSession = useSessionStore((state) => state.setTransientSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [state, setState] = useState<LaunchState>('loading');

  useEffect(() => {
    const controller = new AbortController();

    async function launch() {
      const requestedSessionId = new URLSearchParams(window.location.search).get('session');
      const handoffProvider = createHandoffTokenProvider();
      const accessToken = consumeLaunchToken() ?? await handoffProvider.getAccessToken();
      const user = accessToken ? decodeSessionUser(accessToken) : null;

      clearActiveLaunchContext();

      if (!requestedSessionId || !accessToken || !user || !user.roles.includes('Student')) {
        await handoffProvider.clear?.();
        setState('invalid-link');
        return;
      }

      await handoffProvider.setTokens?.({ accessToken });
      setActiveTokenProvider(handoffProvider);
      setTransientSession({ accessToken, user, kind: 'student' });

      try {
        const response = await getCurrentModuleSession({ signal: controller.signal });

        if (response.status !== 200 || !response.data.taskId || !response.data.returnUrl) {
          await handoffProvider.clear?.();
          clearSession();
          resetActiveTokenProvider();
          setState(response.status === 404 ? 'invalid-link' : 'unavailable');
          return;
        }

        setActiveLaunchContext({
          sessionId: requestedSessionId,
          taskId: response.data.taskId,
          returnUrl: response.data.returnUrl,
        });
        navigate(`/student/tasks/${response.data.taskId}`, { replace: true });
      } catch (error) {
        if (!controller.signal.aborted) {
          await handoffProvider.clear?.();
          clearSession();
          resetActiveTokenProvider();
          setState('unavailable');
        }
      }
    }

    void launch();
    return () => controller.abort();
  }, [clearSession, navigate, setTransientSession]);

  if (state === 'loading') {
    return (
      <Center mih={320}>
        <Stack align="center" gap="sm">
          <Loader aria-label="Открытие задания" />
          <Text c="dimmed">Открываем задание…</Text>
        </Stack>
      </Center>
    );
  }

  const invalidLink = state === 'invalid-link';
  return (
    <Center mih={320}>
      <Stack maw={520} gap="md">
        <Title order={2}>{invalidLink ? 'Ссылка недействительна' : 'Не удалось открыть задание'}</Title>
        <Alert color={invalidLink ? 'orange' : 'red'}>
          {invalidLink
            ? 'Сессия не найдена, завершена или ссылка устарела. Вернитесь на платформу и запустите задание ещё раз.'
            : 'Сервис временно недоступен. Вернитесь на платформу и повторите запуск задания.'}
        </Alert>
        <Button component="a" href="/" variant="light">На главную</Button>
      </Stack>
    </Center>
  );
}
