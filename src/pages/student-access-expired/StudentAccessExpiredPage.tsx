import { Alert, Button, Center, Stack, Title } from '@mantine/core';
import { getRuntimeConfig } from '../../app/config/runtime-config-registry';
import {
  buildTrainingReturnUrl,
  clearActiveLaunchContext,
  clearActiveTokens,
  clearPlatformReturnPath,
  clearTrainingLaunch,
  readPlatformReturnPath,
  resetActiveTokenProvider,
  resolveModuleSlug,
  useSessionStore,
} from '../../session';

/**
 * Доступ в банк заданий истёк (токен входа из платформы просрочен). Студента возвращаем на платформу
 * с `relaunch=<slug>`: платформа сама один раз выдаст новую ссылку и вернёт его в банк.
 */
export function StudentAccessExpiredPage() {
  const setSessionIssue = useSessionStore((state) => state.setSessionIssue);

  const returnToPlatform = async () => {
    const target = buildTrainingReturnUrl(readPlatformReturnPath(), resolveModuleSlug(getRuntimeConfig().basePath));
    await clearActiveTokens();
    clearActiveLaunchContext();
    resetActiveTokenProvider();
    clearTrainingLaunch();
    clearPlatformReturnPath();
    setSessionIssue(null);
    window.location.assign(target);
  };

  return (
    <Center mih={320}>
      <Stack maw={520} gap="md">
        <Title order={2}>Доступ истёк</Title>
        <Alert color="orange">
          Время доступа к банку заданий закончилось. Вернитесь на платформу: ссылка на банк будет выдана заново,
          и вы продолжите с того же места. Несохранённый SQL остаётся в черновике этого браузера.
        </Alert>
        <Button onClick={() => void returnToPlatform()}>Вернуться на платформу</Button>
      </Stack>
    </Center>
  );
}
