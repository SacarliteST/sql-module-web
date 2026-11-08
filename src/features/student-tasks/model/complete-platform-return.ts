import type { SessionFinalizationResponse } from '../../../api/sqlmodule/model';
import type { ActiveLaunchContext } from '../../../session';

type PlatformReturnDependencies = {
  clearContext: () => void;
  clearSession: () => void;
  clearTokens: () => Promise<void>;
  navigate: (url: string) => void;
  resetTokenProvider: () => void;
};

export async function completePlatformReturn(
  result: SessionFinalizationResponse,
  context: ActiveLaunchContext | null,
  dependencies: PlatformReturnDependencies,
) {
  if (!result.canReturnToEducation) return 'callback-pending' as const;
  if (!context || !result.returnUrl || result.returnUrl !== context.returnUrl) return 'untrusted-url' as const;

  await dependencies.clearTokens();
  dependencies.clearContext();
  dependencies.clearSession();
  dependencies.resetTokenProvider();
  dependencies.navigate(context.returnUrl);
  return 'returned' as const;
}
