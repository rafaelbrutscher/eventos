// /src/pages/Register.tsx
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { register } from '../services/authService';
import type { RegisterPayload } from '../services/authService';

// Reutilizar os estilos do Login
import styles from './Login.module.css';

export function Register() {
  const [formData, setFormData] = useState<RegisterPayload>({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redireciona se já estiver logado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await register(formData);
      
      if (response.success) {
        setSuccess(response.message + " Redirecionando para o login...");
        // Redireciona para o login após 2s
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError('Erro inesperado no registro.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h1>Criar Conta</h1>

        <div className={styles.inputGroup}>
          <label htmlFor="name">Nome Completo:</label>
          <input type="text" id="name" name="name" onChange={handleChange} required />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="email">Email:</label>
          <input type="email" id="email" name="email" onChange={handleChange} required />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">Senha:</label>
          <input type="password" id="password" name="password" onChange={handleChange} required />
        </div>



        {error && <p className={styles.errorMessage}>{error}</p>}
        {success && <p style={{ color: '#4caf50', textAlign: 'center' }}>{success}</p>}

        <button type="submit" className={styles.loginButton} disabled={loading || !!success}>
          {loading ? 'Registrando...' : 'Registrar'}
        </button>

        <Link to="/login" style={{ textAlign: 'center', color: '#fff', marginTop: '1rem' }}>
          Já tem uma conta? Faça login
        </Link>
      </form>
    </div>
  );
}