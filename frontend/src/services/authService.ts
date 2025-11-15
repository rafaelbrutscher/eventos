// /src/services/authService.ts
import { createPublicApi, createPrivateApi } from './api';

// URL do auth-service (porta 8001)
const AUTH_SERVICE_URL = 'http://127.0.0.1:8001/api';

// API pública para login/registro
const publicApi = createPublicApi(AUTH_SERVICE_URL);
// API privada para rotas autenticadas do Auth Service
const privateApi = createPrivateApi(AUTH_SERVICE_URL);

// Tipos baseados na API do auth-service
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  };
}

export interface UserProfile {
  success: boolean;
  data: {
    id: number;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
  };
}

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const { data } = await publicApi.post<LoginResponse>('/login', credentials);
    return data;
  } catch (error: any) {
    console.error('Erro no login:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Credenciais inválidas';
    throw new Error(errorMessage);
  }
};

/**
 * Registra um novo usuário no sistema.
 * Corresponde a: POST /register
 */
export const register = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  try {
    const { data } = await publicApi.post<RegisterResponse>('/register', payload);
    return data;
  } catch (error: any) {
    console.error('Erro no registro:', error.response?.data || error.message);
    
    // Tratar erros de validação do Laravel
    if (error.response?.data?.errors) {
      const validationErrors = error.response.data.errors;
      const firstError = Object.values(validationErrors)[0] as string[];
      throw new Error(firstError[0] || 'Falha na validação dos dados.');
    }
    
    const errorMessage = error.response?.data?.message || 'Falha ao tentar registrar';
    throw new Error(errorMessage);
  }
};

/**
 * Busca os dados do perfil do usuário logado.
 * Corresponde a: GET /usuario-logado
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const { data } = await privateApi.get<UserProfile>('/usuario-logado');
    return data;
  } catch (error: any) {
    console.error('Erro ao buscar perfil:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Falha ao buscar dados do perfil';
    throw new Error(errorMessage);
  }
};

/**
 * Faz logout do usuário invalidando o token
 * Corresponde a: POST /logout
 */
export const logout = async (): Promise<void> => {
  try {
    await privateApi.post('/logout');
    // Remover token do localStorage
    localStorage.removeItem('authToken');
  } catch (error: any) {
    console.error('Erro no logout:', error.response?.data || error.message);
    // Mesmo com erro, remover o token localmente
    localStorage.removeItem('authToken');
    throw new Error(error.response?.data?.message || 'Falha ao fazer logout');
  }
};

/**
 * Renova o token JWT
 * Corresponde a: POST /refresh
 */
export const refreshToken = async (): Promise<LoginResponse> => {
  try {
    const { data } = await privateApi.post<LoginResponse>('/refresh');
    // Atualizar token no localStorage
    if (data.success && data.data.access_token) {
      localStorage.setItem('authToken', data.data.access_token);
    }
    return data;
  } catch (error: any) {
    console.error('Erro ao renovar token:', error.response?.data || error.message);
    // Se não conseguir renovar, fazer logout
    localStorage.removeItem('authToken');
    throw new Error(error.response?.data?.message || 'Falha ao renovar token');
  }
};