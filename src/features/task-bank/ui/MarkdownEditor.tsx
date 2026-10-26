import Editor, { loader } from '@monaco-editor/react';
import { Grid, Input, Stack, Text } from '@mantine/core';
import * as monaco from 'monaco-editor/editor/editor.api';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import 'monaco-editor/languages/definitions/markdown/register';
import { SafeMarkdown } from '../../../shared/ui';

(globalThis as typeof globalThis & { MonacoEnvironment?: { getWorker: () => Worker } }).MonacoEnvironment ??= {
  getWorker: () => new EditorWorker(),
};
loader.config({ monaco });

type Props = {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
};

export function MarkdownEditor({ label, value, maxLength, onChange }: Props) {
  const exceeded = value.length > maxLength;
  return <Input.Wrapper label={label} error={exceeded ? `Превышен предел ${maxLength} символов.` : undefined}>
    <Grid mt="xs">
      <Grid.Col span={{ base: 12, md: 6 }}><Stack gap={4}>
        <Editor
          height="260px"
          language="markdown"
          onChange={(next) => onChange(next ?? '')}
          options={{ automaticLayout: true, editContext: false, minimap: { enabled: false }, wordWrap: 'on', scrollBeyondLastLine: false }}
          theme="vs-light"
          value={value}
        />
        <Text c={exceeded ? 'red' : 'dimmed'} size="xs">{value.length} / {maxLength} символов</Text>
      </Stack></Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}><Stack gap={4}><Text c="dimmed" size="xs">Предпросмотр</Text>{value.trim() ? <SafeMarkdown>{value}</SafeMarkdown> : <Text c="dimmed" size="sm">Введите Markdown слева.</Text>}</Stack></Grid.Col>
    </Grid>
  </Input.Wrapper>;
}
