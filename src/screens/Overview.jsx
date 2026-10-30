import ChartCard from '../components/ChartCard.jsx';
import DataTable from '../components/DataTable.jsx';
import Kpi from '../components/Kpi.jsx';
import { StackedArea, StackedBars, TrendChart } from '../components/Charts.jsx';
import { PageHead, Status, auditEntry, linkTo } from '../components/bits.jsx';
import { can } from '../access.js';
import { SOURCE_CHANNELS } from '../data/config.js';
import { useAmp } from '../useAmp.jsx';
import { date, dec1, num, pct, rm } from '../format.js';
import { activationTitle } from '../labels.js';

function prev(value, format) {
  return `Prev: ${format ? format(value) : num(value)}`;
}

export default function Overview() {
  const { route, kpis, prev: previous, formulas, monthly, spendMonthly, spendCategories, growth, byAsset, upcoming, awaiting, operators, state, dispatch, assets } = useAmp();
  const search = route.search;
  const operatorName = (id) => operators.find((item) => item.id === id)?.name || 'PKNS-run';
  void operatorName;
  const columns = [
    { key: 'asset', label: 'Asset', format: (value, row) => <span>{value}<span className="fine" style={{ display: 'block' }}>{row?.operator}</span></span> },
    { key: 'operator', label: 'Operator', optional: true },
    { key: 'activationsCompleted', label: 'Activations', align: 'right', total: 'sum' },
    { key: 'ampSpend', label: 'AMP spend', align: 'right', format: rm, total: 'sum' },
    { key: 'attendance', label: 'Attendance', align: 'right', format: num, total: 'sum' },
    { key: 'newProfiles', label: 'New profiles', align: 'right', format: num, total: 'sum' },
    { key: 'returningProfiles', label: 'Returning profiles', align: 'right', format: num, total: 'sum', optional: true },
    { key: 'costPerAttendee', label: 'Cost per attendee', align: 'right', format: rm, total: (rows) => {
      const spend = rows.reduce((sum, row) => sum + (row.activationSpend || 0), 0);
      const attendance = rows.reduce((sum, row) => sum + (row.attendance || 0), 0);
      return attendance ? spend / attendance : null;
    } },
    { key: 'costPerNewProfile', label: 'Cost per new profile', align: 'right', optional: true, format: rm, total: (rows) => {
      const spend = rows.reduce((sum, row) => sum + (row.ampSpend || 0), 0);
      const fresh = rows.reduce((sum, row) => sum + (row.newProfiles || 0), 0);
      return fresh ? spend / fresh : null;
    } },
    { key: 'avgRating', label: 'Avg rating', align: 'right', optional: true, format: (value) => dec1(value) },
    { key: 'budget', label: 'Budget', align: 'right', optional: true, format: rm, total: 'sum' },
    { key: 'utilisation', label: 'Budget utilisation', align: 'right', format: pct, total: (rows) => {
      const spend = rows.reduce((sum, row) => sum + (row.budget ? row.utilisation * row.budget : 0), 0);
      const budget = rows.reduce((sum, row) => sum + (row.budget || 0), 0);
      return budget ? spend / budget : null;
    } },
  ];
  return (
    <section>
      <PageHead title="Overview" lede="AMP spend, attendance and audience for the selected period." />
      <div className="kpi-row">
        <Kpi label="AMP spend" formula={formulas.ampSpend} value={kpis.ampSpend} format={rm} sub={prev(previous.ampSpend, rm)} href={linkTo('budget', search)} />
        <Kpi label="Activations completed" formula={formulas.activations} value={kpis.activationsCompleted} format={num} sub={prev(previous.activationsCompleted, num)} href={linkTo('activations', search, { done: '1' })} />
        <Kpi label="Total attendance" formula={formulas.attendance} value={kpis.attendance} format={num} sub={prev(previous.attendance, num)} href={linkTo('activations', search)} />
        <Kpi label="New profiles" formula={formulas.newProfiles} value={kpis.newProfiles} format={num} sub={prev(previous.newProfiles, num)} href={linkTo('audience', search, { arrived: '1' })} />
        <Kpi label="Database size" formula={formulas.database} value={kpis.database} format={num} sub={`Prev: ${num(kpis.databaseAtStart)}`} href={linkTo('audience', search, { stock: '1' })} />
        <Kpi label="Consented for marketing" formula={formulas.consented} value={kpis.consented} format={num} sub={`${pct(kpis.consentPct)} of the database · Prev: ${num(previous.consented)}`} href={state.role === 'management' ? undefined : linkTo('audience', search, { consent: 'yes' })} />
        <Kpi label="Cost per attendee" formula={formulas.costAttendee} value={kpis.costPerAttendee} format={rm} sub={prev(previous.costPerAttendee, rm)} href={linkTo('activations', search)} />
        <Kpi label="Cost per new profile" formula={formulas.costProfile} value={kpis.costPerNewProfile} format={rm} sub={prev(previous.costPerNewProfile, rm)} href={linkTo('audience', search, { arrived: '1' })} />
      </div>
      <div className="chart-grid">
        <div className="span-6">
          <ChartCard title="Attendance" rows={monthly.map((row) => ({ id: row.month, name: row.month, value: row.attendance }))} exportName="attendance-by-month">
            <TrendChart data={monthly} lines={[{ key: 'attendance', name: 'Attendance', colour: '#E31E24' }]} />
          </ChartCard>
        </div>
        <div className="span-6">
          <ChartCard title="New profiles" rows={monthly.map((row) => ({ id: row.month, name: row.month, value: row.newProfiles }))} exportName="new-profiles-by-month">
            <TrendChart data={monthly} lines={[{ key: 'newProfiles', name: 'New profiles', colour: '#1F6FEB' }]} />
          </ChartCard>
        </div>
        <div className="span-12">
          <ChartCard title="AMP spend by category" rows={spendMonthly} columns={[{ key: 'month', label: 'Month' }, ...spendCategories.map((name) => ({ key: name, label: name, align: 'right', format: rm }))]} exportName="spend-by-category">
            <StackedBars data={spendMonthly} keys={spendCategories} money />
          </ChartCard>
        </div>
      </div>
      <h2>By asset</h2>
      <DataTable columns={columns} rows={byAsset} totals exportName="amp-by-asset" onRowClick={(row) => { window.location.hash = linkTo(`asset/${row.id}`, search); }} />
      <div className="chart-grid">
        <div className="span-6">
          <article className="info-card">
            <h2>Upcoming activations</h2>
            <ul className="upcoming-list">
              {upcoming.slice(0, 8).map((act) => {
                const when = date(act.startDate).split(' ');
                const assetRow = byAsset.find((row) => row.id === act.assetId) || assets.find((item) => item.id === act.assetId);
                return (
                  <li key={act.id}>
                    <div className="date-block"><strong>{when[0]}</strong><span>{when[1]}</span></div>
                    <a className="upcoming-main" href={linkTo(`activation/${act.id}`, search)}>
                      <strong>{activationTitle(act.name)}</strong>
                      <span><i className="asset-dot" style={{ background: assetRow?.colour || '#64748B' }} /> {assetRow?.asset || assetRow?.name || 'Asset'}</span>
                    </a>
                    <Status value={act.status} />
                    <span className="upcoming-budget">{rm(act.budget)}</span>
                  </li>
                );
              })}
            </ul>
            {upcoming.length === 0 && <p>No upcoming activations in this filter.</p>}
          </article>
        </div>
        <div className="span-6">
          <article className="info-card">
            <h2>Completed, not reported</h2>
            <ul className="report-list">
              {awaiting.slice(0, 8).map((act) => {
                const when = date(act.endDate).split(' ');
                const assetRow = byAsset.find((row) => row.id === act.assetId);
                return (
                  <li key={act.id}>
                    <div className="date-block"><strong>{when[0]}</strong><span>{when[1]}</span></div>
                    <a className="upcoming-main" href={linkTo(`activation/${act.id}`, search)}>
                      <strong>{activationTitle(act.name)}</strong>
                      <span><i className="asset-dot" style={{ background: assetRow?.colour || '#64748B' }} /> {assetRow?.asset || 'Asset'}</span>
                    </a>
                    <Status value={act.status} />
                    {can(state.role, 'activation.report') ? (
                      <button type="button" className="btn btn-quiet" onClick={() => { dispatch({ type: 'patchActivation', id: act.id, patch: { status: 'Reported' } }); dispatch({ type: 'audit', entry: auditEntry(state, 'Edited activation', 'Activation', act.id, 'Marked as reported') }); }}>Mark reported</button>
                    ) : <span />}
                  </li>
                );
              })}
            </ul>
            {awaiting.length === 0 && <p>No completed activations are waiting for a report.</p>}
          </article>
        </div>
      </div>
      <ChartCard title="Database growth by source channel" rows={growth} columns={[{ key: 'month', label: 'Month' }, ...SOURCE_CHANNELS.map((name) => ({ key: name, label: name, align: 'right', format: num }))]} exportName="database-growth">
        <StackedArea data={growth} keys={SOURCE_CHANNELS} />
      </ChartCard>
    </section>
  );
}
