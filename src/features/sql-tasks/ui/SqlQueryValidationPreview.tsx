import { Alert, Badge, Button, Group, Stack, Table, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import type {
  HttpValidationProblemDetails,
  ProblemDetails,
  ValidateSqlQueryResponse,
} from '../../../api/sqlmodule/model';
import { useValidateSqlQuery } from '../../../api/sqlmodule/training/training';

type SqlQueryValidationPreviewProps = {
  queryText?: string | null;
  targetDbId?: string | null;
  disabled?: boolean;
  onValidationChange?: (isValid: boolean) => void;
};

function getProblemMessage(
  problem: ProblemDetails | HttpValidationProblemDetails | null,
  fallback: string,
): string {
  if (!problem) {
    return fallback;
  }

  if ('errors' in problem && problem.errors) {
    const validationMessages = Object.values(problem.errors).flat();

    if (validationMessages.length > 0) {
      return validationMessages.join(' ');
    }
  }

  return problem.detail?.trim() || problem.title?.trim() || fallback;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'не указано';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatCell(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }

  return value;
}

export function SqlQueryValidationPreview({
  disabled = false,
  onValidationChange,
  queryText,
  targetDbId,
}: SqlQueryValidationPreviewProps) {
  const validateMutation = useValidateSqlQuery();
  const [preview, setPreview] = useState<ValidateSqlQueryResponse | null>(null);
  const [error, setError] = useState('');

  const trimmedQuery = queryText?.trim() ?? '';
  const canValidate = Boolean(trimmedQuery && targetDbId && !disabled);

  useEffect(() => {
    setPreview(null);
    setError('');
    onValidationChange?.(false);
  }, [onValidationChange, targetDbId, trimmedQuery]);

  const handleValidate = async () => {
    if (!targetDbId || !trimmedQuery) {
      setPreview(null);
      setError('Выберите учебную базу и эталонный SQL-запрос.');
      return;
    }

    setPreview(null);
    setError('');

    try {
      const response = await validateMutation.mutateAsync({
        data: {
          queryText: trimmedQuery,
          targetDbId,
        },
      });

      if (response.status === 200) {
        setPreview(response.data);
        onValidationChange?.(response.data.isValid === true);
        return;
      }

      onValidationChange?.(false);
      setError(getProblemMessage(response.data, 'SQL-запрос не прошёл проверку.'));
    } catch {
      onValidationChange?.(false);
      setError('Не удалось отправить SQL-запрос на проверку.');
    }
  };

  const columns = preview?.columns ?? [];
  const sampleRows = preview?.sampleRows ?? [];

  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="sm" wrap="wrap">
        <Group gap="xs" wrap="wrap">
          <Badge color="gray" radius="sm" variant="light">
            read-only sandbox
          </Badge>
          {preview ? (
            <Badge color="green" radius="sm" variant="light">
              {preview.executionTimeMs ?? 0} мс
            </Badge>
          ) : null}
        </Group>
        <Button
          disabled={!canValidate}
          loading={validateMutation.isPending}
          size="xs"
          variant="outline"
          onClick={() => void handleValidate()}
        >
          Проверить SQL
        </Button>
      </Group>

      {error ? (
        <Alert color="red" title="SQL-запрос не прошёл проверку" variant="light">
          {error}
        </Alert>
      ) : null}

      {preview ? (
        <Stack gap="xs">
          <Group gap="xs" wrap="wrap">
            <Badge color={preview.isValid ? 'green' : 'red'} radius="sm" variant="light">
              {preview.isValid ? 'Запрос выполнен' : 'Запрос отклонён'}
            </Badge>
            <Badge color="gray" radius="sm" variant="light">
              Строк: {preview.rowCount ?? sampleRows.length}
            </Badge>
            <Badge color="gray" radius="sm" variant="light">
              Проверено: {formatDateTime(preview.validatedAt)}
            </Badge>
          </Group>

          {columns.length > 0 ? (
            <Table.ScrollContainer minWidth={Math.max(520, columns.length * 160)}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead bg="gray.1">
                  <Table.Tr>
                    {columns.map((column, index) => (
                      <Table.Th key={`${column}-${index}`}>{column || `Колонка ${index + 1}`}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sampleRows.length > 0 ? (
                    sampleRows.map((row, rowIndex) => (
                      <Table.Tr key={`row-${rowIndex}`}>
                        {columns.map((_, columnIndex) => (
                          <Table.Td key={`cell-${rowIndex}-${columnIndex}`}>
                            {formatCell(row[columnIndex])}
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={columns.length}>
                        <Text c="dimmed" size="sm">
                          Запрос выполнился, но preview не содержит строк.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <Text c="dimmed" size="sm">
              Запрос выполнился без табличного результата.
            </Text>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
