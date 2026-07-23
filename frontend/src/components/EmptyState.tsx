import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message?: string;
  /** Etiqueta do botão de ação principal. */
  actionLabel?: string;
  /** Se definido, a ação é um link interno para esta rota. */
  actionTo?: string;
  /** Se definido, a ação é um botão com este handler. */
  onAction?: () => void;
  actionIcon?: ReactNode;
}

/**
 * Estado vazio reutilizável com orientação para o utilizador.
 * Mostra um ícone, um título, uma mensagem opcional e uma ação
 * (link interno ou botão) para guiar os próximos passos.
 */
export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  actionTo,
  onAction,
  actionIcon,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <div className="empty-state-title">{title}</div>
      {message && <p className="empty-state-message">{message}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-action">
          {actionIcon}
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button type="button" className="btn btn-action" onClick={onAction}>
          {actionIcon}
          {actionLabel}
        </button>
      )}
    </div>
  );
}
