import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Hexagon, Activity, BellRing, Database } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-container">
      <div className="auth-brand">
        <Link to="/login" className="sidebar-logo" style={{ border: 'none', padding: 0, marginBottom: '2.5rem' }}>
          <span className="logo-icon">
            <Hexagon size={24} color="#fff" strokeWidth={2.5} />
          </span>
          <span className="logo-text">Apiário Tech</span>
        </Link>

        <h2>Monitorização inteligente para as suas colmeias</h2>
        <p>
          Acompanhe temperatura, humidade, peso e muito mais — tudo numa
          plataforma pensada para apicultores.
        </p>

        <div className="auth-features">
          <div className="auth-feature">
            <span className="feature-icon"><Activity size={18} /></span>
            Telemetria em tempo real de cada colmeia
          </div>
          <div className="auth-feature">
            <span className="feature-icon"><BellRing size={18} /></span>
            Alertas automáticos quando algo está errado
          </div>
          <div className="auth-feature">
            <span className="feature-icon"><Database size={18} /></span>
            Histórico completo e registo de intervenções
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        {children}
      </div>
    </div>
  );
}
