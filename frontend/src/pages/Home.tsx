// /src/pages/Home.tsx
import { useState, useEffect } from 'react';
import { getEvents } from '../services/eventService';
import type { Event } from '../services/eventService';
import styles from './Home.module.css';
import { Link } from 'react-router-dom';

// --- 1. DEFINIÇÃO DOS ÍCONES (SVGs Inline) ---

// Ícone para "Ver Detalhes"
function IconArrowRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

// Ícone para React (Código)
function IconCode() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

// Ícone para Docker (Box)
function IconDocker() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10.5 11.25h3M12 15h.008" />
    </svg>
  );
}

// Ícone para Cibersegurança (Escudo)
function IconShield() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.333 9-6.03 9-11.623 0-1.662-.509-3.221-1.402-4.505A11.959 11.959 0 0 1 12 2.714Z" />
    </svg>
  );
}


// --- Componente Principal da Home ---
export function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getEvents();
        setEvents(data);
      } catch (err: any) {
        console.error('Erro ao buscar eventos:', err);
        setError(err.message);
        
        // Fallback para dados mockados se a API falhar
        const mockEvents: Event[] = [
          { 
            id: 1, 
            nome: 'Evento dos sigma da bahia', 
            descricao: 'como ser um sigma da bahia',
            data_inicio: '2025-11-17T10:05:29',
            data_fim: '2025-11-17T11:22:31',
            template_certificado: 'aaaaaaaaaaaa',
            created_at: '2025-11-15T10:05:38',
            updated_at: '2025-11-15T10:05:38'
          }
        ];
        setEvents(mockEvents);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Função auxiliar para obter ícone baseado no nome do evento
  const getEventIcon = (nome: string) => {
    const nomeLower = nome.toLowerCase();
    if (nomeLower.includes('react') || nomeLower.includes('código') || nomeLower.includes('programação')) {
      return <IconCode />;
    }
    if (nomeLower.includes('docker') || nomeLower.includes('container')) {
      return <IconDocker />;
    }
    if (nomeLower.includes('segurança') || nomeLower.includes('cyber') || nomeLower.includes('sigma')) {
      return <IconShield />;
    }
    return <IconCode />; // Ícone padrão
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Carregando eventos...</p>
        </div>
      );
    }

    if (error && events.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#e74c3c' }}>
            Erro ao carregar eventos: {error}
          </p>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            Verificando conexão com o servidor...
          </p>
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Nenhum evento disponível no momento.</p>
        </div>
      );
    }

    return (
      <ul className={styles.eventList}>
        {events.map((event, index) => (
          <li 
            key={event.id} 
            className={styles.eventItem}
            style={{ animationDelay: `${index * 120}ms` } as React.CSSProperties}
          >
            <div className={styles.cardIcon}>{getEventIcon(event.nome)}</div>

            <div className={styles.cardContent}>
              <h3>{event.nome}</h3>
              <p className={styles.date}>
                Data: {new Date(event.data_inicio).toLocaleDateString('pt-BR')}
              </p>
              <p className={styles.description}>
                {event.descricao}
              </p>

              <Link 
                to={`/eventos/${event.id}`}
                className={styles.cardButton}
              >
                Ver Detalhes
                <IconArrowRight />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.homeContainer}>
      <main className={styles.content}>
        <h2>Eventos Disponíveis</h2>
        {renderContent()}
      </main>
    </div>
  );
}