import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from './store.jsx';

const Ui = createContext(null);

export function UiProvider({ children }) {
  const { state } = useStore();
  const [toasts, setToasts] = useState([]);
  const [events, setEvents] = useState([]);
  const [palette, setPalette] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [presenter, setPresenter] = useState(() => {
    try { return sessionStorage.getItem('pkns-presenter') === '1'; } catch { return false; }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('pkns-nav-collapsed') === '1'; } catch { return false; }
  });

  const pushToast = useCallback((item) => {
    setToasts((list) => [...list, item].slice(-3));
    window.setTimeout(() => {
      setToasts((list) => list.filter((toast) => toast.id !== item.id));
    }, 4500);
  }, []);

  const notify = useCallback((event) => {
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, read: false, at: state.now, ...event };
    if (event.bell !== false) setEvents((list) => [item, ...list].slice(0, 12));
    pushToast(item);
  }, [pushToast, state.now]);

  const toastOnly = useCallback((event) => notify({ ...event, bell: false }), [notify]);
  const dismissToast = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);
  const dismissHref = useCallback((href) => {
    setToasts((list) => list.filter((toast) => toast.href !== href));
    setEvents((list) => list.map((item) => (item.href === href ? { ...item, read: true } : item)));
  }, []);
  const clearEvents = useCallback(() => { setEvents([]); setToasts([]); }, []);
  const markAllRead = useCallback(() => setEvents((list) => list.map((item) => ({ ...item, read: true }))), []);
  const markRead = useCallback((id) => setEvents((list) => list.map((item) => (item.id === id ? { ...item, read: true } : item))), []);

  useEffect(() => {
    try { sessionStorage.setItem('pkns-presenter', presenter ? '1' : '0'); } catch { /* ignore */ }
    document.documentElement.classList.toggle('presenter', presenter);
  }, [presenter]);

  useEffect(() => {
    try { localStorage.setItem('pkns-nav-collapsed', collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  useEffect(() => {
    const onToast = (event) => { if (event.detail) notify({ ...event.detail, bell: false }); };
    window.addEventListener('pkns-toast', onToast);
    return () => window.removeEventListener('pkns-toast', onToast);
  }, [notify]);

  const value = useMemo(() => ({
    toasts, events, notify, toastOnly, dismissToast, dismissHref, clearEvents, markAllRead, markRead,
    palette, setPalette, resetOpen, setResetOpen, shortcuts, setShortcuts, presenter, setPresenter, collapsed, setCollapsed,
  }), [toasts, events, notify, toastOnly, dismissToast, dismissHref, clearEvents, markAllRead, markRead, palette, resetOpen, shortcuts, presenter, collapsed]);

  return <Ui.Provider value={value}>{children}</Ui.Provider>;
}

export const useUi = () => useContext(Ui);
