// /src/services/eventService.ts
import { createPublicApi } from './api';

// Eventos-service roda na porta 8002 e as rotas são públicas
const EVENTOS_SERVICE_URL = 'http://127.0.0.1:8002/api';

// API pública para Eventos (rotas não requerem autenticação)
const publicApi = createPublicApi(EVENTOS_SERVICE_URL);

// (Interface Event...)

// Definir interface Event baseada na estrutura real da API
export interface Event {
  id: number;
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  template_certificado: string;
  created_at: string;
  updated_at: string;
}

export const getEvents = async (): Promise<Event[]> => {
  try {
    const { data } = await publicApi.get('/eventos');
    if (data.success) {
      return data.data;
    }
    throw new Error(data.message || 'Falha ao buscar eventos');
  } catch (error: any) {
    console.error('Erro ao buscar eventos:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao buscar eventos');
  }
};

export const getEventById = async (id: string): Promise<Event> => {
  try {
    const { data } = await publicApi.get(`/eventos/${id}`);
    if (data.success) {
      return data.data;
    }
    throw new Error(data.message || 'Evento não encontrado');
  } catch (error: any) {
    console.error('Erro ao buscar evento:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao buscar evento');
  }
};