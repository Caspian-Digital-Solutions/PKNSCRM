import { useEffect, useState } from 'react';
import {
  Building2, ChevronDown, FileText, Footprints, LayoutGrid, Megaphone, PanelLeft, PieChart,
  QrCode, RotateCcw, Settings, Share2, Upload, Users, Wallet,
} from 'lucide-react';
import logo from '../assets/pkns-logo.png';
import { NAV, ROLES } from '../access.js';
import { useAmp } from '../useAmp.jsx';
import { go } from '../router.js';
import { useUi } from '../ui.jsx';
import { openScreen } from './bits.jsx';
import GlobalFilters from './GlobalFilters.jsx';
import Modal from './Modal.jsx';
import CommandPalette from './CommandPalette.jsx';

const ICONS = {
  overview: LayoutGrid,
  activations: Megaphone,
  forms: QrCode,
  audience: Users,
  segments: Users,
  insights: PieChart,
  channels: Share2,
  budget: Wallet,
  assets: Building2,
  reports: FileText,
  import: Upload,
  footfall: Footprints,
  settings: Settings,
  audit: FileText,
};

const GROUPS = [
  { label: 'Plan & capture', ids: ['overview', 'activations', 'forms'] },
  { label: 'Audience', ids: ['audience', 'segments', 'insights'] },
  { label: 'Performance', ids: ['channels', 'budget', 'reports'] },
  { label: 'Admin', ids: ['assets', 'import', 'settings', 'audit'] },
  { label: 'Coming soon', ids: ['footfall'] },
];

const FILTER_PAGES = new Set(['overview', 'activations', 'audience', 'segments', 'insights', 'channels', 'budget', 'reports']);

export default function Shell({ current, children }) {
  const { state, dispatch, route, operators, assets } = useAmp();
  const ui = useUi();
  const role = ROLES[state.role];
  const [menu, setMenu] = useState(false);
  const operator = operators.find((item) => item.id === role.operatorId);
  const operatorAssets = (operator?.assetIds || []).map((id) => assets.find((asset) => asset.id === id)?.name).filter(Boolean);
  const visible = NAV.filter((item) => item.roles.includes(state.role));
  const showFilters = FILTER_PAGES.has(route.screen);

  const switchRole = (id) => {
    const next = ROLES[id];
    dispatch({ type: 'role', role: id, userName: role.person, roleName: next.name });
    setMenu(false);
    const allowed = NAV.find((item) => item.id === route.screen)?.roles.includes(id);
    if (allowed && !route.params.length) openScreen(route.screen, route.search);
    else go(next.landing);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('.main-col')?.scrollTo?.(0, 0);
    document.querySelector('.content')?.scrollTo?.(0, 0);
  }, [route.screen, route.params.join('|')]);

  useEffect(() => {
    const onKey = (event) => {
      const field = event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.setPalette((open) => !open);
      } else if (event.altKey && event.shiftKey && event.code === 'KeyR') {
        event.preventDefault();
        dispatch({ type: 'reset' });
        go(role.landing);
      } else if (!field && event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        ui.setShortcuts(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`app${ui.collapsed ? ' is-collapsed' : ''}`}>
      <div className="body">
        <nav className="sidenav" aria-label="Screens">
          <a className="side-brand" href={`#/${role.landing}`} onClick={(event) => { event.preventDefault(); openScreen(role.landing, route.search); }}>
            <span className="logo-tile"><img src={logo} alt="PKNS" /></span>
            <span className="side-copy"><span className="side-product">AMP Hub</span></span>
          </a>
          <div className="side-links">
            {GROUPS.map((group) => {
              const items = group.ids.map((id) => (id === 'audit' && state.role === 'admin' ? { id: 'audit', name: 'Audit log' } : visible.find((item) => item.id === id))).filter(Boolean);
              if (!items.length) return null;
              return (
                <div key={group.label}>
                  <p className="nav-group">{group.label}</p>
                  {items.map((item) => {
                    const Icon = ICONS[item.id] || LayoutGrid;
                    const active = item.id === 'audit' ? route.screen === 'settings' && route.search.tab === 'audit' : current === item.id && !(item.id === 'settings' && route.search.tab === 'audit');
                    return (
                      <a
                        key={item.id}
                        href={item.id === 'audit' ? '#/settings?tab=audit' : `#/${item.id}`}
                        className={active ? 'active' : ''}
                        onClick={(event) => {
                          event.preventDefault();
                          if (item.id === 'audit') go('settings', { tab: 'audit' });
                          else openScreen(item.id, route.search);
                        }}
                      >
                        <span className="nav-icon"><Icon size={16} strokeWidth={1.75} aria-hidden="true" /></span>
                        <span className="nav-label">{item.name}</span>
                        {item.phase ? <span className="phase-badge">Phase 2</span> : null}
                      </a>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="side-foot">
            <p className="side-expand">Advertising, Marketing and Promotion</p>
            <div className="side-pills">
              <span className="demo-pill">Demo data</span>
              <span className="demo-pill">Prototype</span>
            </div>
            <button type="button" className="icon-btn nav-quiet" aria-label="Reset demo" onClick={() => ui.setResetOpen(true)}>
              <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="nav-label">Reset demo</span>
            </button>
            <button type="button" className="icon-btn nav-quiet" aria-label={ui.collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => ui.setCollapsed((on) => !on)}>
              <PanelLeft size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="nav-label">{ui.collapsed ? 'Expand' : 'Collapse'}</span>
            </button>
          </div>
        </nav>
        <div className="main-col">
          <header className="app-header">
            <div className="topbar">
              <p className="crumb"><span>{NAV.find((item) => item.id === current)?.name || 'AMP Hub'}</span></p>
              <button type="button" className="search-btn" onClick={() => ui.setPalette(true)}>
                <span>Search or jump to…</span>
                <kbd>Ctrl K</kbd>
              </button>
              <div className="topbar-right">
                <div className="user-card">
                  <button type="button" className="role-btn" data-testid="role-menu-button" aria-expanded={menu} onClick={() => setMenu((open) => !open)}>
                    <span className="avatar">{role.initials}</span>
                    <span className="user-meta">
                      <strong>{role.person}</strong>
                      <span>{role.name}</span>
                    </span>
                    <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  {menu && (
                    <div className="role-menu" role="menu">
                      {Object.values(ROLES).map((item) => (
                        <button key={item.id} type="button" className={item.id === state.role ? 'on' : ''} onClick={() => switchRole(item.id)}>
                          <strong>{item.id === state.role ? '✓ ' : ''}{item.name}</strong>
                          <span>{item.person}{item.operatorName ? ` · ${item.operatorName}` : ''}</span>
                        </button>
                      ))}
                      <hr />
                      <button type="button" onClick={() => { dispatch({ type: 'logout' }); setMenu(false); go(''); }}>Back to role selection</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {showFilters ? <GlobalFilters /> : null}
            {state.role === 'operator' && (
              <p className="scope-banner">Viewing data for {operator?.name}. Assets: {operatorAssets.join(' · ')}</p>
            )}
          </header>
          <main className="content">
            <div className="content-inner page" data-screen={current}>
              {children}
            </div>
          </main>
        </div>
      </div>
      <CommandPalette />
      <div className="toaster" aria-live="polite">
        {ui.toasts.map((toast) => (
          <div key={toast.id} className="toast" role="status">
            <div>
              <p className="toast-title">{toast.title}</p>
              {toast.detail && <p className="toast-detail">{toast.detail}</p>}
            </div>
            <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => ui.dismissToast(toast.id)}>×</button>
          </div>
        ))}
      </div>
      <Modal open={ui.resetOpen} title="Reset all demo data to its starting state?" onClose={() => ui.setResetOpen(false)}>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => ui.setResetOpen(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => { ui.setResetOpen(false); dispatch({ type: 'reset' }); go(role.landing); }}>Reset</button>
        </div>
      </Modal>
      <Modal open={ui.shortcuts} title="Keyboard shortcuts" onClose={() => ui.setShortcuts(false)}>
        <ul className="shortcut-list">
          <li><kbd>Ctrl K</kbd> Search or jump to</li>
          <li><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> Reset demo</li>
        </ul>
      </Modal>
    </div>
  );
}
