export const ACTIVE_LAUNCH_CONTEXT_STORAGE_KEY = 'sql-module-active-launch-context';

export type ActiveLaunchContext = {
  sessionId: string;
  returnUrl: string;
};

function isActiveLaunchContext(value: unknown): value is ActiveLaunchContext {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<ActiveLaunchContext>;

  return (
    typeof candidate.sessionId === 'string' &&
    candidate.sessionId.trim().length > 0 &&
    typeof candidate.returnUrl === 'string' &&
    candidate.returnUrl.trim().length > 0
  );
}

export function getActiveLaunchContext(
  storage: Storage = sessionStorage,
): ActiveLaunchContext | null {
  const serializedContext = storage.getItem(ACTIVE_LAUNCH_CONTEXT_STORAGE_KEY);

  if (!serializedContext) return null;

  try {
    const context: unknown = JSON.parse(serializedContext);

    if (isActiveLaunchContext(context)) return context;
  } catch {
    // Повреждённый контекст не должен превращать standalone-запуск в platform-запуск.
  }

  storage.removeItem(ACTIVE_LAUNCH_CONTEXT_STORAGE_KEY);
  return null;
}

export function setActiveLaunchContext(
  context: ActiveLaunchContext,
  storage: Storage = sessionStorage,
): void {
  if (!isActiveLaunchContext(context)) {
    throw new Error('Active launch context requires sessionId and returnUrl');
  }

  storage.setItem(ACTIVE_LAUNCH_CONTEXT_STORAGE_KEY, JSON.stringify(context));
}

export function clearActiveLaunchContext(storage: Storage = sessionStorage): void {
  storage.removeItem(ACTIVE_LAUNCH_CONTEXT_STORAGE_KEY);
}
