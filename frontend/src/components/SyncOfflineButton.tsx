import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface SyncResult {
  processados: number;
  erros: number;
  output?: string;
}

export default function SyncOfflineButton() {
  const { } = useAuth();
  const token = localStorage.getItem('authToken');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [pendenciasCount, setPendenciasCount] = useState<number | null>(null);

  // Buscar contagem de pendências quando abrir o modal
  const fetchPendenciasCount = async () => {
    try {
      const response = await fetch('http://177.44.248.89:8001/api/pendencias-sincronizacao', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendenciasCount(data.data?.total || 0);
      } else {
        console.error('Erro HTTP ao buscar pendências:', response.status, response.statusText);
        setPendenciasCount(0);
      }
    } catch (error) {
      console.error('Erro ao buscar pendências:', error);
      setPendenciasCount(0);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSyncResult(null);
    fetchPendenciasCount();
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://177.44.248.89:8001/api/sincronizar-offline', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 20 })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setSyncResult({
            processados: data.data.processados,
            erros: data.data.erros,
            output: data.data.output
          });
          // Atualizar contagem após sincronização
          fetchPendenciasCount();
        } else {
          alert('Erro na sincronização: ' + data.message);
        }
      } else {
        const errorText = await response.text();
        alert(`Erro HTTP ${response.status}: ${response.statusText}\n${errorText}`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      alert('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSyncResult(null);
    setPendenciasCount(null);
  };

  if (!isModalOpen) {
    return (
      <button
        onClick={handleOpenModal}
        style={{
          backgroundColor: '#e74c3c',
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
        🔄 Sincronizar Offline
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
            minWidth: '400px',
            maxWidth: '600px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: '0 0 1rem 0', color: '#1F2937' }}>
            Sincronização Offline
          </h3>
          
          {pendenciasCount !== null && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0', color: '#6B7280' }}>
                <strong>Pendências para sincronizar:</strong> {pendenciasCount}
              </p>
            </div>
          )}

          {syncResult ? (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ color: '#059669', margin: '0 0 0.5rem 0' }}>
                ✅ Sincronização Concluída
              </h4>
              <div style={{ backgroundColor: '#F3F4F6', padding: '1rem', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>Processados:</strong> {syncResult.processados}
                </p>
                <p style={{ margin: '0' }}>
                  <strong>Erros:</strong> {syncResult.erros}
                </p>
              </div>
              {pendenciasCount !== null && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6B7280' }}>
                  Restam {pendenciasCount} pendências
                </p>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
                Esta ação irá sincronizar os cadastros offline com o sistema online.
                {pendenciasCount && pendenciasCount > 0 && (
                  <><br />Serão processadas até 20 pendências por vez.</>
                )}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
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
            
            {!syncResult && pendenciasCount !== null && pendenciasCount > 0 && (
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
                {isLoading ? 'Sincronizando...' : 'Sincronizar Agora'}
              </button>
            )}

            {syncResult && pendenciasCount !== null && pendenciasCount > 0 && (
              <button
                onClick={() => {
                  setSyncResult(null);
                  handleSync();
                }}
                disabled={isLoading}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sincronizar Novamente
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}