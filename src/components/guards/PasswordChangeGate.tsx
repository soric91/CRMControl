import { Outlet } from 'react-router';
import { ForcedPasswordChangePage } from '../../features/auth/ForcedPasswordChangePage';
import { useAuth } from '../../hooks/useAuth';

/**
 * Stands between the session and the app while the backend answers
 * `password_change_required`. It replaces the route tree rather than
 * redirecting: with a restricted token every screen behind it would fail, so
 * there is nowhere useful to navigate to.
 */
export function PasswordChangeGate() {
  const { passwordChangeRequired } = useAuth();
  return passwordChangeRequired ? <ForcedPasswordChangePage /> : <Outlet />;
}
