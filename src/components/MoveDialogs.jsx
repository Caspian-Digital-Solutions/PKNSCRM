import Modal from './Modal.jsx';
import { HERO, LOST_REASONS } from '../data/config.js';

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

export function SignedDialog({ open, enquiry, onClose, onConfirm }) {
  const submit = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const value = Number(data.get('rent'));
    const start = String(data.get('start') || '');
    if (!Number.isFinite(value) || !start) return;
    onConfirm({ rent: value, start });
  };

  return (
    <Modal open={open} title="Mark as signed" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit} key={enquiry?.id || 'signed'}>
        <label>
          Confirmed monthly rent (RM)
          <input name="rent" type="number" min="0" step="1" defaultValue={enquiry?.rent ?? ''} required />
        </label>
        <label>
          Start date
          <input name="start" type="date" defaultValue={SIGNED_START} required />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Mark as signed</button>
        </div>
      </form>
    </Modal>
  );
}

export function LostDialog({ open, onClose, onConfirm }) {
  const submit = (e) => {
    e.preventDefault();
    const reason = String(new FormData(e.target).get('reason') || '');
    if (!reason) return;
    onConfirm({ lostReason: reason });
  };

  return (
    <Modal open={open} title="Mark as lost" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <label>
          Reason
          <select name="reason" defaultValue={LOST_OPTIONS[0]}>
            {LOST_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Mark as lost</button>
        </div>
      </form>
    </Modal>
  );
}
