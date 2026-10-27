import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getActiveLaunchContext } from '../launch';
import { useSessionStore } from '../store';

export function RequireHandoffScope({ children }: PropsWithChildren) {
  const location = useLocation();
  const mode = useSessionStore((state) => state.mode);
  const handoffKind = useSessionStore((state) => state.handoffKind);

  // Банк заданий открыт из платформы: студенту доступен только его контур, без преподавательского и админского.
  if (mode === 'handoff' && handoffKind === 'student-training') {
    return location.pathname === '/student' || location.pathname.startsWith('/student/')
      ? children
      : <Navigate to="/student/tasks" replace />;
  }

  if (mode !== 'handoff' || handoffKind !== 'student' || location.pathname === '/launch') return children;

  const context = getActiveLaunchContext();
  if (!context) return <Navigate to="/launch" replace />;

  const taskPath = `/student/tasks/${context.taskId}`;
  if (location.pathname !== taskPath) return <Navigate to={taskPath} replace />;

  return children;
}
