// /src/pages/MinhasInscricoes.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMinhasInscricoes, cancelarInscricao } from '../services/inscricaoService';
import type { Inscricao } from '../services/inscricaoService';

import styles from './Home.module.css'; // Reutilizando estilos
// CSS específico para a lista de inscrições
import listStyles from './MinhasInscricoes.module.css'; 

// --- MOCK TEMPORÁRIO ---
const MOCK_INSCRICOES: Inscricao[] = [
  {
    id: 'insc123',
    event_id: 1,
    user_id: 'user1',
    status: 'confirmada',
    created_at: new Date().toISOString(),
    evento: { id: 1, nome: 'Conferência de React', data: '2025-12-01' },
    status_presenca: 'presente', // <-- Participante 1 (check-in feito)
  },
  {
    id: 'insc456',
    event_id: 2,
    user_id: 'user1',
    status: 'confirmada',
    created_at: new Date().toISOString(),
    evento: { id: 2, nome: 'Workshop de Docker', data: '2025-12-05' },
    status_presenca: null, // <-- Participante 2 (só inscrito)
  }
];

export function MinhasInscricoes() {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar os dados
  const carregarInscricoes = async () => {
    setLoading(true);
    setError(null);
    try {
      // (Chamada real)
      // const data = await getMinhasInscricoes(); 

      // (Mock)
      await new Promise(r => setTimeout(r, 500));
      setInscricoes(MOCK_INSCRICOES);

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
      // (Chamada real)
      // await cancelarInscricao(id);

      // (Mock)
      await new Promise(r => setTimeout(r, 500));

      // Remove a inscrição da lista local para atualizar a UI
      setInscricoes(prev => prev.filter(item => item.id !== id));

    } catch (err: any) {
      alert(`Erro ao cancelar inscrição: ${err.message}`);
    }
  };

  const renderContent = () => {
    if (loading) return <p className={styles.statusMessage}>Carregando...</p>;
    if (error) return <p className={styles.errorMessage}>{error}</p>;
    if (inscricoes.length === 0) {
      return <p className={styles.statusMessage}>Você não possui inscrições ativas.</p>;
    }

    return (
      <ul className={listStyles.listContainer}>
        {inscricoes.map(insc => (
          <li key={insc.id} className={listStyles.listItem}>
            <div className={listStyles.itemDetails}>
              <strong>{insc.evento?.nome}</strong>
              <p>Data: {new Date(insc.evento?.data ?? '').toLocaleDateString()}</p>
            </div>

            {/* --- LÓGICA DE STATUS ATUALIZADA --- */}
            {insc.status_presenca === 'presente' ? (
              <span className={listStyles.statusTag}>
                Presença Confirmada
              </span>
            ) : (
              <button 
                onClick={() => handleCancel(insc.id)}
                className={listStyles.cancelButton}
              >
                Cancelar Inscrição
              </button>
            )}
            {/* --- FIM DA ATUALIZAÇÃO --- */}

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