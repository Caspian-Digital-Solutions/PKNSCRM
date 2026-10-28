// AMP Hub consistency: generator totals, import history and a filtered view agree.
import { generate } from '../src/data/generate.js';
import { buildView, filterProfiles } from '../src/data/selectors.js';
import { CONSENT_UNKNOWN, IMPORT_MERGED, IMPORT_REJECTED, IMPORT_ROWS, LEGACY_PROFILES } from '../src/data/config.js';

let failed = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
};

const data = generate();
const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] || 0), 0);
check('import rows sum', sum(data.imports, 'rowsTotal') === IMPORT_ROWS, String(sum(data.imports, 'rowsTotal')));
check('import merged sum', sum(data.imports, 'duplicatesMerged') === IMPORT_MERGED);
check('import rejected sum', sum(data.imports, 'rowsRejected') === IMPORT_REJECTED);
check('legacy profiles', data.profiles.filter((profile) => profile.importedFromLegacy).length === LEGACY_PROFILES);
check('consent unknown profiles', data.profiles.filter((profile) => profile.consent?.unknown).length === CONSENT_UNKNOWN);
check('unique profile ids', new Set(data.profiles.map((profile) => profile.id)).size === data.profiles.length);
check('activation ids unique', new Set(data.activations.map((act) => act.id)).size === data.activations.length);
check('every activation has an asset', data.activations.every((act) => data.assets.some((asset) => asset.id === act.assetId)));
check('spend lines reference known assets', data.spend.every((line) => data.assets.some((asset) => asset.id === line.assetId)));

const state = { role: 'operator', budgetEdits: {}, revealed: {} };
const view = buildView(data, state, {});
const allowed = new Set(['pas', 'gsa']);
check('operator view is Alam Sentral assets', view.byAsset.every((row) => allowed.has(row.id)) && view.byAsset.length === 2, view.byAsset.map((row) => row.id).join(','));
const people = filterProfiles(view.profiles, view.scope, view.scope.from, view.scope.to, { stock: true });
check('operator profiles stay on assigned assets', people.every((profile) => (profile.assetIds || []).some((id) => allowed.has(id))));

const manager = buildView(data, { role: 'amp-manager', budgetEdits: {}, revealed: {} }, { asset: 'pas' });
check('asset filter narrows the by-asset table', manager.byAsset.length === 1 && manager.byAsset[0].id === 'pas');
check('filtered database is not the full 16000', manager.kpis.database < 16000 && manager.kpis.database > 0, String(manager.kpis.database));

if (failed) {
  console.log(`\n${failed} CHECKS FAILED`);
  process.exit(1);
}
console.log('\nALL CHECKS PASSED');
