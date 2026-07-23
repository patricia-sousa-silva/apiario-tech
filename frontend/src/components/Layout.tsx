import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Hexagon, LayoutDashboard, LineChart, Boxes, Upload,
  ClipboardList, LogOut, BellRing, Menu, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, section: 'Monitorização' },
  { to: '/history', label: 'Histórico', icon: LineChart, section: 'Monitorização' },
  { to: '/hives', label: 'Colmeias', icon: Boxes, section: 'Gestão' },
  { to: '/import', label: 'Importar CSV', icon: Upload, section: 'Gestão' },
  { to: '/interventions', label: 'Intervenções', icon: ClipboardList, section: 'Gestão' },
  { to: '/alerts', label: 'Alertas', icon: BellRing, section: 'Gestão' },
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
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState(0);

  const fetchPendingAlerts = useCallback(async () => {
    try {
      const res = await api.get('/alerts', { params: { acknowledged: 'false' } });
      setPendingAlerts(Array.isArray(res.data) ? res.data.length : 0);
    } catch {
      // silencioso — o badge é informativo
    }
  }, []);

  useEffect(() => {
    fetchPendingAlerts();
    const interval = setInterval(fetchPendingAlerts, 60_000);
    return () => clearInterval(interval);
  }, [fetchPendingAlerts]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const monitoring = navItems.filter((n) => n.section === 'Monitorização');
  const management = navItems.filter((n) => n.section === 'Gestão');

  const renderLink = ({ to, label, icon: Icon, end }: (typeof navItems)[number]) => {
    const isAlerts = to === '/alerts';
    return (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
      >
        <Icon size={19} />
        <span>{label}</span>
        {isAlerts && pendingAlerts > 0 && (
          <span className="nav-badge" title={`${pendingAlerts} alerta(s) por reconhecer`}>
            {pendingAlerts > 9 ? '9+' : pendingAlerts}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="layout">
      {/* Overlay para fechar o menu em mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <Link to="/" className="sidebar-logo" onClick={() => setSidebarOpen(false)}>
          <span className="logo-icon">
            <Hexagon size={22} color="#fff" strokeWidth={2.5} />
          </span>
          <span className="logo-text">Apiário Tech</span>
        </Link>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Monitorização</div>
          {monitoring.map(renderLink)}

          <div className="sidebar-section">Gestão</div>
          {management.map(renderLink)}
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
        {/* Barra superior */}
        <header className="topbar">
          <button
            className="topbar-icon-btn hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-spacer" />

          <button
            className="topbar-icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link to="/alerts" className="topbar-icon-btn topbar-bell" aria-label="Alertas">
            <BellRing size={18} />
            {pendingAlerts > 0 && (
              <span className="bell-badge">{pendingAlerts > 9 ? '9+' : pendingAlerts}</span>
            )}
          </Link>
        </header>

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
