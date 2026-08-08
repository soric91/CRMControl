import { Navigate, Outlet } from 'react-router';
import type { UserRole } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { LANDING_PATH } from '../../lib/permissions';

export interface RoleGateProps {
  allow: (role: UserRole) => boolean;
}

/**
 * Keeps a whole section out of a role's reach. Convenience only — the backend
 * still answers 403 (or 404) to anyone who types the URL anyway.
 */
export function RoleGate({ allow }: RoleGateProps) {
  const { user } = useAuth();
  if (!user) return null;

  return allow(user.role) ? <Outlet /> : <Navigate to={LANDING_PATH} replace />;
}
