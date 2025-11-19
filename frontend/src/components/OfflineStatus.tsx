// /src/components/OfflineStatus.tsx
import { useState, useEffect } from 'react';
import { 
  getStatusOffline, 
  sincronizarCheckinsOffline
} from '../services/presencaService';

export function OfflineStatus() {
  const [status, setStatus] = useState(getStatusOffline());
  const [sincronizando, setSincronizando] = useState(false);

  // Atualizar status periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getStatusOffline());
    }, 5000); // A cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  // Listener para mudanças de conectividade
  useEffect(() => {
    const handleOnline = () => {
      setStatus(getStatusOffline());
    };

    const handleOffline = () => {
      setStatus(getStatusOffline());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sincronizar dados offline
  const handleSincronizar = async () => {
    if (sincronizando || !status.isOnline || status.checkinsPendentes === 0) return;

    setSincronizando(true);
    try {
      const resultado = await sincronizarCheckinsOffline();
      
      // Atualizar status após sincronização
      setStatus(getStatusOffline());
      
      // Mostrar resultado
      if (resultado.success) {
        alert(`Sincronização concluída!\n${resultado.detalhes.sucessos} sucessos, ${resultado.detalhes.falhas} falhas`);
      }
    } catch (error: any) {
      console.error('Erro na sincronização:', error);
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setSincronizando(false);
    }
  };

  // Se está online e não tem dados offline, não mostra nada
  if (status.isOnline && status.checkinsPendentes === 0 && !status.temCache) {
    return null;
  }

  return (
    <div className={`offline-status ${status.isOnline ? 'online' : 'offline'}`}>
      <div className="status-content">
        {/* Indicador de conectividade */}
        <div className="connectivity-indicator">
          <span className={`status-dot ${status.isOnline ? 'online' : 'offline'}`}></span>
          <span className="status-text">
            {status.isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>

        {/* Informações offline */}
        {(status.checkinsPendentes > 0 || !status.isOnline) && (
          <div className="offline-info">
            {status.checkinsPendentes > 0 && (
              <div className="pending-checkins">
                <span className="pending-count">{status.checkinsPendentes}</span>
                <span className="pending-text">
                  check-in{status.checkinsPendentes > 1 ? 's' : ''} pendente{status.checkinsPendentes > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {status.isOnline && status.checkinsPendentes > 0 && (
              <button
                onClick={handleSincronizar}
                disabled={sincronizando}
                className="sync-button"
              >
                {sincronizando ? '🔄 Sincronizando...' : '📤 Sincronizar'}
              </button>
            )}

            {!status.isOnline && (
              <div className="offline-message">
                <span>📱 Modo offline ativo</span>
                <small>Check-ins serão salvos localmente</small>
              </div>
            )}
          </div>
        )}

        {/* Cache info */}
        {status.temCache && (
          <div className="cache-info">
            <small>📦 Dados em cache disponíveis</small>
          </div>
        )}

        {/* Última sincronização */}
        {status.ultimaSincronizacao && (
          <div className="last-sync">
            <small>
              Última sync: {status.ultimaSincronizacao.toLocaleTimeString('pt-BR')}
            </small>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .offline-status {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 12px 16px;
            border-left: 4px solid;
            min-width: 200px;
            max-width: 300px;
          }

          .offline-status.online {
            border-left-color: #10b981;
          }

          .offline-status.offline {
            border-left-color: #ef4444;
            background: #fef2f2;
          }

          .status-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .connectivity-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
          }

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }

          .status-dot.online {
            background: #10b981;
          }

          .status-dot.offline {
            background: #ef4444;
          }

          .offline-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .pending-checkins {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
          }

          .pending-count {
            background: #fbbf24;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
            min-width: 20px;
            text-align: center;
          }

          .sync-button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
          }

          .sync-button:hover:not(:disabled) {
            background: #2563eb;
          }

          .sync-button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }

          .offline-message {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 12px;
          }

          .cache-info,
          .last-sync {
            font-size: 11px;
            color: #6b7280;
          }

          @media (max-width: 768px) {
            .offline-status {
              position: relative;
              top: auto;
              right: auto;
              margin: 10px;
              width: calc(100% - 20px);
            }
          }
        `
      }} />
    </div>
  );
}