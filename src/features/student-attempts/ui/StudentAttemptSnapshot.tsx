import { Alert } from '@mantine/core';
import { AttemptResultSnapshotState } from '../../../api/sqlmodule/model';
import { StudentAttemptResultGrid, type StudentAttemptResultGridProps } from './StudentAttemptResultGrid';

type Props = StudentAttemptResultGridProps & {
  resultSnapshotExpiresAt?: string | null;
  resultSnapshotState?: AttemptResultSnapshotState | string;
};

type SnapshotState = 'available' | 'not-produced' | 'not-stored' | 'expired';

function normalizeSnapshotState(value: Props['resultSnapshotState']): SnapshotState | undefined {
  switch (value) {
    case AttemptResultSnapshotState.Available:
      return 'available';
    case AttemptResultSnapshotState.NotProduced:
      return 'not-produced';
    case AttemptResultSnapshotState.NotStored:
      return 'not-stored';
    case AttemptResultSnapshotState.Expired:
      return 'expired';
    default:
      return undefined;
  }
}

function formatExpiry(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('ru-RU');
}

export function StudentAttemptSnapshot({ resultSnapshotState, resultSnapshotExpiresAt, ...gridProps }: Props) {
  switch (normalizeSnapshotState(resultSnapshotState)) {
    case 'available':
      return <StudentAttemptResultGrid {...gridProps} />;
    case 'not-produced':
      return <Alert color="gray" title="Табличный результат не сформирован">Попытка завершилась до получения безопасного табличного результата.</Alert>;
    case 'not-stored':
      return <Alert color="gray" title="Результат не сохранялся">Для этой попытки сохранённый результат недоступен. Это возможно для попыток, созданных до появления истории результатов.</Alert>;
    case 'expired': {
      const expiredAt = formatExpiry(resultSnapshotExpiresAt);
      return <Alert color="gray" title="Срок хранения результата истёк">Сохранённые строки и колонки удалены{expiredAt ? `. Срок хранения завершился: ${expiredAt}` : ''}. Остальные данные попытки доступны.</Alert>;
    }
    default:
      if (resultSnapshotState === undefined && (gridProps.actualColumns !== undefined || gridProps.actualRows !== undefined)) {
        return <StudentAttemptResultGrid {...gridProps} />;
      }
      return <Alert color="gray" title="Сохранённый результат недоступен">Состояние результата этой попытки не определено.</Alert>;
  }
}
