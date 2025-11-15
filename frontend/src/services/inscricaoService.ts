// /src/services/inscricaoService.ts
import { createPrivateApi } from './api';

// Seguindo seu diagrama, este será o terceiro serviço (porta 8002)
const INSCRICOES_SERVICE_URL = 'http://localhost:8002/api';

// API privada para Inscrições (requer autenticação)
const privateApi = createPrivateApi(INSCRICOES_SERVICE_URL);

// --- Tipos ---
export interface EventoResumido {
  id: string | number;
  nome: string;
  data: string;
}
// O que a API retorna após uma inscrição
export interface Inscricao {
  id: string | number;
  event_id: string | number;
  user_id: string | number; 
  status: 'confirmada' | 'cancelada';
  created_at: string;
  status_presenca?: 'presente' | 'ausente' | null;
  evento?: EventoResumido; // Dados do evento
}

// O que precisamos enviar para criar uma inscrição
export interface NovaInscricaoPayload {
  event_id: string | number;
  // O user_id será extraído do token pelo backend
}

// --- Funções da API ---

/**
 * Busca todas as inscrições do usuário logado.
 * Corresponde a: GET /inscricoes
 * (Assumindo que a API filtra pelo usuário do token)
 */
export const getMinhasInscricoes = async (): Promise<Inscricao[]> => {
   try {
    const { data } = await privateApi.get<Inscricao[]>('/inscricoes');
    return data;
  } catch (error: any) {
    console.error("Erro ao buscar inscrições:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao buscar inscrições');
  }
}

/**
 * Registra o usuário logado em um evento.
 * Corresponde a: POST /inscricoes
 */
export const criarInscricao = async (payload: NovaInscricaoPayload): Promise<Inscricao> => {
  try {
    const { data } = await privateApi.post<Inscricao>('/inscricoes', payload);
    return data;
  } catch (error: any) {
    console.error("Erro ao criar inscrição:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao tentar se inscrever');
  }
};

/**
 * Cancela uma inscrição.
 * Corresponde a: DELETE /inscricoes
 * (Nota: O PDF sugere DELETE /inscricoes. Se for REST, seria /inscricoes/{id})
 */
export const cancelarInscricao = async (inscricaoId: string | number): Promise<void> => {
   try {
    // Assumindo que o padrão REST (DELETE /inscricoes/{id}) será usado
    await privateApi.delete(`/inscricoes/${inscricaoId}`);
  } catch (error: any) {
    console.error("Erro ao cancelar inscrição:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao cancelar inscrição');
  }
}