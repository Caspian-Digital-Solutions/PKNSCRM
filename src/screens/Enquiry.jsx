import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { go } from '../router.js';
import Num from '../components/Num.jsx';
import { LostDialog, SignedDialog, commitStage } from '../components/MoveDialogs.jsx';
import { PIPELINE_STAGES } from '../data/config.js';
import { contactLog, firstResponseMinutes, liveAssets, liveEnquiries, liveUnits } from '../data/selectors.js';
import { useQrEnquiries } from '../qrStore.js';
import { date, duration, num, rm, rm2, time } from '../format.js';

const LOG_TYPES = ['Call', 'WhatsApp', 'Email', 'Viewing', 'Note'];

function Fact({ label, children }) {
  return (
    <div className="fact">
      <div className="fact-label">{label}</div>
      <div className="fact-value">{children}</div>
    </div>
  );
}

const text = (value) => (value == null || value === '' ? '–' : value);

export default function Enquiry({ params }) {
  const { state, dispatch, data } = useStore();
  const canEdit = state.role === 'leasing';
  const id = params?.[0] || '';
  const [pending, setPending] = useState(null);
  const [entryType, setEntryType] = useState('Call');
  const [entryText, setEntryText] = useState('');
  const enquiries = useMemo(() => liveEnquiries(data, state), [data, state]);
  const { enquiries: qrEnquiries, ready: qrReady } = useQrEnquiries();
  const enquiry = enquiries.find((item) => item.id === id) || qrEnquiries.find((item) => item.id === id);
  const units = useMemo(() => liveUnits(data, state), [data, state]);
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const log = useMemo(() => (enquiry ? contactLog(data, state, enquiry.id).slice().reverse() : []), [data, state, enquiry]);

  if (!enquiry) {
    return (
      <section>
        <h1 className="page-title">Enquiry</h1>
        <p>{id.startsWith('qr-') && !qrReady ? 'Loading the live enquiry…' : 'This enquiry is not on the board.'}</p>
        <p><a href="#/pipeline" onClick={(e) => { e.preventDefault(); go('pipeline'); }}>Back to pipeline</a></p>
      </section>
    );
  }

  const asset = assets.find((item) => item.id === enquiry.asset);
  const campaign = data.campaigns.find((item) => item.id === enquiry.campaign);
  const officer = data.officers[enquiry.officer];
  const unit = units.find((item) => item.id === enquiry.unitId)
    || units.find((item) => item.asset === enquiry.asset && item.lot === enquiry.lot);
  const minutes = firstResponseMinutes(enquiry);

  const editable = canEdit && !enquiry.qr;

  const requestStage = (stage) => {
    if (!editable || stage === enquiry.stage) return;
    if (stage === 'Signed' || stage === 'Lost') {
      setPending(stage);
      return;
    }
    commitStage(dispatch, enquiry, stage);
  };

  const addEntry = (e) => {
    e.preventDefault();
    const note = entryText.trim();
    if (!note) return;
    dispatch({ type: 'note', id: enquiry.id, note: { type: entryType, text: note, by: enquiry.officer } });
    setEntryText('');
  };

  return (
    <section>
      <p className="crumb">
        <a href="#/pipeline" onClick={(e) => { e.preventDefault(); go('pipeline'); }}>Back to pipeline</a>
        {campaign && (
          <>
            {' · '}
            <a href={`#/campaign/${campaign.id}`} onClick={(e) => { e.preventDefault(); go('campaign', campaign.id); }}>Back to campaign</a>
          </>
        )}
        {enquiry.stage === 'Signed' && (
          <>
            {' · '}
            <a href="#/portfolio" onClick={(e) => { e.preventDefault(); go('portfolio'); }}>View on portfolio</a>
          </>
        )}
      </p>
      <h1 className="page-title">{enquiry.business}</h1>
      <p className="lead">{text(enquiry.contact)} · {enquiry.stage}</p>
      {editable && (
        <div className="stage-actions">
          {PIPELINE_STAGES.map((stage) => (stage === enquiry.stage ? (
            <span key={stage} className="btn on" aria-current="true">{stage}</span>
          ) : (
            <button key={stage} type="button" className="btn" onClick={() => requestStage(stage)}>
              {stage}
            </button>
          )))}
        </div>
      )}

      <h2 className="section-title">Enquirer</h2>
      <div className="fact-grid">
        <Fact label="Contact">{text(enquiry.contact)}</Fact>
        <Fact label="Title">{text(enquiry.title)}</Fact>
        <Fact label="Business">{text(enquiry.business)}</Fact>
        <Fact label="Phone">{text(enquiry.phone)}</Fact>
        <Fact label="Email">{text(enquiry.email)}</Fact>
        <Fact label="Preferred size">{text(enquiry.preferredSize)}</Fact>
        <Fact label="Budget">{text(enquiry.budget)}</Fact>
        <Fact label="Contact channel">{text(enquiry.contactChannel)}</Fact>
      </div>

      <h2 className="section-title">Attribution</h2>
      <div className="fact-grid">
        <Fact label="Source">{text(enquiry.source)}</Fact>
        <Fact label="Campaign">
          {campaign
            ? <a href={`#/campaign/${campaign.id}`} onClick={(e) => { e.preventDefault(); go('campaign', campaign.id); }}>{campaign.name}</a>
            : '–'}
        </Fact>
        <Fact label="Ad">{text(enquiry.ad)}</Fact>
        <Fact label="Received">{date(enquiry.receivedAt)} {time(enquiry.receivedAt)}</Fact>
      </div>

      <h2 className="section-title">Unit</h2>
      <div className="fact-grid">
        <Fact label="Asset">
          {asset
            ? <a href={`#/asset/${asset.id}`} onClick={(e) => { e.preventDefault(); go('asset', asset.id); }}>{asset.name}</a>
            : '–'}
        </Fact>
        <Fact label="Lot">{text(enquiry.lot)}</Fact>
        <Fact label="Use">{text(unit?.use || enquiry.use)}</Fact>
        <Fact label="Size">{unit?.size != null ? `${num(unit.size)} sq ft` : (enquiry.size != null ? `${num(enquiry.size)} sq ft` : '–')}</Fact>
        <Fact label="Asking rent">{unit?.psf != null ? `${rm2(unit.psf)} psf` : '–'} · {enquiry.rent != null ? `${rm(enquiry.rent)} per month` : '–'}</Fact>
        <Fact label="Unit status">
          <span data-testid="unit-status"><Num value={unit?.status || '–'} watch={`unit:${enquiry.id}`} /></span>
        </Fact>
        {enquiry.confirmedRent != null && (
          <Fact label="Confirmed rent">{rm(enquiry.confirmedRent)} per month</Fact>
        )}
      </div>

      <h2 className="section-title">Stage history</h2>
      <ol className="history">
        {(enquiry.history || []).map((entry, index) => (
          <li key={`${entry[0]}-${entry[1]}-${index}`}>
            <strong>{entry[0]}</strong>
            <span>{date(entry[1])} {time(entry[1])}</span>
          </li>
        ))}
      </ol>
      <p data-testid="first-response">First response time: <Num value={minutes} format={duration} watch={`response:${enquiry.id}`} /></p>

      <h2 className="section-title">Contact log</h2>
      <ol className="log">
        {log.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            <div className="log-meta">
              <strong>{entry.type}</strong>
              <span>{date(entry.at)} {time(entry.at)}</span>
              <span>{data.officers[entry.by]?.name || '–'}</span>
            </div>
            <p>{entry.text}</p>
          </li>
        ))}
        {log.length === 0 && <li>No contact logged yet.</li>}
      </ol>
      {editable && (
        <form className="stack-form" onSubmit={addEntry}>
          <label>
            Type
            <select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
              {LOG_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grow">
            Entry
            <input value={entryText} onChange={(e) => setEntryText(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary">Add to log</button>
        </form>
      )}

      <h2 className="section-title">Follow-up and officer</h2>
      {editable ? (
        <div className="stack-form">
          <label>
            Next follow-up
            <input
              type="date"
              value={enquiry.nextFollowUp || ''}
              onChange={(e) => dispatch({ type: 'followUp', id: enquiry.id, date: e.target.value })}
            />
          </label>
          <label>
            Assigned officer
            <select
              value={enquiry.officer || ''}
              onChange={(e) => dispatch({ type: 'reassign', id: enquiry.id, officer: e.target.value })}
            >
              {Object.values(data.officers).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="fact-grid">
          <Fact label="Next follow-up">{date(enquiry.nextFollowUp)}</Fact>
          <Fact label="Assigned officer">{officer?.name || '–'}</Fact>
        </div>
      )}

      <SignedDialog
        open={pending === 'Signed'}
        enquiry={enquiry}
        onClose={() => setPending(null)}
        onConfirm={(extra) => {
          commitStage(dispatch, enquiry, 'Signed', extra);
          setPending(null);
        }}
      />
      <LostDialog
        open={pending === 'Lost'}
        onClose={() => setPending(null)}
        onConfirm={(extra) => {
          commitStage(dispatch, enquiry, 'Lost', extra);
          setPending(null);
        }}
      />
    </section>
  );
}
