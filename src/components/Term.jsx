import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { definitionById } from '../data/definitions.js';
import { sentence } from '../labels.js';

export default function Term({ id, children }) {
  const def = definitionById(id);
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
      const width = 320;
      setBox({ top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) });
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
          <span>{sentence(def.formula)}</span>
          {def.note ? <span>{sentence(def.note)}</span> : null}
        </span>,
        document.body,
      )}
    </span>
  );
}

function placeTip(rect, place) {
  const width = 220;
  const height = 36;
  const margin = 8;
  let top = place === 'right' ? rect.top + rect.height / 2 - height / 2 : rect.bottom + 6;
  let left = place === 'right' ? rect.right + 8 : rect.left;
  if (left + width > window.innerWidth - margin) left = Math.max(margin, rect.left - width - 8);
  if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
  if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - 6);
  if (top < margin) top = margin;
  return { top, left, width };
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
      setBox(placeTip(el.getBoundingClientRect(), place));
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
