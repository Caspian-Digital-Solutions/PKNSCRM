import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HBars } from '../components/Charts.jsx';
import Avatar from '../components/Avatar.jsx';
import ChartCard from '../components/ChartCard.jsx';
import DataTable from '../components/DataTable.jsx';
import Drawer from '../components/Drawer.jsx';
import { PageHead, auditEntry, linkTo, personal } from '../components/bits.jsx';
import { SelectInput, TextInput } from '../components/controls.jsx';
import { can } from '../access.js';
import { AGE_BANDS, ASSETS, GENDERS, INTERESTS, LEAD_TYPES, SOURCE_CHANNELS } from '../data/config.js';
import { audiencePack } from '../data/audienceStats.js';
import { CONDITION_FIELDS, matchSegment, segmentCounts, summariseRules } from '../data/segments.js';
import { channelMatch } from '../data/metrics.js';
import { exportCsv } from '../components/ExportButton.jsx';
import { useAmp } from '../useAmp.jsx';
import { date, num, pct } from '../format.js';
import { fieldLabel, opLabel } from '../labels.js';

const OPTIONS = {
  ageBand: AGE_BANDS,
  gender: GENDERS,
  area: ['Shah Alam', 'Petaling Jaya', 'Kota Damansara', 'Subang Jaya', 'Klang'],
  childrenAgeBand: ['0–3', '4–6', '7–12', '13–17'],
  hasChildren: ['Yes', 'No'],
  interest: INTERESTS,
  leadType: LEAD_TYPES,
  asset: ASSETS.map((asset) => asset.name),
  activationType: [],
  source: SOURCE_CHANNELS,
  interestedRent: ['Yes', 'No'],
  legacy: ['Yes', 'No'],
};

function blank() {
  return {
    name: '',
    description: '',
    match: 'and',
    groups: [{ id: 'g1', match: 'and', conditions: [{ field: 'ageBand', op: 'eq', value: '25–34' }] }],
  };
}

function Compare({ rows }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 16, right: 16 }}>
          <CartesianGrid stroke="#E2E5EA" horizontal={false} />
          <XAxis type="number" domain={[0, 'auto']} tickFormatter={(value) => num(value)} />
          <YAxis type="category" dataKey="name" width={110} />
          <Tooltip formatter={(value) => num(value)} />
          <Legend />
          <Bar dataKey="value" name="Segment" fill="#E31E24" />
          <Bar dataKey="all" name="All profiles" fill="#D1D5DB" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Segments({ id }) {
  const amp = useAmp();
  const { segments, profiles, allActivations, scope, state, dispatch, route, assets, forms } = amp;
  const [table, setTable] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [compare, setCompare] = useState(false);
  const activationById = useMemo(() => new Map(allActivations.map((act) => [act.id, act])), [allActivations]);
  const people = useMemo(() => profiles.filter((profile) => !profile.anonymised && channelMatch(profile, scope.channels) && (scope.unrestricted || (profile.assetIds || []).some((assetId) => scope.assetIds.includes(assetId)))), [profiles, scope]);
  const counted = useMemo(() => segments.filter((segment) => !segment.deleted).map((segment) => ({ ...segment, ...segmentCounts(segment, people, activationById) })), [segments, people, activationById]);
  const current = id ? counted.find((segment) => segment.id === id) : null;
  const previewPeople = useMemo(() => people.filter((profile) => matchSegment(profile, draft, activationById)), [people, draft, activationById]);
  const previewCounts = segmentCounts({ ...draft, id: 'draft' }, people, activationById);
  const previewPack = useMemo(() => audiencePack(previewPeople, scope.from, scope.to, assets), [previewPeople, scope, assets]);

  const save = (andExport) => {
    const segment = {
      ...draft,
      id: draft.id || `SEG-L${state.seq}`,
      createdBy: draft.createdBy || 'Farah Idris',
      createdAt: draft.createdAt || state.now.slice(0, 10),
    };
    if (draft.id && segments.some((item) => item.id === draft.id)) dispatch({ type: 'patchSegment', id: draft.id, segment });
    else dispatch({ type: 'addSegment', segment });
    if (andExport && can(state.role, 'contacts.export')) exportConsented(segment);
    setOpen(false);
  };
  const exportConsented = (segment) => {
    const matched = people.filter((profile) => matchSegment(profile, segment, activationById));
    const rows = matched.filter((profile) => profile.consent?.marketingOptIn && !profile.consent.unknown);
    exportCsv({ filename: segment.name || 'segment', columns: [{ key: 'fullName', label: 'Name' }, { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' }, { key: 'area', label: 'Area' }], rows });
    dispatch({ type: 'audit', entry: auditEntry(state, 'Exported segment', 'Segment', segment.id, `Exported ${rows.length} consented contacts. ${matched.length - rows.length} excluded.`) });
  };
  const edit = (segment) => {
    setDraft(JSON.parse(JSON.stringify(segment)));
    setOpen(true);
  };
  const setGroup = (groupId, patch) => setDraft({ ...draft, groups: draft.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)) });

  if (current) {
    const members = people.filter((profile) => matchSegment(profile, current, activationById));
    const pack = audiencePack(members, scope.from, scope.to, assets);
    const all = audiencePack(people, scope.from, scope.to, assets);
    const merge = (rows, base) => rows.map((row) => ({ ...row, all: base.find((item) => item.name === row.name)?.value || 0 }));
    return (
      <section>
        <PageHead
          title={current.name}
          lede={summariseRules(current)}
          back={{ href: linkTo('segments', route.search), label: 'Segments' }}
          actions={(
            <>
              <button type="button" className="btn" onClick={() => edit(current)}>Edit</button>
              {can(state.role, 'contacts.export') && <button type="button" className="btn btn-primary" onClick={() => exportConsented(current)}>Export consented</button>}
            </>
          )}
        />
        <p className="summary-strip">{num(current.matching)} profiles · {num(current.consented)} with marketing consent</p>
        <label className="check-inline"><input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} /><span>Compared with all profiles</span></label>
        <div className="chart-grid">
          {[['Age band', pack.age, all.age], ['Household type', pack.household, all.household], ['Interests', pack.interests, all.interests], ['Areas', pack.areas, all.areas]].map(([title, rows, base]) => (
            <div className="span-6" key={title}>
              <ChartCard title={title} rows={merge(rows, base)} columns={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Segment', align: 'right', format: num }, { key: 'all', label: 'All profiles', align: 'right', format: num }]} exportName={title}>
                {compare ? <Compare rows={merge(rows, base)} /> : <Compare rows={rows.map((row) => ({ ...row, all: 0 }))} />}
              </ChartCard>
            </div>
          ))}
        </div>
        <ChartCard title="Captured via" rows={forms.map((form) => ({ name: form.publicTitle || form.name, value: members.filter((profile) => (profile.links || []).some((link) => link.activationId === form.activationId)).length })).filter((row) => row.value).sort((a, b) => b.value - a.value).slice(0, 6)} exportName="captured-via">
          <HBars data={forms.map((form) => ({ name: form.publicTitle || form.name, value: members.filter((profile) => (profile.links || []).some((link) => link.activationId === form.activationId)).length })).filter((row) => row.value).sort((a, b) => b.value - a.value).slice(0, 6)} />
        </ChartCard>
        <h2>Members</h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'area', label: 'Area' },
            { key: 'ageBand', label: 'Age band' },
            { key: 'mobile', label: 'Mobile', optional: true },
            { key: 'lastSeen', label: 'Last seen', format: date },
          ]}
          rows={members.map((profile) => ({ id: profile.id, name: profile.fullName, area: profile.area, ageBand: profile.ageBand, mobile: personal(profile, state.role, state.revealed, 'mobile'), lastSeen: profile.lastSeen }))}
          pageSizes={[25, 50, 100]}
          exportName="segment-members"
          onRowClick={(row) => { window.location.hash = linkTo(`profile/${row.id}`, route.search); }}
        />
        {open && builder()}
      </section>
    );
  }

  function builder() {
    return (
      <Drawer open={open} title={draft.id ? 'Edit segment' : 'New segment'} onClose={() => setOpen(false)} width={640}>
        <TextInput ariaLabel="Segment name" placeholder="Segment name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <TextInput ariaLabel="Description" placeholder="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
        <div className="seg-toggle" style={{ margin: '12px 0' }}>
          <span>Join groups with </span>
          <button type="button" className={draft.match === 'and' ? 'on' : ''} onClick={() => setDraft({ ...draft, match: 'and' })}>And</button>
          <button type="button" className={draft.match === 'or' ? 'on' : ''} onClick={() => setDraft({ ...draft, match: 'or' })}>Or</button>
        </div>
        {draft.groups.map((group, index) => (
          <div key={group.id}>
            {index > 0 && <p className="summary-strip">{draft.match === 'or' ? 'Or' : 'And'}</p>}
            <div className="rule-card">
              <div className="seg-toggle">
                <button type="button" className={group.match === 'and' ? 'on' : ''} onClick={() => setGroup(group.id, { match: 'and' })}>And</button>
                <button type="button" className={group.match === 'or' ? 'on' : ''} onClick={() => setGroup(group.id, { match: 'or' })}>Or</button>
              </div>
              {group.conditions.map((condition, conditionIndex) => {
                const meta = CONDITION_FIELDS.find((field) => field.id === condition.field) || CONDITION_FIELDS[0];
                const options = condition.field === 'asset'
                  ? assets.map((asset) => ({ id: asset.id, label: asset.name }))
                  : (OPTIONS[condition.field] || []).map((item) => ({ id: item, label: item }));
                return (
                  <div key={`${group.id}-${conditionIndex}`} className="filters">
                    <SelectInput ariaLabel="Field" value={condition.field} placeholder="Field" onChange={(field) => {
                      const next = group.conditions.slice();
                      next[conditionIndex] = { field, op: (CONDITION_FIELDS.find((item) => item.id === field)?.ops || ['eq'])[0], value: '' };
                      setGroup(group.id, { conditions: next });
                    }} options={CONDITION_FIELDS.map((field) => ({ id: field.id, label: field.label }))} />
                    <SelectInput ariaLabel="Operator" value={condition.op} placeholder="Operator" onChange={(op) => {
                      const next = group.conditions.slice();
                      next[conditionIndex] = { ...condition, op };
                      setGroup(group.id, { conditions: next });
                    }} options={meta.ops.map((op) => ({ id: op, label: opLabel(op) }))} />
                    {meta.kind === 'number' || meta.kind === 'date' ? (
                      <TextInput ariaLabel="Value" type={meta.kind === 'date' ? 'date' : 'number'} value={condition.value} onChange={(value) => {
                        const next = group.conditions.slice();
                        next[conditionIndex] = { ...condition, value };
                        setGroup(group.id, { conditions: next });
                      }} />
                    ) : (
                      <SelectInput ariaLabel="Value" value={condition.value} placeholder="Value" onChange={(value) => {
                        const next = group.conditions.slice();
                        next[conditionIndex] = { ...condition, value };
                        setGroup(group.id, { conditions: next });
                      }} options={options} />
                    )}
                  </div>
                );
              })}
              <button type="button" className="btn" onClick={() => setGroup(group.id, { conditions: [...group.conditions, { field: 'interest', op: 'includes', value: 'Fitness' }] })}>Add condition</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => setDraft({ ...draft, groups: [...draft.groups, { id: `g${draft.groups.length + 1}`, match: 'and', conditions: [{ field: 'area', op: 'eq', value: 'Shah Alam' }] }] })}>Add group</button>
        <p>{summariseRules(draft) || 'Add a rule to describe this segment.'}</p>
        <p className="summary-strip">{num(previewCounts.matching)} profiles · {num(previewCounts.consented)} with marketing consent</p>
        <ChartCard title="Age band" rows={previewPack.age} exportName="segment-preview-age"><Compare rows={previewPack.age.map((row) => ({ ...row, all: 0 }))} /></ChartCard>
        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={() => save(false)}>Save</button>
          {can(state.role, 'contacts.export') && <button type="button" className="btn" onClick={() => save(true)}>Save and export</button>}
        </div>
      </Drawer>
    );
  }

  return (
    <section>
      <PageHead
        title="Segments"
        lede="Saved groups of profiles."
        actions={(
          <>
            <button type="button" className="btn" onClick={() => setTable((value) => !value)}>{table ? 'Cards' : 'Table'}</button>
            <button type="button" className="btn btn-primary" onClick={() => { setDraft(blank()); setOpen(true); }}>New segment</button>
          </>
        )}
      />
      {table ? (
        <DataTable
          columns={[{ key: 'name', label: 'Name' }, { key: 'summary', label: 'Rule', wrap: true }, { key: 'matching', label: 'Profiles', align: 'right', format: num }, { key: 'consented', label: 'Consented', align: 'right', format: num }]}
          rows={counted.map((segment) => ({ ...segment, summary: summariseRules(segment) }))}
          onRowClick={(row) => { window.location.hash = linkTo(`segment/${row.id}`, route.search); }}
          exportName="segments"
          pageSizes={[25, 50, 100]}
        />
      ) : (
        <div className="chart-grid">
          {counted.map((segment) => (
            <article key={segment.id} className="span-4 segment-card">
              <h3>{segment.name}</h3>
              <p>{segment.description || summariseRules(segment)}</p>
              <p className="kpi-value">{num(segment.matching)}</p>
              <p>{num(segment.consented)} with marketing consent</p>
              <div className="util-bar"><span style={{ width: `${Math.round((segment.matching ? segment.consented / segment.matching : 0) * 100)}%` }} /></div>
              <p>{pct(segment.matching ? segment.consented / segment.matching : null)} consented</p>
              <p className="person-cell"><Avatar name={segment.createdBy} size={24} /> Updated {date(segment.createdAt)}</p>
              <div className="screen-actions">
                <a className="btn" href={linkTo(`segment/${segment.id}`, route.search)}>Open</a>
                <button type="button" className="btn" onClick={() => edit({ ...segment, id: undefined, name: `${segment.name} copy` })}>Duplicate</button>
                {can(state.role, 'contacts.export') && <button type="button" className="btn" onClick={() => exportConsented(segment)}>Export consented</button>}
                <button type="button" className="btn" onClick={() => dispatch({ type: 'patchSegment', id: segment.id, segment: { ...segment, deleted: true } })}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {builder()}
    </section>
  );
}
