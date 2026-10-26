import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ROLES, useStore } from './store.jsx';
import { campaignRows } from './data/selectors.js';
import { totalRow } from './data/metrics.js';
import { x } from './format.js';

const Ui = createContext(null);

export function UiProvider({ children }) {
  const { state, data } = useStore();
  const [toasts, setToasts] = useState([]);
  const [events, setEvents] = useState([]);
  const [palette, setPalette] = useState(false);
  const [drawerId, setDrawerId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [resetOpen, setResetOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [presenter, setPresenter] = useState(() => {
    try { return sessionStorage.getItem('pkns-presenter') === '1'; } catch { return false; }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('pkns-nav-collapsed') === '1'; } catch { return false; }
  });
  const prevHero = useRef(state.heroStage);
  const prevRole = useRef(state.role);

  const pushToast = useCallback((item) => {
    setToasts((list) => [...list, item].slice(-3));
  }, []);

  const notify = useCallback((event) => {
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, read: false, at: state.now, ...event };
    if (event.bell !== false) setEvents((list) => [item, ...list].slice(0, 12));
    pushToast(item);
  }, [pushToast, state.now]);

  const toastOnly = useCallback((event) => {
    notify({ ...event, bell: false });
  }, [notify]);

  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const dismissHref = useCallback((href) => {
    if (!href) return;
    setToasts((list) => list.filter((toast) => toast.href !== href));
    setEvents((list) => list.map((item) => (item.href === href ? { ...item, read: true } : item)));
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setToasts([]);
  }, []);

  const markAllRead = useCallback(() => {
    setEvents((list) => list.map((item) => ({ ...item, read: true })));
  }, []);

  const markRead = useCallback((id) => {
    setEvents((list) => list.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, []);

  const setDraft = useCallback((id, draft) => {
    setDrafts((current) => {
      const prev = current[id];
      if (prev && prev.type === draft.type && prev.text === draft.text && prev.viewDate === draft.viewDate && prev.viewTime === draft.viewTime) return current;
      return { ...current, [id]: draft };
    });
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem('pkns-presenter', presenter ? '1' : '0'); } catch { /* session storage can be blocked */ }
    document.documentElement.classList.toggle('presenter', presenter);
  }, [presenter]);

  useEffect(() => {
    try { localStorage.setItem('pkns-nav-collapsed', collapsed ? '1' : '0'); } catch { /* local storage can be blocked */ }
  }, [collapsed]);

  useEffect(() => {
    const onToast = (event) => { if (event.detail) notify({ ...event.detail, bell: event.detail.bell !== false ? event.detail.bell : false }); };
    window.addEventListener('pkns-toast', onToast);
    return () => window.removeEventListener('pkns-toast', onToast);
  }, [notify]);

  useEffect(() => {
    const from = prevRole.current;
    prevRole.current = state.role;
    if (!from || !state.role || from === state.role) return;
    const next = ROLES[state.role];
    toastOnly({ title: `Viewing as ${next.person}, ${next.name}` });
  }, [state.role, toastOnly]);

  useEffect(() => {
    const from = prevHero.current;
    prevHero.current = state.heroStage;
    if (from === state.heroStage) return;
    if (!from && state.heroStage === 'New') {
      notify({
        title: 'New enquiry from Facebook lead ad: Teras Niaga Consulting Sdn Bhd, Suite 4-07',
        href: 'enquiry/ENQ-HERO',
        action: 'Open',
      });
      if (state.triggers?.T1 !== false) {
        notify({
          title: 'New Suspect: Teras Niaga Consulting Sdn Bhd',
          href: 'enquiry/ENQ-HERO',
          action: 'Open',
        });
      }
    }
    if (state.heroStage === 'Signed' && from !== 'Signed') {
      const totals = totalRow(campaignRows(data, state, 'sa'));
      notify({
        title: 'Tenancy signed: Suite 4-07, RM3,360 a month from 1 Dec 2026',
        detail: `SA Sentral now ${totals.signed} signed, ROAS ${x(totals.roas)}`,
        href: 'campaign/sa',
        action: 'View campaign',
      });
      if (state.triggers?.T6 !== false) {
        notify({
          title: 'Teras Niaga Consulting Sdn Bhd became a Customer',
          href: 'enquiry/ENQ-HERO',
          action: 'Open',
        });
      }
    }
  }, [state.heroStage, state, data, notify]);

  const value = useMemo(() => ({
    toasts,
    events,
    notify,
    toastOnly,
    dismissToast,
    dismissHref,
    clearEvents,
    markAllRead,
    markRead,
    palette,
    setPalette,
    drawerId,
    openRecord: setDrawerId,
    closeRecord: () => setDrawerId(null),
    drafts,
    setDraft,
    resetOpen,
    setResetOpen,
    shortcuts,
    setShortcuts,
    presenter,
    setPresenter,
    collapsed,
    setCollapsed,
  }), [
    toasts, events, notify, toastOnly, dismissToast, dismissHref, clearEvents, markAllRead, markRead, palette, drawerId, drafts, setDraft,
    resetOpen, shortcuts, presenter, collapsed,
  ]);

  return <Ui.Provider value={value}>{children}</Ui.Provider>;
}

export const useUi = () => useContext(Ui);
