import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sincronizarTodosOffline, getCadastrosOfflinePendentes, getCheckinsOfflinePendentes } from '../services/presencaService';

interface SyncResult {
  success: boolean;
  message: string;
  detalhes: {
    cadastros?: any;
    checkins?: any;
  };
}

export default function SyncOfflineData() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [cadastrosPendentes, setCadastrosPendentes] = useState(0);
  const [checkinsPendentes, setCheckinsPendentes] = useState(0);

  // Carregar dados offline ao montar o componente
  useEffect(() => {
    loadDadosOffline();
  }, []);

  // Carregar dados offline quando abrir o modal
  const loadDadosOffline = () => {
    const cadastros = getCadastrosOfflinePendentes();
    const checkins = getCheckinsOfflinePendentes();
    setCadastrosPendentes(cadastros);
    setCheckinsPendentes(checkins);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSyncResult(null);
    loadDadosOffline();
  };

  const handleSync = async () => {
    const totalPendentes = cadastrosPendentes + checkinsPendentes;
    if (totalPendentes === 0) {
      alert('Nenhum dado offline para sincronizar');
      return;
    }

    setIsLoading(true);
    try {
      const resultado = await sincronizarTodosOffline();
      setSyncResult(resultado);
      
      if (resultado.success) {
        // Atualizar contadores
        loadDadosOffline();
        
        // Recarregar a página após sincronização bem-sucedida
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
    } catch (error: any) {
      console.error('Erro ao sincronizar:', error);
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSyncResult(null);
    // Recarregar dados offline para atualizar contador
    loadDadosOffline();
  };



  const totalPendentes = cadastrosPendentes + checkinsPendentes;

  if (!isModalOpen) {
    return (
      <button
        onClick={handleOpenModal}
        style={{
          backgroundColor: totalPendentes > 0 ? '#e74c3c' : '#6c757d',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          fontSize: '0.9rem',
          fontWeight: '600',
          cursor: 'pointer',
          textDecoration: 'none'
        }}
      >
        Sincronizar ({totalPendentes})
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            minWidth: '500px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#1F2937' }}>
            Sincronização de Dados Offline
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              backgroundColor: '#F3F4F6', 
              padding: '1rem', 
              borderRadius: '4px',
              marginBottom: '1rem'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
                <strong>📝 Cadastros pendentes:</strong> {cadastrosPendentes}
              </p>
              <p style={{ margin: '0', color: '#374151' }}>
                <strong>✅ Check-ins pendentes:</strong> {checkinsPendentes}
              </p>
            </div>
            
            {totalPendentes > 0 && (
              <div style={{ 
                backgroundColor: '#FEF3C7', 
                padding: '1rem', 
                borderRadius: '4px',
                border: '1px solid #F59E0B'
              }}>
                <p style={{ margin: '0', color: '#92400E', fontSize: '0.9rem' }}>
                  ⚠️ <strong>Total de {totalPendentes} itens</strong> serão sincronizados com o servidor.
                  Isso inclui criação de usuários, inscrições, presenças e certificados.
                </p>
              </div>
            )}
          </div>

          {syncResult && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ 
                color: syncResult.success ? '#059669' : '#DC2626', 
                margin: '0 0 0.5rem 0' 
              }}>
                {syncResult.success ? '✅ Sincronização Concluída' : '⚠️ Erro na Sincronização'}
              </h4>
              <div style={{ backgroundColor: '#F3F4F6', padding: '1rem', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>Resultado:</strong> {syncResult.message}
                </p>
                
                {syncResult.detalhes.cadastros && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Cadastros:</strong>
                    <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem' }}>
                      <li>Total: {syncResult.detalhes.cadastros.detalhes.total}</li>
                      <li>Sucessos: {syncResult.detalhes.cadastros.detalhes.sucessos}</li>
                      <li>Falhas: {syncResult.detalhes.cadastros.detalhes.falhas}</li>
                    </ul>
                  </div>
                )}
                
                {syncResult.detalhes.checkins && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Check-ins:</strong>
                    <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem' }}>
                      <li>Total: {syncResult.detalhes.checkins.detalhes.total}</li>
                      <li>Sucessos: {syncResult.detalhes.checkins.detalhes.sucessos}</li>
                      <li>Falhas: {syncResult.detalhes.checkins.detalhes.falhas}</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={handleClose}
              style={{
                backgroundColor: '#6B7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Fechar
            </button>
            
            {totalPendentes > 0 && !syncResult && (
              <button
                onClick={handleSync}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#9CA3AF' : '#3B82F6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? '⏳ Sincronizando...' : '🚀 Sincronizar Agora'}
              </button>
            )}

            {syncResult && !syncResult.success && (
              <button
                onClick={() => {
                  setSyncResult(null);
                  loadDadosOffline();
                }}
                style={{
                  backgroundColor: '#F59E0B',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🔄 Tentar Novamente
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}