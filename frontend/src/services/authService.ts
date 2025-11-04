// /src/services/authService.ts
import api from './api';

// Definimos os tipos (interfaces) para a requisição e resposta
// Confirmar os campos exatos
interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  // ... (outros dados que a API de login possa retornar, ex: user)
}

/**
 * Tenta autenticar o usuário na API.
 * @param credentials - Email e senha do usuário.
 * @returns Os dados da resposta da API (ex: token de acesso).
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    // Esta chamada SÓ FUNCIONARÁ após o backend mover a rota /login
    // para fora do middleware de autenticação.
    const { data } = await api.post<LoginResponse>('/login', credentials);

    // Se a API retornar o token, podemos salvá-lo (ex: no localStorage)
    if (data.access_token) {
      localStorage.setItem('authToken', data.access_token);
    }

    return data;

  } catch (error: any) {
    // Tratamento básico de erro
    console.error("Erro no login:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao tentar logar');
  }
};

// adicionar login e register futuramente