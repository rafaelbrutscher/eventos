// /src/pages/EventDetails.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEventById } from '../services/eventService';
import type { Event } from '../services/eventService';
import { criarInscricao } from '../services/inscricaoService';
import { enviarEmail } from '../services/emailService';
import styles from './Home.module.css'; 
import { useAuth } from '../context/AuthContext';

export function EventDetails() {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Novos estados para o botão de inscrição
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);

  // Efeito para buscar os detalhes do evento (MOCK AINDA ATIVO)
  useEffect(() => {
    if (!id) return;

    const mockUser = { name: 'Usuário Mock', email: 'usuario@mock.com' };
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        // const data = await getEventById(id); // (Chamada real)

        // --- MOCK TEMPORÁRIO (DETALHES DO EVENTO) ---
        setTimeout(() => {
          setEvent({
            id: id,
            nome: `Detalhes da Conferência de React`,
            data: '2025-12-01',
            local: 'Centro de Convenções XYZ',
            description: 'Uma descrição muito mais longa e detalhada sobre o evento de React...'
          });
          setLoading(false);
        }, 500);
        // --- FIM DO MOCK ---

      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  // 3. Função para lidar com o clique de inscrição
  const handleSubscription = async () => {
    if (!id) return;

    setIsSubscribing(true);
    setSubscriptionError(null);
    setSubscriptionSuccess(false);

    try {
      // --- MOCK TEMPORÁRIO (INSCRIÇÃO) ---
      // Simula uma chamada de API de 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));

      // (Esta seria a chamada real)
      // await criarInscricao({ event_id: id }); 

      setSubscriptionSuccess(true);
      // --- FIM DO MOCK ---
      enviarEmail({
        to_email: mockUser.email,
        to_name: mockUser.name,
        event_name: event?.nome || 'Evento',
        type: 'inscricao'
      });

    } catch (err: any) {
      setSubscriptionError(err.message || 'Falha ao se inscrever.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Função para renderizar o botão de inscrição
  const renderSubscribeButton = () => {
    if (subscriptionSuccess) {
      return (
        <button 
          className={styles.cardButton} 
          style={{ backgroundColor: '#16a34a', cursor: 'default' }}
          disabled
        >
          Inscrito com Sucesso!
        </button>
      );
    }

    return (
      <button 
        className={styles.cardButton} 
        onClick={handleSubscription}
        disabled={isSubscribing}
      >
        {isSubscribing ? 'Inscrevendo...' : 'Inscrever-se neste Evento'}
      </button>
    );
  };

  // Renderiza o conteúdo principal (detalhes do evento)
  const renderContent = () => {
    if (loading) return <p className={styles.statusMessage}>Carregando evento...</p>;
    if (error) return <p className={styles.errorMessage}>{error}</p>;
    if (!event) return <p className={styles.statusMessage}>Evento não encontrado.</p>;

    return (
      <div className={styles.eventItem} style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className={styles.cardContent}>
          <h3>{event.nome}</h3>
          <p className={styles.date}>Data: {new Date(event.data).toLocaleDateString()}</p>
          <p className={styles.date} style={{ marginTop: '-1rem' }}>Local: {event.local}</p>
          <p className={styles.description}>{event.description}</p>

          {/* 4. Botão e mensagem de erro atualizados */}
          {renderSubscribeButton()}
          {subscriptionError && (
            <p className={styles.errorMessage} style={{ marginTop: '1rem' }}>
              {subscriptionError}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.homeContainer}>
            <main className={styles.content}>
        <h2>Detalhes do Evento</h2>
        {renderContent()}
      </main>
    </div>
  );
}