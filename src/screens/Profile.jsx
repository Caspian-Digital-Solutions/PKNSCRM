import { useEffect, useState } from 'react';
import { can } from '../access.js';
import Avatar from '../components/Avatar.jsx';
import ChartCard from '../components/ChartCard.jsx';
import { Donut, VBars } from '../components/Charts.jsx';
import Modal from '../components/Modal.jsx';
import { PageHead, Status, auditEntry, linkTo, personal } from '../components/bits.jsx';
import { ASSET_COLOURS } from '../data/config.js';
import { findProfile } from '../data/live.js';
import { monthKey } from '../data/metrics.js';
import { useAmp } from '../useAmp.jsx';
import { date } from '../format.js';

export default function Profile({ id }) {
  const { data, state, dispatch, allActivations, assets, forms, route } = useAmp();
  const profile = findProfile(data, state, id);
  const revealed = Boolean(state.revealed?.[id]);
  const [confirm, setConfirm] = useState('');
  useEffect(() => {
    if (!profile) return;
    dispatch({ type: 'audit', entry: auditEntry(state, 'Viewed profile', 'Profile', id, `Opened ${id}`) });
  }, [id]);
  if (!profile) return <p>Profile not found.</p>;
  const show = (field) => personal(profile, state.role, revealed, field);
  const acts = (profile.links || []).map((link) => ({ ...link, act: allActivations.find((item) => item.id === link.activationId) })).filter((row) => row.act).sort((a, b) => b.act.startDate.localeCompare(a.act.startDate));
  const months = [...new Set(acts.map((row) => monthKey(row.act.startDate)))].sort();
  const byMonth = months.map((month) => ({ name: month, value: acts.filter((row) => monthKey(row.act.startDate) === month).length }));
  const byAsset = (profile.assetIds || []).map((assetId) => ({
    name: assets.find((asset) => asset.id === assetId)?.name || assetId,
    value: acts.filter((row) => row.act.assetId === assetId).length,
    colour: ASSET_COLOURS[assetId],
  }));
  const run = (kind) => {
    if (kind === 'withdraw') {
      dispatch({
        type: 'patchProfile',
        id,
        patch: { consent: { marketingOptIn: false, withdrawn: true } },
        entry: auditEntry(state, 'Withdrew consent', 'Profile', id, 'Marketing consent withdrawn'),
      });
    } else {
      dispatch({ type: 'deleteProfile', id, entry: auditEntry(state, 'Deleted profile', 'Profile', id, 'Delete on request') });
      window.location.hash = linkTo('audience', route.search);
    }
    setConfirm('');
  };
  return (
    <section>
      <PageHead title={profile.fullName} lede={`${profile.area} · ${profile.ageBand}`} back={{ href: linkTo('audience', route.search), label: 'Audience' }} actions={can(state.role, 'profile.reveal') && !revealed ? <button type="button" className="btn" onClick={() => dispatch({ type: 'reveal', id, entry: auditEntry(state, 'Revealed contact', 'Profile', id, `Revealed ${id}`) })}>Reveal contact</button> : null} />
      <article className="info-card">
        <div className="person-cell">
          <Avatar name={profile.fullName} size={64} />
          <div>
            <h2 style={{ margin: 0 }}>{profile.fullName}</h2>
            <p>{profile.area} · {profile.ageBand} · {profile.gender}</p>
            <p>{(profile.leadTypes || []).map((lead) => <Status key={lead} value={lead} />)} <Status value={profile.consent?.unknown ? 'Consent unknown' : profile.consent?.marketingOptIn ? 'Opted in' : 'Not opted in'} /></p>
            <p>Member since {date(profile.firstSeen)} · Last seen {date(profile.lastSeen)}</p>
          </div>
        </div>
      </article>
      <div className="chart-grid">
        <div className="span-6 info-card">
          <h3>Household</h3>
          <p>Size {profile.householdSize ?? '–'} · Children {profile.childrenCount || 0}</p>
          <p>{(profile.childrenAgeBands || []).map((band) => <Status key={band} value={band} />)}</p>
          <h3>Interests</h3>
          <p>{(profile.interests || []).map((item) => <Status key={item} value={item} />)}</p>
          <h3>Contact</h3>
          <p>Mobile {show('mobile')}</p>
          <p>Email {show('email')}</p>
          <h3>Source</h3>
          <p>{profile.sourceChannelFirst}{profile.legacySourceFile ? ` · ${profile.legacySourceFile}` : ''}</p>
          {can(state.role, 'profile.privacy') && (
            <div className="screen-actions">
              <button type="button" className="btn" onClick={() => setConfirm('withdraw')}>Withdraw consent</button>
              <button type="button" className="btn" onClick={() => setConfirm('delete')}>Delete on request</button>
            </div>
          )}
        </div>
        <div className="span-6">
          <h3>Activity</h3>
          <ol className="timeline">
            {acts.map((row) => (
              <li key={row.act.id}>
                <i className="asset-dot" style={{ background: ASSET_COLOURS[row.act.assetId] }} />
                <a href={linkTo(`activation/${row.act.id}`, route.search)}>{row.act.name}</a>
                <span>{date(row.act.startDate)} · {row.isNew ? 'First visit' : 'Returning'} · {forms.find((form) => form.activationId === row.act.id)?.publicTitle || 'Activation'}</span>
              </li>
            ))}
          </ol>
          <div className="chart-grid">
            <div className="span-6"><ChartCard title="Activations per month" rows={byMonth} exportName="profile-months"><VBars data={byMonth} /></ChartCard></div>
            <div className="span-6"><ChartCard title="Assets engaged" rows={byAsset} exportName="profile-assets"><Donut data={byAsset} /></ChartCard></div>
          </div>
        </div>
      </div>
      <Modal open={Boolean(confirm)} title={confirm === 'delete' ? 'Delete this profile on request?' : 'Withdraw marketing consent?'} onClose={() => setConfirm('')}>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => setConfirm('')}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => run(confirm)}>Confirm</button>
        </div>
      </Modal>
    </section>
  );
}
