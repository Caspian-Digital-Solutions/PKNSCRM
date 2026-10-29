import { useState } from 'react';
import ChartCard from '../components/ChartCard.jsx';
import { Donut, HBars, VBars } from '../components/Charts.jsx';
import DataTable from '../components/DataTable.jsx';
import Kpi from '../components/Kpi.jsx';
import { PageHead, Status, linkTo, personal } from '../components/bits.jsx';
import { QrPreview, downloadPdf, downloadPng, downloadSvg } from '../components/QrArt.jsx';
import { sampleSubmissions } from '../data/inbox.js';
import { useAmp } from '../useAmp.jsx';
import { date, num, pct } from '../format.js';

export default function QrDetail({ id }) {
  const amp = useAmp();
  const { qrCodes, forms, allActivations, profiles, submissions, submissionPatches, state, dispatch, route } = amp;
  const qr = qrCodes.find((item) => item.id === id);
  const [style, setStyle] = useState(qr?.style || {});
  if (!qr) return <p>QR code not found.</p>;
  const form = forms.find((item) => item.id === qr.formId);
  const act = allActivations.find((item) => item.id === qr.activationId);
  const value = qr.targetUrl?.startsWith('#') ? `${window.location.origin}${window.location.pathname}${qr.targetUrl}` : qr.targetUrl;
  const recent = sampleSubmissions(forms, profiles, qrCodes, submissions).filter((row) => row.qrId === qr.id || (row.formId === qr.formId && row.touchpoint === qr.touchpoint)).slice(0, 25).map((row) => ({ ...row, ...(submissionPatches[row.id] || {}) }));
  const devices = Object.entries(qr.devices || {}).map(([name, value]) => ({ name, value }));
  const funnel = [
    { name: 'Scans', value: qr.funnel?.scans || qr.scans || 0 },
    { name: 'Form opened', value: qr.funnel?.opened || 0 },
    { name: 'Started', value: qr.funnel?.started || 0 },
    { name: 'Submitted', value: qr.funnel?.submitted || qr.submissions || 0 },
  ];
  const saveStyle = (next) => {
    setStyle(next);
    dispatch({ type: 'patchQr', id: qr.id, patch: { style: next } });
  };
  return (
    <section>
      <PageHead title={qr.name} lede={qr.touchpoint} back={{ href: linkTo('forms', route.search, { tab: 'qr' }), label: 'QR codes' }} actions={<Status value={qr.status} />} />
      <div className="chart-grid">
        <div className="span-4">
          <QrPreview value={value} style={style} size={220} canvasId={`detail-${qr.id}`} />
          <p className="fine">{qr.shortLink}</p>
          <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(qr.shortLink)}>Copy short link</button>
          <div className="screen-actions">
            <button type="button" className="btn" onClick={() => downloadPng(`detail-${qr.id}`, qr.id)}>PNG</button>
            <button type="button" className="btn" onClick={() => downloadSvg(qr.id)}>SVG</button>
            <button type="button" className="btn" onClick={() => downloadPdf(`detail-${qr.id}`, 'a4', { title: form?.publicTitle || qr.name, when: act ? `${act.startDate} – ${act.endDate}` : '', venue: act?.specificLocation || '', style, filename: qr.id })}>A4 PDF</button>
          </div>
          <label className="field">Foreground<input className="control" type="color" value={style.foreground || '#111827'} onChange={(event) => saveStyle({ ...style, foreground: event.target.value })} /></label>
          <div className="screen-actions">
            <button type="button" className="btn" onClick={() => dispatch({ type: 'patchQr', id: qr.id, patch: { status: qr.status === 'Paused' ? 'Active' : 'Paused' } })}>{qr.status === 'Paused' ? 'Resume' : 'Pause'}</button>
            <button type="button" className="btn" onClick={() => dispatch({ type: 'patchQr', id: qr.id, patch: { status: 'Expired' } })}>Expire</button>
          </div>
        </div>
        <div className="span-8">
          <div className="kpi-row">
            <Kpi label="Scans" value={qr.scans} format={num} />
            <Kpi label="Unique scans" value={qr.uniqueScans} format={num} />
            <Kpi label="Submissions" value={qr.submissions} format={num} />
            <Kpi label="Conversion" value={qr.scans ? (qr.submissions || 0) / qr.scans : null} format={pct} />
          </div>
          <ChartCard title="Scans by day" rows={(qr.byDay || []).map((row) => ({ name: row.day, value: row.scans }))} exportName={`${qr.id}-days`}>
            <VBars data={(qr.byDay || []).map((row) => ({ name: row.day, value: row.scans }))} />
          </ChartCard>
          <ChartCard title="Scans by hour" rows={(qr.byHour || []).map((row) => ({ name: row.hour, value: row.scans }))} exportName={`${qr.id}-hours`}>
            <VBars data={(qr.byHour || []).map((row) => ({ name: row.hour, value: row.scans }))} />
          </ChartCard>
          <div className="chart-grid">
            <div className="span-6"><ChartCard title="Devices" rows={devices} exportName={`${qr.id}-devices`}><Donut data={devices} /></ChartCard></div>
            <div className="span-6"><ChartCard title="Scan to submission" rows={funnel} exportName={`${qr.id}-funnel`}><HBars data={funnel} /></ChartCard></div>
          </div>
        </div>
      </div>
      <h2>Recent submissions</h2>
      <DataTable
        columns={[
          { key: 'submittedAt', label: 'Time', format: date },
          { key: 'profileName', label: 'Profile' },
          { key: 'mobile', label: 'Mobile', format: (value, row) => personal({ id: row.profileId, mobile: value }, state.role, state.revealed, 'mobile') },
          { key: 'status', label: 'Status', format: (value) => <Status value={value} /> },
        ]}
        rows={recent}
        pageSizes={[25, 50, 100]}
        exportName={`${qr.id}-submissions`}
        empty="No submissions for this QR code."
        onRowClick={(row) => { window.location.hash = linkTo(`profile/${row.profileId}`, route.search); }}
      />
    </section>
  );
}
