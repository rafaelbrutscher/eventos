// /src/pages/MeuPerfil.tsx
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getUserProfile, updateUserProfile } from '../services/authService';
import type { UserProfile } from '../services/authService';

// Reutilizando estilos
import styles from './Home.module.css'; 
import formStyles from './Login.module.css';

export function MeuPerfil() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Carrega os dados do perfil
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        // (Chamada real)
        // const data = await getUserProfile();

        // --- MOCK TEMPORÁRIO ---
        await new Promise(r => setTimeout(r, 500));
        const data: UserProfile = {
          id: 1,
          name: 'Usuário Mockado',
          email: 'usuario@mock.com',
          cpf: '', // Vazio para complemento
          telefone: '', // Vazio para complemento
        };
        // --- FIM DO MOCK ---

        setUser(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Lida com a mudança nos inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  // Lida com o salvamento
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      // (Chamada real)
      // await updateUserProfile(user);

      // --- MOCK TEMPORÁRIO ---
      await new Promise(r => setTimeout(r, 1000));
      // --- FIM DO MOCK ---

      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderForm = () => {
    if (loading) return <p className={styles.statusMessage}>Carregando perfil...</p>;
    if (error) return <p className={styles.errorMessage}>{error}</p>;
    if (!user) return null;

    return (
      <form onSubmit={handleSubmit} className={formStyles.loginForm} style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* O email é fixo (geralmente) */}
        <div className={formStyles.inputGroup}>
          <label htmlFor="email">Email (não pode ser alterado)</label>
          <input type="email" id="email" value={user.email} disabled />
        </div>

        <div className={formStyles.inputGroup}>
          <label htmlFor="name">Nome Completo</label>
          <input type="text" id="name" name="name" value={user.name} onChange={handleChange} required />
        </div>

        {/* Campos de complemento */}
        <div className={formStyles.inputGroup}>
          <label htmlFor="cpf">CPF</label>
          <input type="text" id="cpf" name="cpf" value={user.cpf || ''} onChange={handleChange} placeholder="Seu CPF" />
        </div>

        <div className={formStyles.inputGroup}>
          <label htmlFor="telefone">Telefone</label>
          <input type="tel" id="telefone" name="telefone" value={user.telefone || ''} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" />
        </div>

        {saveSuccess && <p style={{ color: '#4caf50', textAlign: 'center' }}>Perfil atualizado com sucesso!</p>}

        <button type="submit" className={formStyles.loginButton} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    );
  };

  return (
    <div className={styles.homeContainer}>
      <main className={styles.content}>
        <h2>Meu Perfil</h2>
        <p style={{ textAlign: 'center', marginTop: '-2rem', marginBottom: '2rem', color: '#555' }}>
          Complete seus dados para facilitar a emissão de certificados.
        </p>
        {renderForm()}
      </main>
    </div>
  );
}