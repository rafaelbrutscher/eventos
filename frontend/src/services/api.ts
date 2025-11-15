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
 * Esta função aplica o interceptor para enviar o Bearer Token.
 */
export const createPrivateApi = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Interceptor que adiciona o token a todas as requisições desta instância
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

  return api;
};