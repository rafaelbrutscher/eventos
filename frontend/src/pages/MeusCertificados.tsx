// /src/pages/MeusCertificados.tsx
import { useState, useEffect } from 'react';
import { getEventosConcluidos, emitirCertificado } from '../services/certificadoService';
import type { EventoConcluido } from '../services/certificadoService';

// Reutilizando estilos
import styles from './Home.module.css'; 
import listStyles from './MinhasInscricoes.module.css'; 

// Removido mock - usando APIs reais
import { useAuth } from '../context/AuthContext';

export function MeusCertificados() {
  const { isAuthenticated, user } = useAuth();
  const [eventos, setEventos] = useState<EventoConcluido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para controlar o botão (ex: 'evt1': 'gerando')
  const [statusEmissao, setStatusEmissao] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setError('Você precisa estar logado para acessar seus certificados');
      return;
    }

    const carregarEventos = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEventosConcluidos();
        setEventos(data);
        
        // Se não há eventos, mostrar mensagem informativa
        if (data.length === 0) {
          setError('Você ainda não participou de nenhum evento ou o serviço de certificados está temporariamente indisponível.');
        }
      } catch (err: any) {
        console.error('Erro ao carregar eventos:', err);
        // Mensagem mais amigável para o usuário
        setError('Não foi possível carregar seus certificados no momento. Tente novamente mais tarde.');
        // Ainda assim, definir eventos como array vazio para não quebrar a interface
        setEventos([]);
      } finally {
        setLoading(false);
      }
    };
    carregarEventos();
  }, [isAuthenticated]);

  // Função para o botão "Emitir Certificado"
  const handleEmitir = async (id: string | number) => {
    // Define o estado desse botão específico para 'gerando'
    setStatusEmissao(prev => ({ ...prev, [id]: 'gerando' }));

    try {
      const certificado = await emitirCertificado(id);

      // Define o estado como o link do PDF
      setStatusEmissao(prev => ({ ...prev, [id]: certificado.link_pdf }));

      // Abre o certificado em nova aba
      window.open(certificado.link_pdf, '_blank');

      // Atualizar a lista para mostrar que o certificado foi gerado
      setEventos(prev => prev.map(evt => 
        evt.id === id 
          ? { ...evt, certificado_gerado: true, certificado_codigo: certificado.codigo_validacao }
          : evt
      ));

    } catch (err: any) {
      setStatusEmissao(prev => ({ ...prev, [id]: 'erro' }));
      alert(`Erro ao emitir certificado: ${err.message}`);
    }
  };

  // Renderiza o botão correto baseado no estado
  const renderButton = (evento: EventoConcluido) => {
    const status = statusEmissao[evento.id];

    // Se não pode gerar certificado ainda
    if (!evento.pode_gerar_certificado) {
      return <span style={{ color: '#666', fontSize: '14px' }}>Evento ainda não concluído</span>;
    }

    if (status === 'gerando') {
      return <button className={listStyles.cancelButton} disabled>Gerando...</button>;
    }

    if (status === 'erro') {
      return <button className={listStyles.cancelButton} style={{ backgroundColor: '#e74c3c' }}>Falhou</button>;
    }

    // Se já tem certificado gerado ou o status é um link
    if (evento.certificado_gerado || (status && status.startsWith('http'))) {
      const link = status || `http://177.44.248.89:8005/api/certificados/${evento.certificado_id}/download/`;
      return (
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={listStyles.cancelButton}
          style={{ textDecoration: 'none', backgroundColor: '#16a34a' }} // Verde
        >
          Ver Certificado
        </a>
      );
    }

    return (
      <button 
        onClick={() => handleEmitir(evento.id)}
        className={listStyles.cancelButton}
        style={{ backgroundColor: '#3B82F6' }} // Azul
      >
        Emitir Certificado
      </button>
    );
  }

  const renderContent = () => {
    if (!isAuthenticated) {
      return <p className={styles.errorMessage}>Você precisa estar logado para ver seus certificados.</p>;
    }
    
    if (loading) return <p className={styles.statusMessage}>Carregando eventos...</p>;
    if (error) return <p className={styles.errorMessage}>{error}</p>;
    if (eventos.length === 0) {
      return <p className={styles.statusMessage}>Você ainda não participou de nenhum evento que gera certificado.</p>;
    }

    return (
      <ul className={listStyles.listContainer}>
        {eventos.map(evt => (
          <li key={evt.id} className={listStyles.listItem}>
            <div className={listStyles.itemDetails}>
              <strong>{evt.nome}</strong>
              <p>Concluído em: {new Date(evt.data_conclusao).toLocaleDateString()}</p>
              {evt.certificado_codigo && (
                <p style={{ fontSize: '12px', color: '#666' }}>
                  Código: {evt.certificado_codigo}
                </p>
              )}
            </div>
            {renderButton(evt)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.homeContainer}>
      <main className={styles.content}>
        <h2>Meus Certificados</h2>
        {renderContent()}
      </main>
    </div>
  );
}