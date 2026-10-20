const KIND = {
  'Facebook Lead Ad': 'facebook',
  'Boosted post': 'boost',
  Instagram: 'instagram',
  'Google Ads': 'google',
  'Website form': 'web',
  'Website form – QR demo': 'web',
  WhatsApp: 'whatsapp',
  'Walk-in / call': 'walkin',
};

function Icon({ kind }) {
  if (kind === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M14.5 8.5V6.8c0-.7.5-1 1.2-1H17V3h-2.1C12.4 3 11 4.4 11 6.6v1.9H9v2.7h2V21h3.5v-9.8h2.3l.4-2.7h-2.7z" />
      </svg>
    );
  }
  if (kind === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="7" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'google') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 11v2.8h4.6c-.2 1.2-1.4 3.5-4.6 3.5A5.3 5.3 0 1 1 12 6.7c1.5 0 2.5.6 3.1 1.2l2.1-2.1C15.9 4.5 14.1 3.7 12 3.7 7.6 3.7 4 7.3 4 11.8S7.6 19.8 12 19.8c4.6 0 7.6-3.2 7.6-7.7 0-.5 0-.9-.1-1.1H12z" />
      </svg>
    );
  }
  if (kind === 'web') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path fill="none" stroke="currentColor" strokeWidth="2" d="M4 12h16M12 4c2.2 2.4 3.3 5.1 3.3 8S14.2 17.6 12 20c-2.2-2.4-3.3-5.1-3.3-8S9.8 6.4 12 4z" />
      </svg>
    );
  }
  if (kind === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 4a8 8 0 0 0-6.9 12L4 20l4.1-1.1A8 8 0 1 0 12 4zm4.3 11.3c-.2.5-1 .9-1.4 1-.4.1-.8.1-1.3-.1-.3-.1-.7-.2-1.2-.5-2.1-1.1-3.5-3.2-3.6-3.4-.1-.2-.9-1.2-.9-2.2s.5-1.5.8-1.7c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .5.4.2.5.7 1.7.7 1.8.1.1 0 .3-.1.4l-.3.4c-.1.1-.2.2-.1.4.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.3.1.4-.1l.5-.6c.1-.2.3-.1.5-.1l1.6.8c.2.1.3.2.4.3.1.3 0 .7-.2 1.1z" />
      </svg>
    );
  }
  if (kind === 'walkin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="7" r="2.2" fill="currentColor" />
        <path fill="currentColor" d="M8.5 20v-5.2l-1.3 2.1-1.6-1 2.4-3.8c.3-.5.8-.8 1.4-.8h3.2c.6 0 1.1.3 1.4.8l2.4 3.8-1.6 1-1.3-2.1V20h-1.8v-3.2h-1.4V20H8.5z" />
      </svg>
    );
  }
  if (kind === 'boost') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M13 3L6 13h5l-1 8 8-12h-5l0-6z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function SourceIcon({ source }) {
  return (
    <span className="source-icon" title={source || ''}>
      <Icon kind={KIND[source] || 'other'} />
    </span>
  );
}
