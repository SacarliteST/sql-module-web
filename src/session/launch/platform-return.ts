const STORAGE_KEY = 'sql-module:platform-return';
const MAX_LENGTH = 512;
const TASK_REF_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

/**
 * Путь возврата на платформу принимаем только относительным: один «/» в начале, без «//»,
 * обратных косых черт и управляющих символов. Так параметр из ссылки не может увести
 * преподавателя на чужой сайт (открытый редирект).
 */
export function parsePlatformReturnPath(value: string | null | undefined): string | null {
  if (!value || value.length > MAX_LENGTH) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.includes('\\') || hasControlCharacters(value)) return null;
  return value;
}

export function parseTaskRef(value: string | null | undefined): string | null {
  return value && TASK_REF_PATTERN.test(value) ? value : null;
}

export function savePlatformReturnPath(path: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // хранилище недоступно — кнопка возврата просто не появится
  }
}

export function readPlatformReturnPath(): string | null {
  try {
    return parsePlatformReturnPath(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearPlatformReturnPath(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // нечего очищать
  }
}
