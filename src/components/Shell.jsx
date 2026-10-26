import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, Building2, ChevronDown, Clock, FileText, Home, Inbox, LayoutGrid, Megaphone,
  PanelLeft, RotateCcw, Settings, Target, X,
} from 'lucide-react';
import logo from '../assets/pkns-logo.png';
import { useStore, ROLES, SCREENS } from '../store.jsx';
import { go, useRoute } from '../router.js';
import { useUi } from '../ui.jsx';
import { liveEnquiries, pipelineSummary } from '../data/selectors.js';
import { asAtLabel, num } from '../format.js';
import { elapsed } from '../time.js';
import { Tip } from './Term.jsx';
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
  window.scrollTo(0, 0);
  document.querySelectorAll('.content, .main-col').forEach((node) => { node.scrollTop = 0; });
}

function ToastCard({ toast, onDismiss, onFollow }) {
  const sticky = Boolean(toast.action);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration || 5000);
  const started = useRef(0);
  useEffect(() => {
    if (sticky) return undefined;
    if (paused) {
      remaining.current -= Date.now() - started.current;
      return undefined;
    }
    started.current = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), Math.max(200, remaining.current));
    return () => window.clearTimeout(timer);
  }, [paused, sticky, toast.id, onDismiss]);
  return (
    <div className="toast" role="status" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Bell size={16} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <p className="toast-title">{toast.title}</p>
        {toast.detail && <p className="toast-detail">{toast.detail}</p>}
        {toast.href && (
          <a
            className="toast-action"
            href={`#/${toast.href}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (onFollow) onFollow(toast);
              else onDismiss(toast.id);
            }}
          >
            {toast.action || 'Open'}
          </a>
        )}
      </div>
      <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Shell({ current, children }) {
  const { state, dispatch, data } = useStore();
  const route = useRoute();
  const ui = useUi();
  const role = ROLES[state.role];
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const fresh = useMemo(() => pipelineSummary(data, state).counts.New || 0, [data, state]);
  const record = useMemo(() => {
    if (route.screen !== 'enquiry') return null;
    return liveEnquiries(data, state).find((item) => item.id === route.params[0]) || null;
  }, [data, state, route.screen, route.params]);
  const navCurrent = current === 'enquiries' || current === 'enquiry' ? 'pipeline' : current;
  const section = SCREENS.find((item) => item.id === navCurrent);

  const closeOverlays = () => {
    ui.closeRecord();
    ui.setPalette(false);
    ui.setShortcuts(false);
    setBell(false);
    setMenu(false);
  };

  const confirmReset = () => {
    ui.setResetOpen(false);
    closeOverlays();
    ui.clearEvents();
    dispatch({ type: 'reset' });
    ui.toastOnly({ title: 'Demo reset' });
    go(role.landing);
  };

  const resetNow = () => {
    closeOverlays();
    ui.clearEvents();
    dispatch({ type: 'reset' });
    ui.toastOnly({ title: 'Demo reset' });
    go(role.landing);
  };

  const switchRole = (id) => {
    dispatch({ type: 'role', role: id });
    setMenu(false);
    const def = SCREENS.find((item) => item.id === route.screen);
    const hasParam = route.params.length > 0;
    if (def && hasParam && def.roles.includes(id)) go(route.screen, ...route.params, route.search);
    else go(ROLES[id].landing);
  };

  const closeRecordRef = useRef(ui.closeRecord);
  closeRecordRef.current = ui.closeRecord;
  const bellGuard = useRef(false);
  const navHold = useRef(null);

  useEffect(() => {
    closeRecordRef.current();
    setBell(false);
    setMenu(false);
    window.scrollTo(0, 0);
    document.querySelectorAll('.content, .main-col').forEach((node) => { node.scrollTop = 0; });
  }, [route.screen, route.params]);

  useEffect(() => {
    if (!ui.drawerId) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') closeRecordRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui.drawerId]);

  useEffect(() => {
    const wide = current === 'pipeline' || current === 'enquiries' || current === 'enquiry';
    if (wide && window.innerWidth < 1600) {
      if (navHold.current === null) navHold.current = ui.collapsed;
      ui.setCollapsed(true);
      return;
    }
    if (navHold.current !== null) {
      ui.setCollapsed(navHold.current);
      navHold.current = null;
    }
  }, [current]);

  useEffect(() => {
    if (!bell && !menu) return undefined;
    const onPointer = (event) => {
      if (bellGuard.current) {
        bellGuard.current = false;
        return;
      }
      if (event.target instanceof Element && event.target.closest('.bell-wrap, .user-card, .bell-menu, .role-menu')) return;
      setBell(false);
      setMenu(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setBell(false);
        setMenu(false);
      }
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [bell, menu]);

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
            {SCREENS.filter((item) => !item.hidden).map((item) => {
              if (!item.roles.includes(state.role)) return null;
              const Icon = ICONS[item.id] || LayoutGrid;
              const icon = <Icon size={18} strokeWidth={1.75} aria-hidden="true" />;
              const badge = item.id === 'pipeline'
                ? <span className="nav-badge" aria-hidden="true">{num(fresh)}</span>
                : null;
              return (
                <a
                  key={item.id}
                  href={`#/${item.id}`}
                  className={navCurrent === item.id ? 'active' : ''}
                  aria-label={item.name}
                  onClick={(event) => { event.preventDefault(); go(item.id); }}
                >
                  <span className="nav-icon">
                    {ui.collapsed ? <Tip label={item.name} place="right">{icon}</Tip> : icon}
                    {ui.collapsed ? badge : null}
                  </span>
                  <span className="nav-label">{item.name}</span>
                  {ui.collapsed ? null : badge}
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
            {ui.collapsed ? (
              <Tip label="Reset demo" place="right">
                <button type="button" className="icon-btn nav-quiet" aria-label="Reset demo" onClick={() => ui.setResetOpen(true)}>
                  <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span className="nav-label">Reset demo</span>
                </button>
              </Tip>
            ) : (
              <button type="button" className="icon-btn nav-quiet" aria-label="Reset demo" onClick={() => ui.setResetOpen(true)}>
                <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="nav-label">Reset demo</span>
              </button>
            )}
            <button type="button" className="icon-btn nav-quiet" onClick={() => ui.setCollapsed((on) => {
              const next = !on;
              if (navHold.current !== null) navHold.current = next;
              return next;
            })} aria-label={ui.collapsed ? 'Expand navigation' : 'Collapse navigation'}>
              <PanelLeft size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="nav-label">{ui.collapsed ? 'Expand' : 'Collapse'}</span>
            </button>
            <div className="user-card">
              <button type="button" className="role-btn" data-testid="role-menu-button" onClick={() => setMenu((open) => !open)} aria-expanded={menu} aria-haspopup="menu">
                <span className="avatar" aria-hidden="true">{role.initials}</span>
                <span className="user-meta">
                  <strong>{role.person}</strong>
                  <span>{role.name}</span>
                </span>
                <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
              {menu && <RoleMenu role={role} current={state.role} onClose={() => setMenu(false)} onSwitch={switchRole} onLogout={() => { dispatch({ type: 'logout' }); setMenu(false); go(''); }} />}
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
              <kbd>{typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <div className="topbar-right">
              <Tip label={asAtLabel(state.now)}>
                <button type="button" className="icon-btn" data-testid="as-at" aria-label={asAtLabel(state.now)}>
                  <Clock size={18} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </Tip>
              <div className="bell-wrap">
                {bell ? (
                  <button type="button" className="icon-btn" aria-label="Notifications" aria-expanded={bell} onClick={(event) => { event.stopPropagation(); bellGuard.current = true; setBell((open) => !open); }}>
                    <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
                    {ui.events.some((event) => !event.read) && <span className="nav-badge" aria-hidden="true">{ui.events.filter((event) => !event.read).length}</span>}
                  </button>
                ) : (
                  <Tip label="Notifications">
                    <button type="button" className="icon-btn" aria-label="Notifications" aria-expanded={bell} onClick={(event) => { event.stopPropagation(); bellGuard.current = true; setBell((open) => !open); }}>
                      <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
                      {ui.events.some((event) => !event.read) && <span className="nav-badge" aria-hidden="true">{ui.events.filter((event) => !event.read).length}</span>}
                    </button>
                  </Tip>
                )}
                {bell && (
                  <div className="role-menu bell-menu" role="menu">
                    {ui.events.length === 0 && <p className="menu-empty">New enquiries, viewings and signed tenancies appear here.</p>}
                    {ui.events.map((event) => (
                      <button
                        key={event.id}
                        role="menuitem"
                        className={event.read ? 'is-read' : ''}
                        onClick={() => { if (event.href) ui.dismissHref(event.href); else ui.markRead(event.id); setBell(false); openHref(event.href); }}
                      >
                        <strong>{event.title}</strong>
                        {event.detail && <span>{event.detail}</span>}
                        <span>{elapsed(event.at, state.now)}</span>
                        {event.action && <span className="toast-action">{event.action}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="avatar" title={role.person}>{role.initials}</span>
            </div>
          </header>
          <main className="content">
            <div className="content-inner page">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette />
      <div className="toaster" aria-live="polite">
        {ui.toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={ui.dismissToast} onFollow={(item) => { if (item.href) ui.dismissHref(item.href); else ui.dismissToast(item.id); openHref(item.href); }} />
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
          <li><kbd>{typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd> Search or jump to</li>
          <li><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> Simulate enquiry</li>
          <li><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> Reset demo</li>
          <li><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> Presenter mode</li>
        </ul>
      </Modal>
    </div>
  );
}

function RoleMenu({ current, onClose, onSwitch, onLogout }) {
  const button = typeof document !== 'undefined' ? document.querySelector('[data-testid="role-menu-button"]') : null;
  const rect = button?.getBoundingClientRect();
  const menuRef = useRef(null);
  const [place, setPlace] = useState(null);
  const items = [...Object.values(ROLES), { id: 'logout' }];
  const [index, setIndex] = useState(Math.max(0, items.findIndex((item) => item.id === current)));
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((value) => Math.min(items.length - 1, value + 1)); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)); }
      if (event.key === 'Enter') {
        event.preventDefault();
        const item = items[index];
        if (!item || item.id === 'logout') onLogout();
        else onSwitch(item.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onClose, onLogout, onSwitch]);
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || !rect) return;
    const height = el.offsetHeight;
    const width = 280;
    let top = rect.top;
    let left = rect.right + 8;
    if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8);
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    setPlace((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
  }, [rect?.top, rect?.right, rect?.bottom]);
  if (!rect) return null;
  return createPortal(
    <div ref={menuRef} className="role-menu role-menu-portal" role="menu" data-testid="role-menu" style={{ top: place?.top ?? rect.top, left: place?.left ?? rect.right + 8 }}>
      {Object.values(ROLES).map((item, itemIndex) => (
        <button key={item.id} type="button" role="menuitem" className={item.id === current || index === itemIndex ? 'on' : ''} onClick={() => onSwitch(item.id)}>
          <strong>{item.name}</strong>
          <span>{item.person}, {item.title}</span>
        </button>
      ))}
      <hr />
      <button type="button" role="menuitem" className={index === items.length - 1 ? 'on' : ''} onClick={onLogout}>
        <strong>Back to role selection</strong>
      </button>
    </div>,
    document.body,
  );
}
