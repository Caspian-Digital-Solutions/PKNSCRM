import { useMemo, useState } from 'react';
import ChartCard from '../components/ChartCard.jsx';
import { Donut, HBars, VBars } from '../components/Charts.jsx';
import DataTable from '../components/DataTable.jsx';
import Kpi from '../components/Kpi.jsx';
import { QrPreview } from '../components/QrArt.jsx';
import { PageHead, SampleBadge, Status, auditEntry, linkTo } from '../components/bits.jsx';
import { can } from '../access.js';
import { SPEND_CATEGORIES } from '../data/config.js';
import { useAmp } from '../useAmp.jsx';
import { date, dec1, num, pct, rm } from '../format.js';
import { exportReportPdf } from '../reportPdf.js';
import { exportSheets } from '../components/ExportButton.jsx';

const TABS = ['Summary', 'Spend', 'Capture', 'Audience', 'Feedback', 'Report'];

function counts(rows, key, list) {
  return (list || [...new Set(rows.map((row) => row[key]).flat().filter(Boolean))]).map((name) => ({
    name,
    count: rows.filter((row) => Array.isArray(row[key]) ? row[key].includes(name) : row[key] === name).length,
  }));
}

export default function ActivationDetail({ id }) {
  const amp = useAmp();
  const { allActivations, activations, spend, forms, profiles, assets, qrCodes, state, dispatch, route } = amp;
  const act = allActivations.find((item) => item.id === id) || activations.find((item) => item.id === id);
  const [tab, setTab] = useState('Summary');
  const [line, setLine] = useState({ category: SPEND_CATEGORIES[0], vendor: '', description: '', amountRM: '', date: act?.startDate || '2026-10-28' });
  const asset = assets.find((item) => item.id === act?.assetId);
  const form = forms.find((item) => item.id === act?.formId);
  const lines = spend.filter((item) => item.activationId === id);
  const actual = lines.reduce((sum, item) => sum + item.amountRM, 0);
  const attendees = useMemo(() => (act ? profiles.filter((profile) => (profile.links || []).some((link) => link.activationId === act.id)) : []), [profiles, act]);
  if (!act) return <p>Activation not found.</p>;
  const editable = can(state.role, 'activation.edit') && (state.role !== 'operator' || act.runBy === 'Operator');
  const outcomes = act.outcomes || {};
  const saveSpend = (event) => {
    event.preventDefault();
    dispatch({
      type: 'addSpend',
      line: {
        id: `SP-L${state.seq}`,
        activationId: act.id,
        assetId: act.assetId,
        date: line.date,
        category: line.category,
        vendor: line.vendor,
        description: line.description,
        amountRM: Number(line.amountRM) || 0,
        enteredBy: 'Farah Idris',
        channel: '',
      },
    });
    dispatch({ type: 'audit', entry: auditEntry(state, 'Edited activation', 'Activation', act.id, 'Added a spend line') });
    setLine({ ...line, vendor: '', description: '', amountRM: '' });
  };
  const reportSections = () => ([
    { heading: 'Activation', lines: [`${act.name}`, `${asset?.name || ''} · ${act.startDate} to ${act.endDate}`, `Status ${act.status}`] },
    { heading: 'Budget and spend', lines: [`Budget ${rm(act.budget)}`, `Actual ${rm(actual)}`, `Difference ${rm(actual - act.budget)}`] },
    { heading: 'Outcomes', lines: [`Attendance ${num(outcomes.totalAttendance)}`, `New profiles ${num(outcomes.newProfiles)}`, `Returning ${num(outcomes.returningProfiles)}`, `Average rating ${dec1(outcomes.avgRating)}`] },
  ]);
  return (
    <section>
      <PageHead title={act.name} lede={`${asset?.name || ''} · ${act.specificLocation || 'Location not set'}`} back={{ href: linkTo('activations', route.search), label: 'Activations' }} actions={<><Status value={act.status} /><span>{act.runBy}</span></>} />
      <div className="tabs">
        {TABS.map((item) => <button key={item} type="button" className={tab === item ? 'on' : ''} onClick={() => setTab(item)}>{item}</button>)}
      </div>
      {tab === 'Summary' && (
        <>
        <div className="kpi-row">
          <Kpi label="Budget" value={act.budget} format={rm} />
          <Kpi label="Actual spend" value={actual} format={rm} />
          <Kpi label="Difference" value={actual - act.budget} format={rm} />
          <Kpi label="Attendance" value={outcomes.totalAttendance} format={num} />
          <Kpi label="Registrations" value={outcomes.registrations} format={num} />
          <Kpi label="New profiles" value={outcomes.newProfiles} format={num} />
          <Kpi label="Returning" value={outcomes.returningProfiles} format={num} />
          <Kpi label="Avg rating" value={outcomes.avgRating} format={dec1} />
        </div>
        <div className="fact-grid">
          <div><div className="fact-label">Run by</div><div className="fact-value">{act.runBy}</div></div>
          <div><div className="fact-label">Type</div><div className="fact-value">{act.type}</div></div>
          <div><div className="fact-label">Objective</div><div className="fact-value">{act.objective}</div></div>
          <div><div className="fact-label">Dates</div><div className="fact-value">{date(act.startDate)} – {date(act.endDate)}</div></div>
          <div><div className="fact-label">Budget</div><div className="fact-value">{rm(act.budget)}</div></div>
          <div><div className="fact-label">Actual spend</div><div className="fact-value">{rm(actual)}</div></div>
          <div><div className="fact-label">Difference</div><div className="fact-value">{rm(actual - act.budget)}</div></div>
          <div><div className="fact-label">Attendance</div><div className="fact-value">{num(outcomes.totalAttendance)}</div></div>
          <div><div className="fact-label">Registrations</div><div className="fact-value">{num(outcomes.registrations)}</div></div>
          <div><div className="fact-label">New profiles</div><div className="fact-value">{num(outcomes.newProfiles)}</div></div>
          <div><div className="fact-label">Returning profiles</div><div className="fact-value">{num(outcomes.returningProfiles)}</div></div>
          <div><div className="fact-label">Average rating</div><div className="fact-value">{dec1(outcomes.avgRating)}</div></div>
          <p>{act.description}</p>
          {can(state.role, 'activation.status') && (
            <label>Status
              <select value={act.status} onChange={(event) => dispatch({ type: 'patchActivation', id: act.id, patch: { status: event.target.value } })}>
                {['Planned', 'Approved', 'Live', 'Completed', 'Reported'].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          )}
        </div>
        <ChartCard title="Budget and actual" rows={[{ name: 'Budget', value: act.budget }, { name: 'Actual', value: actual }]} exportName={`${act.id}-budget`}>
          <VBars data={[{ name: 'Budget', value: act.budget }, { name: 'Actual', value: actual }]} />
        </ChartCard>
        </>
      )}
      {tab === 'Spend' && (
        <>
          <DataTable
            columns={[
              { key: 'date', label: 'Date', format: date },
              { key: 'category', label: 'Category' },
              { key: 'vendor', label: 'Vendor' },
              { key: 'description', label: 'Description' },
              { key: 'amountRM', label: 'Amount', align: 'right', format: rm, total: 'sum' },
            ]}
            rows={lines}
            totals
            exportName={`spend-${act.id}`}
          />
          {editable && can(state.role, 'spend.edit') && (
            <form className="stack-form" onSubmit={saveSpend}>
              <label>Date<input type="date" value={line.date} onChange={(event) => setLine({ ...line, date: event.target.value })} /></label>
              <label>Category<select value={line.category} onChange={(event) => setLine({ ...line, category: event.target.value })}>{SPEND_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Vendor<input value={line.vendor} onChange={(event) => setLine({ ...line, vendor: event.target.value })} /></label>
              <label>Description<input value={line.description} onChange={(event) => setLine({ ...line, description: event.target.value })} /></label>
              <label>Amount<input type="number" min="0" value={line.amountRM} onChange={(event) => setLine({ ...line, amountRM: event.target.value })} /></label>
              <button className="btn" type="submit">Add spend</button>
            </form>
          )}
        </>
      )}
      {tab === 'Capture' && (
        <>
          <div className="screen-actions">
            <a className="btn btn-primary" href={linkTo('form/new', route.search, { tpl: 'tpl-family' })}>Create form</a>
            <a className="btn" href={linkTo('forms', route.search, { tab: 'qr', create: 'qr' })}>Create QR code</a>
            {form && <a className="btn" href={`#/kiosk/${form.id}`}>Open kiosk mode</a>}
          </div>
          <div className="chart-grid">
            {(forms.filter((item) => item.activationId === act.id)).map((item) => (
              <a key={item.id} className="span-4 info-card" href={linkTo(`form/${item.id}`, route.search)}>
                <strong>{item.publicTitle || item.name}</strong>
                <p><Status value={item.status} /></p>
                <p>{num(item.submissionsCount)} submissions · {pct(item.completionRate)}</p>
              </a>
            ))}
            {qrCodes.filter((qr) => qr.activationId === act.id).map((qr) => (
              <a key={qr.id} className="span-4 info-card" href={linkTo(`qr/${qr.id}`, route.search)}>
                <QrPreview value={qr.targetUrl?.startsWith('#') ? `${window.location.origin}${window.location.pathname}${qr.targetUrl}` : qr.targetUrl} style={qr.style} size={88} canvasId={`cap-${qr.id}`} />
                <strong>{qr.touchpoint}</strong>
                <p>{num(qr.scans)} scans · {num(qr.submissions)} submissions</p>
              </a>
            ))}
          </div>
          <ChartCard title="Submissions by hour" rows={(outcomes.hourly || []).map((row) => ({ name: row.hour, value: row.registrations }))} exportName={`${act.id}-hours`}>
            <VBars data={(outcomes.hourly || []).map((row) => ({ name: row.hour, value: row.registrations }))} />
          </ChartCard>
          <ChartCard title="Scans by touchpoint" rows={qrCodes.filter((qr) => qr.activationId === act.id).map((qr) => ({ name: qr.touchpoint, value: qr.scans || 0 }))} exportName={`${act.id}-touch`}>
            <HBars data={qrCodes.filter((qr) => qr.activationId === act.id).map((qr) => ({ name: qr.touchpoint, value: qr.scans || 0 }))} />
          </ChartCard>
          <ChartCard title="Scan to submission" rows={[
            { name: 'Scans', value: qrCodes.filter((qr) => qr.activationId === act.id).reduce((sum, qr) => sum + (qr.funnel?.scans || qr.scans || 0), 0) },
            { name: 'Opened', value: qrCodes.filter((qr) => qr.activationId === act.id).reduce((sum, qr) => sum + (qr.funnel?.opened || 0), 0) },
            { name: 'Started', value: qrCodes.filter((qr) => qr.activationId === act.id).reduce((sum, qr) => sum + (qr.funnel?.started || 0), 0) },
            { name: 'Submitted', value: qrCodes.filter((qr) => qr.activationId === act.id).reduce((sum, qr) => sum + (qr.funnel?.submitted || qr.submissions || 0), 0) },
          ]} exportName={`${act.id}-funnel`}>
            <HBars data={[
              { name: 'Scans', value: qrCodes.filter((qr) => qr.activationId === act.id).reduce((sum, qr) => sum + (qr.scans || 0), 0) },
              { name: 'Submitted', value: qrCodes.filter((qr) => qr.activationId === act.id).reduce((sum, qr) => sum + (qr.submissions || 0), 0) },
            ]} />
          </ChartCard>
        </>
      )}
      {tab === 'Audience' && (
        <div className="chart-grid">
          <p className="span-12"><a href={linkTo('audience', route.search, { activation: act.id })}>View these profiles</a></p>
          {[
            ['Age band', 'ageBand'],
            ['Gender', 'gender'],
            ['Who they came with', 'party'],
            ['How they heard', 'heard'],
          ].map(([title, key]) => {
            const table = counts(attendees, key).map((row) => ({ name: row.name, value: row.count }));
            return (
              <div className="span-6" key={key}>
                <ChartCard title={title} rows={table} exportName={`${act.id}-${key}`}>
                  <VBars data={table} />
                </ChartCard>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'Feedback' && (
        <>
          <p>Average rating {dec1(outcomes.avgRating)} from {num(outcomes.surveyResponses)} responses.</p>
          <ChartCard title="Rating distribution" rows={(outcomes.ratingCounts || []).map((count, index) => ({ name: `${index + 1} star`, value: count }))} exportName={`${act.id}-ratings`}>
            <VBars data={(outcomes.ratingCounts || []).map((count, index) => ({ name: `${index + 1}`, value: count }))} />
          </ChartCard>
          <ChartCard title="Comment sentiment" rows={[{ name: 'Positive', value: outcomes.positiveComments || 0 }, { name: 'Neutral', value: outcomes.neutralComments || 0 }, { name: 'Negative', value: outcomes.negativeComments || 0 }]} exportName={`${act.id}-sentiment`}>
            <Donut data={[{ name: 'Positive', value: outcomes.positiveComments || 0 }, { name: 'Neutral', value: outcomes.neutralComments || 0 }, { name: 'Negative', value: outcomes.negativeComments || 0 }]} />
          </ChartCard>
          <DataTable
            columns={[{ key: 'text', label: 'Comment', wrap: true }, { key: 'sentiment', label: 'Sentiment' }]}
            rows={(outcomes.comments || []).map((comment, index) => ({ id: index, ...comment }))}
            exportName={`${act.id}-comments`}
            empty="No comments in the sample."
          />
        </>
      )}
      {tab === 'Report' && (
        <div className="report-sheet">
          <h2>{act.name}</h2>
          <p>Budget {rm(act.budget)} · Actual {rm(actual)} · Difference {rm(actual - act.budget)}</p>
          <p>Attendance {num(outcomes.totalAttendance)} · New profiles {num(outcomes.newProfiles)} · Average rating {dec1(outcomes.avgRating)}</p>
          <div className="screen-actions">
            <button type="button" className="btn" onClick={() => exportReportPdf({ filename: `${act.id}.pdf`, title: act.name, subtitle: 'Activation report', sections: reportSections() })}>Export PDF</button>
            <button type="button" className="btn" onClick={() => exportSheets({ filename: act.id, sheets: [{ name: 'Report', columns: [{ key: 'label', label: 'Item' }, { key: 'value', label: 'Value' }], rows: [{ label: 'Attendance', value: outcomes.totalAttendance }, { label: 'Spend', value: actual }] }] })}>Export Excel</button>
            {can(state.role, 'activation.report') && act.status !== 'Reported' && (
              <button type="button" className="btn btn-primary" onClick={() => { dispatch({ type: 'patchActivation', id: act.id, patch: { status: 'Reported' } }); dispatch({ type: 'audit', entry: auditEntry(state, 'Edited activation', 'Activation', act.id, 'Marked as reported') }); }}>Mark as Reported</button>
            )}
          </div>
          <SampleBadge text="Prototype" />
        </div>
      )}
    </section>
  );
}
