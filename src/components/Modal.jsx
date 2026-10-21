import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const node = ref.current;
    const focusable = () => [...(node?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    (focusable()[0] || node)?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prev && prev.focus) prev.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={() => onClose?.()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={ref}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
