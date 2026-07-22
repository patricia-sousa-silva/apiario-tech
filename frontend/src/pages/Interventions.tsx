import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  ClipboardList, Plus, Trash2, Search, Eye, Utensils,
  Stethoscope, Droplet, Wrench, X,
} from 'lucide-react';
import api from '../api/client';

interface Hive {
  id: string;
  name: string;
}

interface Intervention {
  id: string;
  type: InterventionType;
  date: string;
  notes: string | null;
  hive: { name: string; apiary: { name: string } };
}

type InterventionType = 'INSPECTION' | 'FEEDING' | 'TREATMENT' | 'HARVEST' | 'OBSERVATION' | 'MAINTENANCE';

const TYPE_CONFIG: Record<InterventionType, { label: string; icon: typeof Search; color: string }> = {
  INSPECTION: { label: 'Inspeção', icon: Search, color: 'info' },
  FEEDING: { label: 'Alimentação', icon: Utensils, color: 'ok' },
  TREATMENT: { label: 'Tratamento', icon: Stethoscope, color: 'error' },
  HARVEST: { label: 'Colheita', icon: Droplet, color: 'warn' },
  OBSERVATION: { label: 'Observação', icon: Eye, color: 'neutral' },
  MAINTENANCE: { label: 'Manutenção', icon: Wrench, color: 'neutral' },
};

export default function Interventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [hives, setHives] = useState<Hive[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [filterType, setFilterType] = useState('');

  const [hiveId, setHiveId] = useState('');
  const [type, setType] = useState<InterventionType>('INSPECTION');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchInterventions = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      const res = await api.get('/interventions', { params });
      setInterventions(res.data);
    } catch (err) {
      console.error('Erro ao carregar intervenções:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    api.get('/hives').then((res) => setHives(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  const openNew = () => {
    setHiveId(hives[0]?.id || '');
    setType('INSPECTION');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setError('');
    setModal(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/interventions', {
        hiveId,
        type,
        date: new Date(date).toISOString(),
        notes: notes || undefined,
      });
      setModal(false);
      await fetchInterventions();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Eliminar esta intervenção?')) return;
    try {
      await api.delete(`/interventions/${id}`);
      await fetchInterventions();
    } catch (err) {
      console.error('Erro ao eliminar intervenção:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        A carregar intervenções...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Intervenções</h1>
          <p className="page-subtitle">Registe inspeções, alimentações, tratamentos e colheitas.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.5rem 0.875rem', borderRadius: 6, border: '1px solid #cbd5e1',
              fontSize: '0.875rem', fontFamily: 'inherit', background: '#fff',
            }}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <button className="btn btn-action" onClick={openNew}>
            <Plus size={17} /> Nova intervenção
          </button>
        </div>
      </div>

      {interventions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ClipboardList size={40} />
            Nenhuma intervenção registada.
            <button className="btn btn-action" onClick={openNew}>
              <Plus size={17} /> Registar primeira intervenção
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Colmeia</th>
                  <th>Apiário</th>
                  <th>Notas</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((itv) => {
                  const cfg = TYPE_CONFIG[itv.type];
                  const Icon = cfg.icon;
                  return (
                    <tr key={itv.id}>
                      <td>
                        <span className={`badge ${cfg.color}`}>
                          <Icon size={13} /> {cfg.label}
                        </span>
                      </td>
                      <td className="font-mono">
                        {new Date(itv.date).toLocaleDateString('pt-PT')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{itv.hive.name}</td>
                      <td className="text-muted">{itv.hive.apiary.name}</td>
                      <td className="text-muted" style={{ maxWidth: 320 }}>
                        {itv.notes || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(itv.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgb(15 23 42 / 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: '1rem',
          }}
          onClick={() => setModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: '1.75rem',
              width: '100%', maxWidth: 460, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Nova intervenção</h2>
              <button
                onClick={() => setModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {hives.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Precisa de ter pelo menos uma colmeia registada antes de criar uma intervenção.
              </p>
            ) : (
              <form onSubmit={save}>
                <div className="form-group">
                  <label htmlFor="itvHive">Colmeia</label>
                  <select id="itvHive" value={hiveId} onChange={(e) => setHiveId(e.target.value)} required>
                    {hives.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="itvType">Tipo</label>
                  <select id="itvType" value={type} onChange={(e) => setType(e.target.value as InterventionType)} required>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="itvDate">Data</label>
                  <input
                    id="itvDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="itvNotes">Notas (opcional)</label>
                  <textarea
                    id="itvNotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Ex.: Colónia forte, postura regular..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-action" disabled={saving}>
                    {saving ? 'A guardar...' : 'Registar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
