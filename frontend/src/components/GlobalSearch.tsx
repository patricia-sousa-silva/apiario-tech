import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Boxes, ClipboardList, BellRing } from 'lucide-react';
import api from '../api/client';

interface HiveItem { id: string; name: string }
interface InterventionItem { id: string; type: string; notes: string | null }
interface AlertItem { id: string; message: string }

interface AllData {
  hives: HiveItem[];
  interventions: InterventionItem[];
  alerts: AlertItem[];
}

const INTERVENTION_LABELS: Record<string, string> = {
  INSPECTION: 'Inspeção',
  FEEDING: 'Alimentação',
  TREATMENT: 'Tratamento',
  HARVEST: 'Colheita',
  OBSERVATION: 'Observação',
  MAINTENANCE: 'Manutenção',
};

/**
 * Pesquisa global na topbar: procura colmeias, intervenções e alertas
 * e navega para a página correspondente.
 */
export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<AllData>({ hives: [], interventions: [], alerts: [] });
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Carrega os dados pesquisáveis uma vez
  useEffect(() => {
    Promise.all([
      api.get('/hives').catch(() => ({ data: [] })),
      api.get('/interventions').catch(() => ({ data: [] })),
      api.get('/alerts').catch(() => ({ data: [] })),
    ]).then(([h, i, a]) => {
      setAll({
        hives: Array.isArray(h.data) ? h.data : [],
        interventions: Array.isArray(i.data) ? i.data : [],
        alerts: Array.isArray(a.data) ? a.data : [],
      });
    });
  }, []);

  // Fecha ao clicar fora
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const q = query.trim().toLowerCase();
  const hives = q ? all.hives.filter((h) => h.name.toLowerCase().includes(q)).slice(0, 4) : [];
  const interventions = q
    ? all.interventions
        .filter((i) =>
          `${INTERVENTION_LABELS[i.type] ?? i.type} ${i.notes ?? ''}`.toLowerCase().includes(q))
        .slice(0, 4)
    : [];
  const alerts = q ? all.alerts.filter((a) => a.message.toLowerCase().includes(q)).slice(0, 4) : [];
  const hasResults = hives.length + interventions.length + alerts.length > 0;

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  return (
    <div className="global-search" ref={containerRef}>
      <Search size={15} className="global-search-icon" aria-hidden="true" />
      <input
        id="global-search-input"
        type="search"
        className="global-search-input"
        placeholder="Pesquisar…  ( / )"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        aria-label="Pesquisa global"
        autoComplete="off"
      />
      {open && q && (
        <div className="global-search-dropdown" role="listbox">
          {!hasResults && (
            <div className="global-search-empty">Sem resultados para “{query.trim()}”.</div>
          )}
          {hives.map((h) => (
            <button key={`h-${h.id}`} type="button" className="global-search-item" onClick={() => go('/hives')}>
              <Boxes size={15} aria-hidden="true" />
              <span className="global-search-name">{h.name}</span>
              <em>Colmeias</em>
            </button>
          ))}
          {interventions.map((i) => (
            <button key={`i-${i.id}`} type="button" className="global-search-item" onClick={() => go('/interventions')}>
              <ClipboardList size={15} aria-hidden="true" />
              <span className="global-search-name">
                {INTERVENTION_LABELS[i.type] ?? i.type}{i.notes ? ` — ${i.notes}` : ''}
              </span>
              <em>Intervenções</em>
            </button>
          ))}
          {alerts.map((a) => (
            <button key={`a-${a.id}`} type="button" className="global-search-item" onClick={() => go('/alerts')}>
              <BellRing size={15} aria-hidden="true" />
              <span className="global-search-name">{a.message}</span>
              <em>Alertas</em>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
