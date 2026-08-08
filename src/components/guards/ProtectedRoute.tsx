import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { Skeleton } from '../ui/Skeleton';

/** Blocks everything behind it until `/auth/me` has answered. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="grid h-dvh place-items-center bg-canvas">
        <Skeleton className="h-2 w-40" />
      </div>
    );
  }

  if (status === 'anonymous') {
    // `state.from` is what sends the user back where they were headed.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
