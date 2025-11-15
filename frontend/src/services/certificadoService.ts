// /src/services/certificadoService.ts
import { createPrivateApi, createPublicApi } from './api';

// Seguindo seu diagrama (porta 8004)
const CERTIFICADOS_SERVICE_URL = 'http://localhost:8004/api';

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
  nome_participante: string;
  nome_evento: string;
  data_emissao: string;
  status: 'valido' | 'invalido';
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
 * Corresponde a: GET /certificados/{id} (ou código)
 * Vamos usar /certificados/validar/{codigo_validacao}
 */
export const validarCertificado = async (codigo: string): Promise<ValidacaoInfo> => {
  try {
    const { data } = await publicApi.get<ValidacaoInfo>(`/certificados/validar/${codigo}`);
    return data;
  } catch (error: any) {
    console.error("Erro ao validar certificado:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Código de validação inválido');
  }
};