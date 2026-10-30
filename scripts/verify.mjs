// Section 15 checks for the PKNS AMP Hub. Replaces the leasing golden-number suite.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { generate } from '../src/data/generate.js';
import { FORMULAS } from '../src/data/metrics.js';
import { ASSETS, CONSENT_UNKNOWN, IMPORT_MERGED, IMPORT_ROWS, LEGACY_PROFILES } from '../src/data/config.js';
import { buildView } from '../src/data/selectors.js';
import { ROLES, NAV } from '../src/access.js';

let fails = 0;
const check = (label, ok, detail = '') => {
  if (!ok) fails += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
};

const data = generate();
check('8 assets', data.assets.length === 8, String(data.assets.length));
check('70 activations', data.activations.length === 70, String(data.activations.length));
check('16000 profiles', data.summary.profiles === 16000, String(data.summary.profiles));
check('10872 legacy profiles', data.summary.legacyProfiles === LEGACY_PROFILES, String(data.summary.legacyProfiles));
check('13214 import rows', data.summary.importRows === IMPORT_ROWS, String(data.summary.importRows));
check('1906 merged duplicates', data.summary.importMerged === IMPORT_MERGED, String(data.summary.importMerged));
check('6430 consent unknown', data.summary.consentUnknown === CONSENT_UNKNOWN, String(data.summary.consentUnknown));
check('5 segments', data.segments.length === 5);
check('import history files', data.imports.length >= 18, String(data.imports.length));
check('example import file', data.imports.some((job) => job.fileName === 'Raya Open House 2025 – Plaza Alam Sentral.xlsx' && job.rowsTotal === 1184 && job.rowsImported === 1102 && job.duplicatesMerged === 61 && job.rowsRejected === 21));
check('consent unknown flag on imports', data.imports.some((job) => job.consentMode === 'unknown'));
check('RentX sample on a linked asset', data.assets.some((asset) => asset.rentxLinked && asset.rentxSnapshot));
check('open space is not RentX linked', data.assets.filter((asset) => asset.type === 'Open space' || asset.type === 'Township site').every((asset) => !asset.rentxLinked));

const configText = readFileSync(new URL('../src/data/config.js', import.meta.url), 'utf8');
for (const asset of ASSETS) {
  const line = configText.split('\n').find((row) => row.includes(`name: '${asset.name}'`) || row.includes(`name: "${asset.name}"`));
  check(`VERIFY NAME ${asset.name}`, Boolean(line && /VERIFY NAME/.test(configText.slice(configText.indexOf(asset.name), configText.indexOf(asset.name) + 80))));
}

for (const key of ['ampSpend', 'activations', 'attendance', 'newProfiles', 'database', 'consented', 'costAttendee', 'costProfile', 'costLead', 'returning', 'rating', 'utilisation', 'engagement']) {
  check(`formula ${key}`, typeof FORMULAS[key] === 'string' && FORMULAS[key].length > 10);
}

check('five roles', Object.keys(ROLES).length === 5 && ['amp-manager', 'amp-executive', 'operator', 'management', 'admin'].every((id) => ROLES[id]));
check('operator scoped', ROLES.operator.operatorId === 'op-alam');
check('management opens audience overview', NAV.find((item) => item.id === 'audience').roles.includes('management'));
check('import is manager and admin', ['amp-manager', 'admin'].every((id) => NAV.find((item) => item.id === 'import').roles.includes(id)));
check('settings is admin only', NAV.find((item) => item.id === 'settings').roles.join() === 'admin');

const view = buildView(data, { role: 'amp-manager', budgetEdits: {}, revealed: {} }, { preset: 'l12' });
check('default view has KPIs', Number.isFinite(view.kpis.ampSpend) && view.kpis.database === 16000);
check('by asset rows', view.byAsset.length === 8);
check('digital sample exists', data.digital.length > 0 && data.digital.some((row) => row.channel === 'Google Ads' && row.spendRM > 0));
check('google ads zero before mid-2026', data.digital.filter((row) => row.channel === 'Google Ads' && row.month < '2026-07').every((row) => row.spendRM === 0));

const forbidden = [
  [/sq\s*ft/i, 'sq ft'],
  [/lease expir/i, 'lease expiry'],
  [/asking rent/i, 'asking rent'],
  [/whatsapp/i, 'WhatsApp'],
  [/\bWALE\b/, 'WALE'],
  [/cost per signed/i, 'cost per signed'],
  [/\bROAS\b/, 'ROAS'],
  [/unit grid/i, 'unit grid'],
  [/leasing (enquiry|pipeline|officer)/i, 'leasing workflow'],
];
const allowOccupancy = new Set(['src/data/config.js', 'src/screens/Assets.jsx']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(js|jsx|css)$/.test(name)) out.push(path);
  }
  return out;
}

for (const file of walk('src')) {
  const text = readFileSync(file, 'utf8');
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) check(`no ${label} in ${file}`, false);
  }
  if (/occupancy/i.test(text) && !allowOccupancy.has(file)) check(`occupancy only on RentX card (${file})`, false);
}
const builder = readFileSync('src/screens/FormBuilder.jsx', 'utf8');
check('consent block cannot be removed', builder.includes('cannot be removed') && !/consentBlock[\s\S]{0,80}Remove/.test(builder));

if (fails) {
  console.log(`\n${fails} CHECKS FAILED`);
  process.exit(1);
}
console.log('\nALL CHECKS PASSED');
