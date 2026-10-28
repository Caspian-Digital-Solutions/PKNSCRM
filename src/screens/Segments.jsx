import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { PageHead, auditEntry } from '../components/bits.jsx';
import { can } from '../access.js';
import { AGE_BANDS, INTERESTS, LEAD_TYPES } from '../data/config.js';
import { CONDITION_FIELDS, matchSegment, segmentCounts, summariseRules } from '../data/segments.js';
import { filterProfiles } from '../data/selectors.js';
import { useAmp } from '../useAmp.jsx';
import { date, num } from '../format.js';
import { exportCsv } from '../components/ExportButton.jsx';

function optionsFor(field, assets) {
  if (field === 'ageBand') return AGE_BANDS;
  if (field === 'interest') return INTERESTS;
  if (field === 'leadType') return LEAD_TYPES;
  if (field === 'asset') return assets.map((asset) => asset.id);
  if (field === 'hasChildren' || field === 'legacy' || field === 'interestedRent') return ['Yes', 'No'];
  if (field === 'gender') return ['Female', 'Male', 'Prefer not to say'];
  return [];
}

export default function Segments() {
  const amp = useAmp();
  const { segments, profiles, scope, assets, allActivations, state, dispatch, route } = amp;
  const [open, setOpen] = useState(route.params[0] === 'new');
  const [draft, setDraft] = useState({
    name: '', description: '', match: 'and',
    groups: [{ id: 'g1', match: 'and', conditions: [{ field: 'ageBand', op: 'eq', value: '25–34' }] }],
  });
  const activationById = useMemo(() => new Map(allActivations.map((act) => [act.id, act])), [allActivations]);
  const pool = useMemo(() => filterProfiles(profiles, scope, scope.from, scope.to, { stock: true }), [profiles, scope]);
  const rows = segments.map((segment) => {
    const counts = segmentCounts(segment, pool, activationById);
    return { ...segment, rules: summariseRules(segment), matching: counts.matching, consented: counts.consented, updated: date(segment.createdAt) };
  });
  const live = segmentCounts({ ...draft, id: 'draft' }, pool, activationById);
  const save = () => {
    const segment = { ...draft, id: `SEG-L${state.seq}`, createdBy: 'Farah Idris', createdAt: '2026-10-28' };
    dispatch({ type: 'addSegment', segment });
    setOpen(false);
  };
  const exportSegment = (segment) => {
    if (!can(state.role, 'contacts.export')) return;
    const matching = pool.filter((profile) => matchSegment(profile, segment, activationById));
    const allowed = matching.filter((profile) => profile.consent?.marketingOptIn && !profile.consent.unknown && !profile.anonymised);
    exportCsv({
      filename: segment.name,
      columns: [{ key: 'fullName', label: 'Name' }, { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' }],
      rows: allowed,
    });
    dispatch({ type: 'audit', entry: auditEntry(state, 'Exported segment', 'Segment', segment.id, `Exported ${allowed.length}. Excluded ${matching.length - allowed.length}.`) });
    window.dispatchEvent(new CustomEvent('pkns-toast', { detail: { title: `Exported ${allowed.length} consented contacts`, detail: `${matching.length - allowed.length} excluded` } }));
  };
  return (
    <section>
      <PageHead title="Segments" actions={<button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>New segment</button>} />
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'rules', label: 'Rule summary' },
          { key: 'matching', label: 'Current count', align: 'right', format: num },
          { key: 'consented', label: 'Consented count', align: 'right', format: num },
          { key: 'updated', label: 'Last updated' },
        ]}
        rows={rows}
        pageSizes={[25, 50, 100]}
        exportName="segments"
      />
      {can(state.role, 'contacts.export') && (
        <div className="screen-actions" style={{ marginTop: 12 }}>
          {segments.map((segment) => (
            <button key={segment.id} type="button" className="btn" onClick={() => exportSegment(segment)}>Export consented contacts: {segment.name}</button>
          ))}
        </div>
      )}
      {open && (
        <div className="info-card" style={{ marginTop: 16 }}>
          <h2>Segment builder</h2>
          <label>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Description<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label>Groups match
            <select value={draft.match} onChange={(event) => setDraft({ ...draft, match: event.target.value })}><option value="and">AND</option><option value="or">OR</option></select>
          </label>
          {draft.groups.map((group, groupIndex) => (
            <div key={group.id} className="consent-pin">
              <label>Conditions
                <select value={group.match} onChange={(event) => {
                  const groups = draft.groups.slice();
                  groups[groupIndex] = { ...group, match: event.target.value };
                  setDraft({ ...draft, groups });
                }}><option value="and">AND</option><option value="or">OR</option></select>
              </label>
              {group.conditions.map((condition, index) => (
                <div key={`${group.id}-${index}`} className="stack-form">
                  <select value={condition.field} onChange={(event) => {
                    const groups = draft.groups.slice();
                    const conditions = group.conditions.slice();
                    const meta = CONDITION_FIELDS.find((item) => item.id === event.target.value);
                    conditions[index] = { field: event.target.value, op: meta?.ops[0] || 'eq', value: '' };
                    groups[groupIndex] = { ...group, conditions };
                    setDraft({ ...draft, groups });
                  }}>{CONDITION_FIELDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
                  <select value={condition.op} onChange={(event) => {
                    const groups = draft.groups.slice();
                    const conditions = group.conditions.slice();
                    conditions[index] = { ...condition, op: event.target.value };
                    groups[groupIndex] = { ...group, conditions };
                    setDraft({ ...draft, groups });
                  }}>{(CONDITION_FIELDS.find((item) => item.id === condition.field)?.ops || ['eq']).map((op) => <option key={op}>{op}</option>)}</select>
                  <input value={condition.value} onChange={(event) => {
                    const groups = draft.groups.slice();
                    const conditions = group.conditions.slice();
                    conditions[index] = { ...condition, value: event.target.value };
                    groups[groupIndex] = { ...group, conditions };
                    setDraft({ ...draft, groups });
                  }} list={`opts-${condition.field}`} />
                  <datalist id={`opts-${condition.field}`}>
                    {optionsFor(condition.field, assets).map((item) => <option key={item} value={item} />)}
                  </datalist>
                </div>
              ))}
              <button type="button" className="btn" onClick={() => {
                const groups = draft.groups.slice();
                groups[groupIndex] = { ...group, conditions: [...group.conditions, { field: 'area', op: 'eq', value: '' }] };
                setDraft({ ...draft, groups });
              }}>Add condition</button>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => setDraft({ ...draft, groups: [...draft.groups, { id: `g${draft.groups.length + 1}`, match: 'and', conditions: [{ field: 'area', op: 'eq', value: '' }] }] })}>Add group</button>
          <p>Matching profiles: {num(live.matching)} | With marketing consent: {num(live.consented)}</p>
          <button type="button" className="btn btn-primary" onClick={save}>Save segment</button>
        </div>
      )}
    </section>
  );
}
