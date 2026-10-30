import { useMemo, useState } from 'react';
import ChartCard from '../components/ChartCard.jsx';
import DataTable from '../components/DataTable.jsx';
import { GroupedBars, HBars } from '../components/Charts.jsx';
import { PageHead, SearchBox, auditEntry, linkTo } from '../components/bits.jsx';
import { can } from '../access.js';
import { SPEND_CATEGORIES } from '../data/config.js';
import { QUARTERS, safeDiv } from '../data/metrics.js';
import { scopedSpend } from '../data/selectors.js';
import { exportSheets } from '../components/ExportButton.jsx';
import { exportReportPdf } from '../reportPdf.js';
import { useAmp } from '../useAmp.jsx';
import { date, num, pct, rm } from '../format.js';

const QUARTER_SPEND = {
  Q1: ['2026-01-01', '2026-03-31'],
  Q2: ['2026-04-01', '2026-06-30'],
  Q3: ['2026-07-01', '2026-09-30'],
  Q4: ['2026-10-01', '2026-12-31'],
};

export default function Budget() {
  const { state, dispatch, scope, assets, spend, allActivations, byAsset, budgets, profiles, route } = useAmp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [draft, setDraft] = useState({ assetId: '', date: '2026-10-15', category: SPEND_CATEGORIES[0], vendor: '', description: '', amountRM: '', activationId: '', attachmentName: '' });
  const [editing, setEditing] = useState(null);
  const [windowStart, setWindowStart] = useState('2025-11');
  const [quarter, setQuarter] = useState('Q4');
  const [exportAssets, setExportAssets] = useState(() => scope.assetIds.slice());
  const editable = can(state.role, 'budget.edit');
  const spendEditable = can(state.role, 'spend.edit');
  const lines = useMemo(() => scopedSpend(spend, allActivations, scope), [spend, allActivations, scope]);
  const assetName = (id) => assets.find((asset) => asset.id === id)?.name || id;
  const actName = (id) => allActivations.find((act) => act.id === id)?.name || '';

  const grid = useMemo(() => scope.assets.filter((asset) => scope.assetIds.includes(asset.id)).map((asset) => {
    const row = { id: asset.id, asset: asset.name };
    QUARTERS.forEach((quarter) => {
      const budget = budgets.find((item) => item.assetId === asset.id && item.quarter === quarter.id && item.year === 2026);
      const [from, to] = QUARTER_SPEND[quarter.id];
      const actual = spend.filter((line) => line.assetId === asset.id && line.date >= from && line.date <= to).reduce((sum, line) => sum + line.amountRM, 0);
      const approved = budget?.approvedRM || 0;
      row[`${quarter.id}Approved`] = approved;
      row[`${quarter.id}Actual`] = actual;
      row[`${quarter.id}Diff`] = approved - actual;
      row[`${quarter.id}Util`] = safeDiv(actual, approved);
    });
    return row;
  }), [scope, budgets, spend]);

  const ledger = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lines.filter((line) => {
      if (category && line.category !== category) return false;
      if (vendor && line.vendor !== vendor) return false;
      if (!q) return true;
      return `${line.description} ${line.vendor} ${assetName(line.assetId)} ${actName(line.activationId)}`.toLowerCase().includes(q);
    }).map((line) => ({ ...line, asset: assetName(line.assetId), activation: actName(line.activationId) || '–' }));
  }, [lines, query, category, vendor, assets, allActivations]);

  const vendors = useMemo(() => [...new Set(lines.map((line) => line.vendor))].sort(), [lines]);
  const byCategory = useMemo(() => {
    const row = { month: 'Spend' };
    SPEND_CATEGORIES.forEach((name) => { row[name] = lines.filter((line) => line.category === name).reduce((sum, line) => sum + line.amountRM, 0); });
    return [row];
  }, [lines]);
  const byAssetChart = useMemo(() => byAsset.map((row) => ({ month: assets.find((asset) => asset.id === row.id)?.shortCode || row.asset, Spend: row.ampSpend })), [byAsset, assets]);

  const saveBudget = (assetId, quarter, value) => {
    dispatch({ type: 'budget', key: `2026|${assetId}|${quarter}`, amount: Number(value) || 0 });
  };
  const addLine = (event) => {
    event.preventDefault();
    const id = `SP-L${state.seq}`;
    dispatch({
      type: 'addSpend',
      line: {
        id,
        activationId: draft.activationId || null,
        assetId: draft.assetId || scope.assetIds[0],
        date: draft.date,
        category: draft.category,
        vendor: draft.vendor,
        description: draft.description,
        amountRM: Number(draft.amountRM) || 0,
        enteredBy: 'Farah Idris',
        attachmentName: draft.attachmentName,
        channel: draft.category === 'Paid media' ? 'Facebook' : '',
      },
    });
    setDraft({ ...draft, vendor: '', description: '', amountRM: '', attachmentName: '' });
  };
  const saveEdit = (event) => {
    event.preventDefault();
    dispatch({ type: 'patchSpend', id: editing.id, patch: { ...editing, amountRM: Number(editing.amountRM) || 0 } });
    setEditing(null);
  };

  const justification = () => {
    const from = `${windowStart}-01`;
    const end = new Date(`${windowStart}-01T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 11);
    const to = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-31`;
    const chosen = new Set(exportAssets);
    const acts = allActivations.filter((act) => chosen.has(act.assetId) && act.endDate >= from && act.startDate <= to);
    const money = spend.filter((line) => chosen.has(line.assetId) && line.date >= from && line.date <= to);
    const people = profiles.filter((profile) => (profile.assetIds || []).some((id) => chosen.has(id)) && profile.firstSeen >= from && profile.firstSeen <= to);
    return { from, to, acts, money, people };
  };
  const exportPdf = () => {
    const pack = justification();
    exportReportPdf({
      filename: 'amp-budget-justification.pdf',
      title: 'AMP budget justification',
      subtitle: `${pack.from} to ${pack.to}`,
      sections: [
        { heading: 'Spend by category', columns: [{ label: 'Category', key: 'category' }, { label: 'Amount', key: 'amount' }], rows: SPEND_CATEGORIES.map((name) => ({ category: name, amount: rm(pack.money.filter((line) => line.category === name).reduce((sum, line) => sum + line.amountRM, 0)) })) },
        { heading: 'Activations', lines: [`Activations in window: ${pack.acts.length}`, `Attendance: ${num(pack.acts.reduce((sum, act) => sum + (act.outcomes?.totalAttendance || 0), 0))}`, `New profiles: ${num(pack.people.length)}`] },
      ],
    });
  };
  const exportExcel = () => {
    const pack = justification();
    exportSheets({
      filename: 'amp-budget-justification',
      sheets: [
        { name: 'Spend', columns: [{ label: 'Category', key: 'category' }, { label: 'Amount', key: 'amountRM' }], rows: SPEND_CATEGORIES.map((name) => ({ category: name, amountRM: pack.money.filter((line) => line.category === name).reduce((sum, line) => sum + line.amountRM, 0) })) },
        { name: 'Activations', columns: [{ label: 'Name', key: 'name' }, { label: 'Attendance', key: 'attendance' }], rows: pack.acts.map((act) => ({ name: act.name, attendance: act.outcomes?.totalAttendance || 0 })) },
      ],
    });
  };

  const quarterColumns = [
    { key: `${quarter}Approved`, label: 'Approved', align: 'right', format: (value, row) => (!row || !editable ? rm(value) : <span className="money-input"><span>RM</span><input className="control" aria-label={`${row.asset} ${quarter} approved`} defaultValue={value} onClick={(event) => event.stopPropagation()} onBlur={(event) => saveBudget(row.id, quarter, event.target.value.replace(/[^\d]/g, ''))} /></span>) },
    { key: `${quarter}Actual`, label: 'Spend', align: 'right', format: rm },
    { key: `${quarter}Diff`, label: 'Difference', align: 'right', format: rm },
    { key: `${quarter}Util`, label: 'Utilisation', align: 'right', format: (value) => <span className="util-cell"><span className="util-bar"><span style={{ width: `${Math.min(100, Math.round((Number(value) || 0) * 100))}%` }} /></span> {pct(value)}</span> },
  ];

  return (
    <section>
      <PageHead title="Budget & Spend" lede="Approved AMP budget against spend lines." actions={<a className="btn" href={linkTo('reports', route.search)}>Open reports</a>} />
      <div className="section-head">
        <h2>Approved budget by quarter</h2>
        <div className="segmented" role="tablist" aria-label="Quarter">{QUARTERS.map((item) => <button key={item.id} type="button" className={quarter === item.id ? 'on' : ''} onClick={() => setQuarter(item.id)}>{item.id}</button>)}</div>
      </div>
      <DataTable columns={[{ key: 'asset', label: 'Asset' }, ...quarterColumns]} rows={grid} exportName="amp-budget-grid" empty="No assets in this filter." />
      <div className="chart-grid">
        <div className="span-6">
          <ChartCard title="Spend by category" rows={SPEND_CATEGORIES.map((name) => ({ name, value: byCategory[0][name] || 0 }))} exportName="spend-category">
            <HBars money data={SPEND_CATEGORIES.map((name) => ({ name, value: byCategory[0][name] || 0 }))} />
          </ChartCard>
        </div>
        <div className="span-6">
          <ChartCard title="Spend by asset" rows={byAssetChart.map((row) => ({ name: row.month, value: row.Spend }))} exportName="spend-asset">
            <HBars money data={byAsset.map((row) => ({ name: row.asset, value: row.ampSpend, colour: row.colour }))} />
          </ChartCard>
        </div>
        <div className="span-12">
          <ChartCard title="Budget and actual by asset" rows={byAsset.map((row) => ({ name: row.asset, Budget: row.budget, Actual: row.ampSpend }))} columns={[{ key: 'name', label: 'Asset' }, { key: 'Budget', label: 'Approved', align: 'right', format: rm }, { key: 'Actual', label: 'Actual', align: 'right', format: rm }]} exportName="budget-vs-actual" footer={<ul className="code-key">{assets.map((asset) => <li key={asset.id}><strong>{asset.shortCode}</strong> {asset.name}</li>)}</ul>}>
            <GroupedBars money categoryKey="name" data={byAsset.map((row) => ({ name: assets.find((asset) => asset.id === row.id)?.shortCode || row.asset, Budget: row.budget, Actual: row.ampSpend }))} bars={[{ key: 'Budget', name: 'Approved', colour: '#64748B' }, { key: 'Actual', name: 'Actual', colour: '#E31E24' }]} />
          </ChartCard>
        </div>
      </div>
      <h2>Outcome per ringgit</h2>
      <DataTable
        columns={[
          { key: 'asset', label: 'Asset' },
          { key: 'ampSpend', label: 'AMP spend', align: 'right', format: rm },
          { key: 'attendance', label: 'Attendance', align: 'right', format: num },
          { key: 'newProfiles', label: 'New profiles', align: 'right', format: num },
          { key: 'consented', label: 'Consented profiles', align: 'right', format: num },
          { key: 'tenantLeads', label: 'Prospective tenant leads', align: 'right', format: num },
          { key: 'buyerLeads', label: 'Prospective buyer leads', align: 'right', format: num },
          { key: 'costPerAttendee', label: 'Cost per attendee', align: 'right', format: rm },
          { key: 'costPerNewProfile', label: 'Cost per new profile', align: 'right', format: rm },
          { key: 'costTenant', label: 'Cost per prospective tenant lead', align: 'right', format: (value, row) => rm(row.tenantLeads ? row.ampSpend / row.tenantLeads : null) },
        ]}
        rows={byAsset.map((row) => ({ ...row, costTenant: row.tenantLeads ? row.ampSpend / row.tenantLeads : null }))}
        exportName="outcome-per-ringgit"
        empty="No assets in this filter."
      />
      <h2>Spend ledger</h2>
      <div className="table-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Search spend" />
        <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {SPEND_CATEGORIES.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select aria-label="Vendor" value={vendor} onChange={(event) => setVendor(event.target.value)}>
          <option value="">All vendors</option>
          {vendors.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>
      {spendEditable && (
        <form className="dialog-form" onSubmit={editing ? saveEdit : addLine}>
          <label>Asset
            <select value={editing ? editing.assetId : draft.assetId} onChange={(event) => (editing ? setEditing({ ...editing, assetId: event.target.value }) : setDraft({ ...draft, assetId: event.target.value }))}>
              {assets.filter((asset) => scope.assetIds.includes(asset.id)).map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
          </label>
          <label>Date<input type="date" value={(editing ? editing.date : draft.date) || ''} onChange={(event) => (editing ? setEditing({ ...editing, date: event.target.value }) : setDraft({ ...draft, date: event.target.value }))} /></label>
          <label>Category
            <select value={editing ? editing.category : draft.category} onChange={(event) => (editing ? setEditing({ ...editing, category: event.target.value }) : setDraft({ ...draft, category: event.target.value }))}>
              {SPEND_CATEGORIES.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label>Vendor<input required value={editing ? editing.vendor : draft.vendor} onChange={(event) => (editing ? setEditing({ ...editing, vendor: event.target.value }) : setDraft({ ...draft, vendor: event.target.value }))} /></label>
          <label>Description<input required value={editing ? editing.description : draft.description} onChange={(event) => (editing ? setEditing({ ...editing, description: event.target.value }) : setDraft({ ...draft, description: event.target.value }))} /></label>
          <label>Amount (RM)<input required type="number" value={editing ? editing.amountRM : draft.amountRM} onChange={(event) => (editing ? setEditing({ ...editing, amountRM: event.target.value }) : setDraft({ ...draft, amountRM: event.target.value }))} /></label>
          <label>Attachment name<input value={editing ? editing.attachmentName || '' : draft.attachmentName} onChange={(event) => (editing ? setEditing({ ...editing, attachmentName: event.target.value }) : setDraft({ ...draft, attachmentName: event.target.value }))} /></label>
          <button type="submit" className="btn">{editing ? 'Save spend line' : 'Add spend line'}</button>
          {editing && <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>}
        </form>
      )}
      <DataTable
        columns={[
          { key: 'date', label: 'Date', format: date },
          { key: 'asset', label: 'Asset' },
          { key: 'activation', label: 'Activation' },
          { key: 'category', label: 'Category' },
          { key: 'vendor', label: 'Vendor' },
          { key: 'description', label: 'Description' },
          { key: 'amountRM', label: 'Amount', align: 'right', format: rm, total: 'sum' },
          { key: 'attachmentName', label: 'Attachment' },
          ...(spendEditable ? [{ key: 'actions', label: 'Actions', format: (_value, row) => (row ? <button type="button" className="btn" onClick={(event) => { event.stopPropagation(); dispatch({ type: 'deleteSpend', id: row.id }); dispatch({ type: 'audit', entry: auditEntry(state, 'Edited activation', 'Spend', row.id, `Deleted spend line ${row.id}`) }); }}>Delete</button> : null) }] : []),
        ]}
        rows={ledger}
        totals
        exportName="amp-spend-ledger"
        pageSizes={[25, 50, 100]}
        empty="No spend lines in this filter."
        onRowClick={spendEditable ? (row) => setEditing({ ...row }) : undefined}
      />
      <h2>Budget justification export</h2>
      <form className="dialog-form" onSubmit={(event) => event.preventDefault()}>
        <label>Window start<input type="month" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} /></label>
        <fieldset>
          <legend>Assets</legend>
          {assets.filter((asset) => scope.allowed.includes(asset.id)).map((asset) => (
            <label key={asset.id} className="check-inline">
              <input type="checkbox" checked={exportAssets.includes(asset.id)} onChange={(event) => setExportAssets((current) => (event.target.checked ? [...current, asset.id] : current.filter((id) => id !== asset.id)))} />
              <span>{asset.name}</span>
            </label>
          ))}
        </fieldset>
        <button type="button" className="btn" onClick={exportPdf}>Export PDF</button>
        <button type="button" className="btn" onClick={exportExcel}>Export Excel</button>
      </form>
    </section>
  );
}
