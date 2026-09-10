import { Alert, Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearActiveLaunchContext, consumeLaunchToken } from '../launch';
import { decodeSessionUser } from '../lib';
import {
  createHandoffTokenProvider,
  resetActiveTokenProvider,
  setActiveTokenProvider,
} from '../providers';
import { useSessionStore } from '../store';

type LaunchState = 'loading' | 'invalid-link';

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
        clearSession();
        resetActiveTokenProvider();
        setState('invalid-link');
        return;
      }

      await provider.setTokens?.({ accessToken });
      setActiveTokenProvider(provider);
      setTransientSession({ accessToken, user });
      navigate('/teacher/topics', { replace: true });
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
