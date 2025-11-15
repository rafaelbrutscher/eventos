// /src/services/inscricaoService.ts
import { createPrivateApi } from './api';

// Inscricoes-service roda na porta 8003
const INSCRICOES_SERVICE_URL = 'http://127.0.0.1:8003/api';

// API privada para Inscrições (requer autenticação)
const privateApi = createPrivateApi(INSCRICOES_SERVICE_URL);

// --- Tipos ---
export interface EventoResumido {
  id: string | number;
  nome: string;
  data_inicio: string;
}

// Interface para resposta da API
export interface InscricoesResponse {
  success: boolean;
  data: Inscricao[];
  total: number;
}

// Interface para resposta de criação de inscrição
export interface CriarInscricaoResponse {
  success: boolean;
  message: string;
  data: Inscricao;
}
// O que a API retorna após uma inscrição
export interface Inscricao {
  id: string | number;
  evento_id: string | number;
  usuario_id: string | number; 
  status: 'ativa' | 'cancelada';
  created_at: string;
  status_presenca?: 'presente' | 'ausente' | null;
  evento?: EventoResumido; // Dados do evento
}

// O que precisamos enviar para criar uma inscrição
export interface NovaInscricaoPayload {
  evento_id: string | number;
  // O usuario_id será extraído do token pelo backend
}

// --- Funções da API ---

/**
 * Busca todas as inscrições do usuário logado.
 * Corresponde a: GET /inscricoes
 * (Assumindo que a API filtra pelo usuário do token)
 */
export const getMinhasInscricoes = async (): Promise<Inscricao[]> => {
   try {
    const { data } = await privateApi.get<InscricoesResponse>('/inscricoes');
    return data.data; // A API retorna {success: true, data: [...], total: 1}
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
    const { data } = await privateApi.post<CriarInscricaoResponse>('/inscricoes', payload);
    return data.data; // A API retorna {success: true, message: '...', data: {...}}
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

/**
 * Verifica se o usuário está inscrito em um evento específico.
 * Corresponde a: GET /inscricoes/evento/{evento_id}/check
 */
// Interface para resposta de verificação
export interface VerificarInscricaoResponse {
  success: boolean;
  inscrito: boolean;
  inscricao?: {
    id: number;
    status: string;
    created_at: string;
  } | null;
}

export const verificarInscricao = async (eventoId: string | number): Promise<{inscrito: boolean, inscricao?: any}> => {
  try {
    const { data } = await privateApi.get<VerificarInscricaoResponse>(`/inscricoes/evento/${eventoId}/check`);
    return {
      inscrito: data.inscrito,
      inscricao: data.inscricao
    };
  } catch (error: any) {
    console.error("Erro ao verificar inscrição:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao verificar inscrição');
  }
}