// /src/services/certificadoService.ts
import { createPrivateApi, createPublicApi } from './api';

// Seguindo seu diagrama (porta 8005)
const CERTIFICADOS_SERVICE_URL = 'http://177.44.248.89:8005/api';

// API privada para Certificados
const privateApi = createPrivateApi(CERTIFICADOS_SERVICE_URL);

const publicApi = createPublicApi(CERTIFICADOS_SERVICE_URL);

// Função utilitária para obter user_id do token
const getUserIdFromToken = (): number => {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('Usuário não autenticado');
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const decoded = JSON.parse(jsonPayload);
    return decoded.sub;
  } catch (error) {
    throw new Error('Token inválido');
  }
};

// --- Tipos ---

// Tipo para um evento que o usuário participou e pode gerar cert.
export interface EventoConcluido {
  id: string | number;
  nome: string;
  data_conclusao: string;
  pode_gerar_certificado: boolean;
  certificado_gerado: boolean;
  certificado_id?: number;
  certificado_codigo?: string;
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
 */
export const getEventosConcluidos = async (): Promise<EventoConcluido[]> => {
  try {
    const userId = getUserIdFromToken();
    
    const { data } = await privateApi.get(`/meus-eventos/?user_id=${userId}`);
    
    // Mapear para o formato esperado pelo frontend
    return data.data.map((evento: any) => ({
      id: evento.evento_id,
      nome: evento.nome,
      data_conclusao: evento.data_fim || evento.data_presenca || evento.data_inicio,
      pode_gerar_certificado: evento.pode_gerar_certificado ?? true,
      certificado_gerado: evento.certificado_gerado ?? false,
      certificado_id: evento.certificado_id,
      certificado_codigo: evento.certificado_codigo
    }));
  } catch (error: any) {
    console.error("Erro ao buscar eventos concluídos:", error.response?.data || error.message);
    throw new Error(error.response?.data?.erro || 'Falha ao buscar eventos');
  }
};

/**
 * Solicita a emissão de um certificado para um evento.
 */
export const emitirCertificado = async (eventId: string | number): Promise<Certificado> => {
  try {
    const userId = getUserIdFromToken();
    
    const { data } = await privateApi.post('/gerar-certificado/', { 
      evento_id: eventId,
      user_id: userId
    });
    
    return {
      id: data.certificado.id,
      codigo_validacao: data.certificado.codigo,
      url_validacao: data.certificado.url_validacao,
      link_pdf: `${CERTIFICADOS_SERVICE_URL}/certificados/${data.certificado.id}/download/`
    };
  } catch (error: any) {
    console.error("Erro ao emitir certificado:", error.response?.data || error.message);
    throw new Error(error.response?.data?.erro || 'Falha ao emitir certificado');
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