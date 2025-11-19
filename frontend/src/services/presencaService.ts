// /src/services/presencaService.ts
import { createPrivateApi } from './api';

// Presença-service roda na porta 8004
const PRESENCA_SERVICE_URL = 'http://177.44.248.89:8004/api';

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

// Interface para evento básico
export interface EventoBasico {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  status: string;
}

// Interface para cache completo offline
export interface CacheCompletoOffline {
  eventos: EventoBasico[];
  inscricoesPorEvento: Record<number, Inscrito[]>;
  timestamp: number;
  versao: string;
}

// Resposta da API de eventos disponíveis
export interface EventosDisponiveisResponse {
  success: boolean;
  data: {
    eventos: EventoBasico[];
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
  sincronizado_em?: string; // Data/hora da sincronização
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
  LAST_SYNC: 'last_sync_timestamp',
  CACHE_COMPLETO: 'cache_completo_offline',
  EVENTOS_DISPONIVEIS: 'eventos_disponiveis'
};

// Salvar check-ins offline
const salvarCheckinOffline = (checkin: CheckinOffline): void => {
  try {
    const checkinsOffline = getCheckinsOffline();
    checkinsOffline.push(checkin);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_CHECKINS, JSON.stringify(checkinsOffline));
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

// Verificar se está online (com verificação mais robusta)
const isOnline = (): boolean => {
  if (!navigator.onLine) {
    return false;
  }
  
  // Verificar se há algum erro de conectividade recente
  const lastConnError = localStorage.getItem('last_connection_error');
  if (lastConnError) {
    const errorTime = parseInt(lastConnError);
    const timeSinceError = Date.now() - errorTime;
    // Se teve erro há menos de 10 segundos, considerar offline
    if (timeSinceError < 10000) {
      return false;
    }
  }
  
  return true;
};

// Função para verificar integridade dos dados de cache
const verificarIntegridadeCache = (eventoId: number): {
  valido: boolean;
  problemas: string[];
  fontes: {
    cacheCompleto: any;
    cachedLists: any;
    inscritosPorEvento: any;
  };
} => {
  const problemas: string[] = [];
  const fontes = {
    cacheCompleto: null as any,
    cachedLists: null as any,
    inscritosPorEvento: null as any
  };

  try {
    // 1. Verificar cache completo
    const cacheCompleto = getCacheCompleto();
    if (cacheCompleto && cacheCompleto.inscricoesPorEvento[eventoId]) {
      fontes.cacheCompleto = cacheCompleto.inscricoesPorEvento[eventoId];
    } else {
      problemas.push('Cache completo não tem dados para este evento');
    }

    // 2. Verificar cached_presenca_lists
    const cachedLists = getCacheListasPresenca();
    if (cachedLists[eventoId]) {
      fontes.cachedLists = cachedLists[eventoId].data.inscritos;
    } else {
      problemas.push('Cached lists não tem dados para este evento');
    }

    // 3. Verificar inscritosPorEvento
    const inscritosPorEvento = localStorage.getItem('inscritosPorEvento');
    if (inscritosPorEvento) {
      const dados = JSON.parse(inscritosPorEvento);
      if (dados[eventoId]) {
        fontes.inscritosPorEvento = dados[eventoId];
      } else {
        problemas.push('InscritosPorEvento não tem dados para este evento');
      }
    } else {
      problemas.push('InscritosPorEvento não existe no localStorage');
    }

    // 4. Comparar quantidades
    const quantidades = [
      fontes.cacheCompleto?.length || 0,
      fontes.cachedLists?.length || 0,
      fontes.inscritosPorEvento?.length || 0
    ].filter(q => q > 0);

    if (quantidades.length > 1) {
      const min = Math.min(...quantidades);
      const max = Math.max(...quantidades);
      if (max - min > 0) {
        problemas.push(`Discrepância nas quantidades: min=${min}, max=${max}`);
      }
    }

    return {
      valido: problemas.length === 0,
      problemas,
      fontes
    };

  } catch (error) {
    console.error('Erro ao verificar integridade do cache:', error);
    return {
      valido: false,
      problemas: ['Erro ao verificar integridade: ' + (error as Error).message],
      fontes
    };
  }
};

// Função para unificar dados de múltiplas fontes de cache
const unificarDadosCache = (eventoId: number): Inscrito[] => {
  
  const integridade = verificarIntegridadeCache(eventoId);

  // Prioridade: Cache completo -> Cached lists -> InscritosPorEvento
  const fontes = [
    { nome: 'cacheCompleto', dados: integridade.fontes.cacheCompleto },
    { nome: 'cachedLists', dados: integridade.fontes.cachedLists },
    { nome: 'inscritosPorEvento', dados: integridade.fontes.inscritosPorEvento }
  ];

  for (const fonte of fontes) {
    if (fonte.dados && Array.isArray(fonte.dados) && fonte.dados.length > 0) {
      
      // Padronizar formato
      return fonte.dados.map((inscrito: any) => ({
        inscricao_id: inscrito.inscricao_id || inscrito.id,
        usuario_id: inscrito.usuario_id,
        evento_id: inscrito.evento_id || eventoId,
        nome: inscrito.nome || inscrito.name,
        email: inscrito.email,
        cpf: inscrito.cpf || null,
        status_inscricao: inscrito.status_inscricao || inscrito.status || 'confirmado',
        ja_tem_presenca: inscrito.ja_tem_presenca || false,
        data_inscricao: inscrito.data_inscricao || inscrito.created_at,
        origem: inscrito.origem || 'cache'
      }));
    }
  }

  return [];
};

// Marcar erro de conectividade
const markConnectionError = (): void => {
  localStorage.setItem('last_connection_error', Date.now().toString());
};

// --- Gerenciamento de Cache Completo Offline ---

// Salvar cache completo offline
const salvarCacheCompleto = (cache: CacheCompletoOffline): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CACHE_COMPLETO, JSON.stringify(cache));
  } catch (error) {
    console.error('Erro ao salvar cache completo:', error);
  }
};

// Recuperar cache completo offline
const getCacheCompleto = (): CacheCompletoOffline | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CACHE_COMPLETO);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Erro ao recuperar cache completo:', error);
    return null;
  }
};

// Verificar se cache está válido (menos de 24 horas)
const isCacheValido = (cache: CacheCompletoOffline): boolean => {
  const agora = Date.now();
  const tempoLimite = 24 * 60 * 60 * 1000; // 24 horas
  return (agora - cache.timestamp) < tempoLimite;
};

// Salvar eventos disponíveis
const salvarEventosDisponiveis = (eventos: EventoBasico[]): void => {
  try {
    const data = {
      eventos,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.EVENTOS_DISPONIVEIS, JSON.stringify(data));
  } catch (error) {
    console.error('Erro ao salvar eventos disponíveis:', error);
  }
};

// Recuperar eventos disponíveis do cache
const getEventosDisponiveisCache = (): EventoBasico[] => {
  try {
    // Tentar várias chaves de cache
    const keys = [STORAGE_KEYS.EVENTOS_DISPONIVEIS, 'eventosCache'];
    
    for (const key of keys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        const eventos = key === 'eventosCache' ? data : (data.eventos || []);
        
        if (Array.isArray(eventos) && eventos.length > 0) {
          return eventos;
        }
      }
    }
    
    return [];
  } catch (error) {
    return [];
  }
};

// --- Funções da API ---

/**
 * Baixa todos os eventos disponíveis
 */
export const getEventosDisponiveis = async (): Promise<EventoBasico[]> => {
  
  try {
    if (isOnline()) {
      const { data } = await privateApi.get<EventosDisponiveisResponse>('/eventos-disponiveis');
      
      if (data.success) {
        // Salvar em cache
        salvarEventosDisponiveis(data.data.eventos);
        return data.data.eventos;
      }
    }
  } catch (error) {
    console.log('PRESENCA: Erro ao buscar eventos online:', error);
  }

  // Usar cache se offline ou erro
  const eventosCache = getEventosDisponiveisCache();
  
  return eventosCache;
};/**
 * Baixa dados completos para funcionamento offline
 * Esta função deve ser chamada quando há internet para preparar o modo offline
 */
export const baixarDadosCompletos = async (): Promise<{
  success: boolean;
  message: string;
  detalhes: {
    eventos: number;
    totalInscricoes: number;
    tamanhoCache: string;
  };
}> => {

  if (!isOnline()) {
    throw new Error('É necessário estar online para baixar dados completos');
  }

  try {
    // 1. Buscar todos os eventos disponíveis
    const eventos = await getEventosDisponiveis();

    if (eventos.length === 0) {
      throw new Error('Nenhum evento disponível para download');
    }

    // 2. Buscar inscrições de cada evento
    const inscricoesPorEvento: Record<number, Inscrito[]> = {};
    let totalInscricoes = 0;
    let eventosComErro = 0;

    for (const evento of eventos) {
      try {
        
        // Fazer requisição direta para evitar cache
        const { data } = await privateApi.get<ListaPresencaResponse>(`/eventos/${evento.id}/lista-presenca`);
        
        if (data.success && data.data.inscritos) {
          inscricoesPorEvento[evento.id] = data.data.inscritos;
          totalInscricoes += data.data.inscritos.length;
          
          // Salvar também no cache individual
          salvarListaCache(evento.id, data);
          
        } else {
          console.warn(`DOWNLOAD: Evento ${evento.nome}: dados inválidos`);
          inscricoesPorEvento[evento.id] = [];
          eventosComErro++;
        }

        // Pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        console.warn(`DOWNLOAD: Erro ao baixar evento ${evento.nome}:`, error.message);
        inscricoesPorEvento[evento.id] = [];
        eventosComErro++;
      }
    }

    // 3. Salvar cache completo unificado
    const cacheCompleto: CacheCompletoOffline = {
      eventos,
      inscricoesPorEvento,
      timestamp: Date.now(),
      versao: '2.0' // Versão atualizada
    };

    salvarCacheCompleto(cacheCompleto);

    
    localStorage.setItem('inscritosPorEvento', JSON.stringify(inscricoesPorEvento));
    
    // Atualizar eventos disponíveis
    salvarEventosDisponiveis(eventos);

    // 5. Calcular tamanho do cache
    const cacheString = JSON.stringify(cacheCompleto);
    const tamanhoKB = Math.round(cacheString.length / 1024);

    const statusMessage = eventosComErro > 0 
      ? `Dados baixados com ${eventosComErro} erro(s). Sistema pronto para funcionar offline.`
      : 'Dados baixados com sucesso! Sistema pronto para funcionar offline.';


    return {
      success: true,
      message: statusMessage,
      detalhes: {
        eventos: eventos.length,
        totalInscricoes,
        tamanhoCache: `${tamanhoKB} KB`
      }
    };

  } catch (error: any) {
    console.error('DOWNLOAD: Erro crítico no download de dados completos:', error);
    throw new Error(error.message || 'Falha ao baixar dados completos');
  }
};

/**
 * Carrega lista de presença de um evento (com cache offline melhorado)
 */
export const getListaPresencaEvento = async (eventoId: number): Promise<ListaPresencaResponse> => {
  try {
    // Tentar buscar online primeiro
    if (isOnline()) {
      const { data } = await privateApi.get<ListaPresencaResponse>(`/eventos/${eventoId}/lista-presenca`);

      // Salvar em múltiplos caches para garantir consistência
      salvarListaCache(eventoId, data);
      
      // Atualizar também o cache do cadastro rápido
      atualizarCacheInscritosPorEvento(eventoId, data.data.inscritos);

      return data;
    }
  } catch (error: any) {
    console.warn('PRESENCA: Erro ao buscar lista online, usando cache offline:', error.message);
    // Marcar erro de conexão
    markConnectionError();
  }


  // Verificar integridade dos caches antes de usar
  const integridade = verificarIntegridadeCache(eventoId);

  // Usar dados unificados de cache
  const inscritosUnificados = unificarDadosCache(eventoId);
  
  if (inscritosUnificados.length > 0) {
    // Buscar dados do evento
    let eventoInfo = null;

    // Tentar cache completo primeiro
    const cacheCompleto = getCacheCompleto();
    if (cacheCompleto) {
      eventoInfo = cacheCompleto.eventos.find(e => e.id === eventoId);
    }

    // Fallback: cache de eventos
    if (!eventoInfo) {
      const eventosCache = getEventosDisponiveisCache();
      eventoInfo = eventosCache.find(e => e.id === eventoId);
    }

    // Fallback: dados básicos
    if (!eventoInfo) {
      eventoInfo = {
        id: eventoId,
        nome: `Evento ${eventoId}`,
        data_inicio: new Date().toISOString(),
        data_fim: new Date().toISOString(),
        local: 'Local não definido'
      };
    }

    const resultado = {
      success: true,
      data: {
        evento: eventoInfo,
        inscritos: inscritosUnificados,
        total_inscritos: inscritosUnificados.length,
        total_presencas: inscritosUnificados.filter(i => i.ja_tem_presenca).length
      }
    };

    return resultado;
  }

  // Se chegou aqui, não há dados disponíveis
  console.error('PRESENCA: Nenhum cache disponível para evento', eventoId);
  throw new Error(`Nenhuma lista de presença disponível offline para o evento ${eventoId}. ${
    integridade.problemas.length > 0 
      ? 'Problemas encontrados: ' + integridade.problemas.join(', ')
      : 'Tente baixar os dados completos quando estiver online.'
  }`);
};

// Função auxiliar para atualizar cache de inscritos por evento
const atualizarCacheInscritosPorEvento = (eventoId: number, inscritos: Inscrito[]): void => {
  try {
    const cache = JSON.parse(localStorage.getItem('inscritosPorEvento') || '{}');
    cache[eventoId] = inscritos;
    localStorage.setItem('inscritosPorEvento', JSON.stringify(cache));
  } catch (error) {
    console.error('Erro ao atualizar cache inscritosPorEvento:', error);
  }
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

  const connectivityCheck = {
    isOnline: isOnline(),
    navigatorOnline: navigator.onLine,
    forceOffline: checkinData.tipo === 'offline',
    shouldTryOnline: false
  };

  // Determinar se deve tentar online
  connectivityCheck.shouldTryOnline = connectivityCheck.isOnline && 
                                     connectivityCheck.navigatorOnline && 
                                     !connectivityCheck.forceOffline;


  // Se deve e pode tentar online, tentar primeiro
  if (connectivityCheck.shouldTryOnline) {
    try {
      const { data } = await privateApi.post<CheckinResponse>('/check-in', checkinData);
      return data;
    } catch (error: any) {
      console.error('CHECKIN: Erro no check-in online, salvando offline:', error);
      // Marcar erro de conectividade para futuras verificações
      markConnectionError();
      // Se falhou online, salvar offline como fallback
    }
  }

  // Modo offline (sem internet OU falha no online)
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
 * Adiciona um cadastro offline para teste (função utilitária)
 */
export const adicionarCadastroOfflineTeste = (nome: string, email: string, eventoId: number): void => {
  const cadastrosOffline = JSON.parse(localStorage.getItem('cadastrosOffline') || '[]');
  
  const novoCadastro = {
    id: Date.now(),
    usuario: {
      name: nome,
      email: email
    },
    inscricao: {
      evento_id: eventoId
    },
    presenca: {
      data_hora: new Date().toISOString().replace('T', ' ').substring(0, 19)
    },
    sincronizado: false,
    criado_em: new Date().toISOString()
  };
  
  cadastrosOffline.push(novoCadastro);
  localStorage.setItem('cadastrosOffline', JSON.stringify(cadastrosOffline));
  
};

/**
 * Sincroniza cadastros offline completos (usuário + inscrição + presença)
 */
export const sincronizarCadastrosOffline = async (): Promise<{
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

  const cadastrosOffline = JSON.parse(localStorage.getItem('cadastrosOffline') || '[]');
  
  const pendentes = cadastrosOffline.filter((c: any) => !c.sincronizado);
  
  // Validar estrutura dos cadastros pendentes
  for (let i = 0; i < pendentes.length; i++) {
    const cadastro = pendentes[i];
    
    // Validações básicas
    if (!cadastro.usuario) {
      console.error(`Cadastro ${i + 1}: falta objeto 'usuario'`);
    }
    if (!cadastro.usuario?.name) {
      console.error(`Cadastro ${i + 1}: falta 'usuario.name'`);
    }
    if (!cadastro.usuario?.email) {
      console.error(`Cadastro ${i + 1}: falta 'usuario.email'`);
    }
    if (!cadastro.inscricao) {
      console.error(`Cadastro ${i + 1}: falta objeto 'inscricao'`);
    }
    if (!cadastro.inscricao?.evento_id) {
      console.error(`Cadastro ${i + 1}: falta 'inscricao.evento_id'`);
    }
    if (!cadastro.presenca) {
      console.error(`Cadastro ${i + 1}: falta objeto 'presenca'`);
    }
    if (!cadastro.presenca?.data_hora) {
      console.error(`Cadastro ${i + 1}: falta 'presenca.data_hora'`);
    }
  }

  if (pendentes.length === 0) {
    return {
      success: true,
      message: 'Nenhum cadastro offline para sincronizar',
      detalhes: {
        total: 0,
        sucessos: 0,
        falhas: 0,
        resultados: []
      }
    };
  }

  try {
    
    // Usar endpoint único para sincronizar todos os cadastros
    const response = await privateApi.post('/cadastro-rapido/offline-sync', {
      cadastros: pendentes
    });
    
    const { data } = response;

    if (data.success) {
      // Marcar todos como sincronizados
      pendentes.forEach((cadastro: any) => {
        cadastro.sincronizado = true;
        cadastro.sincronizado_em = new Date().toISOString();
      });
      
      // Salvar cadastros atualizados
      localStorage.setItem('cadastrosOffline', JSON.stringify(cadastrosOffline));

      // Limpar caches para forçar reload dos dados atualizados do servidor
      limparCachesParaReload();
    }

    return {
      success: data.success,
      message: data.message,
      detalhes: {
        total: data.data.total_processados,
        sucessos: data.data.sucessos,
        falhas: data.data.falhas,
        resultados: data.data.resultados
      }
    };

  } catch (error: any) {
    console.error('SYNC_CADASTROS: Erro na sincronização:', error);
    throw new Error(error.response?.data?.message || 'Falha na sincronização de cadastros');
  }
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


    const { data } = await privateApi.post('/check-in/offline-sync', { checkins });


    // Marcar como sincronizados
    const todosCheckins = getCheckinsOffline();
    checkinsOffline.forEach(offline => {
      const index = todosCheckins.findIndex(c => c.id === offline.id);
      if (index !== -1) {
        todosCheckins[index].sincronizado = true;
        todosCheckins[index].sincronizado_em = new Date().toISOString();
      }
    });
    localStorage.setItem(STORAGE_KEYS.OFFLINE_CHECKINS, JSON.stringify(todosCheckins));

    // Limpar sincronizados após um tempo
    setTimeout(limparCheckinsSincronizados, 1000);

    // Atualizar timestamp da última sincronização
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());

    // Limpar caches para garantir que próxima busca mostre dados atualizados do servidor
    limparCachesParaReload();

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
    console.error('SYNC_CHECKINS: Erro na sincronização:', error);
    throw new Error(error.response?.data?.message || 'Falha na sincronização offline');
  }
};

/**
 * Sincroniza todos os dados offline (cadastros + check-ins)
 */
export const sincronizarTodosOffline = async (): Promise<{
  success: boolean;
  message: string;
  detalhes: {
    cadastros: any;
    checkins: any;
  };
}> => {
  if (!isOnline()) {
    throw new Error('Sincronização requer conexão com a internet');
  }

  const resultados = {
    cadastros: null as any,
    checkins: null as any
  };

  try {
    resultados.cadastros = await sincronizarCadastrosOffline();
    
    resultados.checkins = await sincronizarCheckinsOffline();
    
    const totalSucessos = (resultados.cadastros.detalhes.sucessos || 0) + (resultados.checkins.detalhes.sucessos || 0);
    const totalFalhas = (resultados.cadastros.detalhes.falhas || 0) + (resultados.checkins.detalhes.falhas || 0);
    
    return {
      success: totalSucessos > 0,
      message: `Sincronização completa: ${totalSucessos} sucessos, ${totalFalhas} falhas`,
      detalhes: resultados
    };
    
  } catch (error: any) {
    console.error('Erro na sincronização completa:', error);
    throw new Error(error.message || 'Falha na sincronização');
  }
};

/**
 * Verifica quantos check-ins estão pendentes de sincronização
 */
export const getCheckinsOfflinePendentes = (): number => {
  return getCheckinsOffline().filter(c => !c.sincronizado).length;
};

/**
 * Verifica quantos cadastros estão pendentes de sincronização
 */
export const getCadastrosOfflinePendentes = (): number => {
  const cadastros = JSON.parse(localStorage.getItem('cadastrosOffline') || '[]');
  return cadastros.filter((c: any) => !c.sincronizado).length;
};

/**
 * Limpa caches específicos para forçar reload após sincronização
 */
export const limparCachesParaReload = (): void => {
  
  // Caches que devem ser limpos após sincronização
  const cachesParaLimpar = [
    STORAGE_KEYS.CACHED_LISTS,
    STORAGE_KEYS.CACHE_COMPLETO,
    'inscritosPorEvento'
  ];

  cachesParaLimpar.forEach(cache => {
    localStorage.removeItem(cache);
  });

  // Limpar apenas erro de conectividade para permitir nova tentativa online
  localStorage.removeItem('last_connection_error');
};

/**
 * Força limpeza de todos os dados offline (use com cuidado)
 */
export const limparDadosOffline = (): void => {
  
  try {
    const todosOsCaches = [
      STORAGE_KEYS.OFFLINE_CHECKINS,
      STORAGE_KEYS.CACHED_LISTS,
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.CACHE_COMPLETO,
      STORAGE_KEYS.EVENTOS_DISPONIVEIS,
      'inscritosPorEvento',
      'eventosCache',
      'cadastrosOffline',
      'last_connection_error'
    ];

    // Verificar quais caches existem antes da limpeza
    const cachesExistentes = todosOsCaches.filter(cache => {
      const existe = localStorage.getItem(cache) !== null;
      if (existe) {
        const tamanho = localStorage.getItem(cache)?.length || 0;
      }
      return existe;
    });


    // Remover todos os caches
    let removidos = 0;
    let erros = 0;

    todosOsCaches.forEach(cache => {
      try {
        const existia = localStorage.getItem(cache) !== null;
        localStorage.removeItem(cache);
        
        if (existia) {
          removidos++;
        }
      } catch (error) {
        erros++;
      }
    });

    // Verificar se limpeza foi bem-sucedida
    const cachesRestantes = todosOsCaches.filter(cache => localStorage.getItem(cache) !== null);
    
    if (cachesRestantes.length > 0) {
      console.warn(`LIMPEZA: ${cachesRestantes.length} caches não foram removidos:`, cachesRestantes);
      throw new Error(`Falha na limpeza: ${cachesRestantes.length} caches restantes`);
    }

    
  } catch (error) {
    console.error('ERRO CRÍTICO na limpeza dos dados offline:', error);
    throw error; // Re-lançar para o componente tratar
  }
};

/**
 * Obtém informações sobre o status offline
 */
export const getStatusOffline = () => {
  const checkinsOffline = getCheckinsOffline();
  const pendentes = checkinsOffline.filter(c => !c.sincronizado).length;
  const sincronizados = checkinsOffline.filter(c => c.sincronizado).length;
  const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  const cacheCompleto = getCacheCompleto();
  const eventosCache = getEventosDisponiveisCache();

  return {
    isOnline: isOnline(),
    checkinsPendentes: pendentes,
    checkinsSincronizados: sincronizados,
    totalCheckinsOffline: checkinsOffline.length,
    ultimaSincronizacao: lastSync ? new Date(parseInt(lastSync)) : null,
    temCache: Object.keys(getCacheListasPresenca()).length > 0,
    cacheCompleto: {
      existe: !!cacheCompleto,
      valido: cacheCompleto ? isCacheValido(cacheCompleto) : false,
      eventos: cacheCompleto?.eventos.length || 0,
      totalInscricoes: cacheCompleto ? Object.values(cacheCompleto.inscricoesPorEvento).reduce((acc, arr) => acc + arr.length, 0) : 0,
      timestamp: cacheCompleto?.timestamp,
      tamanhoKB: cacheCompleto ? Math.round(JSON.stringify(cacheCompleto).length / 1024) : 0,
      versao: cacheCompleto?.versao || '1.0'
    },
    eventosDisponiveis: eventosCache.length,
    qualidadeCache: avaliarQualidadeCache()
  };
};

/**
 * Avalia a qualidade geral do sistema de cache offline
 */
export const avaliarQualidadeCache = (): {
  score: number; // 0-100
  nivel: 'excelente' | 'bom' | 'regular' | 'ruim' | 'crítico';
  detalhes: string[];
  recomendacoes: string[];
} => {
  const detalhes: string[] = [];
  const recomendacoes: string[] = [];
  let score = 0;

  // Verificar cache completo (40 pontos)
  const cacheCompleto = getCacheCompleto();
  if (cacheCompleto && isCacheValido(cacheCompleto)) {
    score += 40;
    detalhes.push('✓ Cache completo válido e atualizado');
    
    const totalInscricoes = Object.values(cacheCompleto.inscricoesPorEvento).reduce((acc, arr) => acc + arr.length, 0);
    if (totalInscricoes > 0) {
      score += 10;
      detalhes.push(`✓ ${totalInscricoes} inscrições em cache`);
    }
  } else {
    detalhes.push('⚠ Cache completo inválido ou desatualizado');
    recomendacoes.push('Execute "Baixar Dados" para atualizar o cache completo');
  }

  // Verificar eventos disponíveis (20 pontos)
  const eventosCache = getEventosDisponiveisCache();
  if (eventosCache.length > 0) {
    score += 20;
    detalhes.push(`✓ ${eventosCache.length} eventos em cache`);
  } else {
    detalhes.push('⚠ Nenhum evento em cache');
    recomendacoes.push('Carregue a lista de eventos online primeiro');
  }

  // Verificar conectividade (10 pontos)
  if (isOnline()) {
    score += 10;
    detalhes.push('✓ Sistema online');
  } else {
    detalhes.push('⚠ Sistema offline');
  }

  // Verificar consistência de caches (20 pontos)
  if (eventosCache.length > 0) {
    let cachesConsistentes = 0;
    const totalEventos = eventosCache.length;
    
    eventosCache.forEach(evento => {
      const integridade = verificarIntegridadeCache(evento.id);
      if (integridade.valido) {
        cachesConsistentes++;
      }
    });
    
    const percentualConsistencia = (cachesConsistentes / totalEventos) * 100;
    const pontosConsistencia = Math.round((percentualConsistencia / 100) * 20);
    score += pontosConsistencia;
    
    if (percentualConsistencia >= 90) {
      detalhes.push('✓ Caches altamente consistentes');
    } else if (percentualConsistencia >= 70) {
      detalhes.push('~ Caches parcialmente consistentes');
      recomendacoes.push('Considere recarregar alguns eventos');
    } else {
      detalhes.push('⚠ Problemas de consistência nos caches');
      recomendacoes.push('Execute sincronização completa');
    }
  }

  // Determinar nível
  let nivel: 'excelente' | 'bom' | 'regular' | 'ruim' | 'crítico';
  if (score >= 90) nivel = 'excelente';
  else if (score >= 70) nivel = 'bom';
  else if (score >= 50) nivel = 'regular';
  else if (score >= 30) nivel = 'ruim';
  else nivel = 'crítico';

  // Recomendações gerais
  if (score < 70 && isOnline()) {
    recomendacoes.push('Execute "Baixar Dados" para melhorar a qualidade do cache');
  }

  const pendentes = getCadastrosOfflinePendentes() + getCheckinsOfflinePendentes();
  if (pendentes > 0 && isOnline()) {
    recomendacoes.push(`Sincronize ${pendentes} item(s) offline pendente(s)`);
  }

  return {
    score,
    nivel,
    detalhes,
    recomendacoes
  };
};

/**
 * Executa testes de integridade do sistema offline
 */
export const testarIntegridadeOffline = async (): Promise<{
  success: boolean;
  resultados: {
    cacheCompleto: boolean;
    cacheIndividual: boolean;
    inscritosPorEvento: boolean;
    consistenciaEventos: boolean;
    funcionalidadeOffline: boolean;
  };
  detalhes: string[];
  erros: string[];
}> => {
  
  const resultados = {
    cacheCompleto: false,
    cacheIndividual: false,
    inscritosPorEvento: false,
    consistenciaEventos: false,
    funcionalidadeOffline: false
  };
  
  const detalhes: string[] = [];
  const erros: string[] = [];

  try {
    // Teste 1: Cache completo
    const cacheCompleto = getCacheCompleto();
    if (cacheCompleto && isCacheValido(cacheCompleto)) {
      resultados.cacheCompleto = true;
      detalhes.push(`✓ Cache completo válido com ${cacheCompleto.eventos.length} eventos`);
    } else {
      erros.push('Cache completo inválido ou expirado');
    }

    // Teste 2: Cache individual
    const cacheListas = getCacheListasPresenca();
    const eventosEmCache = Object.keys(cacheListas).length;
    if (eventosEmCache > 0) {
      resultados.cacheIndividual = true;
      detalhes.push(`✓ Cache individual com ${eventosEmCache} eventos`);
    } else {
      erros.push('Nenhum cache individual encontrado');
    }

    // Teste 3: inscritosPorEvento
    const inscritosPorEvento = localStorage.getItem('inscritosPorEvento');
    if (inscritosPorEvento) {
      const dados = JSON.parse(inscritosPorEvento);
      const eventosComInscricoes = Object.keys(dados).length;
      if (eventosComInscricoes > 0) {
        resultados.inscritosPorEvento = true;
        detalhes.push(`✓ InscritosPorEvento com ${eventosComInscricoes} eventos`);
      }
    } else {
      erros.push('Cache inscritosPorEvento não encontrado');
    }

    // Teste 4: Consistência entre eventos
    const eventosDisponiveis = getEventosDisponiveisCache();
    if (eventosDisponiveis.length > 0) {
      let eventosConsistentes = 0;
      
      for (const evento of eventosDisponiveis.slice(0, 3)) { // Testar apenas primeiros 3
        try {
          const integridade = verificarIntegridadeCache(evento.id);
          if (integridade.valido) {
            eventosConsistentes++;
          }
        } catch (error) {
          // Ignorar erros individuais
        }
      }
      
      if (eventosConsistentes > 0) {
        resultados.consistenciaEventos = true;
        detalhes.push(`✓ ${eventosConsistentes} eventos com cache consistente`);
      } else {
        erros.push('Nenhum evento com cache consistente');
      }
    } else {
      erros.push('Nenhum evento disponível para teste');
    }

    // Teste 5: Funcionalidade offline básica
    try {
      const pendentesTotal = getCadastrosOfflinePendentes() + getCheckinsOfflinePendentes();
      
      resultados.funcionalidadeOffline = true;
      detalhes.push(`✓ Funcionalidades offline operacionais (${pendentesTotal} itens pendentes)`);
    } catch (error) {
      erros.push('Erro nas funcionalidades offline: ' + (error as Error).message);
    }

    const sucessoGeral = Object.values(resultados).filter(r => r).length >= 3;

    return {
      success: sucessoGeral,
      resultados,
      detalhes,
      erros
    };

  } catch (error: any) {
    console.error('ERRO CRÍTICO no teste de integridade:', error);
    erros.push('Erro crítico no teste: ' + error.message);
    
    return {
      success: false,
      resultados,
      detalhes,
      erros
    };
  }
};

// Listener para status de conexão
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    
    // Limpar erro de conectividade
    localStorage.removeItem('last_connection_error');
  });

  window.addEventListener('offline', () => {
    
    // Marcar início do período offline
    localStorage.setItem('offline_since', Date.now().toString());
  });
}