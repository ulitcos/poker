import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../../application/contexts/SessionContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { player, isConnecting } = useSession();
  const location = useLocation();

  if (isConnecting) {
    return <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: 80 }}>Подключение...</div>;
  }

  if (!player) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
