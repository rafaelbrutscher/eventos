// /src/services/api.ts
import axios from 'axios';

/**
 * Cria uma instância de API pública (para Login, Registro, etc.)
 */
export const createPublicApi = (baseURL: string) => {
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

/**
 * Cria uma instância de API privada (Autenticada)
 * Esta função aplica interceptors para enviar o Bearer Token e lidar com refresh automático.
 */
export const createPrivateApi = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Interceptor de request - adiciona o token
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Interceptor de response - trata tokens expirados
  api.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Se o erro for 401 (Unauthorized) e não for uma tentativa de refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Tenta fazer refresh do token
          const refreshResponse = await axios.post(`${baseURL}/refresh`, {}, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          });

          if (refreshResponse.data.success && refreshResponse.data.data.access_token) {
            const newToken = refreshResponse.data.data.access_token;
            localStorage.setItem('authToken', newToken);
            
            // Refaz a requisição original com o novo token
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Se não conseguir fazer refresh, limpar token e redirecionar para login
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
};