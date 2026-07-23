import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Thermometer, Droplets, Gauge, ThermometerSun, Weight,
  BatteryMedium, Activity, Boxes, Upload, LineChart as LineChartIcon,
  ClipboardList, Clock, Hexagon, RefreshCw, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import api from '../api/client';
import { timeAgo } from '../utils/time';

interface Hive {
  id: string;
  name: string;
  position: string | null;
  apiary: { name: string };
}

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
}

/** Configuração da tendência: que direção é "favorável". */
type GoodDirection = 'up' | 'down' | 'neutral';

interface TrendInfo {
  icon: typeof TrendingUp;
  text: string;
  className: string;
}

function getTrend(
  current: number | null,
  previous: number | null,
  goodDirection: GoodDirection,
  decimals = 1,
): TrendInfo | null {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < Math.pow(10, -decimals) / 2) {
    return { icon: Minus, text: 'estável', className: 'trend-flat' };
  }
  const isUp = delta > 0;
  const text = `${isUp ? '+' : ''}${delta.toFixed(decimals)}`;
  let className: string;
  if (goodDirection === 'neutral') {
    className = isUp ? 'trend-up' : 'trend-down';
  } else if (goodDirection === 'up') {
    className = isUp ? 'trend-good' : 'trend-bad';
  } else {
    className = isUp ? 'trend-bad' : 'trend-good';
  }
  return { icon: isUp ? TrendingUp : TrendingDown, text, className };
}

const REFRESH_INTERVAL = 30_000; // 30 segundos

export default function Dashboard() {
  const [hives, setHives] = useState<Hive[]>([]);
  const [hiveLatest, setHiveLatest] = useState<Record<string, Reading>>({});
  const [current, setCurrent] = useState<Reading | null>(null);
  const [previous, setPrevious] = useState<Reading | null>(null);
  const [chartData, setChartData] = useState<
    { time: string; tempExt: number | null; nest1: number | null; nest2: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0); // força re-render para atualizar o "há X"

  const fetchData = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const now = new Date();
      const from24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

      const [hivesRes, latestRes, chartRes] = await Promise.all([
        api.get('/hives'),
        api.get('/telemetry', { params: { limit: '2' } }).catch(() => ({ data: { data: [] } })),
        api.get('/telemetry', { params: { from: from24h, limit: '500' } }).catch(() => ({ data: { data: [] } })),
      ]);

      setHives(hivesRes.data);

      // Última leitura de cada colmeia (para comparação lado a lado)
      const latestByHive: Record<string, Reading> = {};
      await Promise.all(
        (hivesRes.data as Hive[]).map(async (h) => {
          try {
            const r = await api.get('/telemetry/latest', { params: { hiveId: h.id } });
            latestByHive[h.id] = r.data;
          } catch {
            // colmeia sem leituras válidas — ignora
          }
        }),
      );
      setHiveLatest(latestByHive);

      const latestTwo: Reading[] = latestRes.data.data ?? [];
      setCurrent(latestTwo[0] ?? null);
      setPrevious(latestTwo[1] ?? null);

      const readings: Reading[] = (chartRes.data.data ?? []).slice().reverse(); // ascendente
      setChartData(
        readings.map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          tempExt: r.tempExtC !== null ? Number(r.tempExtC.toFixed(1)) : null,
          nest1: r.tempNest1C !== null ? Number(r.tempNest1C.toFixed(1)) : null,
          nest2: r.tempNest2C !== null ? Number(r.tempNest2C.toFixed(1)) : null,
        })),
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Re-render periódico para manter o "atualizado há X" fresco
  useEffect(() => {
    const ticker = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(ticker);
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p className="page-subtitle">Visão geral do estado do seu apiário.</p>
          </div>
        </div>
        <div className="stats-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="stat-card skeleton-card">
              <div className="skeleton skeleton-icon" />
              <div className="skeleton skeleton-value" />
              <div className="skeleton skeleton-label" />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-body">
            <div className="skeleton skeleton-chart" />
          </div>
        </div>
      </div>
    );
  }

  const isOk = current?.statusFlags === 'OK';

  const metrics = current
    ? [
        {
          key: 'tempExt', label: 'Temperatura exterior', unit: '°C', icon: Thermometer, color: 'amber',
          value: current.tempExtC, format: (v: number) => v.toFixed(1),
          trend: getTrend(current.tempExtC, previous?.tempExtC ?? null, 'neutral'),
          badge: isOk,
        },
        {
          key: 'humidity', label: 'Humidade relativa', unit: '%', icon: Droplets, color: 'blue',
          value: current.humidityPct, format: (v: number) => v.toFixed(0),
          trend: getTrend(current.humidityPct, previous?.humidityPct ?? null, 'neutral', 0),
        },
        {
          key: 'pressure', label: 'Pressão atmosférica', unit: 'hPa', icon: Gauge, color: 'slate',
          value: current.pressureHpa, format: (v: number) => v.toFixed(0),
          trend: getTrend(current.pressureHpa, previous?.pressureHpa ?? null, 'neutral', 0),
        },
        {
          key: 'nest1', label: 'Temperatura ninho 1', unit: '°C', icon: ThermometerSun, color: 'red',
          value: current.tempNest1C, format: (v: number) => v.toFixed(1),
          trend: getTrend(current.tempNest1C, previous?.tempNest1C ?? null, 'neutral'),
        },
        {
          key: 'weight', label: 'Peso da colmeia', unit: 'kg', icon: Weight, color: 'green',
          value: current.weightG !== null ? current.weightG / 1000 : null,
          format: (v: number) => v.toFixed(1),
          trend: getTrend(
            current.weightG !== null ? current.weightG / 1000 : null,
            previous?.weightG !== null && previous !== null ? previous.weightG / 1000 : null,
            'up', 2,
          ),
        },
        {
          key: 'battery', label: 'Bateria', unit: 'V', icon: BatteryMedium, color: 'green',
          value: current.batteryMv !== null ? current.batteryMv / 1000 : null,
          format: (v: number) => v.toFixed(1),
          trend: getTrend(
            current.batteryMv !== null ? current.batteryMv / 1000 : null,
            previous?.batteryMv !== null && previous !== null ? previous.batteryMv / 1000 : null,
            'up', 2,
          ),
        },
      ]
    : [];

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Visão geral do estado do seu apiário.</p>
        </div>
        <div className="page-header-actions">
          {lastUpdated && (
            <span className="updated-indicator" title="Última atualização">
              <Clock size={14} />
              Atualizado {timeAgo(lastUpdated)}
            </span>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchData(false)}
            title="Atualizar agora"
          >
            <RefreshCw size={15} /> Atualizar
          </button>
          <Link to="/import" className="btn btn-action">
            <Upload size={17} /> Importar CSV
          </Link>
        </div>
      </div>

      {/* Cartões de métricas principais com tendência */}
      {current ? (
        <div className="stats-grid">
          {metrics.map((m) => {
            const Icon = m.icon;
            const TrendIcon = m.trend?.icon;
            return (
              <div key={m.key} className="stat-card">
                <div className="stat-card-header">
                  <span className={`stat-icon ${m.color}`}><Icon size={20} /></span>
                  {m.badge !== undefined && (
                    <span className={`stat-badge ${m.badge ? 'ok' : 'warn'}`}>
                      {m.badge ? 'Normal' : 'Atenção'}
                    </span>
                  )}
                </div>
                <div className="stat-value">
                  {m.value !== null ? m.format(m.value) : '—'}
                  <span className="stat-unit">{m.unit}</span>
                </div>
                <div className="stat-label">{m.label}</div>
                {m.trend && TrendIcon && (
                  <div className={`stat-trend ${m.trend.className}`}>
                    <TrendIcon size={14} />
                    <span>{m.trend.text}</span>
                    <span className="trend-hint">vs. leitura anterior</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Activity size={40} />
            <div>
              <strong>Sem leituras disponíveis.</strong>
              <br />
              Importe um ficheiro CSV para começar a monitorizar.
            </div>
            <Link to="/import" className="btn btn-action"><Upload size={17} /> Importar CSV</Link>
          </div>
        </div>
      )}

      {/* Gráfico de temperatura das últimas 24h */}
      {current && chartData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2><LineChartIcon size={18} /> Temperatura — últimas 24 horas</h2>
            <Link to="/history" className="btn btn-secondary btn-sm">Ver histórico completo</Link>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} minTickGap={40} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tempExt" name="Exterior" stroke="#d97706" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="nest1" name="Ninho 1" stroke="#dc2626" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="nest2" name="Ninho 2" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Leituras detalhadas */}
      {current && (
        <div className="card">
          <div className="card-header">
            <h2><Activity size={18} /> Leituras detalhadas</h2>
            <span className={`badge ${isOk ? 'ok' : 'warn'}`}>{current.statusFlags}</span>
          </div>
          <div className="card-body">
            <div className="readings-grid">
              <div className="reading-item">
                <span className="reading-label">Temp. Exterior</span>
                <span className="reading-value">
                  {current.tempExtC !== null ? `${current.tempExtC.toFixed(1)} °C` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Temp. Ninho 1</span>
                <span className="reading-value">
                  {current.tempNest1C !== null ? `${current.tempNest1C.toFixed(1)} °C` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Temp. Ninho 2</span>
                <span className="reading-value">
                  {current.tempNest2C !== null ? `${current.tempNest2C.toFixed(1)} °C` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Humidade</span>
                <span className="reading-value">
                  {current.humidityPct !== null ? `${current.humidityPct.toFixed(0)} %` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Pressão</span>
                <span className="reading-value">
                  {current.pressureHpa !== null ? `${current.pressureHpa.toFixed(1)} hPa` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Peso</span>
                <span className="reading-value">
                  {current.weightG !== null ? `${(current.weightG / 1000).toFixed(1)} kg` : '—'}
                </span>
              </div>
            </div>
            <p className="reading-time">
              <Clock size={14} />
              Última leitura: {new Date(current.timestamp).toLocaleString('pt-PT')}
            </p>
          </div>
        </div>
      )}

      {/* Colmeias */}
      <div className="card">
        <div className="card-header">
          <h2><Boxes size={18} /> Colmeias</h2>
          <Link to="/hives" className="btn btn-secondary btn-sm">Gerir colmeias</Link>
        </div>
        {hives.length > 0 ? (
          <div className="hives-list">
            {hives.map((hive) => (
              <div key={hive.id} className="hive-item">
                <div className="hive-item-left">
                  <span className="hive-icon"><Hexagon size={19} /></span>
                  <div>
                    <div className="hive-name">{hive.name}</div>
                    <div className="hive-apiary">
                      {hive.apiary.name}{hive.position ? ` · ${hive.position}` : ''}
                    </div>
                  </div>
                </div>
                <div className="hive-stats">
                  {(() => {
                    const latest = hiveLatest[hive.id];
                    if (!latest) {
                      return <span className="hive-stat hive-stat-empty">sem leituras</span>;
                    }
                    return (
                      <>
                        <span className="hive-stat" title="Temperatura do ninho (última leitura)">
                          <ThermometerSun size={14} />
                          {latest.tempNest1C !== null ? `${latest.tempNest1C.toFixed(1)} °C` : '—'}
                        </span>
                        <span className="hive-stat" title="Peso (última leitura)">
                          <Weight size={14} />
                          {latest.weightG !== null ? `${(latest.weightG / 1000).toFixed(1)} kg` : '—'}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <Link to="/history" className="btn btn-secondary btn-sm">
                  <LineChartIcon size={15} /> Ver dados
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Boxes size={36} />
            Nenhuma colmeia registada.
          </div>
        )}
      </div>

      {/* Ações rápidas */}
      <div className="quick-actions">
        <Link to="/history" className="btn btn-secondary"><LineChartIcon size={17} /> Ver histórico</Link>
        <Link to="/interventions" className="btn btn-secondary"><ClipboardList size={17} /> Intervenções</Link>
      </div>
    </div>
  );
}
