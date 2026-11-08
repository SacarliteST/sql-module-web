import { describe, expect, it, vi } from 'vitest';
import type { SessionFinalizationResponse } from '../../../api/sqlmodule/model';
import { completePlatformReturn } from './complete-platform-return';

const response = (overrides: Partial<SessionFinalizationResponse> = {}): SessionFinalizationResponse => ({
  status: 'Completed',
  bestScore: 70,
  finalScore: 70,
  isPassed: true,
  reason: 'Manual',
  finalizedAt: new Date(0).toISOString(),
  canReturnToEducation: true,
  returnUrl: 'https://education.example/result/session-1',
  ...overrides,
});

function dependencies(events: string[]) {
  return {
    clearTokens: vi.fn(async () => { events.push('tokens'); }),
    clearContext: vi.fn(() => { events.push('context'); }),
    clearSession: vi.fn(() => { events.push('session'); }),
    resetTokenProvider: vi.fn(() => { events.push('provider'); }),
    navigate: vi.fn(() => { events.push('redirect'); }),
  };
}

describe('completePlatformReturn', () => {
  it('не очищает handoff и не перенаправляет на несовпадающий URL', async () => {
    const events: string[] = [];
    const deps = dependencies(events);
    const result = await completePlatformReturn(
      response({ returnUrl: 'https://evil.example/result' }),
      { sessionId: 'session-1', taskId: 'task-1', returnUrl: 'https://education.example/result/session-1' },
      deps,
    );

    expect(result).toBe('untrusted-url');
    expect(events).toEqual([]);
  });

  it('оставляет сессию на месте, пока callback не разрешил возврат', async () => {
    const events: string[] = [];
    const result = await completePlatformReturn(
      response({ canReturnToEducation: false, returnUrl: null }),
      { sessionId: 'session-1', taskId: 'task-1', returnUrl: 'https://education.example/result/session-1' },
      dependencies(events),
    );

    expect(result).toBe('callback-pending');
    expect(events).toEqual([]);
  });

  it('очищает handoff перед переходом на доверенный URL', async () => {
    const events: string[] = [];
    const deps = dependencies(events);
    const result = await completePlatformReturn(
      response(),
      { sessionId: 'session-1', taskId: 'task-1', returnUrl: 'https://education.example/result/session-1' },
      deps,
    );

    expect(result).toBe('returned');
    expect(events).toEqual(['tokens', 'context', 'session', 'provider', 'redirect']);
    expect(deps.navigate).toHaveBeenCalledWith('https://education.example/result/session-1');
  });
});
