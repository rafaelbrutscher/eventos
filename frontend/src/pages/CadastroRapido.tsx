// /src/pages/CadastroRapido.tsx
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

// Usando estilos do Home
import styles from './Home.module.css';

interface Evento {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  status: string;
}

export function CadastroRapido() {
  const { user, canAccessCheckIn } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoSelecionado, setEventoSelecionado] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  // Sempre criar inscrição no evento selecionado
  const [loading, setLoading] = useState(false);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cadastrosOfflineCount, setCadastrosOfflineCount] = useState(0);

  // Contar cadastros offline ao carregar
  useEffect(() => {
    const dadosOffline = JSON.parse(localStorage.getItem('cadastrosOffline') || '[]');
    setCadastrosOfflineCount(dadosOffline.length);
  }, [success]); // Recontar quando houver sucesso

  useEffect(() => {
    if (!canAccessCheckIn()) {
      return;
    }
    
    carregarEventos();
  }, [user]);

  const carregarEventos = async () => {
    setLoadingEventos(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Token de autenticação não encontrado');
        return;
      }
      const response = await fetch('http://177.44.248.89:8002/api/eventos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        // Filtrar apenas eventos que não são de template
        const eventosDisponiveis = data.data.filter((evento: Evento) => {
          const naoETemplate = !evento.nome?.toLowerCase().includes('template');
          const temNome = evento.nome && evento.nome.trim() !== '';
          return naoETemplate && temNome;
        });
        setEventos(eventosDisponiveis);
        if (eventosDisponiveis.length === 0) {
          setError('Nenhum evento disponível para cadastro rápido');
        } else {
          const token = localStorage.getItem('authToken');
          const inscritosPorEvento: Record<number, any[]> = {};
          for (const evento of eventosDisponiveis) {
            try {
              const resp = await fetch(`http://177.44.248.89:8004/api/eventos/${evento.id}/lista-presenca`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (resp.ok) {
                const lista = await resp.json();
                if (lista.success && lista.data && Array.isArray(lista.data.inscritos)) {
                  inscritosPorEvento[evento.id] = lista.data.inscritos;
                }
              }
            } catch (e) {
              // Ignorar erro de evento individual
            }
          }
          localStorage.setItem('inscritosPorEvento', JSON.stringify(inscritosPorEvento));
          localStorage.setItem('eventosCache', JSON.stringify(eventosDisponiveis));
        }
      } else {
        setError('Formato de resposta inválido do servidor');
      }
    } catch (err: any) {
      setError(`Erro ao carregar eventos: ${err.message}`);
    } finally {
      setLoadingEventos(false);
    }
  };

  // Função para salvar no localStorage (modo offline)
  const salvarOffline = (dadosUsuario: any) => {
    const dadosOffline = JSON.parse(localStorage.getItem('cadastrosOffline') || '[]');
    dadosOffline.push({
      ...dadosUsuario,
      id: Date.now(), // ID temporário
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('cadastrosOffline', JSON.stringify(dadosOffline));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!eventoSelecionado) {
      setError('Selecione um evento');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const dadosUsuario = {
      name: nome,
      email: email,
      evento_id: eventoSelecionado,
      marcar_presenca: true, // Sempre true - criar inscrição
    };

    try {
      // Tentar criar usuário online primeiro
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://177.44.248.89:8001/api/cadastro-rapido', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: nome,
          email: email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Salvou online, agora salvar dados completos no localStorage para sincronização
          salvarOffline({
            ...dadosUsuario,
            usuario_criado_online: true,
            usuario_id: data.data.user.id,
          });

          setSuccess(
            `Cadastro salvo offline com sucesso!\n` +
            `Nome: ${nome}\n` +
            `Email: ${email}\n` +
            `Será inscrito no evento após sincronizar\n` +
            `Para check-in: usar tela "Check-in" depois da sincronização\n\n` +
            `Use o botão 'Sincronizar' para criar inscrição`
          );
        } else {
          throw new Error(data.message || 'Erro no servidor');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err: any) {
      // Se falhou online, salvar completamente offline
      salvarOffline({
        ...dadosUsuario,
        usuario_criado_online: false,
      });

      setSuccess(
        `Cadastro salvo OFFLINE!\n` +
        `Nome: ${nome}\n` +
        `Email: ${email}\n` +
        `Evento: ${eventos.find(e => e.id === eventoSelecionado)?.nome}\n` +
        `Para check-in: usar tela "Check-in" após sincronizar\n\n` +
        `OFFLINE: Use 'Sincronizar' quando voltar online\n` +
        `Erro: ${err.message}`
      );
    }

    // Limpar formulário
    setNome('');
    setEmail('');
    setEventoSelecionado(null);
    setLoading(false);
  };

  // Verificar se usuário pode acessar
  if (!canAccessCheckIn()) {
    return (
      <div className={styles.homeContainer}>
        <main className={styles.content}>
          <h2>Acesso Negado</h2>
          <p className={styles.errorMessage}>
            Apenas atendentes e administradores podem realizar cadastros rápidos.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.homeContainer}>
      <main className={styles.content}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2>Cadastro Rápido - Evento Offline</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={carregarEventos}
              disabled={loadingEventos}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: loadingEventos ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loadingEventos ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {loadingEventos ? 'Carregando...' : 'Recarregar Eventos'}
            </button>
            <div style={{ 
                backgroundColor: cadastrosOfflineCount > 0 ? '#fff3cd' : '#e3f2fd', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px',
              fontSize: '14px',
              border: cadastrosOfflineCount > 0 ? '1px solid #ffc107' : 'none'
            }}>
              {user?.name} ({user?.role})
              {cadastrosOfflineCount > 0 && (
                <div style={{ fontSize: '12px', color: '#856404', marginTop: '2px' }}>
                  {cadastrosOfflineCount} cadastro{cadastrosOfflineCount !== 1 ? 's' : ''} offline pendente{cadastrosOfflineCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          fontSize: '14px',
          borderLeft: '4px solid #ffc107'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>Sistema Offline - Como funciona:</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#856404' }}>
            <li><strong>Offline:</strong> Dados são salvos no navegador (localStorage)</li>
            <li><strong>Cadastro:</strong> Nome + email + evento selecionado</li>
            <li><strong>Sincronização:</strong> Use o botão "Sincronizar" para criar usuário + inscrição</li>
            <li><strong>Check-in:</strong> Após sincronizar, use a tela "Check-in" para marcar presença</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} style={{ 
          backgroundColor: 'white', 
          padding: '2rem', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="evento" style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Evento:
            </label>
            {loadingEventos ? (
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                backgroundColor: '#f8f9fa',
                borderRadius: '6px'
              }}>
                ⏳ Carregando eventos...
              </div>
            ) : eventos.length === 0 ? (
              <div style={{ 
                padding: '1rem', 
                textAlign: 'center', 
                backgroundColor: '#fff3cd',
                borderRadius: '6px',
                border: '1px solid #ffeaa7'
              }}>
                📝 Nenhum evento disponível. <br/>
                <button 
                  onClick={carregarEventos}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Tentar Novamente
                </button>
              </div>
            ) : (
              <select
                id="evento"
                value={eventoSelecionado || ''}
                onChange={(e) => setEventoSelecionado(Number(e.target.value) || null)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              >
                <option value="">Selecione um evento ({eventos.length} disponível{eventos.length !== 1 ? 'is' : ''})</option>
                {eventos.map(evento => (
                  <option key={evento.id} value={evento.id}>
                    {evento.nome} - {new Date(evento.data_inicio).toLocaleDateString()} 
                    {evento.status ? ` (${evento.status})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="nome" style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Nome da pessoa:
            </label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="email" style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Email da pessoa:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>



          {error && (
            <div style={{ 
              backgroundColor: '#ffebee', 
              color: '#c62828', 
              padding: '1rem', 
              borderRadius: '6px',
              marginBottom: '1rem',
              borderLeft: '4px solid #f44336'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ 
              backgroundColor: '#e8f5e9', 
              color: '#2e7d32', 
              padding: '1rem', 
              borderRadius: '6px',
              marginBottom: '1rem',
              borderLeft: '4px solid #4caf50',
              whiteSpace: 'pre-line'
            }}>
              {success}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || loadingEventos}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Salvando...' : 'Salvar Offline (Cadastro Rápido)'}
          </button>
          
          {cadastrosOfflineCount > 0 && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '14px',
              border: '1px solid #2196f3'
            }}>
              <strong>{cadastrosOfflineCount}</strong> cadastro{cadastrosOfflineCount !== 1 ? 's' : ''} aguardando sincronização
            </div>
          )}
        </form>
      </main>
    </div>
  );
}