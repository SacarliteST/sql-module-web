const STORAGE_KEY = 'sql-module:training-launch';
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,99}$/;

/** Запоминает, что вкладка открыта входом из платформы в банк заданий (токен без платформенной сессии). */
export function markTrainingLaunch(storage: Storage = sessionStorage): void {
  try {
    storage.setItem(STORAGE_KEY, '1');
  } catch {
    // хранилище недоступно — после обновления страницы вход придётся повторить с платформы
  }
}

export function isTrainingLaunch(storage: Storage = sessionStorage): boolean {
  try {
    return storage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearTrainingLaunch(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // нечего очищать
  }
}

/**
 * Идентификатор модуля на платформе — последний сегмент базового пути SPA (`/modules/sql` → `sql`).
 * Платформа по нему сама заново выдаёт ссылку в банк, когда доступ студента истёк.
 */
export function resolveModuleSlug(basePath: string | null | undefined): string | null {
  const segments = (basePath ?? '').split('/').filter(Boolean);
  const slug = segments.at(-1)?.toLowerCase() ?? '';
  return SLUG_PATTERN.test(slug) ? slug : null;
}

/**
 * Адрес возврата на платформу после истёкшего доступа: путь входа плюс `relaunch=<slug>`.
 * Без пути возврата уходим на главную платформы. Путь приходит уже проверенным (относительным).
 */
export function buildTrainingReturnUrl(returnPath: string | null, slug: string | null): string {
  if (!returnPath) return '/';
  const url = new URL(returnPath, 'https://platform.invalid');
  if (slug) url.searchParams.set('relaunch', slug);
  return `${url.pathname}${url.search}${url.hash}`;
}
