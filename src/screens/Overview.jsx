import DataTable from '../components/DataTable.jsx';
import Kpi from '../components/Kpi.jsx';
import { StackedArea, StackedBars, TrendChart } from '../components/Charts.jsx';
import { PageHead, Status, linkTo } from '../components/bits.jsx';
import { SOURCE_CHANNELS } from '../data/config.js';
import { useAmp } from '../useAmp.jsx';
import { date, dec1, num, pct, rm } from '../format.js';

function prev(value, format) {
  return `Prev: ${format ? format(value) : num(value)}`;
}

export default function Overview() {
  const { route, kpis, prev: previous, formulas, monthly, spendMonthly, spendCategories, growth, byAsset, upcoming, awaiting, operators } = useAmp();
  const search = route.search;
  const operatorName = (id) => operators.find((item) => item.id === id)?.name || 'PKNS-run';
  void operatorName;
  const columns = [
    { key: 'asset', label: 'Asset' },
    { key: 'operator', label: 'Operator' },
    { key: 'activationsCompleted', label: 'Activations', align: 'right', total: 'sum' },
    { key: 'ampSpend', label: 'AMP spend', align: 'right', format: rm, total: 'sum' },
    { key: 'attendance', label: 'Attendance', align: 'right', format: num, total: 'sum' },
    { key: 'newProfiles', label: 'New profiles', align: 'right', format: num, total: 'sum' },
    { key: 'returningProfiles', label: 'Returning profiles', align: 'right', format: num, total: 'sum' },
    { key: 'costPerAttendee', label: 'Cost per attendee', align: 'right', format: rm, total: (rows) => {
      const spend = rows.reduce((sum, row) => sum + (row.activationSpend || 0), 0);
      const attendance = rows.reduce((sum, row) => sum + (row.attendance || 0), 0);
      return attendance ? spend / attendance : null;
    } },
    { key: 'costPerNewProfile', label: 'Cost per new profile', align: 'right', format: rm, total: (rows) => {
      const spend = rows.reduce((sum, row) => sum + (row.ampSpend || 0), 0);
      const fresh = rows.reduce((sum, row) => sum + (row.newProfiles || 0), 0);
      return fresh ? spend / fresh : null;
    } },
    { key: 'avgRating', label: 'Avg rating', align: 'right', format: (value) => dec1(value) },
    { key: 'budget', label: 'Budget', align: 'right', format: rm, total: 'sum' },
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
        <Kpi label="Consented for marketing" formula={formulas.consented} value={kpis.consented} format={() => `${num(kpis.consented)} (${pct(kpis.consentPct)})`} sub={`Prev: ${num(previous.consented)} (${pct(previous.consentPct)})`} href={linkTo('audience', search, { consent: 'yes' })} />
        <Kpi label="Cost per attendee" formula={formulas.costAttendee} value={kpis.costPerAttendee} format={rm} sub={prev(previous.costPerAttendee, rm)} href={linkTo('activations', search)} />
        <Kpi label="Cost per new profile" formula={formulas.costProfile} value={kpis.costPerNewProfile} format={rm} sub={prev(previous.costPerNewProfile, rm)} href={linkTo('audience', search, { arrived: '1' })} />
      </div>
      <div className="chart-grid">
        <div>
          <h2>Attendance and new profiles</h2>
          <TrendChart data={monthly} lines={[{ key: 'attendance', name: 'Attendance' }, { key: 'newProfiles', name: 'New profiles' }]} />
        </div>
        <div>
          <h2>AMP spend by category</h2>
          <StackedBars data={spendMonthly} keys={spendCategories} money />
        </div>
      </div>
      <h2>By asset</h2>
      <DataTable columns={columns} rows={byAsset} totals exportName="amp-by-asset" onRowClick={(row) => { window.location.hash = linkTo(`asset/${row.id}`, search); }} />
      <div className="split">
        <div>
          <h2>Upcoming activations</h2>
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'asset', label: 'Asset' },
              { key: 'when', label: 'Date' },
              { key: 'status', label: 'Status', format: (value) => <Status value={value} /> },
              { key: 'budget', label: 'Budget', align: 'right', format: rm },
            ]}
            rows={upcoming.map((act) => ({ id: act.id, name: act.name, asset: byAsset.find((row) => row.id === act.assetId)?.asset || act.assetId, when: date(act.startDate), status: act.status, budget: act.budget }))}
            exportName="upcoming-activations"
            onRowClick={(row) => { window.location.hash = linkTo(`activation/${row.id}`, search); }}
            empty="No activations in the next 30 days."
          />
        </div>
        <div>
          <h2>Completed, not reported</h2>
          <DataTable
            columns={[{ key: 'name', label: 'Name' }, { key: 'end', label: 'End date' }, { key: 'status', label: 'Status' }]}
            rows={awaiting.map((act) => ({ id: act.id, name: act.name, end: date(act.endDate), status: act.status }))}
            exportName="awaiting-report"
            onRowClick={(row) => { window.location.hash = linkTo(`activation/${row.id}`, search); }}
            empty="No completed activations are waiting for a report."
          />
        </div>
      </div>
      <h2>Database growth by source channel</h2>
      <StackedArea data={growth} keys={SOURCE_CHANNELS} />
    </section>
  );
}
