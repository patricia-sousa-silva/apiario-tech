import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Boxes, Hexagon, Plus, Pencil, Trash2, MapPin, X } from 'lucide-react';
import api from '../api/client';

interface Apiary {
  id: string;
  name: string;
  location: string | null;
  hives: Hive[];
}

interface Hive {
  id: string;
  name: string;
  position: string | null;
  active: boolean;
  apiary?: { name: string };
}

export default function Hives() {
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de colmeia
  const [hiveModal, setHiveModal] = useState(false);
  const [editingHive, setEditingHive] = useState<Hive | null>(null);
  const [hiveName, setHiveName] = useState('');
  const [hivePosition, setHivePosition] = useState('');
  const [hiveApiaryId, setHiveApiaryId] = useState('');

  // Modal de apiário
  const [apiaryModal, setApiaryModal] = useState(false);
  const [apiaryName, setApiaryName] = useState('');
  const [apiaryLocation, setApiaryLocation] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchApiaries = useCallback(async () => {
    try {
      const res = await api.get('/apiaries');
      setApiaries(res.data);
    } catch (err) {
      console.error('Erro ao carregar apiários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiaries();
  }, [fetchApiaries]);

  const openNewHive = (apiaryId?: string) => {
    setEditingHive(null);
    setHiveName('');
    setHivePosition('');
    setHiveApiaryId(apiaryId || apiaries[0]?.id || '');
    setError('');
    setHiveModal(true);
  };

  const openEditHive = (hive: Hive, apiaryId: string) => {
    setEditingHive(hive);
    setHiveName(hive.name);
    setHivePosition(hive.position || '');
    setHiveApiaryId(apiaryId);
    setError('');
    setHiveModal(true);
  };

  const saveHive = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { name: hiveName, position: hivePosition, apiaryId: hiveApiaryId };
      if (editingHive) {
        await api.put(`/hives/${editingHive.id}`, payload);
      } else {
        await api.post('/hives', payload);
      }
      setHiveModal(false);
      await fetchApiaries();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  };

  const deleteHive = async (hive: Hive) => {
    if (!confirm(`Eliminar a colmeia "${hive.name}"? Esta ação é irreversível.`)) return;
    try {
      await api.delete(`/hives/${hive.id}`);
      await fetchApiaries();
    } catch (err) {
      console.error('Erro ao eliminar colmeia:', err);
    }
  };

  const openNewApiary = () => {
    setApiaryName('');
    setApiaryLocation('');
    setError('');
    setApiaryModal(true);
  };

  const saveApiary = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/apiaries', { name: apiaryName, location: apiaryLocation });
      setApiaryModal(false);
      await fetchApiaries();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        A carregar colmeias...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Colmeias</h1>
          <p className="page-subtitle">Organize os seus apiários e colmeias.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={openNewApiary}>
            <MapPin size={17} /> Novo apiário
          </button>
          <button className="btn btn-action" onClick={() => openNewHive()}>
            <Plus size={17} /> Nova colmeia
          </button>
        </div>
      </div>

      {apiaries.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Boxes size={40} />
            <div>
              <strong>Ainda não tem apiários.</strong>
              <br />
              Crie um apiário para começar a organizar as colmeias.
            </div>
            <button className="btn btn-action" onClick={openNewApiary}>
              <MapPin size={17} /> Criar apiário
            </button>
          </div>
        </div>
      ) : (
        apiaries.map((apiary) => (
          <div className="card" key={apiary.id}>
            <div className="card-header">
              <h2>
                <MapPin size={18} />
                {apiary.name}
                {apiary.location && (
                  <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.85rem' }}>
                    {' '}&middot; {apiary.location}
                  </span>
                )}
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => openNewHive(apiary.id)}>
                <Plus size={15} /> Adicionar colmeia
              </button>
            </div>
            {apiary.hives.length > 0 ? (
              <div className="hives-list">
                {apiary.hives.map((hive) => (
                  <div key={hive.id} className="hive-item">
                    <div className="hive-item-left">
                      <span className="hive-icon"><Hexagon size={19} /></span>
                      <div>
                        <div className="hive-name">
                          {hive.name}
                          {!hive.active && (
                            <span className="badge neutral" style={{ marginLeft: '0.5rem' }}>Inativa</span>
                          )}
                        </div>
                        <div className="hive-apiary">{hive.position || 'Sem posição definida'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditHive(hive, apiary.id)}>
                        <Pencil size={14} /> Editar
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteHive(hive)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Nenhuma colmeia neste apiário.</div>
            )}
          </div>
        ))
      )}

      {/* Modal de colmeia */}
      {hiveModal && (
        <Modal title={editingHive ? 'Editar colmeia' : 'Nova colmeia'} onClose={() => setHiveModal(false)}>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={saveHive}>
            <div className="form-group">
              <label htmlFor="hiveName">Nome</label>
              <input
                id="hiveName"
                value={hiveName}
                onChange={(e) => setHiveName(e.target.value)}
                required
                placeholder="Ex.: Colmeia 1"
              />
            </div>
            <div className="form-group">
              <label htmlFor="hiveApiary">Apiário</label>
              <select
                id="hiveApiary"
                value={hiveApiaryId}
                onChange={(e) => setHiveApiaryId(e.target.value)}
                required
              >
                {apiaries.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="hivePosition">Posição (opcional)</label>
              <input
                id="hivePosition"
                value={hivePosition}
                onChange={(e) => setHivePosition(e.target.value)}
                placeholder="Ex.: Esquerda, Direita"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setHiveModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-action" disabled={saving}>
                {saving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de apiário */}
      {apiaryModal && (
        <Modal title="Novo apiário" onClose={() => setApiaryModal(false)}>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={saveApiary}>
            <div className="form-group">
              <label htmlFor="apiaryName">Nome</label>
              <input
                id="apiaryName"
                value={apiaryName}
                onChange={(e) => setApiaryName(e.target.value)}
                required
                placeholder="Ex.: Apiário Principal"
              />
            </div>
            <div className="form-group">
              <label htmlFor="apiaryLocation">Localização (opcional)</label>
              <input
                id="apiaryLocation"
                value={apiaryLocation}
                onChange={(e) => setApiaryLocation(e.target.value)}
                placeholder="Ex.: Terreno familiar"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setApiaryModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-action" disabled={saving}>
                {saving ? 'A guardar...' : 'Criar apiário'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgb(15 23 42 / 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 12, padding: '1.75rem',
          width: '100%', maxWidth: 440, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
