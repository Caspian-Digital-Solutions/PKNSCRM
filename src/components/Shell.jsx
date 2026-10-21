import { useEffect, useMemo, useState } from 'react';
import {
  Bell, Building2, ChevronDown, Clock, FileText, Home, Inbox, LayoutGrid, Megaphone,
  PanelLeft, Settings, Target,
} from 'lucide-react';
import logo from '../assets/pkns-logo.png';
import { useStore, ROLES, SCREENS } from '../store.jsx';
import { go, useRoute } from '../router.js';
import { useUi } from '../ui.jsx';
import { liveEnquiries, pipelineSummary } from '../data/selectors.js';
import { num } from '../format.js';
import Modal from './Modal.jsx';
import CommandPalette from './CommandPalette.jsx';
import EnquiryRecord from './EnquiryRecord.jsx';

const ICONS = {
  portfolio: LayoutGrid,
  asset: Building2,
  marketing: Megaphone,
  campaign: Target,
  pipeline: Inbox,
  report: FileText,
  visitors: Home,
  settings: Settings,
};

function openHref(href) {
  if (!href) return;
  const [screen, ...params] = href.split('/');
  go(screen, ...params);
}

export default function Shell({ current, children }) {
  const { state, dispatch, data } = useStore();
  const route = useRoute();
  const ui = useUi();
  const role = ROLES[state.role];
  const nav = SCREENS.filter((item) => !item.hidden && item.roles.includes(state.role));
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const fresh = useMemo(() => pipelineSummary(data, state).counts.New || 0, [data, state]);
  const record = useMemo(() => {
    if (route.screen !== 'enquiry') return null;
    return liveEnquiries(data, state).find((item) => item.id === route.params[0]) || null;
  }, [data, state, route.screen, route.params]);
  const navCurrent = current === 'enquiries' || current === 'enquiry' ? 'pipeline' : current;
  const section = SCREENS.find((item) => item.id === navCurrent);

  const confirmReset = () => {
    ui.setResetOpen(false);
    ui.clearEvents();
    dispatch({ type: 'reset' });
    ui.notify({ title: 'Demo reset' });
    go(role.landing);
  };

  const resetNow = () => {
    ui.clearEvents();
    dispatch({ type: 'reset' });
    ui.notify({ title: 'Demo reset' });
    go(role.landing);
  };

  const switchRole = (id) => {
    dispatch({ type: 'role', role: id });
    setMenu(false);
    go(ROLES[id].landing);
  };

  useEffect(() => {
    if (route.screen === 'enquiry') ui.closeRecord();
  }, [route.screen, route.params, ui]);

  useEffect(() => {
    const onKey = (event) => {
      const field = event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.setPalette((open) => !open);
        return;
      }
      if (event.altKey && event.shiftKey && event.code === 'KeyR') {
        event.preventDefault();
        resetNow();
        return;
      }
      if (event.altKey && event.shiftKey && event.code === 'KeyP') {
        event.preventDefault();
        ui.setPresenter((on) => !on);
        return;
      }
      if (event.altKey && event.shiftKey && event.code === 'KeyE' && state.role === 'leasing' && !state.heroStage) {
        event.preventDefault();
        dispatch({ type: 'simulateHero' });
        go('pipeline');
        return;
      }
      if (!field && event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
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
          <a className="side-brand" href="#/" onClick={(event) => { event.preventDefault(); go(role.landing); }}>
            <span className="logo-tile"><img src={logo} alt="PKNS" /></span>
            <span className="side-copy">
              <span className="side-product">Asset Marketing Hub</span>
            </span>
          </a>
          <div className="side-links">
            {nav.map((item) => {
              const Icon = ICONS[item.id] || LayoutGrid;
              return (
                <a
                  key={item.id}
                  href={`#/${item.id}`}
                  className={navCurrent === item.id ? 'active' : ''}
                  aria-label={item.name}
                  onClick={(event) => { event.preventDefault(); go(item.id); }}
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span className="nav-label">{item.name}</span>
                  {item.id === 'pipeline' && (
                    <span className="nav-badge" aria-hidden="true">{num(fresh)}</span>
                  )}
                </a>
              );
            })}
          </div>
          <div className="side-foot">
            <p className="side-credit">Prototype by Caspian Digital Solutions</p>
            <div className="side-pills">
              <span className="demo-pill">Demo data</span>
              {ui.presenter && <span className="demo-pill">Presenter mode</span>}
            </div>
            <button type="button" className="text-btn" onClick={() => ui.setResetOpen(true)}>Reset demo</button>
            <button type="button" className="text-btn icon-btn" onClick={() => ui.setCollapsed((on) => !on)} aria-label={ui.collapsed ? 'Expand navigation' : 'Collapse navigation'}>
              <PanelLeft size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="nav-label">{ui.collapsed ? 'Expand' : 'Collapse'}</span>
            </button>
            <div className="user-card">
              <button type="button" className="role-btn" onClick={() => setMenu((open) => !open)} aria-expanded={menu}>
                <span className="avatar" aria-hidden="true">{role.initials}</span>
                <span className="user-meta">
                  <strong>{role.person}</strong>
                  <span>{role.name}</span>
                </span>
                <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
              {menu && (
                <div className="role-menu" role="menu">
                  {Object.values(ROLES).map((item) => (
                    <button key={item.id} role="menuitem" className={item.id === state.role ? 'on' : ''} onClick={() => switchRole(item.id)}>
                      <strong>{item.name}</strong>
                      <span>{item.person}, {item.title}</span>
                    </button>
                  ))}
                  <hr />
                  <button role="menuitem" onClick={() => { dispatch({ type: 'logout' }); setMenu(false); go(''); }}>
                    <strong>Back to role selection</strong>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
        <div className="main-col">
          <header className="topbar">
            <p className="crumb">
              <span>{section?.name || 'Asset Marketing Hub'}</span>
              {record && <span className="crumb-name">{record.business}</span>}
            </p>
            <button type="button" className="search-btn" onClick={() => ui.setPalette(true)}>
              <span>Search or jump to…</span>
              <kbd>⌘K</kbd>
            </button>
            <div className="topbar-right">
              <button type="button" className="icon-btn" title="Data as at 31 Oct 2026" aria-label="Data as at 31 Oct 2026">
                <Clock size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <div className="bell-wrap">
                <button type="button" className="icon-btn" aria-label="Notifications" aria-expanded={bell} onClick={() => setBell((open) => !open)}>
                  <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
                  {ui.events.length > 0 && <span className="nav-badge" aria-hidden="true">{ui.events.length}</span>}
                </button>
                {bell && (
                  <div className="role-menu bell-menu" role="menu">
                    {ui.events.length === 0 && <p className="menu-empty">No notifications yet.</p>}
                    {ui.events.map((event) => (
                      <button
                        key={event.id}
                        role="menuitem"
                        onClick={() => { setBell(false); openHref(event.href); }}
                      >
                        <strong>{event.title}</strong>
                        {event.detail && <span>{event.detail}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="avatar" title={role.person}>{role.initials}</span>
            </div>
          </header>
          <main className="content">
            <div className="content-inner">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette />
      <div className="toaster" aria-live="polite">
        {ui.toasts.map((toast) => (
          <div className="toast" key={toast.id} role="status">
            <p>{toast.title}</p>
            {toast.detail && <p className="toast-detail">{toast.detail}</p>}
            <div className="toast-actions">
              {toast.href && (
                <button type="button" className="btn btn-primary" onClick={() => { ui.dismissToast(toast.id); openHref(toast.href); }}>
                  {toast.action || 'Open'}
                </button>
              )}
              <button type="button" className="btn" onClick={() => ui.dismissToast(toast.id)}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
      {ui.drawerId && (
        <div className="drawer-backdrop" onMouseDown={() => ui.closeRecord()}>
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Enquiry" onMouseDown={(event) => event.stopPropagation()}>
            <EnquiryRecord id={ui.drawerId} variant="drawer" onClose={ui.closeRecord} />
          </div>
        </div>
      )}
      <Modal open={ui.resetOpen} title="Reset all demo data to its starting state?" onClose={() => ui.setResetOpen(false)}>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => ui.setResetOpen(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={confirmReset}>Reset</button>
        </div>
      </Modal>
      <Modal open={ui.shortcuts} title="Keyboard shortcuts" onClose={() => ui.setShortcuts(false)}>
        <ul className="shortcut-list">
          <li><kbd>⌘K</kbd> Search or jump to</li>
          <li><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> Simulate enquiry</li>
          <li><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> Reset demo</li>
          <li><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> Presenter mode</li>
        </ul>
      </Modal>
    </div>
  );
}
