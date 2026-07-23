import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, ReferenceLine, Brush,
} from 'recharts';
import {
  LineChart as LineChartIcon, Thermometer, Droplets, Weight, Table2,
  TrendingUp, TrendingDown,
} from 'lucide-react';
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

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  active: boolean;
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

/** Tooltip personalizado para os gráficos. */
function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}:</span>
          <strong>
            {entry.value !== null && entry.value !== undefined ? entry.value : '—'}
            {unit ? ` ${unit}` : ''}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function History() {
  const [hives, setHives] = useState<Hive[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
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
    api.get('/alert-rules').then((res) => setRules(res.data)).catch(() => {});
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

  // Variação de peso no período (primeira → última leitura)
  const weightReadings = readings.filter((r) => r.weightG !== null);
  const weightDelta =
    weightReadings.length >= 2
      ? ((weightReadings[weightReadings.length - 1].weightG as number) -
          (weightReadings[0].weightG as number)) / 1000
      : null;

  // Regras ativas agrupadas por métrica para linhas de referência
  const activeRules = rules.filter((r) => r.active);
  const tempRules = activeRules.filter((r) =>
    ['TEMP_EXT', 'TEMP_NEST1', 'TEMP_NEST2'].includes(r.metric));
  const humidityRules = activeRules.filter((r) => r.metric === 'HUMIDITY');
  const weightRules = activeRules.filter((r) => r.metric === 'WEIGHT');

  const axisTick = { fontSize: 11, fill: 'var(--text-muted)' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Histórico</h1>
          <p className="page-subtitle">Consulte a evolução das leituras do seu apiário.</p>
        </div>
        <div className="page-header-actions">
          <select className="filter-select" value={hiveId} onChange={(e) => setHiveId(e.target.value)}>
            <option value="">Todas as colmeias</option>
            {hives.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
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
        <div className="card">
          <div className="card-body">
            <div className="skeleton skeleton-chart" />
            <div className="skeleton skeleton-chart" style={{ marginTop: '1rem' }} />
          </div>
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
              {tempRules.length > 0 && (
                <span className="ref-hint">— — limites de alerta ativos</span>
              )}
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="time" tick={axisTick} minTickGap={40} />
                  <YAxis tick={axisTick} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip unit="°C" />} />
                  <Legend />
                  {tempRules.map((r) => (
                    <ReferenceLine
                      key={r.id}
                      y={r.threshold}
                      stroke="#dc2626"
                      strokeDasharray="5 5"
                      label={{ value: r.name, position: 'insideTopRight', fontSize: 10, fill: '#dc2626' }}
                    />
                  ))}
                  <Line type="monotone" dataKey="tempExt" name="Exterior" stroke="#d97706" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="nest1" name="Ninho 1" stroke="#dc2626" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="nest2" name="Ninho 2" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
                  <Brush dataKey="time" height={26} stroke="var(--primary)" travellerWidth={8} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="time" tick={axisTick} minTickGap={40} />
                  <YAxis tick={axisTick} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip unit="%" />} />
                  {humidityRules.map((r) => (
                    <ReferenceLine
                      key={r.id}
                      y={r.threshold}
                      stroke="#dc2626"
                      strokeDasharray="5 5"
                      label={{ value: r.name, position: 'insideTopRight', fontSize: 10, fill: '#dc2626' }}
                    />
                  ))}
                  <Area type="monotone" dataKey="humidity" name="Humidade" stroke="#2563eb" strokeWidth={2} fill="url(#humGradient)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Peso */}
          <div className="card">
            <div className="card-header">
              <h2><Weight size={18} /> Peso da colmeia (kg)</h2>
              {weightDelta !== null && (
                <span className={`weight-delta ${weightDelta >= 0 ? 'gain' : 'loss'}`}>
                  {weightDelta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  {weightDelta >= 0 ? '+' : ''}{weightDelta.toFixed(1)} kg no período
                </span>
              )}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="time" tick={axisTick} minTickGap={40} />
                  <YAxis tick={axisTick} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip unit="kg" />} />
                  {weightRules.map((r) => (
                    <ReferenceLine
                      key={r.id}
                      y={r.threshold}
                      stroke="#dc2626"
                      strokeDasharray="5 5"
                      label={{ value: r.name, position: 'insideTopRight', fontSize: 10, fill: '#dc2626' }}
                    />
                  ))}
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
