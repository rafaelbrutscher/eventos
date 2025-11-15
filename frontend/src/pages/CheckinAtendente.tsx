// /src/pages/Checkin.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getListaPresencaEvento, realizarCheckin, type Inscrito } from '../services/presencaService';
import { getEventos } from '../services/eventService';
import type { Event } from '../services/eventService';
import styles from './Home.module.css';

export function Checkin() {
  const { user, isAuthenticated } = useAuth();
  const [eventos, setEventos] = useState<Event[]>([]);
  const [eventoSelecionado, setEventoSelecionado] = useState<number | null>(null);
  const [inscritos, setInscritos] = useState<Inscrito[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Verificar se usuário tem permissão
  const canAccessCheckin = user?.role === 'atendente' || user?.role === 'admin';

  // Carregar eventos
  useEffect(() => {
    const carregarEventos = async () => {
      try {
        const data = await getEventos();
        setEventos(data);
      } catch (err: any) {
        setError('Erro ao carregar eventos');
      }
    };

    if (isAuthenticated && canAccessCheckin) {
      carregarEventos();
    }
  }, [isAuthenticated, canAccessCheckin]);

  // Carregar lista de presença quando evento for selecionado
  const carregarListaPresenca = async (eventoId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getListaPresencaEvento(eventoId);
      setInscritos(response.data.inscritos);
      setEventoSelecionado(eventoId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Realizar check-in
  const handleCheckin = async (inscrito: Inscrito) => {
    if (!eventoSelecionado) return;

    try {
      await realizarCheckin({
        inscricao_id: inscrito.inscricao_id,
        evento_id: eventoSelecionado,
        tipo: 'online'
      });

      // Atualizar lista local
      setInscritos(prev => prev.map(item => 
        item.inscricao_id === inscrito.inscricao_id 
          ? { ...item, ja_tem_presenca: true }
          : item
      ));

      alert(`Check-in realizado com sucesso para ${inscrito.nome}`);
    } catch (err: any) {
      alert(`Erro no check-in: ${err.message}`);
    }
  };

  // Filtrar inscritos por nome
  const inscritosFiltrados = inscritos.filter(inscrito =>
    inscrito.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inscrito.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Verificação de acesso
  if (!isAuthenticated) {
    return (
      <div className={styles.homeContainer}>
        <main className={styles.content}>
          <h2>Check-in de Presença</h2>
          <p className={styles.errorMessage}>Você precisa fazer login para acessar esta página.</p>
        </main>
      </div>
    );
  }

  if (!canAccessCheckin) {
    return (
      <div className={styles.homeContainer}>
        <main className={styles.content}>
          <h2>Check-in de Presença</h2>
          <div className={styles.accessDenied}>
            <p className={styles.errorMessage}>
              ⚠️ Acesso Restrito
            </p>
            <p>Apenas <strong>atendentes</strong> e <strong>administradores</strong> podem acessar a funcionalidade de check-in.</p>
            <p>Seu papel atual: <strong>{user?.role || 'não definido'}</strong></p>
            <p>Entre em contato com um administrador para alterar suas permissões.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.homeContainer}>
      <main className={styles.content}>
        <h2>Check-in de Presença</h2>
        <p>Bem-vindo, <strong>{user?.name}</strong> ({user?.role})</p>

        {/* Seleção de Evento */}
        <div className={styles.eventSelector}>
          <h3>Selecione um Evento</h3>
          <div className={styles.eventList}>
            {eventos.map(evento => (
              <button
                key={evento.id}
                onClick={() => carregarListaPresenca(Number(evento.id))}
                className={`${styles.cardButton} ${
                  eventoSelecionado === Number(evento.id) ? styles.selectedEvent : ''
                }`}
                disabled={loading}
              >
                {evento.nome}
                <br />
                <small>{new Date(evento.data_inicio).toLocaleDateString()}</small>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className={styles.errorMessage}>{error}</p>
        )}

        {loading && (
          <p className={styles.statusMessage}>Carregando lista de presença...</p>
        )}

        {/* Lista de Inscritos */}
        {eventoSelecionado && inscritos.length > 0 && (
          <div className={styles.checkinSection}>
            <h3>Lista de Inscritos</h3>
            
            {/* Busca */}
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Estatísticas */}
            <div className={styles.stats}>
              <p>Total de inscritos: <strong>{inscritos.length}</strong></p>
              <p>Presenças confirmadas: <strong>{inscritos.filter(i => i.ja_tem_presenca).length}</strong></p>
              <p>Pendentes: <strong>{inscritos.filter(i => !i.ja_tem_presenca).length}</strong></p>
            </div>

            {/* Lista */}
            <div className={styles.inscritosList}>
              {inscritosFiltrados.map(inscrito => (
                <div key={inscrito.inscricao_id} className={styles.inscritoItem}>
                  <div className={styles.inscritoInfo}>
                    <strong>{inscrito.nome}</strong>
                    <p>{inscrito.email}</p>
                    {inscrito.cpf && <p>CPF: {inscrito.cpf}</p>}
                  </div>
                  
                  <div className={styles.inscritoActions}>
                    {inscrito.ja_tem_presenca ? (
                      <span className={styles.presencaConfirmada}>✅ Presente</span>
                    ) : (
                      <button
                        onClick={() => handleCheckin(inscrito)}
                        className={styles.checkinButton}
                      >
                        Fazer Check-in
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {inscritosFiltrados.length === 0 && searchTerm && (
              <p className={styles.statusMessage}>
                Nenhum inscrito encontrado com o termo "{searchTerm}"
              </p>
            )}
          </div>
        )}

        {eventoSelecionado && inscritos.length === 0 && !loading && (
          <p className={styles.statusMessage}>
            Nenhum inscrito encontrado para este evento.
          </p>
        )}
      </main>
    </div>
  );
}