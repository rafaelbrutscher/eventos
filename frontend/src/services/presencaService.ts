// /src/services/presencaService.ts
import { createPrivateApi } from './api';

// Presença-service roda na porta 8004
const PRESENCA_SERVICE_URL = 'http://127.0.0.1:8004/api';

// API privada para Presenças
const privateApi = createPrivateApi(PRESENCA_SERVICE_URL);

// --- Tipos ---

// Dados de um inscrito para check-in
export interface Inscrito {
  inscricao_id: number;
  usuario_id: number;
  evento_id: number;
  nome: string;
  email: string;
  cpf?: string;
  status_inscricao: string;
  ja_tem_presenca: boolean;
  data_inscricao: string;
}

// Resposta da lista de presença
export interface ListaPresencaResponse {
  success: boolean;
  data: {
    evento: {
      id: number;
      nome: string;
      data_inicio: string;
      data_fim: string;
      local: string;
    };
    inscritos: Inscrito[];
    total_inscritos: number;
    total_presencas: number;
  };
}

// Payload para check-in
export interface CheckinPayload {
  inscricao_id: number;
  evento_id: number;
  data_hora?: string;
  tipo?: 'online' | 'offline' | 'qrcode';
}

// Check-in offline armazenado localmente
interface CheckinOffline extends CheckinPayload {
  id: string; // ID único local
  timestamp: number;
  sincronizado: boolean;
}

// Resposta do check-in
export interface CheckinResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    inscricao_id: number;
    evento_id: number;
    data_hora: string;
    origem: string;
    operador_usuario_id: number;
  };
}

// --- Gerenciamento de Storage Local ---

const STORAGE_KEYS = {
  OFFLINE_CHECKINS: 'offline_checkins',
  CACHED_LISTS: 'cached_presenca_lists',
  LAST_SYNC: 'last_sync_timestamp'
};

// Salvar check-ins offline
const salvarCheckinOffline = (checkin: CheckinOffline): void => {
  try {
    const checkinsOffline = getCheckinsOffline();
    checkinsOffline.push(checkin);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_CHECKINS, JSON.stringify(checkinsOffline));
    console.log('Check-in salvo offline:', checkin);
  } catch (error) {
    console.error('Erro ao salvar check-in offline:', error);
  }
};

// Recuperar check-ins offline
const getCheckinsOffline = (): CheckinOffline[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.OFFLINE_CHECKINS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erro ao recuperar check-ins offline:', error);
    return [];
  }
};

// Limpar check-ins sincronizados
const limparCheckinsSincronizados = (): void => {
  try {
    const checkinsOffline = getCheckinsOffline();
    const naoSincronizados = checkinsOffline.filter(c => !c.sincronizado);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_CHECKINS, JSON.stringify(naoSincronizados));
  } catch (error) {
    console.error('Erro ao limpar check-ins sincronizados:', error);
  }
};

// Cache da lista de presença
const salvarListaCache = (eventoId: number, lista: ListaPresencaResponse): void => {
  try {
    const cache = getCacheListasPresenca();
    cache[eventoId] = {
      ...lista,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.CACHED_LISTS, JSON.stringify(cache));
  } catch (error) {
    console.error('Erro ao salvar lista em cache:', error);
  }
};

const getCacheListasPresenca = (): Record<number, ListaPresencaResponse & { timestamp: number }> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CACHED_LISTS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Erro ao recuperar cache de listas:', error);
    return {};
  }
};

// Verificar se está online
const isOnline = (): boolean => {
  return navigator.onLine;
};

// --- Funções da API ---

/**
 * Carrega lista de presença de um evento (com cache offline)
 */
export const getListaPresencaEvento = async (eventoId: number): Promise<ListaPresencaResponse> => {
  try {
    // Tentar buscar online primeiro
    if (isOnline()) {
      const { data } = await privateApi.get<ListaPresencaResponse>(`/eventos/${eventoId}/lista-presenca`);
      
      // Salvar em cache
      salvarListaCache(eventoId, data);
      
      return data;
    }
  } catch (error) {
    console.warn('Erro ao buscar lista online, tentando cache:', error);
  }

  // Usar cache se offline ou erro
  const cache = getCacheListasPresenca();
  const listaCache = cache[eventoId];
  
  if (listaCache) {
    console.log('Usando lista de presença do cache offline');
    return {
      success: listaCache.success,
      data: listaCache.data
    };
  }

  throw new Error('Nenhuma lista de presença disponível offline para este evento');
};

/**
 * Realiza check-in (online ou offline)
 */
export const realizarCheckin = async (payload: CheckinPayload): Promise<CheckinResponse> => {
  const checkinData = {
    ...payload,
    data_hora: payload.data_hora || new Date().toISOString(),
    tipo: payload.tipo || (isOnline() ? 'online' : 'offline')
  };

  // Tentar check-in online primeiro
  if (isOnline()) {
    try {
      const { data } = await privateApi.post<CheckinResponse>('/check-in', checkinData);
      console.log('Check-in realizado online:', data);
      return data;
    } catch (error: any) {
      console.warn('Erro no check-in online, salvando offline:', error);
      // Continua para salvar offline
    }
  }

  // Salvar offline
  const checkinOffline: CheckinOffline = {
    ...checkinData,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    sincronizado: false,
    tipo: 'offline'
  };

  salvarCheckinOffline(checkinOffline);

  return {
    success: true,
    message: 'Check-in salvo offline. Será sincronizado quando a conexão for restaurada.',
    data: {
      id: Date.now(), // ID temporário
      inscricao_id: checkinOffline.inscricao_id,
      evento_id: checkinOffline.evento_id,
      data_hora: checkinOffline.data_hora!,
      origem: 'offline',
      operador_usuario_id: 0 // Será definido no backend
    }
  };
};

/**
 * Sincroniza check-ins offline com o servidor
 */
export const sincronizarCheckinsOffline = async (): Promise<{
  success: boolean;
  message: string;
  detalhes: {
    total: number;
    sucessos: number;
    falhas: number;
    resultados: any[];
  };
}> => {
  if (!isOnline()) {
    throw new Error('Sincronização requer conexão com a internet');
  }

  const checkinsOffline = getCheckinsOffline().filter(c => !c.sincronizado);
  
  if (checkinsOffline.length === 0) {
    return {
      success: true,
      message: 'Nenhum check-in offline para sincronizar',
      detalhes: {
        total: 0,
        sucessos: 0,
        falhas: 0,
        resultados: []
      }
    };
  }

  try {
    // Preparar dados para sincronização
    const checkins = checkinsOffline.map(c => ({
      inscricao_id: c.inscricao_id,
      evento_id: c.evento_id,
      data_hora: c.data_hora!
    }));

    const { data } = await privateApi.post('/checkin/offline-sync', { checkins });

    // Marcar como sincronizados
    const todosCheckins = getCheckinsOffline();
    checkinsOffline.forEach(offline => {
      const index = todosCheckins.findIndex(c => c.id === offline.id);
      if (index !== -1) {
        todosCheckins[index].sincronizado = true;
      }
    });
    localStorage.setItem(STORAGE_KEYS.OFFLINE_CHECKINS, JSON.stringify(todosCheckins));

    // Limpar sincronizados após um tempo
    setTimeout(limparCheckinsSincronizados, 1000);

    // Atualizar timestamp da última sincronização
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());

    console.log('Sincronização concluída:', data);
    return {
      success: true,
      message: data.message,
      detalhes: {
        total: data.data.total_processados,
        sucessos: data.data.sucessos,
        falhas: data.data.falhas,
        resultados: data.data.resultados
      }
    };

  } catch (error: any) {
    console.error('Erro na sincronização:', error);
    throw new Error(error.response?.data?.message || 'Falha na sincronização offline');
  }
};

/**
 * Verifica quantos check-ins estão pendentes de sincronização
 */
export const getCheckinsOfflinePendentes = (): number => {
  return getCheckinsOffline().filter(c => !c.sincronizado).length;
};

/**
 * Força limpeza de todos os dados offline (use com cuidado)
 */
export const limparDadosOffline = (): void => {
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_CHECKINS);
  localStorage.removeItem(STORAGE_KEYS.CACHED_LISTS);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  console.log('Dados offline limpos');
};

/**
 * Obtém informações sobre o status offline
 */
export const getStatusOffline = () => {
  const checkinsOffline = getCheckinsOffline();
  const pendentes = checkinsOffline.filter(c => !c.sincronizado).length;
  const sincronizados = checkinsOffline.filter(c => c.sincronizado).length;
  const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  
  return {
    isOnline: isOnline(),
    checkinsPendentes: pendentes,
    checkinsSincronizados: sincronizados,
    totalCheckinsOffline: checkinsOffline.length,
    ultimaSincronizacao: lastSync ? new Date(parseInt(lastSync)) : null,
    temCache: Object.keys(getCacheListasPresenca()).length > 0
  };
};

// Listener para status de conexão
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Conexão restaurada - dados offline podem ser sincronizados');
  });
  
  window.addEventListener('offline', () => {
    console.log('Conexão perdida - modo offline ativado');
  });
}