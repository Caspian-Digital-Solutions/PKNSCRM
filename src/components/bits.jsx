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

export function PageHead({ title, lede, actions }) {
  return (
    <div className="screen-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p className="lead">{lede}</p> : null}
      </div>
      {actions ? <div className="screen-actions">{actions}</div> : null}
    </div>
  );
}

export function SampleBadge({ text = 'Sample data, not connected' }) {
  return <span className="sample-badge">{text}</span>;
}

export function Status({ value }) {
  return <span className="status-chip">{value || '–'}</span>;
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
