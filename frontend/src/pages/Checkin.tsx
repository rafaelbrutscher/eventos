// /src/pages/Checkin.tsx
import { useState } from 'react';
import { registrarPresenca } from '../services/presencaService';

// Reutilizando estilos
import styles from './Home.module.css'; 
import formStyles from './Login.module.css';
import listStyles from './MinhasInscricoes.module.css'; 

// --- MOCK TEMPORÁRIO ---
const MOCK_USUARIO_INSCRITO = {
  user_id: 'user123',
  name: 'Participante 1 (Mock)',
  email: 'p1@mock.com',
  event_id: 'evt1',
  status_inscricao: 'Confirmada',
};

export function Checkin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUser, setFoundUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  // Lida com a busca (simulada)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFoundUser(null);
    setCheckinSuccess(false);

    await new Promise(r => setTimeout(r, 500));

    if (searchTerm.toLowerCase() === 'p1@mock.com') {
      setFoundUser(MOCK_USUARIO_INSCRITO);
    } else {
      setError('Participante não encontrado ou não inscrito.');
    }
    setLoading(false);
  };

  // Lida com o check-in (simulado)
  const handleCheckin = async () => {
    if (!foundUser) return;

    setLoading(true);
    setError(null);
    setCheckinSuccess(false);

    try {
      // (Chamada real)
      // await registrarPresenca({
      //   user_id: foundUser.user_id,
      //   event_id: foundUser.event_id
      // });

      // (Mock)
      await new Promise(r => setTimeout(r, 1000));
      setCheckinSuccess(true);

    } catch (err: any) {
      setError(err.message || 'Falha ao registrar check-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.homeContainer}>
      <main className={styles.content}>
        <h2>Check-in do Evento</h2>

        {/* Formulário de Busca */}
        <form onSubmit={handleSearch} className={formStyles.loginForm} style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className={formStyles.inputGroup}>
            <label htmlFor="search">Buscar Participante (por Email ou CPF)</label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o email ou CPF..."
            />
          </div>
          <button type="submit" className={formStyles.loginButton} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Resultados da Busca */}
        <div style={{ marginTop: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
          {error && <p className={styles.errorMessage}>{error}</p>}

          {foundUser && !checkinSuccess && (
            <div className={listStyles.listItem}>
              <div className={listStyles.itemDetails}>
                <strong>{foundUser.name}</strong>
                <p>Email: {foundUser.email} | Inscrição: {foundUser.status_inscricao}</p>
              </div>
              <button 
                onClick={handleCheckin}
                className={listStyles.cancelButton}
                style={{ backgroundColor: '#16a34a' }}
                disabled={loading}
              >
                {loading ? 'Registrando...' : 'Fazer Check-in'}
              </button>
            </div>
          )}

          {checkinSuccess && (
            <div className={listStyles.listItem} style={{ borderColor: '#16a34a', borderWidth: '2px' }}>
              <p style={{ color: '#16a34a', fontWeight: 600 }}>
                Check-in de {foundUser.name} realizado com sucesso!
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}