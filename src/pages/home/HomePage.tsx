import { Navigate } from 'react-router-dom';
import { getDefaultSessionRoute, useSessionStore } from '../../session';

export function HomePage() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);

  if (status !== 'authenticated' || !user) return <Navigate replace to="/login" />;
  return <Navigate replace to={getDefaultSessionRoute(user)} />;
}
