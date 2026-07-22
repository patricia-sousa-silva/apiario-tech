import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import { LineChart as LineChartIcon, Thermometer, Droplets, Weight, Table2 } from 'lucide-react';
import api from '../api/client';

interface Reading {
  id: string;
  timestamp: string;
  tempExtC: number | null;
  humidityPct: number | null;
  pressureHpa: number | null;
  tempNest1C: number | null;
  tempNest2C: number | null;
  weightG: number | null;
  batteryMv: number | null;
  statusFlags: string;
  valid: boolean;
}

interface Hive {
  id: string;
  name: string;
}

type Period = '24h' | '7d' | '30d' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'all', label: 'Tudo' },
];

function formatTime(ts: string, period: Period) {
  const d = new Date(ts);
  if (period === '24h') {
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export default function History() {
  const [hives, setHives] = useState<Hive[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiveId, setHiveId] = useState('');
  const [period, setPeriod] = useState<Period>('7d');
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '500' };
      if (hiveId) params.hiveId = hiveId;

      if (period !== 'all') {
        const now = new Date();
        const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
        params.from = new Date(now.getTime() - hours * 3600 * 1000).toISOString();
      }

      const res = await api.get('/telemetry', { params });
      // Ordenar ascendente para os gráficos
      const sorted = [...res.data.data].reverse();
      setReadings(sorted);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  }, [hiveId, period]);

  useEffect(() => {
    api.get('/hives').then((res) => setHives(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const chartData = readings.map((r) => ({
    time: formatTime(r.timestamp, period),
    tempExt: r.tempExtC !== null ? Number(r.tempExtC.toFixed(1)) : null,
    nest1: r.tempNest1C !== null ? Number(r.tempNest1C.toFixed(1)) : null,
    nest2: r.tempNest2C !== null ? Number(r.tempNest2C.toFixed(1)) : null,
    humidity: r.humidityPct !== null ? Number(r.humidityPct.toFixed(0)) : null,
    weight: r.weightG !== null ? Number((r.weightG / 1000).toFixed(2)) : null,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Histórico</h1>
          <p className="page-subtitle">Consulte a evolução das leituras do seu apiário.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={hiveId}
            onChange={(e) => setHiveId(e.target.value)}
            style={{
              padding: '0.5rem 0.875rem', borderRadius: 6, border: '1px solid #cbd5e1',
              fontSize: '0.875rem', fontFamily: 'inherit', background: '#fff',
            }}
          >
            <option value="">Todas as colmeias</option>
            {hives.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            style={{
              padding: '0.5rem 0.875rem', borderRadius: 6, border: '1px solid #cbd5e1',
              fontSize: '0.875rem', fontFamily: 'inherit', background: '#fff',
            }}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button
            className={`btn btn-sm ${view === 'chart' ? 'btn-action' : 'btn-secondary'}`}
            onClick={() => setView('chart')}
          >
            <LineChartIcon size={15} /> Gráficos
          </button>
          <button
            className={`btn btn-sm ${view === 'table' ? 'btn-action' : 'btn-secondary'}`}
            onClick={() => setView('table')}
          >
            <Table2 size={15} /> Tabela
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          A carregar histórico...
        </div>
      ) : readings.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <LineChartIcon size={40} />
            Não existem leituras para os filtros selecionados.
          </div>
        </div>
      ) : view === 'chart' ? (
        <>
          {/* Temperaturas */}
          <div className="card">
            <div className="card-header">
              <h2><Thermometer size={18} /> Temperaturas (°C)</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tempExt" name="Exterior" stroke="#d97706" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="nest1" name="Ninho 1" stroke="#dc2626" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="nest2" name="Ninho 2" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Humidade */}
          <div className="card">
            <div className="card-header">
              <h2><Droplets size={18} /> Humidade relativa (%)</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="humidity" name="Humidade" stroke="#2563eb" strokeWidth={2} fill="url(#humGradient)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Peso */}
          <div className="card">
            <div className="card-header">
              <h2><Weight size={18} /> Peso da colmeia (kg)</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Area type="monotone" dataKey="weight" name="Peso" stroke="#16a34a" strokeWidth={2} fill="url(#weightGradient)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Temp. Ext.</th>
                  <th>Ninho 1</th>
                  <th>Ninho 2</th>
                  <th>Humidade</th>
                  <th>Pressão</th>
                  <th>Peso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {[...readings].reverse().map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono">{new Date(r.timestamp).toLocaleString('pt-PT')}</td>
                    <td>{r.tempExtC !== null ? `${r.tempExtC.toFixed(1)} °C` : '—'}</td>
                    <td>{r.tempNest1C !== null ? `${r.tempNest1C.toFixed(1)} °C` : '—'}</td>
                    <td>{r.tempNest2C !== null ? `${r.tempNest2C.toFixed(1)} °C` : '—'}</td>
                    <td>{r.humidityPct !== null ? `${r.humidityPct.toFixed(0)} %` : '—'}</td>
                    <td>{r.pressureHpa !== null ? `${r.pressureHpa.toFixed(1)} hPa` : '—'}</td>
                    <td>{r.weightG !== null ? `${(r.weightG / 1000).toFixed(1)} kg` : '—'}</td>
                    <td>
                      <span className={`badge ${r.statusFlags === 'OK' ? 'ok' : 'warn'}`}>
                        {r.statusFlags}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
