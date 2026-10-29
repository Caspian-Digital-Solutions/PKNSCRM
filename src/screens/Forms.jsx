import { useMemo, useState } from 'react';
import ChartCard from '../components/ChartCard.jsx';
import DataTable from '../components/DataTable.jsx';
import Drawer from '../components/Drawer.jsx';
import { PageHead, Status, linkTo, personal } from '../components/bits.jsx';
import { CheckInline, SelectInput, TextInput } from '../components/controls.jsx';
import { QrPreview, downloadPdf, downloadPng, downloadSvg } from '../components/QrArt.jsx';
import { AS_OF_ISO } from '../data/config.js';
import { FORM_TEMPLATES, PURPOSES, TOUCHPOINTS } from '../data/formTemplates.js';
import { sampleSubmissions } from '../data/inbox.js';
import { useAmp } from '../useAmp.jsx';
import { date, num, pct } from '../format.js';
import { go } from '../router.js';

const TABS = [
  ['forms', 'Forms'],
  ['qr', 'QR codes'],
  ['templates', 'Templates'],
  ['submissions', 'Submissions'],
];

function sparkline(points) {
  const values = points.map((point) => point.value);
  const max = Math.max(1, ...values);
  const d = values.map((value, index) => `${index ? 'L' : 'M'}${(index / Math.max(1, values.length - 1)) * 80},${24 - (value / max) * 20}`).join(' ');
  return <svg className="spark" width="84" height="28" aria-hidden="true"><path d={d} fill="none" stroke="#64748B" strokeWidth="2" /></svg>;
}

export default function Forms() {
  const amp = useAmp();
  const { forms, qrCodes, allActivations, assets, profiles, submissions, submissionPatches, route, state, dispatch } = amp;
  const tab = route.search.tab || 'forms';
  const [menu, setMenu] = useState(false);
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');
  const [mode, setMode] = useState('');
  const [assetId, setAssetId] = useState('');
  const [cards, setCards] = useState(true);
  const [qrOpen, setQrOpen] = useState(route.search.create === 'qr');
  const [query, setQuery] = useState('');
  const setTab = (next) => go('forms', { ...route.search, tab: next === 'forms' ? '' : next, create: '' });
  const assetName = (id) => assets.find((asset) => asset.id === id)?.shortCode || '';
  const rows = useMemo(() => forms.map((form) => {
    const act = allActivations.find((item) => item.id === form.activationId);
    const linked = qrCodes.filter((qr) => qr.formId === form.id);
    const points = [];
    linked.forEach((qr) => (qr.byDay || []).forEach((day) => {
      const found = points.find((point) => point.day === day.day);
      const share = qr.scans ? Math.round(day.scans * (qr.submissions || 0) / qr.scans) : 0;
      if (found) found.value += share;
      else points.push({ day: day.day, value: share });
    }));
    return {
      ...form,
      activation: form.mode === 'Always-on' ? 'Always-on' : (act?.name || '–'),
      submissions: form.submissionsCount || 0,
      qrCount: linked.length,
      spark: points.sort((a, b) => String(a.day).localeCompare(String(b.day))),
      asset: assetName(form.assetIds?.[0]),
    };
  }).filter((form) => {
    if (status && form.status !== status) return false;
    if (purpose && form.purpose !== purpose) return false;
    if (mode && form.mode !== mode) return false;
    if (assetId && !(form.assetIds || []).includes(assetId)) return false;
    if (query && !`${form.name} ${form.publicTitle} ${form.activation}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))), [forms, allActivations, qrCodes, status, purpose, mode, assetId, query, assets]);
  const published = forms.filter((form) => form.status === 'Published').length;
  const submissionsTotal = forms.reduce((sum, form) => sum + (form.submissionsCount || 0), 0);
  const completion = forms.filter((form) => form.viewsCount).reduce((sum, form, _, list) => sum + (form.submissionsCount || 0) / form.viewsCount / list.length, 0);
  const closing = forms.filter((form) => form.closesAt && form.closesAt >= AS_OF_ISO && form.closesAt.slice(0, 10) <= '2026-11-04').length;
  const activeQr = qrCodes.filter((qr) => qr.status === 'Active');
  const scans = qrCodes.reduce((sum, qr) => sum + (qr.scans || 0), 0);
  const unique = qrCodes.reduce((sum, qr) => sum + (qr.uniqueScans || 0), 0);
  const qrSubs = qrCodes.reduce((sum, qr) => sum + (qr.submissions || 0), 0);

  return (
    <section>
      <PageHead
        title="Forms & QR"
        lede="Forms, QR codes and submissions for PKNS activations."
        tabs={(
          <div className="tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
        )}
        actions={(
          <div className="create-menu">
            <button type="button" className="btn btn-primary" onClick={() => setMenu((open) => !open)}>Create</button>
            {menu && (
              <div className="create-menu-panel">
                <button type="button" onClick={() => go('form', 'new')}>New form</button>
                <button type="button" onClick={() => { setMenu(false); setQrOpen(true); }}>New QR code</button>
                <button type="button" onClick={() => { setMenu(false); setTab('templates'); }}>New from template</button>
              </div>
            )}
          </div>
        )}
      />
      {tab === 'forms' && (
        <>
          <p className="summary-strip">{num(published)} published · {num(submissionsTotal)} submissions · {pct(completion)} average completion · {num(closing)} closing in 7 days</p>
          <div className="table-toolbar">
            <TextInput ariaLabel="Search forms" placeholder="Search forms" value={query} onChange={setQuery} />
            <SelectInput ariaLabel="Status" value={status} placeholder="All statuses" onChange={setStatus} options={['Draft', 'Published', 'Scheduled', 'Closed', 'Archived'].map((item) => ({ id: item, label: item }))} />
            <SelectInput ariaLabel="Purpose" value={purpose} placeholder="All purposes" onChange={setPurpose} options={PURPOSES.map((item) => ({ id: item, label: item }))} />
            <SelectInput ariaLabel="Mode" value={mode} placeholder="All modes" onChange={setMode} options={['Activation', 'Always-on'].map((item) => ({ id: item, label: item }))} />
            <SelectInput ariaLabel="Asset" value={assetId} placeholder="All assets" onChange={setAssetId} options={assets.map((asset) => ({ id: asset.id, label: asset.shortCode }))} />
            <button type="button" className="btn" onClick={() => setCards((value) => !value)}>{cards ? 'Table' : 'Cards'}</button>
          </div>
          {cards ? (
            <div className="chart-grid">
              {rows.map((form) => (
                <article key={form.id} className="span-4 info-card">
                  <div className="banner-thumb" style={{ background: form.design?.themeColour || '#E31E24' }} />
                  <h3>{form.publicTitle || form.name}</h3>
                  <p><Status value={form.purpose} /> <Status value={form.status} /></p>
                  <p>{form.activation}</p>
                  <p>{num(form.submissions)} submissions · {num(form.viewsCount)} views · {pct(form.completionRate)} · {num(form.qrCount)} QR</p>
                  {sparkline(form.spark)}
                  <div className="screen-actions">
                    <a className="btn" href={linkTo(`form/${form.id}`, route.search)}>Open builder</a>
                    <a className="btn" href={`#/f/${form.id}`}>Preview</a>
                    <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#/f/${form.id}`)}>Copy link</button>
                    <a className="btn" href={`#/qr/${form.qrCount ? qrCodes.find((qr) => qr.formId === form.id)?.id : ''}`}>Show QR</a>
                    <button type="button" className="btn" onClick={() => go('form', 'new', { tpl: FORM_TEMPLATES.find((item) => item.purpose === form.purpose)?.id || '' })}>Duplicate</button>
                    <button type="button" className="btn" onClick={() => dispatch({ type: 'patchForm', id: form.id, patch: { status: form.status === 'Closed' ? 'Archived' : 'Closed', active: false } })}>{form.status === 'Closed' ? 'Archive' : 'Close'}</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'publicTitle', label: 'Name' },
                { key: 'purpose', label: 'Purpose' },
                { key: 'status', label: 'Status', format: (value) => <Status value={value} /> },
                { key: 'activation', label: 'Linked activation' },
                { key: 'submissions', label: 'Submissions', align: 'right', format: num },
                { key: 'updatedAt', label: 'Updated', format: date },
              ]}
              rows={rows}
              pageSizes={[25, 50, 100]}
              exportName="forms"
              onRowClick={(row) => { window.location.hash = linkTo(`form/${row.id}`, route.search); }}
            />
          )}
        </>
      )}
      {tab === 'qr' && <QrTab amp={amp} scans={scans} unique={unique} qrSubs={qrSubs} active={activeQr.length} onCreate={() => setQrOpen(true)} />}
      {tab === 'templates' && (
        <div className="chart-grid">
          {FORM_TEMPLATES.map((template) => (
            <article key={template.id} className="span-4 info-card">
              <h3>{template.name}</h3>
              <p>{template.purpose}</p>
              <p>{template.description}</p>
              <p>{template.fields.length} fields</p>
              <button type="button" className="btn btn-primary" onClick={() => go('form', 'new', { tpl: template.id })}>Use template</button>
            </article>
          ))}
        </div>
      )}
      {tab === 'submissions' && <Submissions amp={amp} profiles={profiles} forms={forms} qrCodes={qrCodes} submissions={submissions} patches={submissionPatches} />}
      <QrDrawer open={qrOpen} onClose={() => setQrOpen(false)} amp={amp} />
    </section>
  );
}

function QrTab({ amp, scans, unique, qrSubs, active, onCreate }) {
  const { qrCodes, forms, assets, route } = amp;
  const [cards, setCards] = useState(false);
  const rows = qrCodes.map((qr) => ({
    ...qr,
    form: forms.find((form) => form.id === qr.formId)?.publicTitle || qr.targetType,
    asset: assets.find((asset) => asset.id === qr.assetId)?.shortCode || '–',
    conversion: qr.scans ? (qr.submissions || 0) / qr.scans : null,
  })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return (
    <>
      <p className="summary-strip">{num(active)} active · {num(scans)} scans · {num(unique)} unique scans · {pct(scans ? qrSubs / scans : null)} scan-to-submission</p>
      <div className="screen-actions">
        <button type="button" className="btn" onClick={() => setCards((value) => !value)}>{cards ? 'Table' : 'Cards'}</button>
        <button type="button" className="btn btn-primary" onClick={onCreate}>New QR code</button>
      </div>
      {cards ? (
        <div className="chart-grid">
          {rows.slice(0, 12).map((qr) => (
            <a key={qr.id} className="span-4 info-card" href={linkTo(`qr/${qr.id}`, route.search)}>
              <QrPreview value={qr.targetUrl.startsWith('#') ? `${window.location.origin}${window.location.pathname}${qr.targetUrl}` : qr.targetUrl} style={qr.style} size={96} canvasId={`card-${qr.id}`} />
              <strong>{qr.name}</strong>
              <p>{qr.touchpoint} · {num(qr.scans)} scans</p>
            </a>
          ))}
        </div>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'form', label: 'Form' },
            { key: 'touchpoint', label: 'Touchpoint' },
            { key: 'asset', label: 'Asset' },
            { key: 'scans', label: 'Scans', align: 'right', format: num },
            { key: 'uniqueScans', label: 'Unique scans', align: 'right', format: num },
            { key: 'submissions', label: 'Submissions', align: 'right', format: num },
            { key: 'conversion', label: 'Conversion', align: 'right', format: pct },
            { key: 'status', label: 'Status', format: (value) => <Status value={value} /> },
            { key: 'createdAt', label: 'Created', format: date },
          ]}
          rows={rows}
          pageSizes={[25, 50, 100]}
          exportName="qr-codes"
          onRowClick={(row) => { window.location.hash = linkTo(`qr/${row.id}`, route.search); }}
        />
      )}
    </>
  );
}

function QrDrawer({ open, onClose, amp }) {
  const { forms, allActivations, assets, state, dispatch } = amp;
  const [targetType, setTargetType] = useState('Form');
  const [formId, setFormId] = useState(forms[0]?.id || '');
  const [activationId, setActivationId] = useState('');
  const [url, setUrl] = useState('https://www.pkns.gov.my');
  const [name, setName] = useState('');
  const [touchpoint, setTouchpoint] = useState(TOUCHPOINTS[0]);
  const [custom, setCustom] = useState('');
  const [bulk, setBulk] = useState('');
  const [assetId, setAssetId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [style, setStyle] = useState({ foreground: '#111827', background: '#FFFFFF', logo: 'PKNS', frame: 'Scan to register', frameText: '', cornerStyle: 'Rounded' });
  const form = forms.find((item) => item.id === formId);
  const act = allActivations.find((item) => item.id === (activationId || form?.activationId));
  const touch = custom || touchpoint;
  const slug = touch.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const value = targetType === 'URL' ? url : `${window.location.origin}${window.location.pathname}#/f/${formId || 'preview'}?tp=${slug}`;
  const make = (label) => {
    const tag = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const id = `QR-L${state.seq}-${tag || 'x'}`;
    return {
      id,
      name: name || `${form?.publicTitle || 'Link'} · ${label}`,
      formId: targetType === 'Form' ? formId : null,
      targetType,
      targetUrl: targetType === 'URL' ? url : `#/f/${formId}?tp=${encodeURIComponent(tag)}`,
      shortLink: `pkns.my/a/${tag || id.slice(-6).toLowerCase()}`,
      touchpoint: label,
      sourceTag: tag,
      assetId: assetId || form?.assetIds?.[0] || act?.assetId || null,
      activationId: act?.id || form?.activationId || null,
      status: 'Active',
      expiresAt: expiresAt || null,
      style,
      scans: 0,
      uniqueScans: 0,
      submissions: 0,
      byDay: [],
      byHour: [],
      devices: { iOS: 0, Android: 0, Other: 0 },
      funnel: { scans: 0, opened: 0, started: 0, submitted: 0 },
      createdBy: 'Farah Idris',
      createdAt: AS_OF_ISO,
    };
  };
  const save = () => {
    const labels = bulk.trim() ? bulk.split(/[\n,]/).map((item) => item.trim()).filter(Boolean) : [touch];
    labels.forEach((label) => dispatch({ type: 'addQr', qr: make(label) }));
    onClose();
  };
  return (
    <Drawer open={open} title="New QR code" onClose={onClose} width={640}>
      <SelectInput ariaLabel="Target" value={targetType} onChange={setTargetType} options={['Form', 'Activation landing page', 'URL'].map((item) => ({ id: item, label: item }))} />
      {targetType !== 'URL' && <SelectInput ariaLabel="Form" value={formId} onChange={setFormId} options={forms.map((item) => ({ id: item.id, label: item.publicTitle || item.name }))} />}
      {targetType === 'Activation landing page' && <SelectInput ariaLabel="Activation" value={activationId} onChange={setActivationId} options={allActivations.map((item) => ({ id: item.id, label: item.name }))} />}
      {targetType === 'URL' && <TextInput ariaLabel="URL" value={url} onChange={setUrl} />}
      <TextInput ariaLabel="Name" placeholder="Name" value={name} onChange={setName} />
      <SelectInput ariaLabel="Touchpoint" value={touchpoint} onChange={setTouchpoint} options={TOUCHPOINTS.map((item) => ({ id: item, label: item }))} />
      <TextInput ariaLabel="Custom touchpoint" placeholder="Custom touchpoint" value={custom} onChange={setCustom} />
      <label className="field">Bulk touchpoints<textarea className="control" rows={3} placeholder="Booth A, Booth B, Entrance" value={bulk} onChange={(event) => setBulk(event.target.value)} /></label>
      <SelectInput ariaLabel="Asset" value={assetId} placeholder="Asset" onChange={setAssetId} options={assets.map((asset) => ({ id: asset.id, label: asset.name }))} />
      <label className="field">Expiry<input className="control" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
      <p>Source tag {slug || 'form'}</p>
      <div className="screen-actions">
        <label className="field">Foreground<input className="control" type="color" value={style.foreground} onChange={(event) => setStyle({ ...style, foreground: event.target.value })} /></label>
        <label className="field">Background<input className="control" type="color" value={style.background} onChange={(event) => setStyle({ ...style, background: event.target.value })} /></label>
      </div>
      <SelectInput ariaLabel="Logo" value={style.logo} onChange={(logo) => setStyle({ ...style, logo })} options={['PKNS', 'Asset', 'None'].map((item) => ({ id: item, label: item }))} />
      <SelectInput ariaLabel="Corners" value={style.cornerStyle} onChange={(cornerStyle) => setStyle({ ...style, cornerStyle })} options={['Square', 'Rounded', 'Dots'].map((item) => ({ id: item, label: item }))} />
      <SelectInput ariaLabel="Frame" value={style.frame} onChange={(frame) => setStyle({ ...style, frame })} options={['None', 'Scan to register', 'Imbas untuk daftar', 'Scan for lucky draw', 'Custom'].map((item) => ({ id: item, label: item }))} />
      {style.frame === 'Custom' && <TextInput ariaLabel="Frame text" value={style.frameText} onChange={(frameText) => setStyle({ ...style, frameText })} />}
      <QrPreview value={value} style={style} canvasId="qr-draft" />
      <p className="fine">pkns.my/a/{slug || 'link'}</p>
      <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(`pkns.my/a/${slug || 'link'}`)}>Copy short link</button>
      <div className="screen-actions">
        <button type="button" className="btn" onClick={() => downloadPng('qr-draft', slug || 'qr')}>PNG</button>
        <button type="button" className="btn" onClick={() => downloadSvg(slug || 'qr')}>SVG</button>
        {['a4', 'a5', 'tent', 'stickers'].map((layout) => (
          <button key={layout} type="button" className="btn" onClick={() => downloadPdf('qr-draft', layout, { title: form?.publicTitle || name || 'PKNS', when: act ? `${act.startDate} – ${act.endDate}` : '', venue: act?.specificLocation || '', style, filename: slug || 'qr' })}>{layout}</button>
        ))}
      </div>
      <button type="button" className="btn btn-primary" onClick={save}>{bulk.trim() ? 'Create QR codes' : 'Create QR code'}</button>
    </Drawer>
  );
}

function Submissions({ amp, profiles, forms, qrCodes, submissions, patches }) {
  const { state, dispatch, route } = amp;
  const [formId, setFormId] = useState('');
  const [status, setStatus] = useState('');
  const [touch, setTouch] = useState('');
  const [dupes, setDupes] = useState(false);
  const [open, setOpen] = useState(null);
  const rows = useMemo(() => sampleSubmissions(forms, profiles, qrCodes, submissions).map((row) => ({ ...row, ...(patches[row.id] || {}) })), [forms, profiles, qrCodes, submissions, patches]);
  const shown = rows.filter((row) => {
    if (formId && row.formId !== formId) return false;
    if (status && row.status !== status) return false;
    if (touch && row.touchpoint !== touch) return false;
    if (dupes && !row.isDuplicate) return false;
    return true;
  });
  const profile = open ? profiles.find((item) => item.id === open.profileId) : null;
  return (
    <>
      <div className="table-toolbar">
        <SelectInput ariaLabel="Form" value={formId} placeholder="All forms" onChange={setFormId} options={forms.map((form) => ({ id: form.id, label: form.publicTitle || form.name }))} />
        <SelectInput ariaLabel="Status" value={status} placeholder="All statuses" onChange={setStatus} options={['New', 'Matched to existing profile', 'Flagged'].map((item) => ({ id: item, label: item }))} />
        <SelectInput ariaLabel="Touchpoint" value={touch} placeholder="All touchpoints" onChange={setTouch} options={TOUCHPOINTS.map((item) => ({ id: item, label: item }))} />
        <CheckInline checked={dupes} onChange={setDupes}>Duplicates only</CheckInline>
      </div>
      <DataTable
        columns={[
          { key: 'submittedAt', label: 'Time', format: date },
          { key: 'formId', label: 'Form', format: (value) => forms.find((form) => form.id === value)?.publicTitle || value },
          { key: 'touchpoint', label: 'Touchpoint' },
          { key: 'profileName', label: 'Profile' },
          { key: 'mobile', label: 'Mobile', format: (value, row) => personal({ id: row.profileId, mobile: value }, state.role, state.revealed, 'mobile') },
          { key: 'status', label: 'Status', format: (value) => <Status value={value} /> },
          { key: 'consent', label: 'Consent', format: (value) => (value?.marketing ? 'Marketing' : 'Required only') },
        ]}
        rows={shown}
        pageSizes={[25, 50, 100]}
        exportName="submissions"
        onRowClick={setOpen}
      />
      <Drawer open={Boolean(open)} title="Submission" onClose={() => setOpen(null)}>
        {open && (
          <>
            <p>{open.profileName}</p>
            <p>{open.touchpoint}</p>
            <p><Status value={open.status} /></p>
            {profile && <a href={linkTo(`profile/${profile.id}`, route.search)}>Open profile</a>}
            <div className="screen-actions">
              <button type="button" className="btn" onClick={() => dispatch({ type: 'patchSubmission', id: open.id, patch: { status: 'Flagged', isDuplicate: true }, entry: { userName: 'Farah Idris', role: 'AMP Manager', action: 'Flagged submission', targetType: 'Submission', targetId: open.id, details: 'Flagged as duplicate' } })}>Flag duplicate</button>
              <button type="button" className="btn" onClick={() => dispatch({ type: 'patchSubmission', id: open.id, patch: { status: 'Matched to existing profile', isDuplicate: false }, entry: { userName: 'Farah Idris', role: 'AMP Manager', action: 'Merged submission', targetType: 'Submission', targetId: open.id, details: 'Merged duplicate into the existing profile' } })}>Merge</button>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
