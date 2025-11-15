// /src/pages/MinhasInscricoes.tsx
import { useState, useEffect } from 'react';
import { getMinhasInscricoes, cancelarInscricao } from '../services/inscricaoService';
import type { Inscricao } from '../services/inscricaoService';

import styles from './Home.module.css'; // Reutilizando estilos
// CSS específico para a lista de inscrições
import listStyles from './MinhasInscricoes.module.css';

export function MinhasInscricoes() {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar os dados
  const carregarInscricoes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Chamada real para buscar inscrições
      const data = await getMinhasInscricoes();
      setInscricoes(data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carrega os dados quando a página abre
  useEffect(() => {
    carregarInscricoes();
  }, []);

  // Função para o botão "Cancelar"
  const handleCancel = async (id: string | number) => {
    if (!window.confirm("Tem certeza que deseja cancelar esta inscrição?")) {
      return;
    }

    try {
      // Chamada real para cancelar inscrição
      await cancelarInscricao(id);

      // Recarrega a lista após cancelar
      await carregarInscricoes();

    } catch (err: any) {
      alert(`Erro ao cancelar inscrição: ${err.message}`);
    }
  };

  const renderContent = () => {
    if (loading) return <p className={styles.statusMessage}>Carregando...</p>;
    if (error) return <p className={styles.errorMessage}>{error}</p>;
    if (!Array.isArray(inscricoes) || inscricoes.length === 0) {
      return <p className={styles.statusMessage}>Você não possui inscrições ativas.</p>;
    }

    return (
      <ul className={listStyles.listContainer}>
        {inscricoes.map(insc => (
          <li key={insc.id} className={listStyles.listItem}>
            <div className={listStyles.itemDetails}>
              <strong>{insc.evento?.nome || 'Evento sem nome'}</strong>
              <p>Data: {insc.evento?.data_inicio ? new Date(insc.evento.data_inicio).toLocaleDateString() : 'Data não disponível'}</p>
              <p>Status: <span style={{ color: insc.status === 'ativa' ? '#16a34a' : '#e74c3c', fontWeight: 'bold' }}>
                {insc.status === 'ativa' ? 'Ativa' : 'Cancelada'}
              </span></p>
            </div>

            {/* Botão de cancelar só aparece se a inscrição estiver ativa */}
            {insc.status === 'ativa' ? (
              <button 
                onClick={() => handleCancel(insc.id)}
                className={listStyles.cancelButton}
              >
                Cancelar Inscrição
              </button>
            ) : (
              <span className={listStyles.statusTag}>
                Inscrição Cancelada
              </span>
            )}

          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.homeContainer}>
      <main className={styles.content}>
        <h2>Minhas Inscrições</h2>
        {renderContent()}
      </main>
    </div>
  );
}