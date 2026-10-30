import { useState } from 'react';
import { can, ROLES } from '../access.js';
import { globalQuery } from '../filters.js';
import { go } from '../router.js';
import { maskEmail, maskName, maskPhone } from '../mask.js';

export function linkTo(path, search, extra = {}) {
  const query = { ...globalQuery(search), ...extra };
  const qs = Object.entries(query)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `#/${path}${qs ? `?${qs}` : ''}`;
}

export function openScreen(screen, search, ...params) {
  go(screen, ...params, globalQuery(search));
}

export function PageHead({ title, lede, actions, tabs, back, status }) {
  return (
    <header className="screen-head page-head">
      {back ? <a className="back-link" href={back.href} onClick={back.onClick}>{back.label || 'Back'}</a> : null}
      <div className="page-head-row">
        <div className="page-head-copy">
          <h1>{title}{status}</h1>
          {lede ? <p className="lead">{lede}</p> : null}
        </div>
        {actions ? <div className="screen-actions">{actions}</div> : null}
      </div>
      {tabs || null}
    </header>
  );
}

export function OverflowMenu({ label = 'More actions', items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-menu">
      <button type="button" className="icon-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((value) => !value)}>⋯</button>
      {open ? (
        <div className="overflow-panel" role="menu">
          {items.map((item) => (item.href ? (
            <a key={item.label} href={item.href} role="menuitem" onClick={() => setOpen(false)}>{item.label}</a>
          ) : (
            <button key={item.label} type="button" role="menuitem" onClick={() => { setOpen(false); item.onClick?.(); }}>{item.label}</button>
          )))}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, action }) {
  return (
    <div className="empty-state">
      <p>{title}</p>
      {action || null}
    </div>
  );
}

export function SampleBadge({ text = 'Sample data, not connected' }) {
  return <span className="sample-badge">{text}</span>;
}

const STATUS_CLASS = {
  Planned: 'st-planned',
  Approved: 'st-approved',
  Live: 'st-live',
  Completed: 'st-completed',
  Reported: 'st-reported',
  Draft: 'st-planned',
  Published: 'st-live',
  Scheduled: 'st-approved',
  Closed: 'st-completed',
  Archived: 'st-reported',
  Active: 'st-live',
  Paused: 'st-completed',
  Expired: 'st-reported',
  New: 'st-approved',
  'Matched to existing profile': 'st-reported',
  Flagged: 'st-completed',
  'Opted in': 'st-consent-in',
  'Not opted in': 'st-consent-out',
  'Consent unknown': 'st-consent-unknown',
  'Not connected': 'st-planned',
};

export function Status({ value }) {
  return <span className={`status-chip ${STATUS_CLASS[value] || ''}`}>{value || '–'}</span>;
}

export function auditEntry(state, action, targetType, targetId, details) {
  const role = ROLES[state.role] || {};
  return { userName: role.person || 'User', role: role.name || '', action, targetType, targetId, details };
}

export function personal(profile, role, revealed, field) {
  const shown = revealed === true || (revealed && (revealed[profile?.id] === true || revealed[`${profile?.id}:${field}`] === true));
  if (field === 'mobile') return shown && can(role, 'profile.reveal') ? (profile.mobile || '–') : maskPhone(profile?.mobile);
  if (field === 'email') return shown && can(role, 'profile.reveal') ? (profile.email || '–') : maskEmail(profile?.email);
  if (role === 'management' && field === 'fullName') return maskName(profile.fullName);
  return profile?.[field] || '–';
}

export function SearchBox({ value, onChange, placeholder = 'Search' }) {
  return <input className="search-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />;
}
