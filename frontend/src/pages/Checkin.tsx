// /src/pages/CheckIn.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getListaPresencaEvento, realizarCheckin, type Inscrito } from '../services/presencaService';
import { getEvents } from '../services/eventService';
import { OfflineStatus } from '../components/OfflineStatus';

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
        const data = await getEvents();
        setEventos(data);
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
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
          setInscritos(response.data.inscritos);
          
          // Verificar se veio do cache
          if (!navigator.onLine) {
            setMessage({ 
              type: 'warning', 
              text: 'Dados carregados do cache offline. Pode não estar atualizado.' 
            });
          }
        } catch (error: any) {
          console.error('Erro ao carregar inscritos:', error);
          setMessage({ type: 'error', text: error.message || 'Erro ao carregar lista de presença' });
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
        evento_id: selectedEvento,
        tipo: navigator.onLine ? 'online' : 'offline'
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
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Check-in de Participantes</h1>
          <p className="text-gray-600">
            Bem-vindo, <strong>{user?.name}</strong> ({user?.role})
          </p>
        </div>

        {/* Mensagem de feedback */}
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Seleção de evento */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o Evento:
          </label>
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

        {/* Lista de participantes */}
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
                        {inscrito.ja_tem_presenca ? '✅ Presente' : 'Fazer Check-in'}
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