// /src/App.tsx
import { Outlet, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
// Importe o CSS que define os estilos do header
import styles from './pages/Home.module.css';

function Layout() {
  // Usamos o useAuth aqui dentro do Layout
  const { isAuthenticated, logout } = useAuth();

  // Só mostramos o cabeçalho se o usuário estiver logado
  const renderHeader = () => {
    if (!isAuthenticated) return null; // Sem cabeçalho no Login

    return (
      <header className={styles.header}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1>Portal de Eventos</h1>
        </Link>

        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link
            to="/minhas-inscricoes"
            className={styles.logoutButton}
            style={{ textDecoration: 'none', backgroundColor: '#3B82F6' }}
          >
            Minhas Inscrições
          </Link>

          <button onClick={logout} className={styles.logoutButton}>
            Sair (Logout)
          </button>
        </nav>
      </header>
    );
  };

  return (
    <AuthProvider>
      {renderHeader()}
      <main>
        <Outlet />
      </main>
    </AuthProvider>
  );
}

// O elemento raiz do roteador agora é o Layout
// (Ajuste o main.tsx para usar <Layout /> em vez de <App /> se você 
// renomear o componente, ou apenas mantenha <App /> como está)

// Deixe como estava:
export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedLayout />
    </AuthProvider>
  )
}

function AuthenticatedLayout() {
  const { isAuthenticated } = useAuth(); // Esta linha pode ficar

  return (
    <>
      {/* Removemos a condição, o header sempre aparecerá */}
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
          <Link 
          to="/checkin"
          className={styles.logoutButton} // Estilo de botão
          style={{ textDecoration: 'none', backgroundColor: '#f39c12' }} // Laranja
        >
          Check-in (Local)
        </Link>

          <button onClick={useAuth().logout} className={styles.logoutButton}>
            Sair
          </button>
        </nav>
      </header>

      <Outlet />
    </>
  )
}