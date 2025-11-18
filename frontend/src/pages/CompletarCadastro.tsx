// /src/pages/CompletarCadastro.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Usando estilos do Login
import styles from './Login.module.css';

interface VerificacaoData {
  pode_completar: boolean;
  nome?: string;
  cadastrado_em?: string;
}

export function CompletarCadastro() {
  const [step, setStep] = useState<'verificar' | 'completar'>('verificar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<VerificacaoData | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleVerificarEmail = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://177.44.248.89:8001/api/verificar-cadastro-incompleto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success && data.data.pode_completar) {
        setUserData(data.data);
        setStep('completar');
      } else {
        setError(data.message || 'Email não encontrado ou já possui cadastro completo');
      }
    } catch (err: any) {
      setError('Erro ao verificar email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletarCadastro = async (e: FormEvent) => {
    e.preventDefault();
    
    if (password !== passwordConfirmation) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://177.44.248.89:8001/api/completar-cadastro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Login automático após completar cadastro
        login(data.data.access_token);
      } else {
        setError(data.message || 'Erro ao completar cadastro');
      }
    } catch (err: any) {
      setError('Erro ao completar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      {step === 'verificar' ? (
        <form onSubmit={handleVerificarEmail} className={styles.loginForm}>
          <h1>🚀 Completar Cadastro</h1>
          
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            fontSize: '14px'
          }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#1976d2' }}>
              📝 Você foi cadastrado rapidamente em um evento
            </p>
            <p style={{ margin: 0, color: '#555' }}>
              Para acessar sua conta e gerenciar suas inscrições, complete seu cadastro definindo uma senha.
            </p>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email cadastrado no evento:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
              required
            />
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? 'Verificando...' : 'Verificar Email'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/login" style={{ color: '#fff', textDecoration: 'none' }}>
              ← Voltar para Login
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCompletarCadastro} className={styles.loginForm}>
          <h1>✅ Email Encontrado!</h1>
          
          <div style={{ 
            backgroundColor: '#e8f5e9', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            fontSize: '14px'
          }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#2e7d32' }}>
              👋 Olá, {userData?.nome}!
            </p>
            <p style={{ margin: '0 0 0.5rem 0', color: '#555' }}>
              Email: <strong>{email}</strong>
            </p>
            {userData?.cadastrado_em && (
              <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>
                Cadastrado em: {userData.cadastrado_em}
              </p>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Defina sua senha:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="passwordConfirmation">Confirme sua senha:</label>
            <input
              type="password"
              id="passwordConfirmation"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Digite a senha novamente"
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? 'Completando...' : 'Completar Cadastro'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button 
              type="button"
              onClick={() => {
                setStep('verificar');
                setPassword('');
                setPasswordConfirmation('');
                setError(null);
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#fff', 
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              ← Verificar outro email
            </button>
          </div>
        </form>
      )}
    </div>
  );
}