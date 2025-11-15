// /src/routes/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Se não estiver autenticado, redireciona para a página de login
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado, renderiza o conteúdo da rota (ex: a Home)
  return <Outlet />;
}