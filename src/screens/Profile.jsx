import { useEffect } from 'react';
import { can } from '../access.js';
import { PageHead, auditEntry, personal } from '../components/bits.jsx';
import { useAmp } from '../useAmp.jsx';
import { findProfile } from '../data/live.js';
import { date } from '../format.js';

export default function Profile({ id }) {
  const { data, state, dispatch, allActivations } = useAmp();
  const profile = findProfile(data, state, id);
  const revealed = Boolean(state.revealed?.[id]);
  useEffect(() => {
    if (!profile) return;
    dispatch({ type: 'audit', entry: auditEntry(state, 'Viewed profile', 'Profile', id, `Opened ${id}`) });
  }, [id]);
  if (!profile) return <p>Profile not found.</p>;
  const show = (field) => personal(profile, state.role, revealed, field);
  return (
    <section>
      <PageHead title={show('fullName')} lede="Profile" actions={state.role === 'management' && can(state.role, 'profile.reveal') && !revealed ? <button type="button" className="btn" onClick={() => dispatch({ type: 'reveal', id, entry: auditEntry(state, 'Revealed contact', 'Profile', id, `Revealed ${id}`) })}>Reveal contact</button> : null} />
      <div className="fact-grid">
        <div><div className="fact-label">Mobile</div><div>{show('mobile')}</div></div>
        <div><div className="fact-label">Email</div><div>{show('email')}</div></div>
        <div><div className="fact-label">Postcode</div><div>{profile.postcode}</div></div>
        <div><div className="fact-label">Area</div><div>{profile.area}</div></div>
        <div><div className="fact-label">Age band</div><div>{profile.ageBand}</div></div>
        <div><div className="fact-label">Gender</div><div>{profile.gender}</div></div>
        <div><div className="fact-label">Household size</div><div>{profile.householdSize ?? '–'}</div></div>
        <div><div className="fact-label">Children</div><div>{profile.childrenCount}</div></div>
        <div><div className="fact-label">Children's age bands</div><div>{(profile.childrenAgeBands || []).join(', ') || '–'}</div></div>
        <div><div className="fact-label">Interests</div><div>{(profile.interests || []).join(', ') || '–'}</div></div>
        <div><div className="fact-label">Lead types</div><div>{(profile.leadTypes || []).join(', ')}</div></div>
        <div><div className="fact-label">Source</div><div>{profile.sourceChannelFirst}</div></div>
      </div>
      <h2>Consent</h2>
      <p>Required consent: Yes · Marketing opt-in: {profile.consent?.marketingOptIn ? 'Yes' : 'No'} · Unknown: {profile.consent?.unknown ? 'Yes' : 'No'}</p>
      <p>Date {date(profile.consent?.consentDate)} · Version {profile.consent?.consentVersion || '–'} · Source {profile.consent?.source}</p>
      {profile.consent?.withdrawn && <p>Consent withdrawn.</p>}
      {can(state.role, 'profile.privacy') && (
        <div className="screen-actions">
          <button type="button" className="btn" onClick={() => dispatch({ type: 'patchProfile', id, patch: { consent: { marketingOptIn: false, withdrawn: true } }, entry: auditEntry(state, 'Withdrew consent', 'Profile', id, `Withdrew marketing consent for ${id}`) })}>Withdraw consent</button>
          <button type="button" className="btn" onClick={() => { dispatch({ type: 'deleteProfile', id, entry: auditEntry(state, 'Deleted profile', 'Profile', id, `Deleted ${id} on request`) }); window.location.hash = '#/audience'; }}>Delete on request</button>
        </div>
      )}
      <h2>Activations attended</h2>
      <ul className="recent">
        {(profile.links || []).map((link) => {
          const act = allActivations.find((item) => item.id === link.activationId);
          return <li key={link.activationId}>{act?.name || link.activationId} · {link.isNew ? 'First activation' : 'Returning'} · {date(act?.startDate)}</li>;
        })}
      </ul>
    </section>
  );
}
