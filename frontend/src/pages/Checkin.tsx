// /src/pages/CheckIn.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getListaPresencaEvento, 
  realizarCheckin, 
  limparDadosOffline, 
  baixarDadosCompletos,
  getEventosDisponiveis,
  getStatusOffline,
  sincronizarTodosOffline,
  getCadastrosOfflinePendentes,
  getCheckinsOfflinePendentes,
  type Inscrito,
  type EventoBasico 
} from '../services/presencaService';
import { getEvents } from '../services/eventService';
import { OfflineStatus } from '../components/OfflineStatus';

// Função para determinar origem e qualidade dos dados
function determinarOrigemDados(response: any, isOnline: boolean): { 
  type: 'success' | 'warning' | 'error', 
  message: string 
} {
  if (!isOnline) {
    // Verificar qual cache foi usado
    const hasCache = response.data?.inscritos?.some((i: any) => i.origem === 'cache');
    const hasCadastroRapido = response.data?.inscritos?.some((i: any) => i.origem === 'cadastro_rapido_offline');
    
    let message = 'OFFLINE: Dados do cache local.';
    
    if (hasCadastroRapido) {
      message += ' Inclui cadastros offline pendentes.';
    }
    
    message += ' Sincronize quando possível.';
    
    return {
      type: 'warning',
      message
    };
  }

  // Online - dados do servidor
  return {
    type: 'success',
    message: 'ONLINE: Dados atualizados do servidor.'
  };
}

// Componente para dashboard offline
function OfflineDashboard() {
  const [statusOffline, setStatusOffline] = useState<any>({});
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
  const [cadastrosPendentes, setCadastrosPendentes] = useState(0);
  const [checkinsPendentes, setCheckinsPendentes] = useState(0);

  useEffect(() => {
    const atualizarStatus = () => {
      const status = getStatusOffline();
      const cadastros = getCadastrosOfflinePendentes();
      const checkins = getCheckinsOfflinePendentes();
      
      setStatusOffline(status);
      setCadastrosPendentes(cadastros);
      setCheckinsPendentes(checkins);
    };
    atualizarStatus();
    const interval = setInterval(atualizarStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleBaixarDadosCompletos = async () => {
    setCarregandoDados(true);
    try {
      const resultado = await baixarDadosCompletos();
      alert(`${resultado.message}\n\nDetalhes:\n- Eventos: ${resultado.detalhes.eventos}\n- Total de inscrições: ${resultado.detalhes.totalInscricoes}\n- Tamanho do cache: ${resultado.detalhes.tamanhoCache}`);
      
      // Atualizar status
      const novoStatus = getStatusOffline();
      setStatusOffline(novoStatus);
    } catch (error: any) {
      alert(`Erro ao baixar dados: ${error.message}`);
    } finally {
      setCarregandoDados(false);
    }
  };

  const handleSincronizarTodos = async () => {
    if (!navigator.onLine) {
      alert('Sincronização requer conexão com a internet');
      return;
    }

    setSincronizando(true);
    try {
      const resultado = await sincronizarTodosOffline();
      
      let mensagem = resultado.message + '\n\n';
      
      if (resultado.detalhes.cadastros) {
        mensagem += `Cadastros:\n- Total: ${resultado.detalhes.cadastros.detalhes.total}\n- Sucessos: ${resultado.detalhes.cadastros.detalhes.sucessos}\n- Falhas: ${resultado.detalhes.cadastros.detalhes.falhas}\n\n`;
      }
      
      if (resultado.detalhes.checkins) {
        mensagem += `Check-ins:\n- Total: ${resultado.detalhes.checkins.detalhes.total}\n- Sucessos: ${resultado.detalhes.checkins.detalhes.sucessos}\n- Falhas: ${resultado.detalhes.checkins.detalhes.falhas}`;
      }
      
      alert(mensagem);
      
      // Recarregar página para atualizar listas
      window.location.reload();
      
    } catch (error: any) {
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex-1">
          <h3 className="font-bold text-2xl text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text mb-4 flex items-center gap-2">
            Sistema Offline
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status de Conexão */}
            <div className={`p-4 rounded-xl border-2 ${
              statusOffline.isOnline 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full animate-pulse ${
                  statusOffline.isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="font-semibold text-gray-800">Conexão</span>
              </div>
              <p className={`text-lg font-bold ${
                statusOffline.isOnline ? 'text-green-700' : 'text-red-700'
              }`}>
                {statusOffline.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>

            {/* Cache Local */}
            {statusOffline.cacheCompleto?.existe && (
              <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-800">Cache Local</span>
                </div>
                <div className="space-y-1 text-sm text-blue-700">
                  <p><strong>{statusOffline.cacheCompleto.eventos}</strong> eventos</p>
                  <p><strong>{statusOffline.cacheCompleto.totalInscricoes}</strong> inscrições</p>
                  <p><strong>{statusOffline.cacheCompleto.tamanhoKB}</strong> KB</p>
                </div>
              </div>
            )}

            {(cadastrosPendentes > 0 || checkinsPendentes > 0) && (
              <div className="p-4 rounded-xl bg-orange-50 border-2 border-orange-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-800">Pendências</span>
                </div>
                <div className="space-y-1 text-sm text-orange-700">
                  {cadastrosPendentes > 0 && (
                    <p><strong>{cadastrosPendentes}</strong> cadastros</p>
                  )}
                  {checkinsPendentes > 0 && (
                    <p><strong>{checkinsPendentes}</strong> check-ins</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
          {statusOffline.isOnline && (
            <button
              onClick={handleBaixarDadosCompletos}
              disabled={carregandoDados}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
            >
              {carregandoDados ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Baixando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Baixar Dados
                </span>
              )}
            </button>
          )}
          
          {statusOffline.isOnline && (cadastrosPendentes > 0 || checkinsPendentes > 0) && (
            <button
              onClick={handleSincronizarTodos}
              disabled={sincronizando}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold relative"
            >
              {sincronizando ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Sincronizando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sincronizar
                  <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                    {cadastrosPendentes + checkinsPendentes}
                  </span>
                </span>
              )}
            </button>
          )}
          
          <button
            onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
          >
            <span className="flex items-center gap-2">
              {mostrarDetalhes ? '👁️ Ocultar' : '🔍 Detalhes'}
            </span>
          </button>
          
          <button
            onClick={() => {
              const confirmacao = window.confirm(
                'ATENÇÃO: Esta ação irá limpar TODOS os dados offline:\n\n' +
                'Cache de eventos e participantes\n' +
                'Cadastros offline pendentes\n' +
                'Check-ins offline pendentes\n' +
                'Configurações de sincronização\n\n' +
                'Todos os dados não sincronizados serão PERDIDOS.\n\n' +
                'Tem certeza que deseja continuar?'
              );
              
              if (confirmacao) {
                try {
                  limparDadosOffline();
                  alert('Dados offline limpos com sucesso!');
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                } catch (error) {
                  console.error('Erro ao limpar dados offline:', error);
                  alert('Erro ao limpar dados offline. Verifique o console.');
                }
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
          >
            <span className="flex items-center gap-2">
              Limpar Cache
            </span>
          </button>
        </div>
      </div>
      {mostrarDetalhes && (
        <div className="mt-6 p-5 bg-gray-50 rounded-xl border-2 border-gray-200 shadow-inner">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            Detalhes Técnicos do Sistema
          </h4>
          <div className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-auto max-h-60 font-mono text-xs">
            <pre>{JSON.stringify(statusOffline, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function CheckIn() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<any[]>([]);
  const [selectedEvento, setSelectedEvento] = useState<number | null>(null);
  const [inscritos, setInscritos] = useState<Inscrito[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Carregar eventos ativos
  useEffect(() => {
    const fetchEventos = async () => {
      
      try {
        // Tentar carregar eventos da API principal primeiro
        let data = [];
        try {
          data = await getEvents();
          setEventos(data);
        } catch (error) {
          // Fallback: tentar carregar eventos disponíveis (pode vir do cache)
          try {
            const eventosDisponiveis = await getEventosDisponiveis();
            setEventos(eventosDisponiveis);
            data = eventosDisponiveis;
          } catch (error2) {
            setMessage({ type: 'error', text: 'Erro ao carregar eventos. Verifique sua conexão.' });
            return;
          }
        }
        // Se estiver online e houver eventos, verificar se precisa baixar dados completos
        if (navigator.onLine && data.length > 0) {
          const status = getStatusOffline();
          // Se não tem cache completo ou está desatualizado, sugerir download
          if (!status.cacheCompleto?.existe || !status.cacheCompleto?.valido) {
            setMessage({
              type: 'warning',
              text: 'Para usar o sistema offline, é recomendado baixar os dados completos.'
            });
          }
        }
      } catch (error) {
        console.error('Erro geral ao carregar eventos:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar eventos' });
      }
    };

    fetchEventos();
  }, []);

  // Carregar lista de presença do evento selecionado
  useEffect(() => {
    if (selectedEvento) {      
      const fetchInscritos = async () => {
        setLoading(true);
        
        try {
          const response = await getListaPresencaEvento(selectedEvento);
        
          if (response.data && response.data.inscritos) {
            setInscritos(response.data.inscritos);
          } else {
            setInscritos([]);
          }

          // Verificar cache local
          const cacheKeys = ['cached_presenca_lists', 'inscritosPorEvento', 'eventosCache'];
          cacheKeys.forEach(key => {
            const cache = localStorage.getItem(key);
            if (cache) {
              try {
                const parsed = JSON.parse(cache);
                if (key === 'inscritosPorEvento' && parsed[selectedEvento]) {
                }
              } catch (e) {
                console.log(`CHECKIN: Erro ao parsear cache ${key}:`, e);
              }
            } else {
              console.log(`CHECKIN: Cache ${key} não existe`);
            }
          });

          // Determinar origem dos dados e qualidade
          const origemDados = determinarOrigemDados(response, navigator.onLine);
          setMessage({
            type: origemDados.type as 'success' | 'warning' | 'error',
            text: `${origemDados.message} ${response.data.inscritos.length} participantes encontrados.`
          });

          if (origemDados.type === 'success') {
            setTimeout(() => setMessage(null), 3000);
          }
        } catch (error: any) {
          setMessage({ 
            type: 'error', 
            text: `Erro ao carregar lista: ${error.message || 'Erro desconhecido'}. ${!navigator.onLine ? 'Verifique se há dados em cache.' : 'Verifique a conexão.'}`
          });
        } finally {
          setLoading(false);
        }
      };

      fetchInscritos();
    } else {
      setInscritos([]);
    }
  }, [selectedEvento]);

  // Realizar check-in (online ou offline)
  const handleCheckIn = async (inscrito: Inscrito) => {
    if (!selectedEvento) return;

    try {
      const resultado = await realizarCheckin({
        inscricao_id: inscrito.inscricao_id,
        evento_id: selectedEvento
        // Não precisa especificar tipo - o service decide automaticamente
      });

      if (resultado.success) {
        // Atualizar lista local
        setInscritos(prev => prev.map(item =>
          item.inscricao_id === inscrito.inscricao_id
            ? { ...item, ja_tem_presenca: true }
            : item
        ));

        const isOffline = !navigator.onLine || resultado.data?.origem === 'offline';
        setMessage({
          type: isOffline ? 'warning' : 'success',
          text: isOffline
            ? 'Check-in salvo offline. Será sincronizado quando houver internet.'
            : 'Check-in realizado com sucesso!'
        });
      }
    } catch (error: any) {
      console.error('Erro no check-in:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao realizar check-in' });
    }

    // Limpar mensagem após 5 segundos
    setTimeout(() => setMessage(null), 5000);
  };

  // Filtrar inscritos pela busca
  const inscritosFiltrados = inscritos.filter(inscrito =>
    inscrito.nome.toLowerCase().includes(busca.toLowerCase()) ||
    inscrito.email.toLowerCase().includes(busca.toLowerCase())
  );
  

  return (
    <>
      <OfflineStatus />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Header moderno */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-12 text-white">
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
                  Check-in de Participantes
                </h1>
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 border border-white/30">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse shadow-lg"></div>
                  <p className="font-medium">
                    Bem-vindo, <span className="font-bold">{user?.name}</span>
                    <span className="ml-3 px-3 py-1 bg-white/30 rounded-full text-sm font-semibold">
                      {user?.role}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo principal */}
            <div className="p-8">

            {/* Painel de Controle Offline */}
            <div className="mb-8 p-6 bg-gradient-to-r from-slate-50 to-gray-100 border border-slate-200 rounded-xl shadow-lg">
              <OfflineDashboard />
            </div>

            {/* Mensagem de feedback moderna */}
            {message && (
              <div className={`mb-6 p-4 rounded-xl shadow-lg border-l-4 backdrop-blur-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50/80 border-l-emerald-500 border border-emerald-200 text-emerald-800'
                  : message.type === 'warning'
                  ? 'bg-amber-50/80 border-l-amber-500 border border-amber-200 text-amber-800'
                  : 'bg-red-50/80 border-l-red-500 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg">
                    {message.type === 'success' ? '✅' : message.type === 'warning' ? '⚠️' : '❌'}
                  </span>
                  <span className="font-medium">{message.text}</span>
                </div>
              </div>
            )}

            {/* Seleção de evento moderna */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-4">
                <label className="block text-lg font-bold text-slate-800 flex items-center gap-2">
                  Selecione o Evento
                </label>
                {selectedEvento && (
                  <button
                    onClick={() => {
                      setInscritos([]);
                      setMessage(null);
                      const eventoId = selectedEvento;
                      setSelectedEvento(null);
                      setTimeout(() => setSelectedEvento(eventoId), 100);
                    }}
                    className="text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    Recarregar Lista
                  </button>
                )}
              </div>
              <select
                value={selectedEvento || ''}
                onChange={(e) => setSelectedEvento(e.target.value ? Number(e.target.value) : null)}
                className="w-full p-4 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 bg-white shadow-lg hover:shadow-xl text-lg font-medium"
              >
                <option value="">-- Escolha um evento para começar --</option>
                {eventos.map(evento => (
                  <option key={evento.id} value={evento.id}>
                    {evento.nome} - {new Date(evento.data_inicio).toLocaleDateString('pt-BR')} | {evento.local}
                  </option>
                ))}
              </select>
            </div>

            {/* Busca de participantes moderna */}
            {selectedEvento && (
              <div className="mb-8">
                <label className="block text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  Buscar Participante
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Digite o nome ou email do participante..."
                    className="w-full p-4 pl-14 pr-12 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-white shadow-lg hover:shadow-xl text-lg font-medium"
                  />
                  {busca && (
                    <button
                      onClick={() => setBusca('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedEvento && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    Participantes Inscritos
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full text-lg font-bold shadow-lg">
                      {inscritosFiltrados.length}
                    </span>
                  </h2>
                  {inscritosFiltrados.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-emerald-700 bg-emerald-100 px-3 py-2 rounded-lg font-semibold border border-emerald-200">
                        {inscritosFiltrados.filter(i => i.ja_tem_presenca).length} presentes
                      </div>
                      <div className="text-sm text-amber-700 bg-amber-100 px-3 py-2 rounded-lg font-semibold border border-amber-200">
                        {inscritosFiltrados.filter(i => !i.ja_tem_presenca).length} pendentes
                      </div>
                    </div>
                  )}
                </div>
            

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="mt-6 text-slate-600 font-semibold animate-pulse">Carregando participantes...</p>
                  </div>
                ) : inscritosFiltrados.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                    <div className="w-16 h-16 mx-auto mb-6 bg-slate-200 rounded-full flex items-center justify-center">
                      {busca ? (
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="text-xl font-bold text-slate-700 mb-3">
                      {busca ? 'Nenhum resultado encontrado' : 'Nenhum participante inscrito'}
                    </div>
                    <div className="text-slate-500 mb-6">
                      {busca ? 'Tente buscar por outro termo.' : 'Este evento ainda não possui inscrições.'}
                    </div>
                    {busca && (
                      <button
                        onClick={() => setBusca('')}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all font-semibold shadow-lg"
                      >
                        Limpar busca
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inscritosFiltrados.map((inscrito: Inscrito) => (
                      <div 
                        key={inscrito.inscricao_id} 
                        className={`relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl rounded-xl border-2 p-6 backdrop-blur-sm ${
                          inscrito.ja_tem_presenca 
                            ? 'bg-gradient-to-r from-emerald-50/90 to-green-50/90 border-emerald-300 shadow-xl ring-1 ring-emerald-200' 
                            : 'bg-white/90 border-slate-200 hover:border-indigo-300 shadow-lg hover:shadow-xl ring-1 ring-slate-100'
                        }`}
                      >
                        {/* Badge de status moderno */}
                        <div className="absolute top-4 right-4">
                          {inscrito.ja_tem_presenca ? (
                            <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg flex items-center gap-1">
                              PRESENTE
                            </div>
                          ) : (
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                              PENDENTE
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pr-28 md:pr-40">
                          {/* Informações do participante modernas */}
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white">
                                {inscrito.nome.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1">{inscrito.nome}</h3>
                                <p className="text-slate-600 flex items-center gap-2 font-medium">
                                  {inscrito.email}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-3 text-sm">
                              <div className={`px-4 py-2 rounded-full font-bold shadow-sm border ${
                                inscrito.status_inscricao === 'confirmado' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }`}>
                                {inscrito.status_inscricao}
                              </div>
                              
                              {inscrito.cpf && (
                                <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-full font-mono text-xs border border-slate-200">
                                  {inscrito.cpf}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Botão de check-in moderno */}
                          <div className="absolute bottom-4 right-4 md:relative md:bottom-auto md:right-auto">
                            <button
                              onClick={() => handleCheckIn(inscrito)}
                              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-xl ${
                                inscrito.ja_tem_presenca
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white cursor-default ring-4 ring-emerald-200'
                                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white hover:shadow-2xl ring-4 ring-purple-200 hover:ring-purple-300'
                              }`}
                              disabled={inscrito.ja_tem_presenca}
                            >
                              {inscrito.ja_tem_presenca ? (
                                <span className="flex items-center gap-2">
                                  Check-in OK
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  Fazer Check-in
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}