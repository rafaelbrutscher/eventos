// /src/pages/MeusCertificados.tsx
import { useState, useEffect } from 'react';
import { getEventosConcluidos, emitirCertificado } from '../services/certificadoService';
import type { EventoConcluido } from '../services/certificadoService';

// Reutilizando estilos
import styles from './Home.module.css'; 
import listStyles from './MinhasInscricoes.module.css'; 

// --- MOCK TEMPORÁRIO ---
const MOCK_EVENTOS_CONCLUIDOS: EventoConcluido[] = [
  {
    id: 'evt1',
    nome: 'Palestra de Cibersegurança',
    data_conclusao: '2025-12-10',
  },
  {
    id: 'evt2',
    nome: 'Workshop de Docker',
    data_conclusao: '2025-12-05',
  }
];

export function MeusCertificados() {
  const [eventos, setEventos] = useState<EventoConcluido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para controlar o botão (ex: 'evt1': 'gerando')
  const [statusEmissao, setStatusEmissao] = useState<Record<string, string>>({});

  useEffect(() => {
    const carregarEventos = async () => {
      setLoading(true);
      setError(null);
      try {
        // (Chamada real)
        // const data = await getEventosConcluidos();

        // (Mock)
        await new Promise(r => setTimeout(r, 500));
        setEventos(MOCK_EVENTOS_CONCLUIDOS);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    carregarEventos();
  }, []);

  // Função para o botão "Emitir Certificado"
  const handleEmitir = async (id: string | number) => {
    // Define o estado desse botão específico para 'gerando'
    setStatusEmissao(prev => ({ ...prev, [id]: 'gerando' }));

    try {
      // (Chamada real)
      // const certificado = await emitirCertificado(id);

      // (Mock)
      await new Promise(r => setTimeout(r, 1000));
      const mockCertificado = {
        link_pdf: 'http://exemplo.com/certificado.pdf',
        codigo_validacao: 'ABC-123',
      }

      // Define o estado como o link do PDF
      setStatusEmissao(prev => ({ ...prev, [id]: mockCertificado.link_pdf }));

      // (Opcional) Abre o link do PDF em nova aba
      window.open(mockCertificado.link_pdf, '_blank');

    } catch (err: any) {
      setStatusEmissao(prev => ({ ...prev, [id]: 'erro' }));
      alert(`Erro ao emitir certificado: ${err.message}`);
    }
  };

  // Renderiza o botão correto baseado no estado
  const renderButton = (eventoId: string | number) => {
    const status = statusEmissao[eventoId];

    if (status === 'gerando') {
      return <button className={listStyles.cancelButton} disabled>Gerando...</button>;
    }

    if (status === 'erro') {
      return <button className={listStyles.cancelButton} style={{ backgroundColor: '#e74c3c' }}>Falhou</button>;
    }

    if (status && status.startsWith('http')) {
      // Se já gerou, vira um link
      return (
        <a 
          href={status} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={listStyles.cancelButton}
          style={{ textDecoration: 'none', backgroundColor: '#16a34a' }} // Verde
        >
          Ver PDF
        </a>
      );
    }

    return (
      <button 
        onClick={() => handleEmitir(eventoId)}
        className={listStyles.cancelButton}
        style={{ backgroundColor: '#3B82F6' }} // Azul
      >
        Emitir Certificado
      </button>
    );
  }

  const renderContent = () => {
    if (loading) return <p className={styles.statusMessage}>Carregando...</p>;
    if (error) return <p className={styles.errorMessage}>{error}</p>;
    if (eventos.length === 0) {
      return <p className={styles.statusMessage}>Você não concluiu nenhum evento ainda.</p>;
    }

    return (
      <ul className={listStyles.listContainer}>
        {eventos.map(evt => (
          <li key={evt.id} className={listStyles.listItem}>
            <div className={listStyles.itemDetails}>
              <strong>{evt.nome}</strong>
              <p>Concluído em: {new Date(evt.data_conclusao).toLocaleDateString()}</p>
            </div>
            {renderButton(evt.id)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.homeContainer}>
      <main className={styles.content}>
        <h2>Meus Certificados</h2>
        {renderContent()}
      </main>
    </div>
  );
}