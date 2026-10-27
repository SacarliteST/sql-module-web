import { Alert, Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearActiveLaunchContext,
  clearPlatformReturnPath,
  consumeLaunchToken,
  markTrainingLaunch,
  parsePlatformReturnPath,
  readPlatformReturnPath,
  savePlatformReturnPath,
} from '../launch';
import { decodeSessionUser, hasPlatformSessionClaim } from '../lib';
import {
  createHandoffTokenProvider,
  resetActiveTokenProvider,
  setActiveTokenProvider,
} from '../providers';
import { useSessionStore } from '../store';

type LaunchState = 'loading' | 'invalid-link' | 'students-only';

const BANK_ROUTE = '/student/tasks';

/**
 * Вход студента из платформы в банк заданий. Токен приходит во фрагменте адреса и не связан с платформенной
 * сессией: студент свободно тренируется, а в платформу возвращается по пути из параметра `return`.
 */
export function TrainingLaunchPage() {
  const navigate = useNavigate();
  const setTransientSession = useSessionStore((state) => state.setTransientSession);
  const [state, setState] = useState<LaunchState>('loading');
  const [returnPath, setReturnPath] = useState<string | null>(null);

  useEffect(() => {
    async function launch() {
      const params = new URLSearchParams(window.location.search);
      const requestedReturnPath = parsePlatformReturnPath(params.get('return'));
      setReturnPath(requestedReturnPath);

      const provider = createHandoffTokenProvider();
      const accessToken = consumeLaunchToken() ?? await provider.getAccessToken();
      const user = accessToken ? decodeSessionUser(accessToken) : null;

      // Банк не работает в контексте платформенного задания: прежний контекст запуска сбрасываем.
      clearActiveLaunchContext();

      const reject = async (reason: LaunchState) => {
        await provider.clear?.();
        resetActiveTokenProvider();
        setState(reason);
      };

      if (!accessToken || !user || hasPlatformSessionClaim(accessToken)) {
        await reject('invalid-link');
        return;
      }
      if (!user.roles.includes('Student')) {
        await reject('students-only');
        return;
      }

      await provider.setTokens?.({ accessToken });
      setActiveTokenProvider(provider);
      markTrainingLaunch();
      if (requestedReturnPath) {
        savePlatformReturnPath(requestedReturnPath);
      } else {
        clearPlatformReturnPath();
      }
      setTransientSession({ accessToken, user, kind: 'student-training' });
      navigate(BANK_ROUTE, { replace: true });
    }

    void launch();
  }, [navigate, setTransientSession]);

  if (state === 'loading') {
    return (
      <Center mih={320}>
        <Stack align="center" gap="sm">
          <Loader aria-label="Открытие банка заданий" />
          <Text c="dimmed">Открываем банк заданий…</Text>
        </Stack>
      </Center>
    );
  }

  const studentsOnly = state === 'students-only';
  return (
    <Center mih={320}>
      <Stack maw={520} gap="md">
        <Title order={2}>{studentsOnly ? 'Вход только для студентов' : 'Ссылка недействительна'}</Title>
        <Alert color={studentsOnly ? 'red' : 'orange'}>
          {studentsOnly
            ? 'Банк заданий открывается из платформы под учётной записью студента. Войдите на платформу как студент и откройте банк ещё раз.'
            : 'Ссылка отсутствует, устарела или не подходит для банка заданий. Вернитесь на платформу и откройте банк ещё раз.'}
        </Alert>
        <Button component="a" href={returnPath ?? readPlatformReturnPath() ?? '/'} variant="light">
          Вернуться на платформу
        </Button>
      </Stack>
    </Center>
  );
}
