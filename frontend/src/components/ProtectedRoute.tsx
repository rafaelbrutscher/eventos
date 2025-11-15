// /src/components/ProtectedRoute.tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string | string[];
  requireCheckInAccess?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles, 
  requireCheckInAccess = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, canAccessCheckIn } = useAuth();

  // Ainda carregando
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Não autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar se precisa de acesso ao check-in
  if (requireCheckInAccess && !canAccessCheckIn()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não possui permissão para acessar a funcionalidade de check-in.
          </p>
          <p className="text-sm text-gray-500">
            Apenas usuários com perfil de <strong>atendente</strong> ou <strong>administrador</strong> podem realizar check-ins.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Verificar roles específicos
  if (requiredRoles && !hasRole(requiredRoles)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não possui permissão para acessar esta área.
          </p>
          <p className="text-sm text-gray-500">
            Roles necessários: {Array.isArray(requiredRoles) ? requiredRoles.join(', ') : requiredRoles}
          </p>
          <button 
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}