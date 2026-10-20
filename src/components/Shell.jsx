import { useEffect, useState } from 'react';
import logo from '../assets/pkns-logo.png';
import { useStore, ROLES, SCREENS } from '../store.jsx';
import { go } from '../router.js';

export default function Shell({ current, children }) {
  const { state, dispatch } = useStore();
  const role = ROLES[state.role];
  const nav = SCREENS.filter((s) => s.roles.includes(state.role));
  const [menu, setMenu] = useState(false);

  // Hidden reset for the presenter: Alt + Shift + R.
  useEffect(() => {
    const on = (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyR') { dispatch({ type: 'reset' }); go(role.landing); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [dispatch, role]);

  const switchRole = (id) => { dispatch({ type: 'role', role: id }); setMenu(false); go(ROLES[id].landing); };

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); go(role.landing); }}>
          <img src={logo} alt="PKNS" />
          <span className="brand-name">Asset Marketing Hub</span>
        </a>
        <div className="topbar-right">
          <span className="demo-tag" title="Every figure in this prototype is dummy data">Demo data</span>
          <div className="role">
            <button className="role-btn" onClick={() => setMenu(!menu)} aria-expanded={menu}>
              <span className="role-label">View</span> {role.name} <span aria-hidden>▾</span>
            </button>
            {menu && (
              <div className="role-menu" role="menu">
                {Object.values(ROLES).map((r) => (
                  <button key={r.id} role="menuitem" className={r.id === state.role ? 'on' : ''} onClick={() => switchRole(r.id)}>
                    <strong>{r.name}</strong><span>{r.blurb}</span>
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
      </header>
      <div className="body">
        <nav className="sidenav" aria-label="Screens">
          {nav.map((s) => (
            <a key={s.id} href={`#/${s.id}`} className={current === s.id ? 'active' : ''}>{s.name}</a>
          ))}
        </nav>
        <main className="content">{children}</main>
      </div>
      <footer className="footer">
        <span>Prototype by Caspian Digital Solutions · All figures are demo data · Data as at 31 Oct 2026</span>
        <button className="reset" onClick={() => { dispatch({ type: 'reset' }); go(role.landing); }} title="Return all demo data to its starting state (Alt+Shift+R)">Reset demo</button>
      </footer>
    </div>
  );
}
