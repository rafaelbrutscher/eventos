import React, { useState, useEffect } from 'react';
import { updateProfile, getUserProfile, UpdateProfilePayload } from '../services/authService';
import './Profile.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    current_password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await getUserProfile();
      if (response.success) {
        setUser(response.data);
        setFormData({
          name: response.data.name,
          email: response.data.email,
          password: '',
          current_password: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao carregar perfil'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showPasswordFields) {
      if (formData.password !== formData.confirmPassword) {
        setMessage({
          type: 'error',
          text: 'As senhas não coincidem'
        });
        return;
      }
      
      if (!formData.current_password) {
        setMessage({
          type: 'error',
          text: 'Senha atual é obrigatória para alterar a senha'
        });
        return;
      }
    }

    try {
      setLoading(true);
      setMessage(null);

      const payload: UpdateProfilePayload = {
        name: formData.name,
        email: formData.email
      };

      if (showPasswordFields && formData.password) {
        payload.password = formData.password;
        payload.current_password = formData.current_password;
      }

      const response = await updateProfile(payload);
      
      if (response.success) {
        setMessage({
          type: 'success',
          text: response.message || 'Perfil atualizado com sucesso!'
        });
        
        // Atualizar dados do usuário
        setUser(prev => prev ? {...prev, ...response.data} : null);
        
        // Limpar campos de senha
        setFormData(prev => ({
          ...prev,
          password: '',
          current_password: '',
          confirmPassword: ''
        }));
        setShowPasswordFields(false);
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao atualizar perfil'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading && !user) {
    return (
      <div className="profile-container">
        <div className="loading">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>Meu Perfil</h2>
        
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="name">Nome:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <button
              type="button"
              onClick={() => setShowPasswordFields(!showPasswordFields)}
              className="toggle-password-btn"
              disabled={loading}
            >
              {showPasswordFields ? 'Cancelar alteração de senha' : 'Alterar senha'}
            </button>
          </div>

          {showPasswordFields && (
            <>
              <div className="form-group">
                <label htmlFor="current_password">Senha atual:</label>
                <input
                  type="password"
                  id="current_password"
                  name="current_password"
                  value={formData.current_password}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Nova senha:</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar nova senha:</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar Perfil'}
          </button>
        </form>

        {user && (
          <div className="profile-info">
            <h3>Informações da Conta</h3>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Função:</strong> {user.role}</p>
            <p><strong>Conta criada em:</strong> {new Date(user.created_at).toLocaleString('pt-BR')}</p>
            <p><strong>Última atualização:</strong> {new Date(user.updated_at).toLocaleString('pt-BR')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;