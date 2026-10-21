// Display labels only. Stored source strings and section 8.2 figures stay as generated.

const SOURCE_LABEL = {
  'Facebook Lead Ad': 'Facebook lead ad',
  'Facebook lead form': 'Facebook lead ad',
  'Facebook lead ads': 'Facebook lead ad',
  Instagram: 'Instagram ad',
  'Instagram ads': 'Instagram ad',
  'Google Ads': 'Google Ads',
  'Google Ads (Search)': 'Google Ads',
  'Boosted post': 'Boosted post',
  'Boosted posts (FB/IG)': 'Boosted post',
  'Website form': 'Website form',
  'Website form – QR demo': 'Website form',
  WhatsApp: 'WhatsApp',
  'Walk-in / call': 'Walk-in / call',
  'Walk-in': 'Walk-in / call',
  Referral: 'Referral',
};

export function displaySource(source) {
  if (!source) return '–';
  return SOURCE_LABEL[source] || source;
}

export function spaceWord(use) {
  return use === 'Office' ? 'Suite' : 'Lot';
}

export function spaceLabel(use, lot) {
  if (!lot) return '–';
  return `${spaceWord(use)} ${lot}`;
}

const ASSET_MARK = {
  kpsa: 'KSA',
  pas: 'PAS',
  sacc: 'SAC',
  bangi: 'KBG',
  mpkns: 'MPK',
  mww: 'MWW',
  wy: 'WY',
  mu: 'MU',
  mu2: 'U2',
  sitc: 'SITC',
};

export function assetMark(asset) {
  if (!asset) return '–';
  if (ASSET_MARK[asset.id]) return ASSET_MARK[asset.id];
  return String(asset.short || asset.name || asset.id || '–').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '–';
}

const OFFICER_TINT = {
  aina: 's1',
  hafiz: 's2',
  izzati: 's5',
  huda: 's6',
};

export function officerTint(id) {
  return OFFICER_TINT[id] || 's4';
}

export function initialsOf(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '–';
}

export function sentence(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  return /[.!?]$/.test(value) ? value : `${value}.`;
}
