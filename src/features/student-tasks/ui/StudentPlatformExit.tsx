import { Button, Text } from '@mantine/core';
import { useState } from 'react';
import {
  buildStudentPlatformLeaveUrl,
  clearActiveLaunchContext,
  clearActiveTokens,
  getActiveLaunchContext,
  resetActiveTokenProvider,
  useSessionStore,
} from '../../../session';
import { ConfirmModal } from '../../../shared/ui';

/**
 * Выход на платформу без завершения прохождения — например, чтобы сначала пройти тест.
 * Сессия на платформе остаётся активной: вернуться можно кнопкой «Продолжить». Отправка попытки
 * и завершение прохождения остаются отдельными кнопками на странице задания.
 */
export function StudentPlatformExit() {
  const [opened, setOpened] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const leave = async () => {
    const context = getActiveLaunchContext();
    const target = context ? buildStudentPlatformLeaveUrl(context.returnUrl) : null;
    if (!target) {
      setOpened(false);
      setUnavailable(true);
      return;
    }
    await clearActiveTokens();
    clearActiveLaunchContext();
    useSessionStore.getState().clearSession();
    resetActiveTokenProvider();
    window.location.assign(target);
  };

  return (
    <>
      <Button variant="default" onClick={() => setOpened(true)}>
        Вернуться на платформу
      </Button>
      <ConfirmModal
        opened={opened}
        title="Выйти на платформу без завершения?"
        message="Прохождение не будет завершено, а попытка не отправится на проверку. Задание останется открытым — продолжить можно на платформе кнопкой «Продолжить». SQL-черновик сохранён на этом устройстве."
        confirmLabel="Вернуться на платформу"
        confirmColor="blue"
        onCancel={() => setOpened(false)}
        onConfirm={() => void leave()}
      />
      {unavailable ? (
        <Text c="red" size="xs">
          Адрес платформы для этой сессии недоступен. Откройте задание с платформы заново.
        </Text>
      ) : null}
    </>
  );
}
