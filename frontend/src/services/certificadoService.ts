// /src/services/certificadoService.ts
import { createPrivateApi, createPublicApi } from './api';

// Seguindo seu diagrama (porta 8004)
const CERTIFICADOS_SERVICE_URL = 'http://177.44.248.89:8005/api';

// API privada para Certificados
const privateApi = createPrivateApi(CERTIFICADOS_SERVICE_URL);

const publicApi = createPublicApi(CERTIFICADOS_SERVICE_URL);

// --- Tipos ---

// Tipo para um evento que o usuário participou e pode gerar cert.
export interface EventoConcluido {
  id: string | number;
  nome: string;
  data_conclusao: string;
}

// Tipo para o certificado gerado
export interface Certificado {
  id: string | number;
  codigo_validacao: string;
  url_validacao: string;
  link_pdf: string; // URL para o PDF do certificado
}

export interface ValidacaoInfo {
  valido: boolean;
  codigo: string;
  participante_nome?: string;
  evento_nome?: string;
  mensagem: string;
}

// --- Funções da API ---

/**
 * Busca a lista de eventos que o usuário participou
 * e está apto a emitir certificado.
 * (Novo endpoint, ex: GET /certificados/aptos)
 */
export const getEventosConcluidos = async (): Promise<EventoConcluido[]> => {
  try {
    // O PDF diz "são listados todos os eventos que o mesmo participou"
    const { data } = await privateApi.get<EventoConcluido[]>('/certificados/aptos');
    return data;
  } catch (error: any) {
    console.error("Erro ao buscar eventos concluídos:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao buscar eventos');
  }
};

/**
 * Solicita a emissão de um certificado para um evento.
 * Corresponde a: POST /certificados
 */
export const emitirCertificado = async (eventId: string | number): Promise<Certificado> => {
  try {
    const { data } = await privateApi.post<Certificado>('/certificados', { event_id: eventId });
    return data;
  } catch (error: any) {
    console.error("Erro ao emitir certificado:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Falha ao emitir certificado');
  }
};

/**
 * Verifica a autenticidade de um certificado
 * Corresponde a: GET /certificados/validar/{codigo_validacao}
 * Retorna informações detalhadas sobre a validade do certificado
 */
export const validarCertificado = async (codigo: string): Promise<ValidacaoInfo> => {
  try {
    const { data } = await publicApi.get<ValidacaoInfo>(`/certificados/validar/${codigo}`);
    return data;
  } catch (error: any) {
    // Se for 404, o Django retorna dados na resposta mesmo com erro
    if (error.response?.status === 404 && error.response?.data) {
      return error.response.data;
    }
    
    // Tratar diferentes tipos de erro
    if (error.response?.status === 500) {
      throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
    }
    
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
    }
    
    console.error("Erro ao validar certificado:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.response?.data?.erro || 'Erro ao validar certificado');
  }
};