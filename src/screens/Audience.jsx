import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { PageHead, SearchBox, linkTo, personal } from '../components/bits.jsx';
import { maskName, maskPhone } from '../mask.js';
import { AGE_BANDS, LEAD_TYPES, SOURCE_CHANNELS } from '../data/config.js';
import { filterProfiles } from '../data/selectors.js';
import { useAmp } from '../useAmp.jsx';
import { date, num } from '../format.js';

export default function Audience() {
  const amp = useAmp();
  const { profiles, scope, route, state } = amp;
  const [query, setQuery] = useState('');
  const [lead, setLead] = useState(route.search.lead || '');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [children, setChildren] = useState('');
  const [consent, setConsent] = useState(route.search.consent || '');
  const [source, setSource] = useState('');
  const [legacy, setLegacy] = useState('');
  const stock = route.search.stock === '1';
  const arrived = route.search.arrived === '1';
  const activation = route.search.activation || '';
  const rows = useMemo(() => {
    let list = filterProfiles(profiles, scope, scope.from, scope.to, { stock: stock || !arrived });
    if (arrived) list = list.filter((profile) => profile.firstSeen >= scope.from && profile.firstSeen <= scope.to);
    if (activation) list = profiles.filter((profile) => (profile.activationIds || []).includes(activation) || (profile.links || []).some((link) => link.activationId === activation));
    if (lead) list = list.filter((profile) => profile.leadTypes?.includes(lead));
    if (age) list = list.filter((profile) => profile.ageBand === age);
    if (gender) list = list.filter((profile) => profile.gender === gender);
    if (children === 'Yes') list = list.filter((profile) => profile.childrenCount > 0);
    if (children === 'No') list = list.filter((profile) => !profile.childrenCount);
    if (consent === 'yes') list = list.filter((profile) => profile.consent?.marketingOptIn && !profile.consent.unknown);
    if (consent === 'no') list = list.filter((profile) => !profile.consent?.marketingOptIn || profile.consent.unknown);
    if (source) list = list.filter((profile) => profile.sourceChannelFirst === source);
    if (legacy === 'Yes') list = list.filter((profile) => profile.importedFromLegacy);
    if (legacy === 'No') list = list.filter((profile) => !profile.importedFromLegacy);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((profile) => `${profile.fullName} ${profile.mobile} ${profile.area} ${profile.email}`.toLowerCase().includes(q));
    }
    return list;
  }, [profiles, scope, stock, arrived, activation, lead, age, gender, children, consent, source, legacy, query]);
  const consentedRows = rows.filter((profile) => profile.consent?.marketingOptIn && !profile.consent.unknown);
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'area', label: 'Area' },
    { key: 'ageBand', label: 'Age band' },
    { key: 'leads', label: 'Lead types' },
    { key: 'attended', label: 'Activations attended', align: 'right', format: num },
    { key: 'assets', label: 'Assets engaged' },
    { key: 'firstSeen', label: 'First seen' },
    { key: 'lastSeen', label: 'Last seen' },
    { key: 'consent', label: 'Marketing consent' },
    { key: 'source', label: 'Source' },
  ];
  const shaped = rows.map((profile) => ({
    id: profile.id,
    name: personal(profile, state.role, state.revealed, 'fullName'),
    mobile: personal(profile, state.role, state.revealed, 'mobile'),
    area: profile.area,
    ageBand: profile.ageBand,
    leads: (profile.leadTypes || []).join(', '),
    attended: profile.totalActivationsAttended,
    assets: (profile.assetIds || []).length,
    firstSeen: date(profile.firstSeen),
    lastSeen: date(profile.lastSeen),
    consent: profile.consent?.marketingOptIn ? 'Yes' : 'No',
    source: profile.sourceChannelFirst,
    email: profile.email,
  }));
  const exportRows = (state.role === 'amp-manager' ? consentedRows : rows).map((profile) => ({
    name: state.role === 'amp-manager' ? profile.fullName : maskName(profile.fullName),
    mobile: state.role === 'amp-manager' ? profile.mobile : maskPhone(profile.mobile),
    area: profile.area,
    ageBand: profile.ageBand,
    leads: (profile.leadTypes || []).join(', '),
    attended: profile.totalActivationsAttended,
    assets: (profile.assetIds || []).length,
    firstSeen: date(profile.firstSeen),
    lastSeen: date(profile.lastSeen),
    consent: profile.consent?.marketingOptIn ? 'Yes' : 'No',
    source: profile.sourceChannelFirst,
  }));
  return (
    <section>
      <PageHead title="Audience" />
      <p className="fine">Profiles are built only from information people provide to PKNS and their participation in PKNS activations and channels.</p>
      {state.role === 'amp-manager' && <p className="fine">Contact export includes consented profiles only. {num(rows.length - consentedRows.length)} excluded.</p>}
      <div className="filters">
        <SearchBox value={query} onChange={setQuery} placeholder="Search profiles" />
        <label>Lead type<select value={lead} onChange={(event) => setLead(event.target.value)}><option value="">All</option>{LEAD_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Age band<select value={age} onChange={(event) => setAge(event.target.value)}><option value="">All</option>{AGE_BANDS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">All</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select></label>
        <label>Has children<select value={children} onChange={(event) => setChildren(event.target.value)}><option value="">All</option><option>Yes</option><option>No</option></select></label>
        <label>Consent<select value={consent} onChange={(event) => setConsent(event.target.value)}><option value="">All</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Source<select value={source} onChange={(event) => setSource(event.target.value)}><option value="">All</option>{SOURCE_CHANNELS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Legacy imported<select value={legacy} onChange={(event) => setLegacy(event.target.value)}><option value="">All</option><option>Yes</option><option>No</option></select></label>
      </div>
      <DataTable columns={columns} rows={shaped} exportRows={exportRows} pageSizes={[25, 50, 100]} exportName="audience" onRowClick={(row) => { window.location.hash = linkTo(`profile/${row.id}`, route.search); }} />
    </section>
  );
}
