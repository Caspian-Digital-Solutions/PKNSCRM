import { useState } from 'react';
import Modal from './Modal.jsx';
import Field from './Field.jsx';
import { DescriptionList } from './DescriptionList.jsx';
import { HERO, LOST_REASONS_BEFORE_VIEWING, LOST_REASONS_AFTER_VIEWING } from '../data/config.js';
import { unitLabel, spaceLabel } from '../labels.js';
import { rm, weekdayDate, num, date, tooltipDate } from '../format.js';
import { firstOfNextMonth, nextWorkingSlot } from '../time.js';

const LOST_NAMES = [...new Set([...LOST_REASONS_BEFORE_VIEWING, ...LOST_REASONS_AFTER_VIEWING].map(([name]) => name))];
export const LOST_OPTIONS = [...LOST_NAMES, 'Other'];
export const SIGNED_START = HERO.signedTerms.start;

export function commitStage(dispatch, enquiry, stage, extra = {}) {
  if (!enquiry) return;
  if (enquiry.hero) {
    const action = { type: 'heroStage', stage };
    if (extra.at) action.at = extra.at;
    if (stage === 'Signed') {
      action.at = extra.signedAt;
      action.signed = { rent: extra.rent, start: extra.start, term: extra.term || HERO.signedTerms.term, at: extra.signedAt };
    }
    if (stage === 'Viewing Scheduled' && extra.viewingAt) {
      action.viewing = { at: extra.viewingAt, held: false };
    }
    if (stage === 'Lost') action.lostReason = extra.lostReason;
    dispatch(action);
    return;
  }
  const action = { type: 'move', id: enquiry.id, stage };
  if (stage === 'Signed') {
    action.rent = extra.rent;
    action.start = extra.start;
    action.signedOn = extra.signedAt;
    if (extra.signedAt) action.at = extra.signedAt;
  }
  if (stage === 'Lost') action.lostReason = extra.lostReason;
  dispatch(action);
}

export function SignedDialog({ open, enquiry, assetName, unit, now, onClose, onConfirm }) {
  const [rentError, setRentError] = useState('');
  const [startError, setStartError] = useState('');
  const clock = now || '2026-10-28T10:00:00+08:00';
  const hero = Boolean(enquiry?.hero);
  const signedDefault = hero ? nextWorkingSlot(clock, 15, 0) : clock;
  const leaseDefault = hero ? HERO.signedTerms.start : firstOfNextMonth(signedDefault);
  const submit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const raw = String(data.get('rent') || '').replace(/,/g, '');
    const value = Number(raw);
    const start = String(data.get('start') || '');
    const signedOn = String(data.get('signedOn') || signedDefault.slice(0, 10));
    const nextRent = Number.isFinite(value) && value > 0 ? '' : 'Enter the monthly rent';
    const nextStart = start ? '' : 'Enter the start date';
    setRentError(nextRent);
    setStartError(nextStart);
    if (nextRent || nextStart) return;
    const signedAt = signedOn.length > 10 ? signedOn : `${signedOn}T${signedDefault.slice(11, 16)}:00+08:00`;
    onConfirm({ rent: value, start, signedAt });
  };

  return (
    <Modal open={open} title="Mark as signed" onClose={onClose}>
      <form className="dialog-form" noValidate onSubmit={submit} key={`${enquiry?.id || 'signed'}-${open ? signedDefault : ''}`}>
        <DescriptionList
          rows={[
            { label: 'Unit', value: unit ? unitLabel(unit) : spaceLabel(enquiry?.use, enquiry?.lot) },
            { label: 'Asset', value: assetName || '–' },
            { label: 'Term', value: '2 years' },
          ]}
        />
        <Field label="Confirmed monthly rent" error={rentError}>
          <span className="affix">
            <span className="affix-prefix">RM</span>
            <input name="rent" inputMode="decimal" defaultValue={enquiry?.rent != null ? num(enquiry.rent) : ''} />
          </span>
        </Field>
        <Field label="Signed on" hint={tooltipDate(signedDefault)}>
          <input name="signedOn" type="date" defaultValue={signedDefault.slice(0, 10)} min={clock.slice(0, 10)} />
        </Field>
        <Field label="Lease starts" error={startError} hint={weekdayDate(leaseDefault)}>
          <input name="start" type="date" defaultValue={leaseDefault} />
        </Field>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Mark as signed</button>
        </div>
      </form>
    </Modal>
  );
}

export function LostDialog({ open, enquiry, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (!reason) return;
    onConfirm({ lostReason: reason });
    setReason('');
  };

  return (
    <Modal open={open} title={enquiry?.business ? `Mark ${enquiry.business} as lost?` : 'Mark as lost?'} onClose={onClose}>
      <form className="dialog-form" noValidate onSubmit={submit}>
        <p className="field-label">Reason</p>
        <ul className="reason-list">
          {LOST_OPTIONS.map((item) => (
            <li key={item}>
              <label className="reason-row">
                <input type="radio" name="reason" value={item} checked={reason === item} onChange={() => setReason(item)} />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!reason}>Mark as lost</button>
        </div>
      </form>
    </Modal>
  );
}

export function ZoneMoveDialog({ open, fromLabel, toLabel, openItems, onStay, onMove }) {
  const count = openItems?.length || 0;
  return (
    <Modal open={open} title={`Move to ${toLabel} with ${count} ${count === 1 ? 'requirement' : 'requirements'} open?`} onClose={onStay}>
      <ul className="reason-list">
        {(openItems || []).map((item) => <li key={item.id}>{item.id} {item.title}</li>)}
      </ul>
      <p className="cell-note">Qualifiers guide the decision. They never block a move.</p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onMove}>Move anyway</button>
        <button type="button" className="btn btn-primary" onClick={onStay}>Stay in {fromLabel}</button>
      </div>
    </Modal>
  );
}

export function HandoffDialog({ open, enquiry, assetName, unitText, officerName, start, onClose, onConfirm }) {
  if (!enquiry) return null;
  const rent = enquiry.confirmedRent ?? enquiry.rent;
  const deposit = rent != null ? `${rm(rent * 2)} (2 months' rent) + 1 month utilities` : '–';
  return (
    <Modal open={open} title="Hand over to property management" onClose={onClose}>
      <DescriptionList
        rows={[
          { label: 'Business', value: enquiry.business },
          { label: 'Contact', value: enquiry.contact || '–' },
          { label: 'SSM number', value: `${enquiry.ssmSample || '–'} (sample)` },
          { label: 'Unit', value: unitText || '–' },
          { label: 'Asset', value: assetName || '–' },
          { label: 'Monthly rent', value: rent != null ? `${rm(rent)} a month` : '–' },
          { label: 'Start date', value: date(start || '2026-12-01') },
          { label: 'Term', value: '2 years' },
          { label: 'Deposit', value: deposit },
          { label: 'Officer', value: officerName || '–' },
        ]}
      />
      <p className="cell-note">Sent to PREC property management (in the full system: their own system via API or scheduled file).</p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>Hand over</button>
      </div>
    </Modal>
  );
}

export { rm };
