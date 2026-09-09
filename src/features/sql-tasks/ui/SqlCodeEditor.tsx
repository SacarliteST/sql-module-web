import { Button, Group, Input, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import styles from './SqlCodeEditor.module.css';

const MonacoSqlEditor = lazy(() => import('./MonacoSqlEditor'));

type Props = {
  ariaLabel?: string;
  description?: ReactNode;
  disabled?: boolean;
  error?: ReactNode;
  label?: ReactNode;
  maxLength?: number;
  onChange: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  value: string;
};

function FallbackTextarea({ ariaLabel, disabled, onChange, readOnly, value }: Props) {
  return (
    <Textarea
      aria-label={ariaLabel}
      disabled={disabled}
      minRows={9}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder="SELECT ..."
      readOnly={readOnly}
      styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
      value={value}
    />
  );
}

class MonacoErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Monaco SQL editor failed to load; textarea fallback is active.', error, info);
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function SqlCodeEditor({
  ariaLabel = 'SQL-запрос',
  description = 'Используйте read-only SQL. Shift+Alt+F — форматирование, Ctrl+F — поиск.',
  disabled,
  error,
  label = 'SQL-запрос',
  maxLength,
  onChange,
  readOnly,
  required,
  value,
}: Props) {
  const [clearOpened, clearModal] = useDisclosure(false);
  const limitExceeded = typeof maxLength === 'number' && value.length > maxLength;
  const fallback = <FallbackTextarea ariaLabel={ariaLabel} disabled={disabled} onChange={onChange} readOnly={readOnly} value={value} />;
  const formatSql = async () => {
    if (!value.trim()) return;
    try {
      const { format } = await import('sql-formatter');
      onChange(format(value, { keywordCase: 'upper', language: 'sql' }));
    } catch {
      // Незавершённый SQL остаётся без изменений; backend вернёт результат проверки.
    }
  };
  return (
    <Stack gap="xs">
      <Input.Wrapper description={description} error={error} label={label} required={required}>
        <MonacoErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <div className={`${styles.editor} ${error || limitExceeded ? styles.invalid : ''} ${disabled || readOnly ? styles.disabled : ''}`}>
              <MonacoSqlEditor ariaLabel={ariaLabel} disabled={disabled} onChange={onChange} readOnly={readOnly} value={value} />
            </div>
          </Suspense>
        </MonacoErrorBoundary>
      </Input.Wrapper>
      <Group justify="space-between" align="center">
        <Text c={limitExceeded ? 'red' : 'dimmed'} size="xs">
          {maxLength ? `${value.length} / ${maxLength} символов` : `${value.length} символов`}
        </Text>
        {!readOnly ? <Group gap="xs">
          <Button disabled={disabled || !value.trim()} size="xs" variant="default" onClick={() => void formatSql()}>Форматировать</Button>
          <Button color="red" disabled={disabled || !value} size="xs" variant="subtle" onClick={clearModal.open}>Очистить</Button>
        </Group> : null}
      </Group>
      <Modal centered opened={clearOpened} title="Очистить SQL-запрос?" onClose={clearModal.close}>
        <Text size="sm">Весь текст в редакторе будет удалён.</Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={clearModal.close}>Отмена</Button>
          <Button color="red" onClick={() => { onChange(''); clearModal.close(); }}>Очистить</Button>
        </Group>
      </Modal>
    </Stack>
  );
}
