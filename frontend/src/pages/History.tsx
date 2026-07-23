import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, ReferenceLine, Brush,
} from 'recharts';
import {
  LineChart as LineChartIcon, Thermometer, Droplets, Weight, Table2,
  TrendingUp, TrendingDown, Download, ImageDown, Upload, CalendarRange,
  BatteryMedium, BarChart3, Sigma,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { downloadCsv, downloadChartPng } from '../utils/export';

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

type Period = 'today' | '24h' | '7d' | '30d' | '90d' | 'all' | 'custom';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Tudo' },
  { value: 'custom', label: 'Personalizado…' },
];

/** Converte um período + intervalo personalizado em `from`/`to` ISO. */
function periodToRange(period: Period, customFrom: string, customTo: string) {
  const now = new Date();
  if (period === 'all') return {};
  if (period === 'custom') {
    const range: { from?: string; to?: string } = {};
    if (customFrom) range.from = new Date(`${customFrom}T00:00:00`).toISOString();
    if (customTo) range.to = new Date(`${customTo}T23:59:59.999`).toISOString();
    return range;
  }
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from: start.toISOString() };
  }
  const hours = period === '24h' ? 24 : period === '7d' ? 168 : period === '30d' ? 720 : 2160;
  return { from: new Date(now.getTime() - hours * 3600 * 1000).toISOString() };
}

function formatTime(ts: string, period: Period) {
  const d = new Date(ts);
  if (period === '24h' || period === 'today') {
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

/** Estatísticas (mín/máx/média) de um conjunto de valores. */
function stats(values: number[]): { min: number; max: number; avg: number } | null {
  if (values.length === 0) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  };
}

/** Cor de uma célula do heatmap conforme a temperatura (0–40 °C). */
function tempColor(t: number | null): string {
  if (t === null) return 'var(--surface-2)';
  const norm = Math.max(0, Math.min(1, t / 40));
  const hue = 220 * (1 - norm); // azul (frio) → vermelho (quente)
  return `hsl(${hue}, 72%, ${58 - norm * 6}%)`;
}

/** Limiar de bateria baixa (mV) para estimar autonomia. */
const BATTERY_LOW_MV = 11000;

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
  const { success, error: showError } = useToast();
  const [hives, setHives] = useState<Hive[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiveId, setHiveId] = useState('');
  const [period, setPeriod] = useState<Period>('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const tempChartRef = useRef<HTMLDivElement>(null);
  const humChartRef = useRef<HTMLDivElement>(null);
  const weightChartRef = useRef<HTMLDivElement>(null);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '500' };
      if (hiveId) params.hiveId = hiveId;
      const range = periodToRange(period, customFrom, customTo);
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;

      const res = await api.get('/telemetry', { params });
      // Ordenar ascendente para os gráficos
      const sorted = [...res.data.data].reverse();
      setReadings(sorted);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  }, [hiveId, period, customFrom, customTo]);

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

  // --- Agregados do período (mín / máx / média) ---
  const nonNull = (vals: (number | null)[]) => vals.filter((v): v is number => v !== null);
  const aggregates = [
    { label: 'Temp. exterior', unit: '°C', dec: 1, s: stats(nonNull(readings.map((r) => r.tempExtC))) },
    { label: 'Ninho 1', unit: '°C', dec: 1, s: stats(nonNull(readings.map((r) => r.tempNest1C))) },
    { label: 'Ninho 2', unit: '°C', dec: 1, s: stats(nonNull(readings.map((r) => r.tempNest2C))) },
    { label: 'Humidade', unit: '%', dec: 0, s: stats(nonNull(readings.map((r) => r.humidityPct))) },
    { label: 'Peso', unit: 'kg', dec: 1, s: stats(nonNull(readings.map((r) => (r.weightG !== null ? r.weightG / 1000 : null)))) },
    { label: 'Bateria', unit: 'V', dec: 2, s: stats(nonNull(readings.map((r) => (r.batteryMv !== null ? r.batteryMv / 1000 : null)))) },
  ];

  // --- Bateria: tendência e estimativa de autonomia ---
  const batteryReadings = readings
    .filter((r) => r.batteryMv !== null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let batteryInfo: { currentMv: number; ratePerDay: number; autonomyDays: number | null } | null = null;
  if (batteryReadings.length >= 2) {
    const first = batteryReadings[0];
    const last = batteryReadings[batteryReadings.length - 1];
    const hoursSpan = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 36e5;
    const currentMv = last.batteryMv as number;
    if (hoursSpan > 0) {
      const ratePerDay = ((currentMv - (first.batteryMv as number)) / hoursSpan) * 24;
      let autonomyDays: number | null = null;
      if (ratePerDay < -1 && currentMv > BATTERY_LOW_MV) {
        autonomyDays = (currentMv - BATTERY_LOW_MV) / -ratePerDay;
      }
      batteryInfo = { currentMv, ratePerDay, autonomyDays };
    }
  }

  // --- Heatmap: temperatura exterior média por hora do dia ---
  const byHour = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }));
  readings.forEach((r) => {
    if (r.tempExtC !== null) {
      const h = new Date(r.timestamp).getHours();
      byHour[h].sum += r.tempExtC;
      byHour[h].count += 1;
    }
  });
  const hourAvg = byHour.map((b) => (b.count > 0 ? b.sum / b.count : null));

  const axisTick = { fontSize: 11, fill: 'var(--text-muted)' };

  /** Exporta as leituras atuais em CSV (formato contrato v1.0, sem device_id). */
  const handleExportCsv = () => {
    if (readings.length === 0) {
      showError('Não há leituras para exportar com os filtros atuais.');
      return;
    }
    const headers = [
      'timestamp', 'temp_ext_c', 'humidity_pct', 'pressure_hpa',
      'temp_nest1_c', 'temp_nest2_c', 'weight_g', 'battery_mv', 'status_flags',
    ];
    const rows = readings.map((r) => [
      r.timestamp, r.tempExtC, r.humidityPct, r.pressureHpa,
      r.tempNest1C, r.tempNest2C, r.weightG, r.batteryMv, r.statusFlags,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`telemetria_${stamp}.csv`, headers, rows);
    success(`${readings.length} leituras exportadas em CSV.`);
  };

  /** Exporta um gráfico em PNG. */
  const handleExportPng = async (ref: React.RefObject<HTMLDivElement | null>, name: string) => {
    const ok = await downloadChartPng(ref.current, `${name}.png`);
    if (ok) success('Gráfico exportado em PNG.');
    else showError('Não foi possível exportar o gráfico.');
  };

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
          {period === 'custom' && (
            <span className="date-range">
              <CalendarRange size={15} aria-hidden="true" />
              <input
                type="date"
                className="filter-input"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                aria-label="Data inicial"
              />
              <span aria-hidden="true">→</span>
              <input
                type="date"
                className="filter-input"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                aria-label="Data final"
              />
            </span>
          )}
          <button className="btn btn-sm btn-secondary" onClick={handleExportCsv} title="Exportar leituras em CSV">
            <Download size={15} /> CSV
          </button>
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
          <EmptyState
            icon={<LineChartIcon size={40} />}
            title="Sem leituras para estes filtros"
            message="Ajuste o período ou a colmeia, ou importe um ficheiro CSV com dados do ESP32."
            actionLabel="Importar CSV"
            actionTo="/import"
            actionIcon={<Upload size={17} />}
          />
        </div>
      ) : view === 'chart' ? (
        <>
          {/* Temperaturas */}
          <div className="card">
            <div className="card-header">
              <h2><Thermometer size={18} /> Temperaturas (°C)</h2>
              <span className="card-header-actions">
                {tempRules.length > 0 && (
                  <span className="ref-hint">— — limites de alerta ativos</span>
                )}
                <button
                  className="chart-export-btn"
                  onClick={() => handleExportPng(tempChartRef, 'grafico_temperaturas')}
                  title="Exportar gráfico em PNG"
                  aria-label="Exportar gráfico de temperaturas em PNG"
                >
                  <ImageDown size={16} />
                </button>
              </span>
            </div>
            <div className="card-body" ref={tempChartRef}>
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
              <button
                className="chart-export-btn"
                onClick={() => handleExportPng(humChartRef, 'grafico_humidade')}
                title="Exportar gráfico em PNG"
                aria-label="Exportar gráfico de humidade em PNG"
              >
                <ImageDown size={16} />
              </button>
            </div>
            <div className="card-body" ref={humChartRef}>
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
              <span className="card-header-actions">
                {weightDelta !== null && (
                  <span className={`weight-delta ${weightDelta >= 0 ? 'gain' : 'loss'}`}>
                    {weightDelta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    {weightDelta >= 0 ? '+' : ''}{weightDelta.toFixed(1)} kg no período
                  </span>
                )}
                <button
                  className="chart-export-btn"
                  onClick={() => handleExportPng(weightChartRef, 'grafico_peso')}
                  title="Exportar gráfico em PNG"
                  aria-label="Exportar gráfico de peso em PNG"
                >
                  <ImageDown size={16} />
                </button>
              </span>
            </div>
            <div className="card-body" ref={weightChartRef}>
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

          {/* Resumo do período (mín / máx / média) */}
          <div className="card">
            <div className="card-header">
              <h2><Sigma size={18} /> Resumo do período</h2>
              <span className="reading-count">{readings.length} leituras</span>
            </div>
            <div className="card-body">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Métrica</th>
                      <th>Mínimo</th>
                      <th>Média</th>
                      <th>Máximo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregates.map((a) => (
                      <tr key={a.label}>
                        <td style={{ fontWeight: 600 }}>{a.label}</td>
                        <td className="font-mono">{a.s ? `${a.s.min.toFixed(a.dec)} ${a.unit}` : '—'}</td>
                        <td className="font-mono"><strong>{a.s ? `${a.s.avg.toFixed(a.dec)} ${a.unit}` : '—'}</strong></td>
                        <td className="font-mono">{a.s ? `${a.s.max.toFixed(a.dec)} ${a.unit}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bateria e estimativa de autonomia */}
          {batteryInfo && (
            <div className="card">
              <div className="card-header">
                <h2><BatteryMedium size={18} /> Bateria do dispositivo</h2>
              </div>
              <div className="card-body">
                <div className="battery-summary">
                  <div className="battery-block">
                    <span className="battery-value">{(batteryInfo.currentMv / 1000).toFixed(2)} V</span>
                    <span className="battery-label">tensão atual</span>
                  </div>
                  <div className="battery-block">
                    <span className={`battery-trend ${batteryInfo.ratePerDay < 0 ? 'down' : 'up'}`}>
                      {batteryInfo.ratePerDay < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                      {batteryInfo.ratePerDay < 0 ? '' : '+'}{batteryInfo.ratePerDay.toFixed(0)} mV/dia
                    </span>
                    <span className="battery-label">ritmo de descarga</span>
                  </div>
                  <div className="battery-block">
                    <span className="battery-value">
                      {batteryInfo.autonomyDays !== null
                        ? `~${Math.round(batteryInfo.autonomyDays)} dias`
                        : batteryInfo.ratePerDay >= 0
                          ? 'estável'
                          : '—'}
                    </span>
                    <span className="battery-label">autonomia estimada</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Heatmap de temperatura por hora do dia */}
          <div className="card">
            <div className="card-header">
              <h2><BarChart3 size={18} /> Temperatura por hora do dia</h2>
              <span className="reading-count">média da temp. exterior (°C)</span>
            </div>
            <div className="card-body">
              <div className="heatmap">
                {hourAvg.map((t, h) => (
                  <div
                    key={h}
                    className="heatmap-cell"
                    style={{ background: tempColor(t) }}
                    title={`${String(h).padStart(2, '0')}h — ${t !== null ? `${t.toFixed(1)} °C` : 'sem dados'}`}
                  >
                    <span className="heatmap-hour">{String(h).padStart(2, '0')}</span>
                    <span className="heatmap-val">{t !== null ? t.toFixed(0) : '·'}</span>
                  </div>
                ))}
              </div>
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
