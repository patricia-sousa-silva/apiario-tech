import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  ClipboardList, Plus, Trash2, Search, Eye, Utensils,
  Stethoscope, Droplet, Wrench, X,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { formatDateTime } from '../utils/time';

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
  const { success, error: showError } = useToast();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [hives, setHives] = useState<Hive[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [toDelete, setToDelete] = useState<Intervention | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      success('Intervenção registada com sucesso.');
      await fetchInterventions();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao guardar.';
      setError(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/interventions/${toDelete.id}`);
      success('Intervenção eliminada.');
      setToDelete(null);
      await fetchInterventions();
    } catch {
      showError('Erro ao eliminar a intervenção.');
    } finally {
      setDeleting(false);
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
        <div className="page-header-actions">
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
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
          <EmptyState
            icon={<ClipboardList size={40} />}
            title="Nenhuma intervenção registada"
            message="Registe inspeções, alimentações, tratamentos e colheitas para manter o histórico completo da colmeia."
            actionLabel="Registar primeira intervenção"
            onAction={openNew}
            actionIcon={<Plus size={17} />}
          />
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
                      <td className="font-mono">{formatDateTime(itv.date)}</td>
                      <td style={{ fontWeight: 600 }}>{itv.hive.name}</td>
                      <td className="text-muted">{itv.hive.apiary.name}</td>
                      <td className="text-muted" style={{ maxWidth: 320 }}>
                        {itv.notes || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => setToDelete(itv)}>
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

      {/* Modal de nova intervenção */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova intervenção</h2>
              <button className="modal-close" onClick={() => setModal(false)} aria-label="Fechar">
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
                <div className="modal-footer">
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

      {/* Confirmação de eliminação */}
      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar intervenção?"
        message={
          toDelete
            ? `A intervenção "${TYPE_CONFIG[toDelete.type].label}" em ${toDelete.hive.name} será eliminada definitivamente.`
            : ''
        }
        confirmLabel="Eliminar intervenção"
        onConfirm={confirmRemove}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}
