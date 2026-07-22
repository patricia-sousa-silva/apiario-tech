import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Hexagon, LayoutDashboard, LineChart, Boxes, Upload,
  ClipboardList, LogOut, BellRing,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/history', label: 'Histórico', icon: LineChart },
  { to: '/hives', label: 'Colmeias', icon: Boxes },
  { to: '/import', label: 'Importar CSV', icon: Upload },
  { to: '/interventions', label: 'Intervenções', icon: ClipboardList },
  { to: '/alerts', label: 'Alertas', icon: BellRing },
];

function getInitials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to="/" className="sidebar-logo">
          <span className="logo-icon">
            <Hexagon size={22} color="#fff" strokeWidth={2.5} />
          </span>
          <span className="logo-text">Apiário Tech</span>
        </Link>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Monitorização</div>
          {navItems.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="sidebar-section">Gestão</div>
          {navItems.slice(2).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="user-avatar">{getInitials(user?.name)}</span>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'ADMIN' ? 'Administrador' : 'Apicultor'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={19} />
            <span>Terminar sessão</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
