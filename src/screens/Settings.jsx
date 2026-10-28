import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import { PageHead, SampleBadge, SearchBox, auditEntry } from '../components/bits.jsx';
import { ROLES } from '../access.js';
import { INTEGRATIONS } from '../data/config.js';
import { liveFields, liveUsers } from '../data/live.js';
import { useAmp } from '../useAmp.jsx';
import { date, dateTime } from '../format.js';

const TABS = ['Users & Roles', 'Operators', 'Field Library', 'Integrations', 'Data Retention', 'Hosting & Security', 'Audit Log'];

export default function Settings() {
  const amp = useAmp();
  const [tab, setTab] = useState(TABS[0]);
  return (
    <section>
      <PageHead title="Settings" lede="Users, operators, fields, integrations, retention and the audit log." />
      <div className="tabs">
        {TABS.map((name) => <button key={name} type="button" className="btn" aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>{name}</button>)}
      </div>
      {tab === 'Users & Roles' && <Users amp={amp} />}
      {tab === 'Operators' && <Operators amp={amp} />}
      {tab === 'Field Library' && <Fields amp={amp} />}
      {tab === 'Integrations' && <Integrations />}
      {tab === 'Data Retention' && <Retention amp={amp} />}
      {tab === 'Hosting & Security' && (
        <article className="info-card">
          <h2>Hosting & Security</h2>
          <p>Hosted in Malaysia · Role-based access · Encryption in transit and at rest · Audit logging · Aligned to PKNS ICT and cybersecurity requirements</p>
        </article>
      )}
      {tab === 'Audit Log' && <Audit amp={amp} />}
    </section>
  );
}

function Users({ amp }) {
  const { data, state, dispatch } = amp;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'amp-executive' });
  const users = liveUsers(data, state).filter((user) => !query.trim() || `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div>
      <div className="table-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Search users" />
        <button type="button" className="btn" onClick={() => setOpen(true)}>Invite user</button>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'roleName', label: 'Role' },
          { key: 'assets', label: 'Assigned assets' },
          { key: 'status', label: 'Status' },
          { key: 'lastLogin', label: 'Last login', format: (value) => (value ? dateTime(value) : '–') },
        ]}
        rows={users.map((user) => ({ ...user, roleName: ROLES[user.role]?.name || user.role, assets: (user.assetIds || []).join(', ') || 'All' }))}
        exportName="users"
        pageSizes={[25, 50, 100]}
        empty="No users."
      />
      <Modal open={open} title="Invite user" onClose={() => setOpen(false)}>
        <form className="dialog-form" onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: 'addUser', user: { id: `u-${state.seq}`, ...form, operatorId: null, assetIds: [], status: 'Invited', lastLogin: null } });
          dispatch({ type: 'audit', entry: auditEntry(state, 'Changed role', 'User', form.email, `Invited ${form.name} as ${ROLES[form.role]?.name || form.role}`) });
          setOpen(false);
        }}
        >
          <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {Object.values(ROLES).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </label>
          <button type="submit" className="btn">Send invite</button>
        </form>
      </Modal>
    </div>
  );
}

function Operators({ amp }) {
  const { operators, assets, dispatch, state } = amp;
  const [form, setForm] = useState({ name: '', contactName: '', contactEmail: '', assetIds: [] });
  const toggle = (id) => setForm((current) => ({ ...current, assetIds: current.assetIds.includes(id) ? current.assetIds.filter((item) => item !== id) : [...current.assetIds, id] }));
  const save = (event) => {
    event.preventDefault();
    const id = `op-${state.seq}`;
    dispatch({ type: 'addOperator', operator: { id, ...form } });
    form.assetIds.forEach((assetId) => dispatch({ type: 'patchAsset', id: assetId, patch: { operatorId: id } }));
    setForm({ name: '', contactName: '', contactEmail: '', assetIds: [] });
  };
  return (
    <div>
      <DataTable
        columns={[
          { key: 'name', label: 'Operator' },
          { key: 'contactName', label: 'Contact' },
          { key: 'contactEmail', label: 'Email' },
          { key: 'assets', label: 'Assets' },
        ]}
        rows={operators.map((item) => ({ ...item, assets: assets.filter((asset) => item.assetIds?.includes(asset.id) || asset.operatorId === item.id).map((asset) => asset.shortCode).join(', ') }))}
        exportName="operators"
        empty="No operators."
      />
      <h2>Add operator</h2>
      <form className="dialog-form" onSubmit={save}>
        <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Contact name<input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} /></label>
        <label>Email<input type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></label>
        <fieldset>
          <legend>Assets</legend>
          {assets.map((asset) => (
            <label key={asset.id}><input type="checkbox" checked={form.assetIds.includes(asset.id)} onChange={() => toggle(asset.id)} />{asset.name}</label>
          ))}
        </fieldset>
        <button type="submit" className="btn">Save operator</button>
      </form>
    </div>
  );
}

function Fields({ amp }) {
  const { data, state, dispatch } = amp;
  const fields = liveFields(data, state);
  const [form, setForm] = useState({ labelEN: '', labelBM: '', type: 'text', isPersonalData: false });
  return (
    <div>
      <DataTable
        columns={[
          { key: 'labelEN', label: 'Label (EN)' },
          { key: 'labelBM', label: 'Label (BM)' },
          { key: 'type', label: 'Type' },
          { key: 'isPersonalData', label: 'Personal data', format: (value, row) => (row ? <input aria-label={`Personal data ${row.labelEN}`} type="checkbox" checked={Boolean(value)} onChange={(event) => dispatch({ type: 'patchField', id: row.id, patch: { isPersonalData: event.target.checked } })} /> : null) },
        ]}
        rows={fields}
        exportName="field-library"
        pageSizes={[25, 50, 100]}
      />
      <h2>Add field</h2>
      <form className="dialog-form" onSubmit={(event) => {
        event.preventDefault();
        const key = form.labelEN.toLowerCase().replace(/[^a-z0-9]+/g, '') || `field${state.seq}`;
        dispatch({ type: 'addField', field: { id: key, key, ...form, required: false } });
        setForm({ labelEN: '', labelBM: '', type: 'text', isPersonalData: false });
      }}
      >
        <label>Label EN<input required value={form.labelEN} onChange={(event) => setForm({ ...form, labelEN: event.target.value })} /></label>
        <label>Label BM<input value={form.labelBM} onChange={(event) => setForm({ ...form, labelBM: event.target.value })} /></label>
        <label>Type
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            {['text', 'phone', 'email', 'number', 'select', 'checkbox'].map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={form.isPersonalData} onChange={(event) => setForm({ ...form, isPersonalData: event.target.checked })} /> Personal data</label>
        <button type="submit" className="btn">Add field</button>
      </form>
    </div>
  );
}

function Integrations() {
  return (
    <div className="card-grid">
      {INTEGRATIONS.map((item) => (
        <article key={item.id} className="info-card">
          {(item.status === 'Sample data' || item.id === 'rentx') && <SampleBadge text={item.id === 'rentx' ? 'Sample data, not connected' : 'Sample data, not connected'} />}
          <h2>{item.name}</h2>
          <p>Status: {item.status}</p>
          <p>Method: {item.method}</p>
          <p>Direction: {item.direction}</p>
          <p>Owner: {item.owner}</p>
          <p>{item.notes}</p>
        </article>
      ))}
    </div>
  );
}

function Retention({ amp }) {
  const { state, data, dispatch } = amp;
  const [months, setMonths] = useState(state.retentionMonths);
  const [auto, setAuto] = useState(state.autoAnonymise);
  const requests = [...state.deletionRequests, ...(data.deletionRequests || []).filter((item) => !state.deletionRequests.some((row) => row.id === item.id))];
  return (
    <div>
      <form className="dialog-form" onSubmit={(event) => { event.preventDefault(); dispatch({ type: 'retention', months: Number(months) || 36, autoAnonymise: auto }); }}>
        <label>Retention for inactive profiles (months)<input type="number" min="1" value={months} onChange={(event) => setMonths(event.target.value)} /></label>
        <label><input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} /> Auto-anonymise when retention ends</label>
        <button type="submit" className="btn">Save retention</button>
      </form>
      <h2>Pending deletion requests</h2>
      <DataTable columns={[{ key: 'profileId', label: 'Profile' }, { key: 'requestedBy', label: 'Requested by' }, { key: 'requestedAt', label: 'Requested', format: date }, { key: 'status', label: 'Status' }, { key: 'note', label: 'Note' }]} rows={requests} exportName="deletion-requests" empty="No deletion requests." />
    </div>
  );
}

function Audit({ amp }) {
  const { audit } = amp;
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');
  const actions = useMemo(() => [...new Set(audit.map((row) => row.action))].sort(), [audit]);
  const rows = audit.filter((row) => (!action || row.action === action) && (!query.trim() || `${row.userName} ${row.details} ${row.targetId} ${row.action}`.toLowerCase().includes(query.trim().toLowerCase())));
  return (
    <div>
      <div className="table-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Search audit log" />
        <select aria-label="Action" value={action} onChange={(event) => setAction(event.target.value)}>
          <option value="">All actions</option>
          {actions.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>
      <DataTable
        columns={[
          { key: 'timestamp', label: 'When', format: dateTime },
          { key: 'userName', label: 'User' },
          { key: 'role', label: 'Role' },
          { key: 'action', label: 'Action' },
          { key: 'targetType', label: 'Target' },
          { key: 'targetId', label: 'Id' },
          { key: 'details', label: 'Details' },
        ]}
        rows={rows}
        exportName="audit-log"
        pageSizes={[25, 50, 100]}
        empty="No audit entries."
      />
    </div>
  );
}
