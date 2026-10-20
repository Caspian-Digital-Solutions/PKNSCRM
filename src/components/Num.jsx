import { useEffect, useRef, useState } from 'react';

const show = (value, format) => {
  if (format) return format(value);
  return value == null || value === '' ? '–' : String(value);
};

// Highlights a figure for 2.5s after it changes. The first render stays still.
export default function Num({ value, format, className = '' }) {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  const prev = useRef(value);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      prev.current = value;
      return undefined;
    }
    if (Object.is(prev.current, value)) return undefined;
    prev.current = value;
    setOn(true);
    const timer = setTimeout(() => setOn(false), 2500);
    return () => clearTimeout(timer);
  }, [value]);

  return <span className={`${on ? 'num-flash' : ''} ${className}`.trim()}>{show(value, format)}</span>;
}
