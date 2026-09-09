import { useEffect, useRef, useState } from 'react';

const SAVE_DELAY_MS = 500;
const MAX_STORED_DRAFT_LENGTH = 50_000;

type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';

type Options = { initialValue?: string; studentId?: string; taskId: string };

function draftKey(studentId: string | undefined, taskId: string) {
  return studentId && taskId ? `sql-module:student-draft:v1:${studentId}:${taskId}` : null;
}

function readDraft(key: string | null) {
  if (!key || typeof sessionStorage === 'undefined') return { error: null, value: '' };
  try {
    return { error: null, value: sessionStorage.getItem(key) ?? '' };
  } catch {
    return { error: 'Локальное хранилище недоступно. Черновик не будет сохранён.', value: '' };
  }
}

function writeDraft(key: string | null, value: string) {
  if (!key || typeof sessionStorage === 'undefined') return;
  if (value.length > MAX_STORED_DRAFT_LENGTH) throw new Error('draft-too-large');
  if (value) sessionStorage.setItem(key, value); else sessionStorage.removeItem(key);
}

export function useStudentSqlDraft({ initialValue = '', studentId, taskId }: Options) {
  const key = draftKey(studentId, taskId);
  const initialRead = useRef(readDraft(key));
  const [value, setValue] = useState(initialValue || initialRead.current.value);
  const [restored, setRestored] = useState(Boolean(!initialValue && initialRead.current.value));
  const [status, setStatus] = useState<DraftStatus>(initialRead.current.error ? 'error' : 'idle');
  const [storageError, setStorageError] = useState<string | null>(initialRead.current.error);
  const activeKey = useRef(key);
  const latestValue = useRef(value);
  latestValue.current = value;

  useEffect(() => {
    if (activeKey.current === key) return;
    activeKey.current = key;
    const loaded = readDraft(key);
    const nextValue = initialValue || loaded.value;
    latestValue.current = nextValue;
    setValue(nextValue);
    setRestored(Boolean(!initialValue && loaded.value));
    setStorageError(loaded.error);
    setStatus(loaded.error ? 'error' : 'idle');
  }, [initialValue, key]);

  useEffect(() => {
    if (!key) return;
    setStatus('saving');
    const timeout = window.setTimeout(() => {
      try {
        writeDraft(key, value);
        setStorageError(null);
        setStatus('saved');
      } catch (error) {
        setStorageError(error instanceof Error && error.message === 'draft-too-large'
          ? `Черновик длиннее ${MAX_STORED_DRAFT_LENGTH} символов и не сохранён.`
          : 'Не удалось сохранить черновик в локальном хранилище.');
        setStatus('error');
      }
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [key, value]);

  useEffect(() => () => {
    try { writeDraft(key, latestValue.current); } catch { /* Ошибка уже показывается при debounce-сохранении. */ }
  }, [key]);

  const clearDraft = () => {
    setValue('');
    setRestored(false);
    try {
      writeDraft(key, '');
      setStorageError(null);
      setStatus('saved');
    } catch {
      setStorageError('Не удалось удалить черновик из локального хранилища.');
      setStatus('error');
    }
  };

  return { clearDraft, restored, setValue, status, storageError, value };
}
