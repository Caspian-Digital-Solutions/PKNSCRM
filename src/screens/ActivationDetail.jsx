import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DataTable from '../components/DataTable.jsx';
import { PageHead, SampleBadge, Status, auditEntry, linkTo } from '../components/bits.jsx';
import { can } from '../access.js';
import { SPEND_CATEGORIES } from '../data/config.js';
import { useAmp } from '../useAmp.jsx';
import { date, dec1, num, rm } from '../format.js';
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
  const { allActivations, activations, spend, forms, profiles, assets, state, dispatch, route } = amp;
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
      <PageHead title={act.name} lede={`${asset?.name || ''} · ${act.specificLocation || 'Location not set'}`} actions={<Status value={act.status} />} />
      <div className="tabs">
        {TABS.map((item) => <button key={item} type="button" className={tab === item ? 'on' : ''} onClick={() => setTab(item)}>{item}</button>)}
      </div>
      {tab === 'Summary' && (
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
          <p>{form ? <a href={linkTo(`form/${form.id}`, route.search)}>{form.name}</a> : 'No form linked.'}</p>
          {form && <p><a href={`#/f/${form.id}`}>Open public form</a></p>}
          <div className="chart-wrap compact">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcomes.hourly || []}>
                <CartesianGrid stroke="#E2E5EA" />
                <XAxis dataKey="hour" tick={{ fill: '#231F20', fontSize: 14 }} />
                <YAxis tick={{ fill: '#231F20', fontSize: 14 }} />
                <Tooltip />
                <Bar dataKey="registrations" name="Registrations" fill="#3D5A80" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="fine">Registrations by hour on the first event day.</p>
        </>
      )}
      {tab === 'Audience' && (
        <>
          <p><a href={linkTo('audience', route.search, { activation: act.id })}>View these profiles</a></p>
          {['ageBand', 'gender', 'party', 'heard'].map((key) => {
            const table = counts(attendees, key);
            return (
              <div key={key}>
                <h2>{key}</h2>
                <div className="chart-wrap compact">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={table}>
                      <CartesianGrid stroke="#E2E5EA" />
                      <XAxis dataKey="name" tick={{ fill: '#231F20', fontSize: 12 }} interval={0} angle={-20} height={70} />
                      <YAxis tick={{ fill: '#231F20', fontSize: 14 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8A9A5B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <DataTable columns={[{ key: 'name', label: 'Value' }, { key: 'count', label: 'Count', align: 'right', format: num, total: 'sum' }]} rows={table.map((row) => ({ ...row, id: row.name }))} totals exportName={`${act.id}-${key}`} />
              </div>
            );
          })}
          <h2>New and returning</h2>
          <p>{num(outcomes.newProfiles)} new · {num(outcomes.returningProfiles)} returning</p>
        </>
      )}
      {tab === 'Feedback' && (
        <>
          <p>Average rating {dec1(outcomes.avgRating)} from {num(outcomes.surveyResponses)} responses.</p>
          <DataTable
            columns={[{ key: 'star', label: 'Rating' }, { key: 'count', label: 'Count', align: 'right', format: num, total: 'sum' }]}
            rows={(outcomes.ratingCounts || []).map((count, index) => ({ id: index + 1, star: index + 1, count }))}
            totals
            exportName={`${act.id}-ratings`}
          />
          <h2>Sample of comments</h2>
          <DataTable
            columns={[{ key: 'text', label: 'Comment' }, { key: 'sentiment', label: 'Sentiment' }]}
            rows={(outcomes.comments || []).map((comment, index) => ({ id: index, ...comment }))}
            exportName={`${act.id}-comments`}
            empty="No comments in the sample."
          />
          <p className="fine">Positive {num(outcomes.positiveComments)} · Neutral {num(outcomes.neutralComments)} · Negative {num(outcomes.negativeComments)}</p>
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
