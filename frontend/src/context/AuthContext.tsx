// /src/context/AuthContext.tsx
import { createContext, useState, useContext, useMemo, useEffect } from 'react';
import type {ReactNode} from 'react';
import { useNavigate } from 'react-router-dom';
import { logout as logoutService } from '../services/authService';

// Tipos para o usuário
interface User {
  id: number;
  name: string;
  email: string;
  role: 'participante' | 'atendente' | 'admin';
}

// Tipos que o contexto irá prover
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string) => void;
  logout: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  canAccessCheckIn: () => boolean;
}

// Criamos o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função para decodificar o token JWT e extrair as informações do usuário
function decodeToken(token: string): User | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decoded = JSON.parse(jsonPayload);
    
    return {
      id: decoded.sub,
      name: decoded.name || '',
      email: decoded.email || '',
      role: decoded.role || 'participante'
    };
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
}

// Este é o "Provedor" que irá envolver nossa aplicação
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    // Ao carregar, verifica se já existe um token no localStorage
    return localStorage.getItem('authToken');
  });
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Verifica se o token existe para definir o estado de autenticação
  const isAuthenticated = !!token && !!user;

  // Efeito para verificar token inicial e atualizar localStorage
  useEffect(() => {
    const initializeAuth = () => {
      const savedToken = localStorage.getItem('authToken');
      if (savedToken) {
        setToken(savedToken);
        const userData = decodeToken(savedToken);
        setUser(userData);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Efeito para atualizar o localStorage quando o token mudar
  useEffect(() => {
    if (token) {
      localStorage.setItem('authToken', token);
      const userData = decodeToken(token);
      setUser(userData);
    } else {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  }, [token]);

  // Função de Login: atualiza o estado e navega para a Home
  const login = (newToken: string) => {
    setToken(newToken);
    navigate('/');
  };

  // Função de Logout: faz logout no backend e limpa o estado
  const logout = async () => {
    try {
      if (token) {
        await logoutService();
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Continua com o logout local mesmo se houver erro
    } finally {
      setToken(null);
      setUser(null);
      navigate('/login');
    }
  };

  // Função para verificar se o usuário tem um role específico
  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  // Função para verificar se pode acessar a funcionalidade de check-in
  const canAccessCheckIn = (): boolean => {
    return hasRole(['admin', 'atendente']);
  };

  // O 'useMemo' otimiza o contexto, evitando re-renderizações desnecessárias
  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      hasRole,
      canAccessCheckIn,
    }),
    [isAuthenticated, isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook customizado para facilitar o uso do contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}