import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getActiveLaunchContext } from '../launch';
import { useSessionStore } from '../store';

export function RequireHandoffScope({ children }: PropsWithChildren) {
  const location = useLocation();
  const mode = useSessionStore((state) => state.mode);
  const handoffKind = useSessionStore((state) => state.handoffKind);

  if (mode !== 'handoff' || handoffKind !== 'student' || location.pathname === '/launch') return children;

  const context = getActiveLaunchContext();
  if (!context) return <Navigate to="/launch" replace />;

  const taskPath = `/student/tasks/${context.taskId}`;
  if (location.pathname !== taskPath) return <Navigate to={taskPath} replace />;

  return children;
}
