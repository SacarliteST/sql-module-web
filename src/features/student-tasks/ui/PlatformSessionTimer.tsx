import { Badge } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';

function remainingMilliseconds(expiresAt: string): number {
  const deadline = Date.parse(expiresAt);
  return Number.isFinite(deadline) ? Math.max(0, deadline - Date.now()) : 0;
}

function formatRemaining(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const restSeconds = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
}

export function PlatformSessionTimer({ expiresAt, onExpired }: { expiresAt?: string | null; onExpired: () => void }) {
  const [remaining, setRemaining] = useState(() => expiresAt ? remainingMilliseconds(expiresAt) : null);
  const expirationReported = useRef(false);

  useEffect(() => {
    expirationReported.current = false;
    if (!expiresAt) {
      setRemaining(null);
      return;
    }

    const update = () => {
      const next = remainingMilliseconds(expiresAt);
      setRemaining(next);
      if (next === 0 && !expirationReported.current) {
        expirationReported.current = true;
        onExpired();
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, onExpired]);

  if (!expiresAt) return <Badge color="gray" size="lg" variant="light">Без ограничения времени</Badge>;
  if (remaining === null || remaining === 0) return <Badge aria-live="polite" color="red" size="lg" variant="filled">Время истекло</Badge>;

  const color = remaining <= 60_000 ? 'red' : remaining <= 5 * 60_000 ? 'orange' : 'indigo';
  return <Badge color={color} size="lg" variant={remaining <= 60_000 ? 'filled' : 'light'}>
    Осталось {formatRemaining(remaining)}
  </Badge>;
}
