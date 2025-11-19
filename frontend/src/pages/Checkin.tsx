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
      <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        <div style={{flex: '1'}}>
          <h3 style={{fontWeight: 'bold', fontSize: '1.5rem', background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            Sistema Offline
          </h3>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem'}}>
            {/* Status de Conexão */}
            <div style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '2px solid',
              backgroundColor: statusOffline.isOnline ? '#f0fdf4' : '#fef2f2',
              borderColor: statusOffline.isOnline ? '#bbf7d0' : '#fecaca'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem'}}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite',
                  backgroundColor: statusOffline.isOnline ? '#22c55e' : '#ef4444'
                }}></div>
                <span style={{fontWeight: '600', color: '#1f2937'}}>Conexão</span>
              </div>
              <p style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: statusOffline.isOnline ? '#15803d' : '#dc2626'
              }}>
                {statusOffline.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>

            {/* Cache Local */}
            {statusOffline.cacheCompleto?.existe && (
              <div style={{padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#dbeafe', border: '2px solid #93c5fd'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem'}}>
                  <span style={{fontWeight: '600', color: '#1f2937'}}>Cache Local</span>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#1d4ed8'}}>
                  <p><strong>{statusOffline.cacheCompleto.eventos}</strong> eventos</p>
                  <p><strong>{statusOffline.cacheCompleto.totalInscricoes}</strong> inscrições</p>
                  <p><strong>{statusOffline.cacheCompleto.tamanhoKB}</strong> KB</p>
                </div>
              </div>
            )}

            {(cadastrosPendentes > 0 || checkinsPendentes > 0) && (
              <div style={{padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#fff7ed', border: '2px solid #fed7aa'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem'}}>
                  <span style={{fontWeight: '600', color: '#1f2937'}}>Pendências</span>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: '#c2410c'}}>
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
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center'}}>
          {statusOffline.isOnline && (
            <button
              onClick={handleBaixarDadosCompletos}
              disabled={carregandoDados}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(90deg, #22c55e 0%, #059669 100%)',
                color: 'white',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: carregandoDados ? 'not-allowed' : 'pointer',
                opacity: carregandoDados ? 0.5 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => {
                if (!carregandoDados) {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #16a34a 0%, #047857 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!carregandoDados) {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #22c55e 0%, #059669 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {carregandoDados ? (
                <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <div style={{animation: 'spin 1s linear infinite', width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%'}}></div>
                  Baixando...
                </span>
              ) : (
                <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  Baixar Dados
                </span>
              )}
            </button>
          )}
          
          {statusOffline.isOnline && (cadastrosPendentes > 0 || checkinsPendentes > 0) && (
            <button
              onClick={handleSincronizarTodos}
              disabled={sincronizando}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(90deg, #f97316 0%, #d97706 100%)',
                color: 'white',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: sincronizando ? 'not-allowed' : 'pointer',
                opacity: sincronizando ? 0.5 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontWeight: '600',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!sincronizando) {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #ea580c 0%, #c2410c 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!sincronizando) {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #f97316 0%, #d97706 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {sincronizando ? (
                <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <div style={{animation: 'spin 1s linear infinite', width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%'}}></div>
                  Sincronizando...
                </span>
              ) : (
                <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  Sincronizar
                  <span style={{backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem'}}>
                    {cadastrosPendentes + checkinsPendentes}
                  </span>
                </span>
              )}
            </button>
          )}
          
          <button
            onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(90deg, #3b82f6 0%, #4f46e5 100%)',
              color: 'white',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              fontWeight: '600'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #2563eb 0%, #4338ca 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #3b82f6 0%, #4f46e5 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              {mostrarDetalhes ? 'Ocultar' : 'Detalhes'}
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
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(90deg, #ef4444 0%, #f43f5e 100%)',
              color: 'white',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              fontWeight: '600'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #dc2626 0%, #e11d48 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #ef4444 0%, #f43f5e 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              Limpar Cache
            </span>
          </button>
        </div>
      </div>
      {mostrarDetalhes && (
        <div style={{marginTop: '1.5rem', padding: '1.25rem', backgroundColor: '#f9fafb', borderRadius: '0.75rem', border: '2px solid #e5e7eb', boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)'}}>
          <h4 style={{fontWeight: 'bold', color: '#1f2937', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            Detalhes Técnicos do Sistema
          </h4>
          <div style={{backgroundColor: '#1f2937', color: '#4ade80', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', maxHeight: '240px', fontFamily: 'monospace', fontSize: '0.75rem'}}>
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
      <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem'}}>
          <div style={{background: 'rgba(255,255,255,0.95)', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden'}}>
            {/* Header moderno */}
            <div style={{background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)', padding: '3rem 2rem', color: 'white'}}>
              <div style={{textAlign: 'center'}}>
                <h1 style={{fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', filter: 'drop-shadow(0 4px 3px rgba(0,0,0,0.3))'}}>
                  Check-in de Participantes
                </h1>
                <div style={{display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.2)', borderRadius: '2rem', padding: '0.75rem 1.5rem', border: '1px solid rgba(255,255,255,0.3)'}}>
                  <div style={{width: '12px', height: '12px', background: '#4ade80', borderRadius: '50%', marginRight: '0.75rem', animation: 'pulse 2s infinite'}}></div>
                  <p style={{fontWeight: '500'}}>
                    Bem-vindo, <span style={{fontWeight: 'bold'}}>{user?.name}</span>
                    <span style={{marginLeft: '0.75rem', padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.3)', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: '600'}}>
                      {user?.role}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo principal */}
            <div style={{padding: '2rem'}}>

            {/* Painel de Controle Offline */}
            <div style={{marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(90deg, #f8fafc 0%, #f3f4f6 100%)', border: '1px solid #e2e8f0', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}>
              <OfflineDashboard />
            </div>

            {/* Mensagem de feedback moderna */}
            {message && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                borderLeft: `4px solid ${message.type === 'success' ? '#10b981' : message.type === 'warning' ? '#f59e0b' : '#ef4444'}`,
                backgroundColor: message.type === 'success' ? 'rgba(236,253,245,0.8)' : message.type === 'warning' ? 'rgba(255,251,235,0.8)' : 'rgba(254,242,242,0.8)',
                border: `1px solid ${message.type === 'success' ? '#a7f3d0' : message.type === 'warning' ? '#fcd34d' : '#fca5a5'}`,
                color: message.type === 'success' ? '#065f46' : message.type === 'warning' ? '#92400e' : '#991b1b'
              }}>
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
                  <span style={{fontSize: '1.125rem'}}>
                    {message.type === 'success' ? '✅' : message.type === 'warning' ? '⚠️' : '❌'}
                  </span>
                  <span style={{fontWeight: '500'}}>{message.text}</span>
                </div>
              </div>
            )}

            {/* Seleção de evento moderna */}
            <div style={{marginBottom: '2rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem'}}>
                <label style={{display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1e293b'}}>
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
                    style={{fontSize: '0.875rem', background: 'linear-gradient(90deg, #6366f1 0%, #7c3aed 100%)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.2s'}}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #4f46e5 0%, #6d28d9 100%)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #6366f1 0%, #7c3aed 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Recarregar Lista
                  </button>
                )}
              </div>
              <select
                value={selectedEvento || ''}
                onChange={(e) => setSelectedEvento(e.target.value ? Number(e.target.value) : null)}
                style={{width: '100%', padding: '1rem', border: '2px solid #cbd5e1', borderRadius: '0.75rem', backgroundColor: 'white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '1.125rem', fontWeight: '500', outline: 'none'}}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
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
              <div style={{marginBottom: '2rem'}}>
                <label style={{display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1rem'}}>
                  Buscar Participante
                </label>
                <div style={{position: 'relative'}}>
                  <div style={{position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', pointerEvents: 'none'}}>
                    <svg style={{width: '20px', height: '20px', color: '#94a3b8'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Digite o nome ou email do participante..."
                    style={{width: '100%', padding: '1rem 3rem 1rem 3.5rem', border: '2px solid #cbd5e1', borderRadius: '0.75rem', backgroundColor: 'white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '1.125rem', fontWeight: '500', outline: 'none'}}
                    onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                  {busca && (
                    <button
                      onClick={() => setBusca('')}
                      style={{position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'}}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#64748b';
                        e.currentTarget.style.backgroundColor = '#e2e8f0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                    >
                      <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedEvento && (
              <div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem'}}>
                  <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap'}}>
                    Participantes Inscritos
                    <span style={{background: 'linear-gradient(90deg, #6366f1 0%, #7c3aed 100%)', color: 'white', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '1.125rem', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}>
                      {inscritosFiltrados.length}
                    </span>
                  </h2>
                  {inscritosFiltrados.length > 0 && (
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
                      <div style={{fontSize: '0.875rem', color: '#047857', backgroundColor: '#d1fae5', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontWeight: '600', border: '1px solid #a7f3d0'}}>
                        {inscritosFiltrados.filter(i => i.ja_tem_presenca).length} presentes
                      </div>
                      <div style={{fontSize: '0.875rem', color: '#b45309', backgroundColor: '#fef3c7', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontWeight: '600', border: '1px solid #fcd34d'}}>
                        {inscritosFiltrados.filter(i => !i.ja_tem_presenca).length} pendentes
                      </div>
                    </div>
                  )}
                </div>
            

                {loading ? (
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0'}}>
                    <div style={{position: 'relative'}}>
                      <div style={{animation: 'spin 1s linear infinite', borderRadius: '50%', width: '64px', height: '64px', border: '4px solid #c7d2fe'}}></div>
                      <div style={{animation: 'spin 1s linear infinite', borderRadius: '50%', width: '64px', height: '64px', border: '4px solid #4f46e5', borderTopColor: 'transparent', position: 'absolute', top: '0', left: '0'}}></div>
                    </div>
                    <p style={{marginTop: '1.5rem', color: '#475569', fontWeight: '600', animation: 'pulse 2s infinite'}}>Carregando participantes...</p>
                  </div>
                ) : inscritosFiltrados.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '4rem 0', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '2px dashed #cbd5e1'}}>
                    <div style={{width: '64px', height: '64px', margin: '0 auto 1.5rem', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      {busca ? (
                        <svg style={{width: '32px', height: '32px', color: '#94a3b8'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      ) : (
                        <svg style={{width: '32px', height: '32px', color: '#94a3b8'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                    </div>
                    <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem'}}>
                      {busca ? 'Nenhum resultado encontrado' : 'Nenhum participante inscrito'}
                    </div>
                    <div style={{color: '#6b7280', marginBottom: '1.5rem'}}>
                      {busca ? 'Tente buscar por outro termo.' : 'Este evento ainda não possui inscrições.'}
                    </div>
                    {busca && (
                      <button
                        onClick={() => setBusca('')}
                        style={{padding: '0.75rem 1.5rem', background: 'linear-gradient(90deg, #6366f1 0%, #7c3aed 100%)', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '600', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', transition: 'all 0.2s'}}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, #4f46e5 0%, #6d28d9 100%)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, #6366f1 0%, #7c3aed 100%)'}
                      >
                        Limpar busca
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {inscritosFiltrados.map((inscrito: Inscrito) => (
                      <div 
                        key={inscrito.inscricao_id} 
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.3s',
                          borderRadius: '0.75rem',
                          border: inscrito.ja_tem_presenca ? '2px solid #6ee7b7' : '2px solid #e2e8f0',
                          padding: '1.5rem',
                          background: inscrito.ja_tem_presenca ? 'linear-gradient(90deg, rgba(236,253,245,0.9) 0%, rgba(240,253,244,0.9) 100%)' : 'rgba(255,255,255,0.9)',
                          boxShadow: inscrito.ja_tem_presenca ? '0 25px 50px -12px rgba(0,0,0,0.25)' : '0 10px 15px -3px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.25)';
                          if (!inscrito.ja_tem_presenca) e.currentTarget.style.borderColor = '#a5b4fc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = inscrito.ja_tem_presenca ? '0 25px 50px -12px rgba(0,0,0,0.25)' : '0 10px 15px -3px rgba(0,0,0,0.1)';
                          if (!inscrito.ja_tem_presenca) e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        {/* Badge de status moderno */}
                        <div style={{position: 'absolute', top: '1rem', right: '1rem'}}>
                          {inscrito.ja_tem_presenca ? (
                            <div style={{background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 'bold', animation: 'pulse 2s infinite', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                              PRESENTE
                            </div>
                          ) : (
                            <div style={{background: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                              PENDENTE
                            </div>
                          )}
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '7rem'}}>
                          {/* Informações do participante modernas */}
                          <div style={{flex: '1'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
                              <div style={{width: '56px', height: '56px', background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #ec4899 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '4px solid white'}}>
                                {inscrito.nome.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.25rem'}}>{inscrito.nome}</h3>
                                <p style={{color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500'}}>
                                  {inscrito.email}
                                </p>
                              </div>
                            </div>
                            
                            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.875rem'}}>
                              <div style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '2rem',
                                fontWeight: 'bold',
                                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
                                border: '1px solid',
                                backgroundColor: inscrito.status_inscricao === 'confirmado' ? '#dbeafe' : '#fef3c7',
                                color: inscrito.status_inscricao === 'confirmado' ? '#1d4ed8' : '#b45309',
                                borderColor: inscrito.status_inscricao === 'confirmado' ? '#93c5fd' : '#fcd34d'
                              }}>
                                {inscrito.status_inscricao}
                              </div>
                              
                              {inscrito.cpf && (
                                <div style={{backgroundColor: '#f1f5f9', color: '#334155', padding: '0.5rem 1rem', borderRadius: '2rem', fontFamily: 'monospace', fontSize: '0.75rem', border: '1px solid #e2e8f0'}}>
                                  {inscrito.cpf}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Botão de check-in moderno */}
                          <div style={{position: 'absolute', bottom: '1rem', right: '1rem'}}>
                            <button
                              onClick={() => handleCheckIn(inscrito)}
                              disabled={inscrito.ja_tem_presenca}
                              style={{
                                padding: '1rem 2rem',
                                borderRadius: '0.75rem',
                                fontWeight: 'bold',
                                fontSize: '1.125rem',
                                transition: 'all 0.2s',
                                border: 'none',
                                cursor: inscrito.ja_tem_presenca ? 'default' : 'pointer',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                background: inscrito.ja_tem_presenca 
                                  ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                  : 'linear-gradient(90deg, #6366f1 0%, #7c3aed 50%, #ec4899 100%)',
                                color: 'white'
                              }}
                              onMouseEnter={(e) => {
                                if (!inscrito.ja_tem_presenca) {
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                  e.currentTarget.style.background = 'linear-gradient(90deg, #4f46e5 0%, #6d28d9 50%, #db2777 100%)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!inscrito.ja_tem_presenca) {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.background = 'linear-gradient(90deg, #6366f1 0%, #7c3aed 50%, #ec4899 100%)';
                                }
                              }}
                            >
                              {inscrito.ja_tem_presenca ? (
                                <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                  Check-in OK
                                </span>
                              ) : (
                                <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
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