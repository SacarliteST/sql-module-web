import Editor, { loader, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import 'monaco-editor/languages/definitions/sql/register';
import { format } from 'sql-formatter';

type MonacoEnvironment = { getWorker: () => Worker };

(globalThis as typeof globalThis & { MonacoEnvironment?: MonacoEnvironment }).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};
loader.config({ monaco });

type Props = {
  ariaLabel: string;
  disabled?: boolean;
  readOnly?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export default function MonacoSqlEditor({ ariaLabel, disabled, readOnly, value, onChange }: Props) {
  const handleMount: OnMount = (editor) => {
    editor.addAction({
      id: 'sql-format-document',
      label: 'Форматировать SQL',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: () => {
        const model = editor.getModel();
        if (!model) return;
        try {
          const formatted = format(model.getValue(), { keywordCase: 'upper', language: 'sql' });
          editor.pushUndoStop();
          editor.executeEdits('sql-formatter', [{ range: model.getFullModelRange(), text: formatted }]);
          editor.pushUndoStop();
        } catch {
          // Незавершённый SQL остаётся без изменений; backend validation покажет детали.
        }
      },
    });
  };

  return (
    <Editor
      height="280px"
      language="sql"
      loading={null}
      onChange={(nextValue) => onChange(nextValue ?? '')}
      onMount={handleMount}
      options={{
        ariaLabel,
        accessibilitySupport: 'auto',
        automaticLayout: true,
        // Monaco 0.56 включает EditContext-based ввод по умолчанию — он всё ещё
        // помечен в типах как "experimental" и на практике теряет отдельные
        // нажатия (в т.ч. пробел) в некоторых браузерах/раскладках. Классический
        // textarea-ввод годами стабилен, поэтому отключаем EditContext явно.
        editContext: false,
        fontSize: 14,
        minimap: { enabled: false },
        padding: { top: 12, bottom: 12 },
        readOnly: disabled || readOnly,
        scrollBeyondLastLine: false,
        tabSize: 2,
        wordWrap: 'on',
      }}
      theme="vs-light"
      value={value}
    />
  );
}
