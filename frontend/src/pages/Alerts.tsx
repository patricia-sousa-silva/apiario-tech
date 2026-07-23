import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { BellRing, Plus, Trash2, CheckCircle2, Settings2, X, Power } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { timeAgo } from '../utils/time';

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  active: boolean;
}

interface Alert {
  id: string;
  message: string;
  value: number | null;
  acknowledged: boolean;
  createdAt: string;
  rule: { name: string; metric: string };
}

const METRIC_LABELS: Record<string, string> = {
  TEMP_EXT: 'Temp. exterior',
  TEMP_NEST1: 'Temp. ninho 1',
  TEMP_NEST2: 'Temp. ninho 2',
  HUMIDITY: 'Humidade',
  PRESSURE: 'Pressão',
  WEIGHT: 'Peso',
  BATTERY: 'Bateria',
};

const OPERATOR_LABELS: Record<string, string> = {
  GT: '>',
  LT: '<',
  GTE: '≥',
  LTE: '≤',
};

export default function Alerts() {
  const { success, error: showError } = useToast();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<AlertRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [metric, setMetric] = useState('TEMP_NEST1');
  const [operator, setOperator] = useState('GT');
  const [threshold, setThreshold] = useState('38');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [rulesRes, alertsRes] = await Promise.all([
        api.get('/alert-rules'),
        api.get('/alerts'),
      ]);
      setRules(rulesRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openNew = () => {
    setName('');
    setMetric('TEMP_NEST1');
    setOperator('GT');
    setThreshold('38');
    setFormError('');
    setModal(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/alert-rules', {
        name,
        metric,
        operator,
        threshold: parseFloat(threshold),
      });
      setModal(false);
      success('Regra de alerta criada com sucesso.');
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao guardar.';
      setFormError(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: AlertRule) => {
    try {
      await api.put(`/alert-rules/${rule.id}`, { active: !rule.active });
      success(`Regra "${rule.name}" ${rule.active ? 'desativada' : 'ativada'}.`);
      await fetchData();
    } catch {
      showError('Erro ao alterar o estado da regra.');
    }
  };

  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/alert-rules/${ruleToDelete.id}`);
      success(`Regra "${ruleToDelete.name}" eliminada.`);
      setRuleToDelete(null);
      await fetchData();
    } catch {
      showError('Erro ao eliminar a regra.');
    } finally {
      setDeleting(false);
    }
  };

  const acknowledge = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/acknowledge`);
      success('Alerta reconhecido.');
      await fetchData();
    } catch {
      showError('Erro ao reconhecer o alerta.');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        A carregar alertas...
      </div>
    );
  }

  const pendingAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Alertas</h1>
          <p className="page-subtitle">
            {pendingAlerts.length > 0
              ? `${pendingAlerts.length} alerta(s) por reconhecer.`
              : 'Sem alertas pendentes.'}
          </p>
        </div>
        <button className="btn btn-action" onClick={openNew}>
          <Plus size={17} /> Nova regra
        </button>
      </div>

      {/* Alertas gerados */}
      <div className="card">
        <div className="card-header">
          <h2><BellRing size={18} /> Alertas recentes</h2>
        </div>
        {alerts.length === 0 ? (
          <EmptyState
            icon={<BellRing size={36} />}
            title="Ainda não foram gerados alertas"
            message="Quando uma leitura ultrapassar os limites de uma regra ativa, o alerta aparece aqui."
          />
        ) : (
          <div className="hives-list">
            {alerts.map((alert) => (
              <div key={alert.id} className="hive-item">
                <div className="hive-item-left">
                  <span
                    className="hive-icon"
                    style={alert.acknowledged
                      ? { background: 'var(--surface-2)', color: 'var(--text-muted)' }
                      : { background: 'var(--error-bg)', color: 'var(--error)' }}
                  >
                    <BellRing size={18} />
                  </span>
                  <div>
                    <div className="hive-name">{alert.message}</div>
                    <div className="hive-apiary">
                      {alert.rule.name} · {timeAgo(alert.createdAt)}
                      {alert.value !== null && ` · valor: ${alert.value}`}
                    </div>
                  </div>
                </div>
                {alert.acknowledged ? (
                  <span className="badge neutral"><CheckCircle2 size={13} /> Reconhecido</span>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => acknowledge(alert.id)}>
                    <CheckCircle2 size={14} /> Reconhecer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regras de alerta */}
      <div className="card">
        <div className="card-header">
          <h2><Settings2 size={18} /> Regras de alerta</h2>
        </div>
        {rules.length === 0 ? (
          <EmptyState
            icon={<Settings2 size={36} />}
            title="Nenhuma regra configurada"
            message="Crie regras de alerta para ser avisado quando a temperatura, humidade ou peso saírem dos limites."
            actionLabel="Criar primeira regra"
            onAction={openNew}
            actionIcon={<Plus size={17} />}
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Condição</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td style={{ fontWeight: 600 }}>{rule.name}</td>
                    <td className="font-mono">
                      {METRIC_LABELS[rule.metric] || rule.metric} {OPERATOR_LABELS[rule.operator] || rule.operator} {rule.threshold}
                    </td>
                    <td>
                      <span className={`badge ${rule.active ? 'ok' : 'neutral'}`}>
                        {rule.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleRule(rule)}
                          title={rule.active ? 'Desativar' : 'Ativar'}
                        >
                          <Power size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setRuleToDelete(rule)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de nova regra */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova regra de alerta</h2>
              <button className="modal-close" onClick={() => setModal(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            {formError && <div className="error-message">{formError}</div>}

            <form onSubmit={save}>
              <div className="form-group">
                <label htmlFor="ruleName">Nome</label>
                <input
                  id="ruleName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex.: Temperatura ninho alta"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ruleMetric">Métrica</label>
                <select id="ruleMetric" value={metric} onChange={(e) => setMetric(e.target.value)}>
                  {Object.entries(METRIC_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="ruleOperator">Operador</label>
                  <select id="ruleOperator" value={operator} onChange={(e) => setOperator(e.target.value)}>
                    {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ruleThreshold">Limiar</label>
                  <input
                    id="ruleThreshold"
                    type="number"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-action" disabled={saving}>
                  {saving ? 'A guardar...' : 'Criar regra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmação de eliminação */}
      <ConfirmDialog
        open={ruleToDelete !== null}
        title="Eliminar regra de alerta?"
        message={
          ruleToDelete
            ? `A regra "${ruleToDelete.name}" será eliminada definitivamente. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Eliminar regra"
        onConfirm={confirmDelete}
        onCancel={() => setRuleToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}
