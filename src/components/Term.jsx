import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { definitionById } from '../data/definitions.js';

export function Abbr({ title, children }) {
  return <abbr title={title}>{children}</abbr>;
}

export default function Term({ id, formula, children }) {
  const def = formula ? { name: typeof children === 'string' ? children : '', formula } : definitionById(id);
  const label = children || (def?.name || id || '').replace(/ %$/, '');
  const heading = typeof label === 'string' ? label.replace(/ %$/, '') : (def?.name || '').replace(/ %$/, '');
  const [box, setBox] = useState(null);
  const timer = useRef(null);
  const anchor = useRef(null);

  const close = () => {
    window.clearTimeout(timer.current);
    setBox(null);
  };

  const schedule = (el) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setBox(placeBox(rect, 320, 120, 'above'));
    }, 150);
  };

  useEffect(() => {
    if (!box) return undefined;
    const onClose = () => close();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [box]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      className="term"
      ref={anchor}
      tabIndex={0}
      onMouseEnter={(event) => schedule(event.currentTarget)}
      onMouseLeave={close}
      onFocus={() => anchor.current && schedule(anchor.current)}
      onBlur={close}
    >
      <span className="term-label">{label}</span>
      {def ? <Info className="term-icon" size={14} strokeWidth={1.75} aria-hidden="true" /> : null}
      {def && box && createPortal(
        <span className="term-pop is-open" role="tooltip" style={{ top: box.top, left: box.left }}>
          <strong>{heading}</strong>
          <span>{def.formula}</span>
          {def.note ? <span>{def.note}</span> : null}
        </span>,
        document.body,
      )}
    </span>
  );
}

function placeBox(rect, width, height, place = 'above') {
  const margin = 8;
  const gap = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampLeft = (left) => Math.max(margin, Math.min(left, vw - width - margin));
  const spots = {
    above: { top: rect.top - gap - height, left: clampLeft(rect.left) },
    below: { top: rect.bottom + gap, left: clampLeft(rect.right - width) },
    right: { top: rect.top + rect.height / 2 - height / 2, left: rect.right + gap },
    left: { top: rect.top + rect.height / 2 - height / 2, left: rect.left - gap - width },
  };
  const order = place === 'right' ? ['right', 'left', 'below', 'above'] : ['above', 'below', 'right', 'left'];
  const overlaps = (box) => box.left < rect.right - 1 && box.right > rect.left + 1 && box.top < rect.bottom - 1 && box.bottom > rect.top + 1;
  for (const name of order) {
    const raw = spots[name];
    const left = clampLeft(raw.left);
    let top = raw.top;
    if (top < margin) top = margin;
    if (top + height > vh - margin) top = Math.max(margin, vh - height - margin);
    const box = { top, left, right: left + width, bottom: top + height };
    if (overlaps(box)) continue;
    if (box.top < margin || box.bottom > vh - margin) continue;
    return { top, left, width };
  }
  return { top: Math.min(vh - height - margin, rect.bottom + gap), left: clampLeft(rect.left), width };
}

export function Tip({ label, children, place = 'bottom' }) {
  const [box, setBox] = useState(null);
  const timer = useRef(null);
  const close = () => {
    window.clearTimeout(timer.current);
    setBox(null);
  };
  const schedule = (el) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const width = Math.min(320, Math.max(96, String(label).length * 8));
      setBox(placeBox(rect, width, 36, place));
    }, 150);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <span className="tip" onMouseEnter={(event) => schedule(event.currentTarget)} onMouseLeave={close} onBlur={close}>
      {children}
      {box && createPortal(
        <span className="term-pop is-open" role="tooltip" style={{ top: box.top, left: box.left, maxWidth: box.width }}>{label}</span>,
        document.body,
      )}
    </span>
  );
}
