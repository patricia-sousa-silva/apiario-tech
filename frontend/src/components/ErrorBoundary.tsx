import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Título mostrado no ecrã de erro. */
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary: captura erros de renderização dos filhos e mostra um
 * ecrã de fallback em vez de rebentar a aplicação inteira.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Em produção poderíamos enviar para um serviço de logging
    console.error('ErrorBoundary capturou:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-icon" aria-hidden="true">
          <AlertTriangle size={40} />
        </div>
        <h2 className="error-boundary-title">
          {this.props.title ?? 'Algo correu mal'}
        </h2>
        <p className="error-boundary-message">
          Ocorreu um erro inesperado ao apresentar esta secção. Pode tentar
          recarregar ou voltar ao dashboard.
        </p>
        {this.state.error && (
          <code className="error-boundary-detail">{this.state.error.message}</code>
        )}
        <div className="error-boundary-actions">
          <button type="button" className="btn btn-action" onClick={this.handleRetry}>
            <RotateCcw size={17} /> Tentar novamente
          </button>
          <a href="/" className="btn btn-secondary">
            <Home size={17} /> Ir para o dashboard
          </a>
        </div>
      </div>
    );
  }
}
