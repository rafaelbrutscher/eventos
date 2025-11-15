// /src/services/authService.ts
import { createPublicApi, createPrivateApi } from './api';

// !!! Ajuste a porta se necessário
const AUTH_SERVICE_URL = 'http://localhost:8000/api';

// API pública para login/registro
const publicApi = createPublicApi(AUTH_SERVICE_URL);
// API privada para rotas autenticadas do Auth Service
const privateApi = createPrivateApi(AUTH_SERVICE_URL);

interface LoginCredentials { /* ... */ }
interface LoginResponse { /* ... */ }

// --- NOVOS Tipos de Registro ---
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: number | string;
    name: string;
    email: string;
  };
  // (O backend pode ou não retornar um token no registro)
  access_token?: string; 
}

export interface UserProfile {
  id: string | number;
  name: string;
  email: string;
  // Adicione outros campos que podem ser complementados
  cpf?: string;
  telefone?: string;
  instituicao?: string;
}

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    // Use a API pública
    const { data } = await publicApi.post<LoginResponse>('/login', credentials);
    return data;
  } catch (error: any) {
    // ... (lógica de erro)
  }
};

/**
 * Registra um novo usuário no sistema.
 * Corresponde a: POST /register
 */
export const register = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  try {
    // Usa a API pública
    const { data } = await publicApi.post<RegisterResponse>('/register', payload);
    return data;
  } catch (error: any)
  {
    console.error("Erro no registro:", error.response?.data || error.message);
    // O backend (Laravel) geralmente retorna erros de validação
    const validationErrors = error.response?.data?.errors;
    if (validationErrors) {
      // Pega a primeira mensagem de erro
      const firstError = Object.values(validationErrors)[0] as string[];
      throw new Error(firstError[0] || 'Falha na validação dos dados.');
    }
    throw new Error(error.response?.data?.message || 'Falha ao tentar registrar');
  }
};

/**
 * Busca os dados do perfil do usuário logado.
 * Corresponde a: GET /user-profile
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    // Usa a API privada
    const { data } = await privateApi.get<UserProfile>('/user-profile');
    return data;
  } catch (error: any) {
    console.error("Erro ao buscar perfil:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao buscar dados do perfil');
  }
};

/**
 * Atualiza os dados do perfil do usuário logado.
 * (Assumindo um endpoint PUT /user-profile)
 */
export const updateUserProfile = async (payload: Partial<UserProfile>): Promise<UserProfile> => {
  try {
    const { data } = await privateApi.put<UserProfile>('/user-profile', payload);
    return data;
  } catch (error: any) {
    console.error("Erro ao atualizar perfil:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao atualizar perfil');
  }
};