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
  type Inscrito,
  type EventoBasico 
} from '../services/presencaService';
import { getEvents } from '../services/eventService';
import { OfflineStatus } from '../components/OfflineStatus';

// Componente para dashboard offline
function OfflineDashboard() {
  const [statusOffline, setStatusOffline] = useState<any>({});
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  useEffect(() => {
    const atualizarStatus = () => {
      const status = getStatusOffline();
      setStatusOffline(status);
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-blue-800 mb-2">Sistema Offline</h3>
          <div className="text-sm text-blue-700">
            <p className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                statusOffline.isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              Status: {statusOffline.isOnline ? 'Online' : 'Offline'}
            </p>
            {statusOffline.cacheCompleto?.existe && (
              <p className="mt-1">
                Cache: {statusOffline.cacheCompleto.eventos} eventos, {statusOffline.cacheCompleto.totalInscricoes} inscrições
                ({statusOffline.cacheCompleto.tamanhoKB} KB)
              </p>
            )}
            {statusOffline.checkinsPendentes > 0 && (
              <p className="mt-1 text-orange-600">
                {statusOffline.checkinsPendentes} check-ins pendentes de sincronização
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {statusOffline.isOnline && (
            <button
              onClick={handleBaixarDadosCompletos}
              disabled={carregandoDados}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {carregandoDados ? 'Baixando...' : 'Baixar Dados'}
            </button>
          )}
          <button
            onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {mostrarDetalhes ? 'Ocultar' : 'Detalhes'}
          </button>
          <button
            onClick={() => {
              if (window.confirm('Limpar todos os dados offline? Esta ação não pode ser desfeita.')) {
                limparDadosOffline();
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Limpar
          </button>
        </div>
      </div>
      {mostrarDetalhes && (
        <div className="mt-4 p-3 bg-white rounded border">
          <pre className="text-xs overflow-auto max-h-40">
            {JSON.stringify(statusOffline, null, 2)}
          </pre>
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
      console.log('=== CHECKIN: Iniciando carregamento de eventos ===');
      console.log('Navigator.onLine:', navigator.onLine);
      
      try {
        // Tentar carregar eventos da API principal primeiro
        let data = [];
        try {
          console.log('CHECKIN: Tentando getEvents()');
          data = await getEvents();
          console.log('CHECKIN: getEvents() sucesso:', data.length, 'eventos');
          setEventos(data);
        } catch (error) {
          console.log('CHECKIN: getEvents() falhou:', error);
          // Fallback: tentar carregar eventos disponíveis (pode vir do cache)
          try {
            console.log('CHECKIN: Tentando getEventosDisponiveis()');
            const eventosDisponiveis = await getEventosDisponiveis();
            console.log('CHECKIN: getEventosDisponiveis() sucesso:', eventosDisponiveis.length, 'eventos');
            setEventos(eventosDisponiveis);
            data = eventosDisponiveis;
          } catch (error2) {
            console.log('CHECKIN: getEventosDisponiveis() falhou:', error2);
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
      console.log('=== CHECKIN: Carregando inscritos do evento', selectedEvento, '===');
      console.log('Navigator.onLine:', navigator.onLine);
      
      const fetchInscritos = async () => {
        setLoading(true);
        
        try {
          console.log('CHECKIN: Chamando getListaPresencaEvento para evento', selectedEvento);
          const response = await getListaPresencaEvento(selectedEvento);
          
          console.log('CHECKIN: Resposta recebida:', {
            success: response.success,
            inscritos_count: response.data?.inscritos?.length || 0,
            evento: response.data?.evento?.nome,
            response_keys: Object.keys(response)
          });
          
          if (response.data && response.data.inscritos) {
            console.log('CHECKIN: Primeiros 3 inscritos:', response.data.inscritos.slice(0, 3));
            setInscritos(response.data.inscritos);
          } else {
            console.log('CHECKIN: PROBLEMA - response.data.inscritos não existe!');
            console.log('CHECKIN: response.data:', response.data);
            setInscritos([]);
          }

          // Verificar cache local
          const cacheKeys = ['cached_presenca_lists', 'inscritosPorEvento', 'eventosCache'];
          cacheKeys.forEach(key => {
            const cache = localStorage.getItem(key);
            if (cache) {
              try {
                const parsed = JSON.parse(cache);
                console.log(`CHECKIN: Cache ${key}:`, typeof parsed === 'object' ? Object.keys(parsed) : 'not object');
                if (key === 'inscritosPorEvento' && parsed[selectedEvento]) {
                  console.log(`CHECKIN: Cache ${key} tem evento ${selectedEvento}:`, parsed[selectedEvento].length, 'inscritos');
                }
              } catch (e) {
                console.log(`CHECKIN: Erro ao parsear cache ${key}:`, e);
              }
            } else {
              console.log(`CHECKIN: Cache ${key} não existe`);
            }
          });

          // Verificar se veio do cache
          if (!navigator.onLine) {
            setMessage({
              type: 'warning',
              text: `Dados carregados do cache offline (${response.data.inscritos.length} participantes). Pode não estar atualizado.`
            });
          } else {
            setMessage({
              type: 'success',
              text: `Lista carregada com sucesso! ${response.data.inscritos.length} participantes encontrados.`
            });
            setTimeout(() => setMessage(null), 3000);
          }
        } catch (error: any) {
          console.log('CHECKIN: Erro ao carregar inscritos:', error);
          console.log('CHECKIN: Error message:', error.message);
          console.log('CHECKIN: Error stack:', error.stack);
          
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
      console.log('CHECKIN: Nenhum evento selecionado, limpando inscritos');
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
  
  // Log do estado atual
  console.log('CHECKIN: Estado atual:', {
    eventos_count: eventos.length,
    selectedEvento,
    inscritos_count: inscritos.length,
    inscritosFiltrados_count: inscritosFiltrados.length,
    busca,
    loading,
    navigator_online: navigator.onLine
  });

  return (
    <>
      <OfflineStatus />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Check-in de Participantes</h1>
          <p className="text-gray-600">
            Bem-vindo, <strong>{user?.name}</strong> ({user?.role})
          </p>
        </div>

        {/* Painel de Controle Offline */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <OfflineDashboard />
        </div>

        {/* Mensagem de feedback */}
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : message.type === 'warning'
              ? 'bg-yellow-100 border border-yellow-400 text-yellow-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            <div className="flex items-start gap-2">
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Seleção de evento */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Selecione o Evento:
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
                className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                Recarregar Lista
              </button>
            )}
          </div>
          <select
            value={selectedEvento || ''}
            onChange={(e) => setSelectedEvento(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Selecione um evento --</option>
            {eventos.map(evento => (
              <option key={evento.id} value={evento.id}>
                {evento.nome} - {new Date(evento.data_inicio).toLocaleDateString('pt-BR')} ({evento.local})
              </option>
            ))}
          </select>
        </div>

        {/* Busca de participantes */}
        {selectedEvento && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Participante:
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome ou email do participante..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {selectedEvento && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Participantes Inscritos ({inscritosFiltrados.length})
            </h2>
            

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : inscritosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {busca ? 'Nenhum participante encontrado com esse critério de busca.' : 'Nenhum participante inscrito neste evento.'}
              </div>
            ) : (
              <div className="grid gap-4">
                {inscritosFiltrados.map((inscrito: Inscrito) => (
                  <div key={inscrito.inscricao_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <h3 className="font-semibold text-gray-800">{inscrito.nome}</h3>
                      <p className="text-gray-600 text-sm">{inscrito.email}</p>
                      <p className="text-xs text-gray-500">Status: {inscrito.status_inscricao}</p>
                      {inscrito.cpf && <p className="text-xs text-gray-400">CPF: {inscrito.cpf}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => handleCheckIn(inscrito)}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={inscrito.ja_tem_presenca}
                      >
                        {inscrito.ja_tem_presenca ? 'Presente' : 'Fazer Check-in'}
                      </button>
                      {inscrito.ja_tem_presenca && (
                        <span className="text-xs text-green-600">Check-in realizado</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </>
  );
}