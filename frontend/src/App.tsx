// /src/App.tsx
import { Outlet, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SyncOfflineData from './components/SyncOfflineData';
import styles from './pages/Home.module.css';

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedLayout />
    </AuthProvider>
  );
}

function AuthenticatedLayout() {
  const { isAuthenticated, logout, canAccessCheckIn } = useAuth();

  return (
    <>
      <header className={styles.header}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 style={{ color: '#1F2937' }}>Portal de Eventos</h1>
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Link público sempre visível */}
          <Link
            to="/validar-certificado"
            style={{ textDecoration: 'none', color: '#059669', fontWeight: 600, fontSize: '0.9rem' }}
          >
            Validar Certificado
          </Link>
          
          {/* Links apenas para usuários autenticados */}
          {isAuthenticated && (
            <>
              <Link
                to="/minhas-inscricoes"
                style={{ textDecoration: 'none', color: '#3B82F6', fontWeight: 600 }}
              >
                Minhas Inscrições
              </Link>
              <Link
                to="/meus-certificados"
                style={{ textDecoration: 'none', color: '#3B82F6', fontWeight: 600, fontSize: '0.9rem' }}
              >
                Meus Certificados
              </Link>
              <Link
                to="/meu-perfil"
                style={{ textDecoration: 'none', color: '#3B82F6', fontWeight: 600, fontSize: '0.9rem' }}
              >
                Meu Perfil
              </Link>
              {canAccessCheckIn() && (
                <>
                  <Link 
                    to="/checkin"
                    className={styles.logoutButton}
                    style={{ textDecoration: 'none', backgroundColor: '#f39c12' }}
                  >
                    Check-in (Local)
                  </Link>
                  <Link 
                    to="/cadastro-rapido"
                    className={styles.logoutButton}
                    style={{ textDecoration: 'none', backgroundColor: '#8e24aa' }}
                  >
                    Cadastro Rápido
                  </Link>
                  <SyncOfflineData />
                </>
              )}
              <button onClick={() => logout()} className={styles.logoutButton}>
                Sair
              </button>
            </>
          )}
          
          {/* Se não estiver autenticado, mostra link de login */}
          {!isAuthenticated && (
            <Link
              to="/login"
              className={styles.logoutButton}
              style={{ textDecoration: 'none' }}
            >
              Entrar
            </Link>
          )}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  );
}