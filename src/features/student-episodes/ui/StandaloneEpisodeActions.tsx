import { Button, Group } from '@mantine/core';
import { useState } from 'react';
import type { LearningEpisodeFinalizationMode } from '../../../api/sqlmodule/model';
import { ConfirmModal } from '../../../shared/ui';

type Props = {
  attemptsUsed: number;
  bestScore: number | null;
  isFinalizing: boolean;
  onAbandon: () => Promise<boolean>;
  onAcceptPartialResult: () => Promise<boolean>;
  onFinalized: () => void;
};

export function StandaloneEpisodeActions({
  attemptsUsed,
  bestScore,
  isFinalizing,
  onAbandon,
  onAcceptPartialResult,
  onFinalized,
}: Props) {
  const [confirmation, setConfirmation] = useState<LearningEpisodeFinalizationMode | null>(null);
  const acceptingPartial = confirmation === 'AcceptPartialResult';

  const confirm = async () => {
    const completed = acceptingPartial ? await onAcceptPartialResult() : await onAbandon();
    if (!completed) return;
    setConfirmation(null);
    onFinalized();
  };

  return <>
    <Group gap="sm">
      <Button disabled={attemptsUsed === 0 || isFinalizing} variant="light" onClick={() => setConfirmation('AcceptPartialResult')}>
        Принять лучший результат
      </Button>
      <Button color="red" disabled={isFinalizing} variant="outline" onClick={() => setConfirmation('Abandon')}>
        Отказаться от задания
      </Button>
    </Group>
    <ConfirmModal
      confirmColor={acceptingPartial ? 'blue' : 'red'}
      confirmLabel={acceptingPartial ? 'Принять результат' : 'Отказаться'}
      loading={isFinalizing}
      message={acceptingPartial
        ? `Лучший результат: ${bestScore ?? 0} из 100. Эпизод станет окончательным, новые решения отправить будет нельзя.`
        : 'Текущий эпизод будет завершён как неуспешный. Новые решения в нём отправить будет нельзя.'}
      opened={confirmation !== null}
      title={acceptingPartial ? 'Принять частичный результат?' : 'Отказаться от задания?'}
      onCancel={() => setConfirmation(null)}
      onConfirm={() => void confirm()}
    />
  </>;
}
