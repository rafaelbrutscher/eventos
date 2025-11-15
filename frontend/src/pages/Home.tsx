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
    // ... (lógica do useEffect permanece a mesma) ...
  }, []);

  const renderContent = () => {
    
    // --- 2. MOCK ATUALIZADO (com ícones) ---
    const mockEvents = [
      { 
        id: 1, 
        nome: 'Conferência de React', 
        data: '2025-12-01',
        description: 'Um mergulho profundo nos novos hooks e funcionalidades do React 19.',
        icon: <IconCode /> // Passando o componente de ícone
      },
      { 
        id: 2, 
        nome: 'Workshop de Docker', 
        data: '2025-12-05',
        description: 'Aprenda a containerizar suas aplicações do zero.',
        icon: <IconDocker />
      },
      { 
        id: 3, 
        nome: 'Palestra de Cibersegurança', 
        data: '2025-12-10',
        description: 'Técnicas essenciais de defesa para aplicações web modernas.',
        icon: <IconShield />
      },
    ];

    // (Quando a API funcionar, comente os mocks e descomente o resto)
    
    // if (loading) { ... }
    // if (error) { ... }
    // if (events.length === 0) { ... }

    return (
      <ul className={styles.eventList}>
        {mockEvents.map((event, index) => (
          <li 
            key={event.id} 
            className={styles.eventItem}
            style={{ '--animation-delay': `${index * 120}ms` }}
          >
            <div className={styles.cardIcon}>{event.icon}</div>

            <div className={styles.cardContent}>
              <h3>{event.nome}</h3>
              <p className={styles.date}>
                Data: {new Date(event.data).toLocaleDateString()}
              </p>
              <p className={styles.description}>
                {event.description}
              </p>

              {/* 2. TROCAR O <button> POR <Link> */}
              <Link 
                to={`/eventos/${event.id}`} // Rota dinâmica
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