import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentSessionStateResponse } from '../../../api/sqlmodule/model';
import { StudentTaskFinalization } from './StudentTaskFinalization';

const finalize = vi.hoisted(() => vi.fn());
vi.mock('../../../api/sqlmodule/module-integration/module-integration', () => ({
  useFinalizeCurrentModuleSession: () => ({ isPending: false, mutateAsync: finalize }),
}));

const session: StudentSessionStateResponse = {
  status: 'Active',
  bestScore: 55,
  attemptsUsed: 1,
  maxAttempts: 3,
  attemptsRemaining: 2,
  canSubmit: true,
  canFinalize: true,
  isPassed: false,
  expiresAt: null,
  finalScore: null,
  finalizationReason: null,
  finalizedAt: null,
};

function openFinalization() {
  render(<MantineProvider><StudentTaskFinalization session={session} passingScore={70} onFinalized={vi.fn()} /></MantineProvider>);
}

describe('StudentTaskFinalization', () => {
  beforeEach(() => finalize.mockReset().mockResolvedValue({
    status: 200,
    data: {
      status: 'Completed',
      bestScore: 55,
      finalScore: 55,
      isPassed: false,
      reason: 'Manual',
      finalizedAt: new Date(0).toISOString(),
      canReturnToEducation: false,
      returnUrl: null,
    },
  }));

  it.each([
    ['Завершить с лучшим результатом и вернуться', 'Завершить и вернуться', 'AcceptPartialResult'],
    ['Отказаться и вернуться', 'Отказаться и вернуться', 'Abandon'],
  ])('передаёт явный mode через platform finalize: %s', async (openLabel, confirmLabel, mode) => {
    openFinalization();
    fireEvent.click(screen.getByRole('button', { name: openLabel }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));

    await waitFor(() => expect(finalize).toHaveBeenCalledTimes(1));
    expect(finalize.mock.calls[0][0].data).toEqual({ mode });
    expect(finalize.mock.calls[0][0].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
