import { useState } from 'react';
import { createPortal } from 'react-dom';
import { definitionById } from '../data/definitions.js';

export default function Term({ id, children }) {
  const def = definitionById(id);
  const label = children || def?.name || id;
  const interactive = label != null && typeof label !== 'string' && typeof label !== 'number';
  const [box, setBox] = useState(null);

  const open = (el) => {
    const rect = el.getBoundingClientRect();
    const width = 320;
    setBox({ top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) });
  };
  const close = () => setBox(null);

  return (
    <span
      className="term"
      tabIndex={interactive ? undefined : 0}
      onMouseEnter={(e) => open(e.currentTarget)}
      onMouseLeave={close}
      onFocusCapture={(e) => open(e.currentTarget)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) close(); }}
    >
      {interactive ? label : <span className="term-label">{label}</span>}
      {def && box && createPortal(
        <span className="term-pop is-open" role="tooltip" style={{ top: box.top, left: box.left }}>
          <strong>{def.name}</strong>
          <span>{def.formula}</span>
          {def.note ? <span>{def.note}</span> : null}
        </span>,
        document.body,
      )}
    </span>
  );
}
