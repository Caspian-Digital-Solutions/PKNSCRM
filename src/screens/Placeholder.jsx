import { SCREENS } from '../store.jsx';

export default function Placeholder({ id }) {
  const s = SCREENS.find((x) => x.id === id);
  return (
    <section>
      <h1 className="page-title">{s ? s.name : 'Screen'}</h1>
      <div className="placeholder">
        <p>This screen is being built.</p>
        <p className="muted">Planned for {s ? s.milestone : 'a later milestone'}.</p>
      </div>
    </section>
  );
}
