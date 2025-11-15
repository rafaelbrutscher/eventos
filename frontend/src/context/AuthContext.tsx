// /src/context/AuthContext.tsx
import { createContext, useState, useContext, useMemo, useEffect } from 'react';
import type {ReactNode} from 'react';
import { useNavigate } from 'react-router-dom';

// Tipos que o contexto irá prover
interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// Criamos o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Este é o "Provedor" que irá envolver nossa aplicação
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    // Ao carregar, verifica se já existe um token no localStorage
    return localStorage.getItem('authToken');
  });
  const navigate = useNavigate();

  // Verifica se o token existe para definir o estado de autenticação
  const isAuthenticated = !!token;

  // Efeito para atualizar o localStorage quando o token mudar
  useEffect(() => {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }, [token]);

  // Função de Login: atualiza o estado e navega para a Home
  const login = (newToken: string) => {
    setToken(newToken);
    navigate('/');
  };

  // Função de Logout: limpa o estado e navega para o Login
  const logout = () => {
    setToken(null);
    navigate('/login');
  };

  // O 'useMemo' otimiza o contexto, evitando re-renderizações desnecessárias
  const value = useMemo(
    () => ({
      isAuthenticated,
      login,
      logout,
    }),
    [isAuthenticated]
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