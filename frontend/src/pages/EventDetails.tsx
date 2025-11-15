// /src/pages/EventDetails.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getEventById } from '../services/eventService';
import type { Event } from '../services/eventService';
import { criarInscricao, verificarInscricao } from '../services/inscricaoService';
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
  const [isAlreadySubscribed, setIsAlreadySubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  // Hook para verificar autenticação
  const { isAuthenticated } = useAuth();

  // Efeito para buscar os detalhes do evento e verificar inscrição
  useEffect(() => {
    if (!id) return;

    const fetchEventAndCheckSubscription = async () => {
      setLoading(true);
      setError(null);
      try {
        // Buscar detalhes do evento
        const eventData = await getEventById(id);
        setEvent(eventData);

        // Verificar se usuário já está inscrito (só se estiver autenticado)
        if (isAuthenticated) {
          setCheckingSubscription(true);
          try {
            const { inscrito } = await verificarInscricao(id);
            setIsAlreadySubscribed(inscrito);
          } catch (checkError) {
            console.warn('Erro ao verificar inscrição:', checkError);
          } finally {
            setCheckingSubscription(false);
          }
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndCheckSubscription();
  }, [id, isAuthenticated]);

  // 3. Função para lidar com o clique de inscrição
  const handleSubscription = async () => {
    if (!id) return;

    setIsSubscribing(true);
    setSubscriptionError(null);
    setSubscriptionSuccess(false);

    try {
      // Chamada real para criar inscrição
      await criarInscricao({ evento_id: id });
      setSubscriptionSuccess(true);
      setIsAlreadySubscribed(true);
      // Enviar email de confirmação (opcional)
      if (isAuthenticated && event) {
        try {
          await enviarEmail({
            to_email: 'usuario@email.com', // TODO: Obter do contexto/API
            to_name: 'Usuário',
            event_name: event.nome,
            type: 'inscricao'
          });
        } catch (emailError) {
          console.warn('Erro ao enviar email:', emailError);
        }
      }

    } catch (err: any) {
      setSubscriptionError(err.message || 'Falha ao se inscrever.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Função para renderizar o botão de inscrição
  const renderSubscribeButton = () => {
    if (!isAuthenticated) {
      return (
        <button 
          className={styles.cardButton} 
          style={{ backgroundColor: '#6b7280', cursor: 'default' }}
          disabled
        >
          Faça login para se inscrever
        </button>
      );
    }

    if (checkingSubscription) {
      return (
        <button 
          className={styles.cardButton} 
          style={{ backgroundColor: '#6b7280', cursor: 'default' }}
          disabled
        >
          Verificando inscrição...
        </button>
      );
    }

    if (isAlreadySubscribed || subscriptionSuccess) {
      return (
        <button 
          className={styles.cardButton} 
          style={{ backgroundColor: '#16a34a', cursor: 'default' }}
          disabled
        >
          Inscrito
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
          <p className={styles.date}>Início: {new Date(event.data_inicio).toLocaleDateString()} às {new Date(event.data_inicio).toLocaleTimeString()}</p>
          <p className={styles.date} style={{ marginTop: '-0.5rem' }}>Fim: {new Date(event.data_fim).toLocaleDateString()} às {new Date(event.data_fim).toLocaleTimeString()}</p>
          <p className={styles.description}>{event.descricao}</p>

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