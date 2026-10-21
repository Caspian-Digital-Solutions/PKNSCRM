import { useState } from 'react';
import Modal from './Modal.jsx';
import Field from './Field.jsx';
import { DescriptionList } from './DescriptionList.jsx';
import { HERO, LOST_REASONS } from '../data/config.js';
import { spaceLabel } from '../labels.js';
import { rm } from '../format.js';

export const LOST_OPTIONS = [...LOST_REASONS.map(([name]) => name), 'Other'];
export const SIGNED_START = HERO.signedTerms.start;

export function commitStage(dispatch, enquiry, stage, extra = {}) {
  if (!enquiry) return;
  if (enquiry.hero) {
    const action = { type: 'heroStage', stage };
    if (stage === 'Signed') {
      action.signed = { rent: extra.rent, start: extra.start, term: HERO.signedTerms.term };
    }
    if (stage === 'Lost') action.lostReason = extra.lostReason;
    dispatch(action);
    return;
  }
  const action = { type: 'move', id: enquiry.id, stage };
  if (stage === 'Signed') {
    action.rent = extra.rent;
    action.start = extra.start;
  }
  if (stage === 'Lost') action.lostReason = extra.lostReason;
  dispatch(action);
}

export function SignedDialog({ open, enquiry, assetName, onClose, onConfirm }) {
  const [rentError, setRentError] = useState('');
  const [startError, setStartError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const raw = String(data.get('rent') || '').replace(/,/g, '');
    const value = Number(raw);
    const start = String(data.get('start') || '');
    const nextRent = Number.isFinite(value) && value > 0 ? '' : 'Enter the monthly rent';
    const nextStart = start ? '' : 'Enter the start date';
    setRentError(nextRent);
    setStartError(nextStart);
    if (nextRent || nextStart) return;
    onConfirm({ rent: value, start });
  };

  return (
    <Modal open={open} title="Mark as signed" onClose={onClose}>
      <form className="dialog-form" noValidate onSubmit={submit} key={enquiry?.id || 'signed'}>
        <DescriptionList
          rows={[
            { label: 'Lot', value: spaceLabel(enquiry?.use, enquiry?.lot) },
            { label: 'Asset', value: assetName || '–' },
            { label: 'Term', value: '2 years' },
          ]}
        />
        <Field label="Confirmed monthly rent" error={rentError}>
          <span className="affix">
            <span className="affix-prefix">RM</span>
            <input name="rent" inputMode="numeric" defaultValue={enquiry?.rent ?? ''} />
          </span>
        </Field>
        <Field label="Start date" error={startError}>
          <input name="start" type="date" defaultValue={SIGNED_START} />
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
        <fieldset className="reason-list">
          <legend>Reason</legend>
          {LOST_OPTIONS.map((item) => (
            <label key={item}>
              <input type="radio" name="reason" value={item} checked={reason === item} onChange={() => setReason(item)} />
              {item}
            </label>
          ))}
        </fieldset>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!reason}>Mark as lost</button>
        </div>
      </form>
    </Modal>
  );
}

export { rm };
