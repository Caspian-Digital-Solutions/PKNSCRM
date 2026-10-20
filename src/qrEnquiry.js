import { AS_AT, ASSETS } from './data/config.js';

export const QR_SOURCE = 'Website form – QR demo';

// Uses already defined on the assets. The public form does not add new types.
export const SPACE_TYPES = ['Office', 'Retail', 'Shop lot', 'Shop office'];

// The demo's "today" is 31 Oct 2026. Stamp that date the first time a row is seen
// so a live card shows 0 days in stage, the same as Simulate enquiry.
const receivedAtById = new Map();

function demoNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? '00';
  const hour = pick('hour') === '24' ? '00' : pick('hour');
  return `${AS_AT}T${hour}:${pick('minute')}:${pick('second')}+08:00`;
}

function receivedAtFor(id) {
  if (!receivedAtById.has(id)) receivedAtById.set(id, demoNow());
  return receivedAtById.get(id);
}

// A QR row becomes a New-column card. The officer is the asset's officer.
export function toQrEnquiry(row) {
  if (!row?.id || !row.asset) return null;
  const asset = ASSETS.find((item) => item.id === row.asset);
  if (!asset?.officer) return null;
  const receivedAt = receivedAtFor(row.id);
  return {
    id: `qr-${row.id}`,
    qr: true,
    business: (row.business || '').trim() || '–',
    contact: (row.name || '').trim(),
    phone: (row.phone || '').trim(),
    use: (row.space_type || '').trim(),
    asset: asset.id,
    lot: '',
    source: QR_SOURCE,
    channel: null,
    campaign: null,
    officer: asset.officer,
    stage: 'New',
    rent: null,
    receivedAt,
    history: [['New', receivedAt]],
    nextFollowUp: null,
    notes: [],
    log: [],
  };
}
