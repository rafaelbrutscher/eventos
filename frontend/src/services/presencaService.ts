// /src/services/presencaService.ts
import { createPrivateApi } from './api';

// Seguindo seu diagrama (porta 8003)
const PRESENCA_SERVICE_URL = 'http://localhost:8003/api';

// API privada para Presenças
const privateApi = createPrivateApi(PRESENCA_SERVICE_URL);

// --- Tipos ---

// O que enviamos para a API de presença
export interface PresencaPayload {
  user_id: string | number;
  event_id: string | number;
}

// O que a API retorna
export interface Presenca {
  id: string | number;
  user_id: string | number;
  event_id: string | number;
  checkin_at: string;
}

// --- Funções da API ---

/**
 * Registra a presença (check-in) de um usuário em um evento.
 * Corresponde a: POST /presencas
 */
export const registrarPresenca = async (payload: PresencaPayload): Promise<Presenca> => {
  try {
    const { data } = await privateApi.post<Presenca>('/presencas', payload);
    return data;
  } catch (error: any) {
    console.error("Erro ao registrar presença:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao registrar presença');
  }
};