import { useEffect, useRef, useState } from 'react';

const show = (value, format) => {
  if (format) return format(value);
  return value == null || value === '' ? '–' : String(value);
};

// Last value rendered for a figure, including after the screen unmounts.
const seen = new Map();

// Highlights a figure for 2.5s after it changes. The first time a figure is shown, it stays still.
export default function Num({ value, format, className = '', watch }) {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  const prev = useRef(value);

  useEffect(() => {
    const remembered = watch != null && seen.has(watch) ? seen.get(watch) : undefined;
    if (watch != null) seen.set(watch, value);
    const baseline = first.current ? remembered : prev.current;
    if (first.current) {
      first.current = false;
      prev.current = value;
    }
    if (baseline === undefined || Object.is(baseline, value)) return undefined;
    prev.current = value;
    setOn(true);
    const timer = setTimeout(() => setOn(false), 2500);
    return () => clearTimeout(timer);
  }, [value, watch]);

  return <span className={`${on ? 'num-flash' : ''} ${className}`.trim()}>{show(value, format)}</span>;
}
