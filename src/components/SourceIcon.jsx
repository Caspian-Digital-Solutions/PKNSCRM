import { Footprints, Globe, Megaphone, MessageCircle } from 'lucide-react';
import { displaySource } from '../labels.js';

function Mark({ source }) {
  const name = displaySource(source);
  if (name === 'Facebook lead ad') return <span className="badge-letter">f</span>;
  if (name === 'Google Ads') return <span className="badge-letter">G</span>;
  if (name === 'Instagram ad') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <rect x="1.2" y="1.2" width="11.6" height="11.6" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="7" cy="7" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="10.2" cy="3.8" r="0.7" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'Boosted post') return <Megaphone size={14} strokeWidth={1.75} aria-hidden="true" />;
  if (name === 'Website form') return <Globe size={14} strokeWidth={1.75} aria-hidden="true" />;
  if (name === 'WhatsApp') return <MessageCircle size={14} strokeWidth={1.75} aria-hidden="true" />;
  if (name === 'Walk-in / call') return <Footprints size={14} strokeWidth={1.75} aria-hidden="true" />;
  return <span className="badge-letter">{name.slice(0, 1)}</span>;
}

export default function SourceIcon({ source }) {
  const name = displaySource(source);
  return (
    <span className="source-badge" aria-hidden="true" title={name}>
      <Mark source={source} />
    </span>
  );
}

export function SourceBadge({ source }) {
  return (
    <span className="source-with-name">
      <SourceIcon source={source} />
      <span>{displaySource(source)}</span>
    </span>
  );
}
