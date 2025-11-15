// /src/App.tsx
import { Outlet, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
      {/* Só mostra header se autenticado */}
      {isAuthenticated && (
        <header className={styles.header}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1 style={{ color: '#1F2937' }}>Portal de Eventos</h1>
          </Link>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
              <Link 
                to="/checkin"
                className={styles.logoutButton}
                style={{ textDecoration: 'none', backgroundColor: '#f39c12' }}
              >
                Check-in (Local)
              </Link>
            )}
            <button onClick={() => logout()} className={styles.logoutButton}>
              Sair
            </button>
          </nav>
        </header>
      )}

      <main>
        <Outlet />
      </main>
    </>
  );
}