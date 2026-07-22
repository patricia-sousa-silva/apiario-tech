import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Thermometer, Droplets, Gauge, ThermometerSun, Weight,
  BatteryMedium, Activity, Boxes, Upload, LineChart,
  ClipboardList, Clock, Hexagon,
} from 'lucide-react';
import api from '../api/client';

interface Hive {
  id: string;
  name: string;
  position: string | null;
  apiary: { name: string };
}

interface LatestReading {
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

export default function Dashboard() {
  const [hives, setHives] = useState<Hive[]>([]);
  const [latestReading, setLatestReading] = useState<LatestReading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hivesRes, readingRes] = await Promise.all([
          api.get('/hives'),
          api.get('/telemetry/latest').catch(() => ({ data: null })),
        ]);
        setHives(hivesRes.data);
        setLatestReading(readingRes.data);
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        A carregar dados do apiário...
      </div>
    );
  }

  const isOk = latestReading?.statusFlags === 'OK';

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Visão geral do estado do seu apiário.</p>
        </div>
        <Link to="/import" className="btn btn-action">
          <Upload size={17} /> Importar CSV
        </Link>
      </div>

      {/* Cartões de métricas principais */}
      {latestReading ? (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-icon amber"><Thermometer size={20} /></span>
              <span className={`stat-badge ${isOk ? 'ok' : 'warn'}`}>{isOk ? 'Normal' : 'Atenção'}</span>
            </div>
            <div className="stat-value">
              {latestReading.tempExtC !== null ? latestReading.tempExtC.toFixed(1) : '—'}
              <span className="stat-unit">°C</span>
            </div>
            <div className="stat-label">Temperatura exterior</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-icon blue"><Droplets size={20} /></span>
            </div>
            <div className="stat-value">
              {latestReading.humidityPct !== null ? latestReading.humidityPct.toFixed(0) : '—'}
              <span className="stat-unit">%</span>
            </div>
            <div className="stat-label">Humidade relativa</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-icon slate"><Gauge size={20} /></span>
            </div>
            <div className="stat-value">
              {latestReading.pressureHpa !== null ? latestReading.pressureHpa.toFixed(0) : '—'}
              <span className="stat-unit">hPa</span>
            </div>
            <div className="stat-label">Pressão atmosférica</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-icon red"><ThermometerSun size={20} /></span>
            </div>
            <div className="stat-value">
              {latestReading.tempNest1C !== null ? latestReading.tempNest1C.toFixed(1) : '—'}
              <span className="stat-unit">°C</span>
            </div>
            <div className="stat-label">Temperatura ninho 1</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-icon green"><Weight size={20} /></span>
            </div>
            <div className="stat-value">
              {latestReading.weightG !== null ? (latestReading.weightG / 1000).toFixed(1) : '—'}
              <span className="stat-unit">kg</span>
            </div>
            <div className="stat-label">Peso da colmeia</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-icon green"><BatteryMedium size={20} /></span>
            </div>
            <div className="stat-value">
              {latestReading.batteryMv !== null ? (latestReading.batteryMv / 1000).toFixed(1) : '—'}
              <span className="stat-unit">V</span>
            </div>
            <div className="stat-label">Bateria</div>
          </div>
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

      {/* Leituras detalhadas */}
      {latestReading && (
        <div className="card">
          <div className="card-header">
            <h2><Activity size={18} /> Leituras detalhadas</h2>
            <span className={`badge ${isOk ? 'ok' : 'warn'}`}>
              {latestReading.statusFlags}
            </span>
          </div>
          <div className="card-body">
            <div className="readings-grid">
              <div className="reading-item">
                <span className="reading-label">Temp. Exterior</span>
                <span className="reading-value">
                  {latestReading.tempExtC !== null ? `${latestReading.tempExtC.toFixed(1)} °C` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Temp. Ninho 1</span>
                <span className="reading-value">
                  {latestReading.tempNest1C !== null ? `${latestReading.tempNest1C.toFixed(1)} °C` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Temp. Ninho 2</span>
                <span className="reading-value">
                  {latestReading.tempNest2C !== null ? `${latestReading.tempNest2C.toFixed(1)} °C` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Humidade</span>
                <span className="reading-value">
                  {latestReading.humidityPct !== null ? `${latestReading.humidityPct.toFixed(0)} %` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Pressão</span>
                <span className="reading-value">
                  {latestReading.pressureHpa !== null ? `${latestReading.pressureHpa.toFixed(1)} hPa` : '—'}
                </span>
              </div>
              <div className="reading-item">
                <span className="reading-label">Peso</span>
                <span className="reading-value">
                  {latestReading.weightG !== null ? `${(latestReading.weightG / 1000).toFixed(1)} kg` : '—'}
                </span>
              </div>
            </div>
            <p className="reading-time">
              <Clock size={14} />
              Última leitura: {new Date(latestReading.timestamp).toLocaleString('pt-PT')}
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
                <Link to="/history" className="btn btn-secondary btn-sm">
                  <LineChart size={15} /> Ver dados
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
        <Link to="/history" className="btn btn-secondary"><LineChart size={17} /> Ver histórico</Link>
        <Link to="/interventions" className="btn btn-secondary"><ClipboardList size={17} /> Intervenções</Link>
      </div>
    </div>
  );
}
