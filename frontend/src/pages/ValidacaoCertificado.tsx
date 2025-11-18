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
      const resultado = await validarCertificado(codigo);
      setResultado(resultado);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Renderiza o resultado
  const renderResultado = () => {
    if (!resultado) return null;

    if (resultado.valido) {
      return (
        <div className={styles.loginForm} style={{ marginTop: '2rem', backgroundColor: '#e8f5e9' }}>
          <h2 style={{ color: '#2e7d32' }}>✅ Certificado Válido</h2>
          <p><strong>Participante:</strong> {resultado.participante_nome}</p>
          <p><strong>Evento:</strong> {resultado.evento_nome}</p>
          <p><strong>Código:</strong> {resultado.codigo}</p>
        </div>
      );
    } else {
      return (
        <div className={styles.loginForm} style={{ marginTop: '2rem', backgroundColor: '#ffebee' }}>
          <h2 style={{ color: '#c62828' }}>❌ Certificado Inválido</h2>
          <p><strong>Código:</strong> {resultado.codigo}</p>
          <p><strong>Mensagem:</strong> {resultado.mensagem}</p>
        </div>
      );
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h1>🔍 Validação de Certificado</h1>
        <div style={{ textAlign: 'left', marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '14px' }}>
          <p><strong>Como validar seu certificado:</strong></p>
          <ol style={{ margin: '0.5rem 0', paddingLeft: '1.2rem' }}>
            <li>Localize o código de validação impresso no certificado</li>
            <li>Digite o código exato no campo abaixo</li>
            <li>Clique em "Validar" para verificar a autenticidade</li>
          </ol>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>
            <em>O código geralmente está no rodapé do documento.</em>
          </p>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="codigo">Código de Validação:</label>
          <input
            type="text"
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.trim().toUpperCase())}
            placeholder="Ex: 5FE0DBFA60C74569A89D6568EB2B7830"
            disabled={loading}
            required
            maxLength={50}
            style={{ fontFamily: 'monospace', fontSize: '16px' }}
          />
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <button type="submit" className={styles.loginButton} disabled={loading}>
          {loading ? 'Validando...' : 'Validar'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/login" style={{ color: '#fff', textDecoration: 'none' }}>
            Voltar para o Login
          </Link>
          <span style={{ color: '#fff', margin: '0 1rem' }}>•</span>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>
            Página Principal
          </Link>
        </div>
      </form>

      {renderResultado()}
    </div>
  );
}