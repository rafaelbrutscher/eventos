import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface UsuarioOffline {
  id: number;
  name: string;
  email: string;
  evento_id: number;
  marcar_presenca: boolean;
  timestamp: string;
  usuario_criado_online?: boolean;
  usuario_id?: number;
}

interface SyncResult {
  total: number;
  processados: number;
  erros: number;
  resultados: any[];
}

export default function SyncOfflineData() {
  const { } = useAuth();
  const token = localStorage.getItem('authToken');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [dadosOffline, setDadosOffline] = useState<UsuarioOffline[]>([]);

  // Carregar dados offline ao montar o componente
  useEffect(() => {
    loadDadosOffline();
  }, []);

  // Carregar dados offline quando abrir o modal
  const loadDadosOffline = () => {
    const dados = JSON.parse(localStorage.getItem('cadastrosOffline') || '[]');
    setDadosOffline(dados);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSyncResult(null);
    loadDadosOffline();
  };

  const handleSync = async () => {
    if (dadosOffline.length === 0) {
      alert('Nenhum dado offline para sincronizar');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://177.44.248.89:8001/api/sincronizar-lote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usuarios: dadosOffline
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setSyncResult(data.data);
          
          // Limpar localStorage se tudo foi processado com sucesso
          if (data.data.erros === 0) {
            localStorage.removeItem('cadastrosOffline');
            setDadosOffline([]);
          } else {
            // Se houveram erros, manter apenas os dados que falharam
            // Por simplicidade, vamos limpar tudo e deixar o usuário tentar novamente
            alert(`Sincronização parcial: ${data.data.processados} processados, ${data.data.erros} erros`);
          }
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
    // Recarregar dados offline para atualizar contador
    loadDadosOffline();
  };

  const limparDadosOffline = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados offline? Esta ação não pode ser desfeita.')) {
      localStorage.removeItem('cadastrosOffline');
      setDadosOffline([]);
    }
  };

  if (!isModalOpen) {
    return (
      <button
        onClick={handleOpenModal}
        style={{
          backgroundColor: dadosOffline.length > 0 ? '#e74c3c' : '#6c757d',
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
        🔄 Sincronizar ({dadosOffline.length})
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
            <p style={{ margin: '0', color: '#6B7280' }}>
              <strong>Dados pendentes:</strong> {dadosOffline.length}
            </p>
          </div>

          {dadosOffline.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
                Dados a serem sincronizados:
              </h4>
              <div style={{ 
                backgroundColor: '#F9FAFB', 
                padding: '1rem', 
                borderRadius: '4px',
                maxHeight: '200px',
                overflow: 'auto',
                border: '1px solid #E5E7EB'
              }}>
                {dadosOffline.map((item, index) => (
                  <div key={item.id} style={{ 
                    marginBottom: index < dadosOffline.length - 1 ? '0.5rem' : 0,
                    padding: '0.5rem',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>{item.name}</strong> - {item.email}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.8rem' }}>
                      Evento ID: {item.evento_id} | 
                      Check-in: {item.marcar_presenca ? '⏰ Fazer após sincronizar' : '❌ Não'} | 
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {syncResult && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ 
                color: syncResult.erros === 0 ? '#059669' : '#DC2626', 
                margin: '0 0 0.5rem 0' 
              }}>
                {syncResult.erros === 0 ? '✅ Sincronização Concluída com Sucesso' : '⚠️ Sincronização Parcial'}
              </h4>
              <div style={{ backgroundColor: '#F3F4F6', padding: '1rem', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>Total:</strong> {syncResult.total}
                </p>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>Processados:</strong> {syncResult.processados}
                </p>
                <p style={{ margin: '0' }}>
                  <strong>Erros:</strong> {syncResult.erros}
                </p>
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
            
            {dadosOffline.length > 0 && (
              <button
                onClick={limparDadosOffline}
                style={{
                  backgroundColor: '#DC2626',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🗑️ Limpar Dados
              </button>
            )}
            
            {dadosOffline.length > 0 && !syncResult && (
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

            {syncResult && syncResult.erros > 0 && (
              <button
                onClick={() => {
                  setSyncResult(null);
                  handleSync();
                }}
                disabled={isLoading}
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