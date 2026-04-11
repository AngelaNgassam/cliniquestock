import { Navigate, useLocation } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function PrivateRoute({ children, requiredRole }: Props) {
  const location = useLocation();

  // ✅ Vérifier token ET role depuis localStorage (source de vérité)
  const token = localStorage.getItem('access_token');
  const role  = localStorage.getItem('role');

  // Pas de token → rediriger vers login en mémorisant la page demandée
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role insuffisant
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}