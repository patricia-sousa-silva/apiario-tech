import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Hexagon, LayoutDashboard, LineChart, Boxes, Upload,
  ClipboardList, LogOut, BellRing, Menu, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useConnection } from '../context/ConnectionContext';
import { requestNotifyPermission, sendBrowserNotification, playBeep } from '../utils/notify';
import GlobalSearch from './GlobalSearch';
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
  const { status, lastChecked, recheck } = useConnection();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const knownAlertIds = useRef<Set<string>>(new Set());
  const firstAlertLoad = useRef(true);

  const fetchPendingAlerts = useCallback(async () => {
    try {
      const res = await api.get('/alerts', { params: { acknowledged: 'false' } });
      const list: { id: string; message: string }[] = Array.isArray(res.data) ? res.data : [];
      setPendingAlerts(list.length);

      // Deteta alertas novos desde a última verificação para notificar
      if (!firstAlertLoad.current) {
        const fresh = list.filter((a) => !knownAlertIds.current.has(a.id));
        if (fresh.length > 0) {
          playBeep();
          sendBrowserNotification(
            'Apiário Tech — novo alerta',
            fresh.map((a) => a.message).join(' · '),
          );
        }
      }
      knownAlertIds.current = new Set(list.map((a) => a.id));
      firstAlertLoad.current = false;
    } catch {
      // silencioso — o badge é informativo
    }
  }, []);

  useEffect(() => {
    // Pede permissão para notificações do browser (uma vez)
    requestNotifyPermission();
  }, []);

  useEffect(() => {
    fetchPendingAlerts();
    const interval = setInterval(fetchPendingAlerts, 60_000);
    return () => clearInterval(interval);
  }, [fetchPendingAlerts]);

  // Atalhos de teclado globais: 1–6 navegam, T alterna o tema, / foca a pesquisa
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        toggleTheme();
        return;
      }
      const routes: Record<string, string> = {
        '1': '/', '2': '/history', '3': '/hives', '4': '/import', '5': '/interventions', '6': '/alerts',
      };
      if (routes[e.key]) navigate(routes[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, toggleTheme]);

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
      {/* Ligação de salto para leitores de ecrã / teclado */}
      <a href="#main-content" className="skip-link">Saltar para o conteúdo</a>

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

        <nav className="sidebar-nav" aria-label="Navegação principal">
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

          <GlobalSearch />

          <div className="topbar-spacer" />

          <button
            type="button"
            className={`conn-indicator conn-${status}`}
            onClick={recheck}
            title={
              status === 'online'
                ? `API ligada${lastChecked ? ` · verificado às ${lastChecked.toLocaleTimeString('pt-PT')}` : ''}`
                : status === 'offline'
                  ? 'API inacessível — clique para voltar a verificar'
                  : 'A verificar ligação…'
            }
            aria-label={`Estado da ligação à API: ${status}`}
          >
            <span className="conn-dot" aria-hidden="true" />
            <span className="conn-label">
              {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : '…'}
            </span>
          </button>

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

        <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
