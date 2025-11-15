// /src/pages/ValidacaoCertificado.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { validarCertificado } from '../services/certificadoService';
import type { ValidacaoInfo } from '../services/certificadoService';

// Estilos do Login
import styles from './Login.module.css';

export function ValidacaoCertificado() {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ValidacaoInfo | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      // --- MOCK TEMPORÁRIO ---
      await new Promise(r => setTimeout(r, 1000));
      if (codigo.toUpperCase() !== 'ABC-123') {
        throw new Error('Código de validação inválido');
      }
      const mockResultado: ValidacaoInfo = {
        nome_participante: 'Usuário Teste (Mock)',
        nome_evento: 'Conferência de React',
        data_emissao: '2025-12-11',
        status: 'valido',
      };
      // --- FIM DO MOCK ---

      // (Chamada real)
      // const mockResultado = await validarCertificado(codigo);

      setResultado(mockResultado);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Renderiza o resultado
  const renderResultado = () => {
    if (!resultado) return null;

    return (
      <div className={styles.loginForm} style={{ marginTop: '2rem', backgroundColor: '#e8f5e9' }}>
        <h2 style={{ color: '#2e7d32' }}>Certificado Válido</h2>
        <p><strong>Participante:</strong> {resultado.nome_participante}</p>
        <p><strong>Evento:</strong> {resultado.nome_evento}</p>
        <p><strong>Emissão:</strong> {new Date(resultado.data_emissao).toLocaleDateString()}</p>
      </div>
    );
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h1>Validação de Certificado</h1>
        <p style={{ textAlign: 'center', marginTop: '-1rem' }}>
          Insira o código de autenticação impresso no documento.
        </p>

        <div className={styles.inputGroup}>
          <label htmlFor="codigo">Código:</label>
          <input
            type="text"
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ex: ABC-123"
            required
          />
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <button type="submit" className={styles.loginButton} disabled={loading}>
          {loading ? 'Validando...' : 'Validar'}
        </button>

        <Link to="/login" style={{ textAlign: 'center', color: '#fff', marginTop: '1rem' }}>
          Voltar para o Login
        </Link>
      </form>

      {renderResultado()}
    </div>
  );
}