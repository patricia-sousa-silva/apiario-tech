import {
  createContext, useContext, useState, useEffect, useCallback, type ReactNode,
} from 'react';
import api from '../api/client';

export type ConnectionStatus = 'online' | 'offline' | 'checking';

interface ConnectionContextValue {
  status: ConnectionStatus;
  lastChecked: Date | null;
  /** Força uma verificação imediata do estado da API. */
  recheck: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);

const CHECK_INTERVAL = 30_000; // 30 segundos

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    try {
      await api.get('/health', { timeout: 5000 });
      setStatus('online');
    } catch (err) {
      // Se recebemos qualquer resposta HTTP (ex.: 401/404), a API está
      // alcançável — só um erro de rede (sem resposta) significa offline.
      const hasResponse = (err as { response?: unknown })?.response !== undefined;
      setStatus(hasResponse ? 'online' : 'offline');
    } finally {
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, CHECK_INTERVAL);
    // Revalida quando o separador volta a ficar visível
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  return (
    <ConnectionContext.Provider value={{ status, lastChecked, recheck: check }}>
      {children}
    </ConnectionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error('useConnection deve ser usado dentro de <ConnectionProvider>');
  }
  return ctx;
}
