import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '@/stores/auth.store';
import type { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
}

function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login?session=expired" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export default AuthGuard;
