export const ROLES = {
  'amp-manager': {
    id: 'amp-manager',
    name: 'AMP Manager',
    landing: 'overview',
    person: 'Farah Idris',
    title: 'AMP Manager, PKNS HQ',
    initials: 'FI',
    operatorId: null,
    blurb: 'Activations, forms, budgets, imports and consented exports.',
  },
  'amp-executive': {
    id: 'amp-executive',
    name: 'AMP Executive',
    landing: 'overview',
    person: 'Danish Hakim',
    title: 'AMP Executive, PKNS HQ',
    initials: 'DH',
    operatorId: null,
    blurb: 'Activations, forms and spend. No budget approval, contact export or import.',
  },
  operator: {
    id: 'operator',
    name: 'Operator',
    landing: 'overview',
    person: 'Aina Rahman',
    title: 'Operator staff',
    initials: 'AR',
    operatorId: 'op-alam',
    operatorName: 'Alam Sentral Property Management Sdn Bhd',
    blurb: 'Own activations, forms and spend for assigned assets.',
  },
  management: {
    id: 'management',
    name: 'Management',
    landing: 'overview',
    person: 'Hisham Karim',
    title: 'Senior management',
    initials: 'HK',
    operatorId: null,
    blurb: 'Read-only aggregates. No individual profile records.',
  },
  admin: {
    id: 'admin',
    name: 'System Admin',
    landing: 'settings',
    person: 'Razak Ibrahim',
    title: 'PKNS ICT',
    initials: 'RI',
    operatorId: null,
    blurb: 'Users, assets, fields, integrations, retention and the audit log.',
  },
};

export const NAV = [
  { id: 'overview', name: 'Overview', roles: ['amp-manager', 'amp-executive', 'operator', 'management'] },
  { id: 'activations', name: 'Activations', roles: ['amp-manager', 'amp-executive', 'operator', 'management'] },
  { id: 'forms', name: 'Forms & QR', roles: ['amp-manager', 'amp-executive', 'operator'] },
  { id: 'audience', name: 'Audience', roles: ['amp-manager', 'amp-executive', 'operator'] },
  { id: 'segments', name: 'Segments', roles: ['amp-manager', 'amp-executive', 'operator'] },
  { id: 'insights', name: 'Insights', roles: ['amp-manager', 'amp-executive', 'operator', 'management'] },
  { id: 'channels', name: 'Digital Channels', roles: ['amp-manager', 'amp-executive', 'operator', 'management'] },
  { id: 'budget', name: 'Budget & Spend', roles: ['amp-manager', 'amp-executive', 'operator', 'management'] },
  { id: 'assets', name: 'Assets', roles: ['amp-manager', 'amp-executive', 'operator', 'management', 'admin'] },
  { id: 'reports', name: 'Reports', roles: ['amp-manager', 'amp-executive', 'operator', 'management'] },
  { id: 'import', name: 'Data Import', roles: ['amp-manager'] },
  { id: 'footfall', name: 'Footfall', roles: ['amp-manager', 'amp-executive', 'operator', 'management'], phase: true },
  { id: 'settings', name: 'Settings', roles: ['admin'] },
];

const ACTIONS = {
  'activation.edit': ['amp-manager', 'amp-executive', 'operator'],
  'activation.status': ['amp-manager'],
  'activation.report': ['amp-manager', 'amp-executive'],
  'form.edit': ['amp-manager', 'amp-executive', 'operator'],
  'consent.edit': ['amp-manager', 'admin'],
  'spend.edit': ['amp-manager', 'amp-executive', 'operator'],
  'budget.edit': ['amp-manager'],
  'contacts.export': ['amp-manager'],
  'import.run': ['amp-manager'],
  'profile.reveal': ['amp-manager', 'amp-executive', 'operator', 'admin'],
  'profile.open': ['amp-manager', 'amp-executive', 'operator', 'admin'],
  'profile.privacy': ['amp-manager', 'admin'],
  'asset.add': ['amp-manager', 'admin'],
  'settings.manage': ['admin'],
  'report.export': ['amp-manager', 'amp-executive', 'operator', 'management'],
};

export function can(role, action) {
  return (ACTIONS[action] || []).includes(role);
}

export function roleAllows(role, screen) {
  const item = NAV.find((entry) => entry.id === screen);
  if (!item) return false;
  return item.roles.includes(role);
}
