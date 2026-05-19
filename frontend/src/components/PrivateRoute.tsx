import { Navigate, useLocation } from 'react-router-dom';
import { useRole } from '../hooks/useRole';

interface Props {
  children:  React.ReactNode;
  adminOnly?: boolean;
}

export default function PrivateRoute({ children, adminOnly = false }: Props) {
  const location               = useLocation();
  const token                  = localStorage.getItem('access_token');
  const { isAdmin, isPharmacien } = useRole();

  // Pas connecté → login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Page réservée admin mais utilisateur est pharmacien → inventaire
  if (adminOnly && isPharmacien) {
    return <Navigate to="/admin/inventaire" replace />;
  }

  return <>{children}</>;
}