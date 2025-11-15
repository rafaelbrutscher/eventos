// /src/pages/Login.tsx
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { login as loginService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css'; 
import { Link, useNavigate, useLocation } from 'react-router-dom'; 

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redireciona se já estiver logado
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]); 

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); 
    setError(null); 

    try {
      const response = await loginService({ email, password });
      if (response.success && response.data.access_token) {
        login(response.data.access_token);
        // Redirecionar para a página que o usuário tentou acessar ou para home
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError('Token de acesso não recebido.');
      }
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas.');
    }
  };

  // 2. Aplique as classes do CSS Module
  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h1>Login</h1>

        <div className={styles.inputGroup}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">Senha:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <button type="submit" className={styles.loginButton}>
          Entrar
        </button>
        
        <Link to="/register" style={{ textAlign: 'center', color: '#fff', marginTop: '1rem' }}>
          Não tem uma conta? Crie uma agora
        </Link>
      </form>
    </div>
  );
}