/**
 * Utilitários de formatação de datas e tempo relativo.
 */

/**
 * Devolve uma descrição humana de "tempo decorrido" em português.
 * Ex.: "agora mesmo", "há 5 min", "há 2 h", "há 3 dias".
 */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 0) return 'agora mesmo';
  if (seconds < 45) return 'agora mesmo';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? 'há 1 dia' : `há ${days} dias`;

  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? 'há 1 mês' : `há ${months} meses`;

  const years = Math.floor(months / 12);
  return years === 1 ? 'há 1 ano' : `há ${years} anos`;
}

/**
 * Formata uma data/hora completa em pt-PT.
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-PT');
}
