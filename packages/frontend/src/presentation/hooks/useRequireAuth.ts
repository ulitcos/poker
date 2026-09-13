import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '../../application/contexts/SessionContext';

export function useRequireAuth(redirectTo = '/login') {
  const { player, isConnecting } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isConnecting && !player) {
      navigate(redirectTo, { state: { from: location.pathname }, replace: true });
    }
  }, [player, isConnecting, navigate, redirectTo, location.pathname]);

  return { player, isConnecting };
}
