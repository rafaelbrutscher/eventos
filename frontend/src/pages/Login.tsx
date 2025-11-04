// /src/pages/Login.tsx
// Correção:
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Hook para navegar o usuário para a Home após o login
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Impede o recarregamento da página
    setError(null); // Limpa erros anteriores

    try {
      await login({ email, password });
      // Se o login for bem-sucedido, navega para a Home
      navigate('/'); 

    } catch (err: any) {
      // Se o authService lançar um erro (ex: 401 do backend)
      setError(err.message || 'Credenciais inválidas.');
    }
  };

  return (
    <div>
      <h1>Página de Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Senha:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Exibe a mensagem de erro do backend */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}