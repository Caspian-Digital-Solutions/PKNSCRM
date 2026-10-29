import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '../components/DataTable.jsx';
import { exportCsv } from '../components/ExportButton.jsx';
import { PageHead, SearchBox, auditEntry } from '../components/bits.jsx';
import { Dropzone } from '../components/controls.jsx';
import Kpi from '../components/Kpi.jsx';
import { CONSENT_UNKNOWN, IMPORT_MERGED, IMPORT_ROWS, LEGACY_PROFILES, POSTCODES } from '../data/config.js';
import { findExistingId, normaliseMobile } from '../data/submit.js';
import { useAmp } from '../useAmp.jsx';
import { dateTime, num } from '../format.js';

const FIELDS = [
  { key: 'fullName', label: 'Full name', synonyms: ['name', 'nama', 'full name', 'fullname'] },
  { key: 'mobile', label: 'Mobile', synonyms: ['phone', 'mobile', 'telefon', 'tel', 'hp', 'no telefon'] },
  { key: 'email', label: 'Email', synonyms: ['email', 'emel', 'e-mail'] },
  { key: 'postcode', label: 'Postcode', synonyms: ['postcode', 'poskod', 'zip'] },
  { key: 'ageBand', label: 'Age band', synonyms: ['age', 'umur', 'age band'] },
  { key: 'gender', label: 'Gender', synonyms: ['gender', 'jantina'] },
];
const STEPS = ['Upload', 'Map columns', 'Validate', 'De-duplicate', 'Consent', 'Confirm'];
const SHEET_ROWS = [
  { Nama: 'Aishah Karim', Telefon: '0123456789', Emel: 'aishah.sheet@example.com', Poskod: '40100' },
  { Nama: 'Bad mobile', Telefon: '123', Emel: 'bad.sheet@example.com', Poskod: '40100' },
  { Nama: 'Unknown postcode', Telefon: '0138882211', Emel: 'pc.sheet@example.com', Poskod: '99999' },
  { Nama: '', Telefon: '0142223344', Emel: 'noname.sheet@example.com', Poskod: '47810' },
];

function suggest(header) {
  const key = String(header || '').trim().toLowerCase();
  const hit = FIELDS.find((field) => field.synonyms.includes(key) || field.key.toLowerCase() === key);
  return hit ? hit.key : '';
}

function readSheet(file) {
  return file.arrayBuffer().then((buffer) => {
    const book = XLSX.read(buffer, { type: 'array' });
    const sheet = book.Sheets[book.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  });
}

export default function ImportData() {
  const { data, state, dispatch, assets, allActivations, imports } = useAmp();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [activationId, setActivationId] = useState('');
  const [consentMode, setConsentMode] = useState('unknown');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const knownPostcodes = useMemo(() => new Set(POSTCODES.map((item) => item.code)), []);

  const loadRows = (nextRows, name) => {
    setRows(nextRows);
    setFileName(name);
    const next = {};
    Object.keys(nextRows[0] || {}).forEach((header) => { next[header] = suggest(header); });
    setMapping(next);
    setStep(1);
    setMessage('');
  };

  const valueOf = (row, key) => {
    const header = Object.keys(mapping).find((name) => mapping[name] === key);
    return header ? row[header] : '';
  };

  const reviewed = useMemo(() => rows.map((row, index) => {
    const mobile = normaliseMobile(valueOf(row, 'mobile'));
    const email = String(valueOf(row, 'email') || '').trim();
    const postcode = String(valueOf(row, 'postcode') || '').trim();
    const fullName = String(valueOf(row, 'fullName') || '').trim();
    const errors = [];
    if (!fullName) errors.push('Missing name');
    if (!/^01\d{8,9}$/.test(mobile)) errors.push('Invalid phone');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email');
    if (postcode && !knownPostcodes.has(postcode)) errors.push('Unrecognised postcode');
    const existingId = !errors.length ? findExistingId(data, state, mobile, email) : null;
    return { index: index + 2, fullName, mobile, email, postcode, ageBand: valueOf(row, 'ageBand'), gender: valueOf(row, 'gender'), errors, existingId };
  }), [rows, mapping, data, state, knownPostcodes]);

  const valid = reviewed.filter((row) => !row.errors.length);
  const invalid = reviewed.filter((row) => row.errors.length);
  const merges = valid.filter((row) => row.existingId);
  const creates = valid.filter((row) => !row.existingId);

  const confirm = () => {
    const profiles = creates.map((row, index) => ({
      id: `PR-I${state.seq}-${index + 1}`,
      fullName: row.fullName,
      mobile: row.mobile,
      email: row.email,
      postcode: row.postcode,
      area: POSTCODES.find((item) => item.code === row.postcode)?.area || '',
      ageBand: row.ageBand || '',
      gender: row.gender || '',
      householdSize: null,
      childrenCount: 0,
      childrenAgeBands: [],
      interests: [],
      leadTypes: ['Visitor'],
      firstSeen: '2026-10-28',
      lastSeen: '2026-10-28',
      sourceChannelFirst: 'Legacy import',
      assetIds: assetId ? [assetId] : [],
      activationIds: activationId ? [activationId] : [],
      links: activationId ? [{ activationId, isNew: true, spendRM: 0 }] : [],
      totalActivationsAttended: activationId ? 1 : 0,
      consent: {
        required: true,
        marketingOptIn: false,
        unknown: consentMode === 'unknown',
        consentDate: consentMode === 'unknown' ? null : '2026-10-28',
        consentVersion: consentMode === 'unknown' ? '' : 'legacy',
        source: 'Legacy import',
      },
      importedFromLegacy: true,
      legacySourceFile: fileName,
    }));
    const mergePatches = merges.map((row) => ({
      id: row.existingId,
      patch: {
        lastSeen: '2026-10-28',
        assetIds: assetId ? undefined : undefined,
        legacySourceFile: fileName,
      },
    }));
    dispatch({
      type: 'addImport',
      job: {
        id: `IMP-L${state.seq}`,
        fileName,
        uploadedBy: 'Farah Idris',
        uploadedAt: '2026-10-28T09:30:00+08:00',
        rowsTotal: rows.length,
        rowsImported: creates.length,
        duplicatesMerged: merges.length,
        rowsRejected: invalid.length,
        status: 'Completed',
        consentMode,
        fieldMapping: mapping,
        errors: invalid.slice(0, 20).map((row) => ({ row: row.index, field: 'row', message: row.errors.join(', ') })),
      },
      profiles,
      merges: mergePatches,
      entry: auditEntry(state, 'Imported file', 'Import', fileName, `${fileName}: ${creates.length} imported, ${merges.length} merged, ${invalid.length} rejected. Consent ${consentMode}.`),
    });
    setMessage(`${fileName} imported. ${num(creates.length)} profiles created, ${num(merges.length)} merged, ${num(invalid.length)} rejected.`);
    setStep(0);
    setRows([]);
  };

  const history = imports.filter((job) => !query.trim() || `${job.fileName} ${job.status}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <section>
      <PageHead title="Data Import" lede="One-time load of legacy Google Forms and Excel files." />
      <div className="kpi-row">
        <Kpi label="Rows imported" value={IMPORT_ROWS} format={num} />
        <Kpi label="Merged duplicates" value={IMPORT_MERGED} format={num} />
        <Kpi label="Profiles created" value={LEGACY_PROFILES} format={num} />
        <Kpi label="Consent unknown" value={CONSENT_UNKNOWN} format={num} />
      </div>
      <ol className="stepper">
        {STEPS.map((label, index) => (
          <li key={label}><button type="button" onClick={() => rows.length && setStep(index)}><span className={step === index ? 'on' : index < step ? 'done' : ''}>{index < step ? '✓' : index + 1}</span>{label}</button></li>
        ))}
      </ol>
      {step === 0 && (
        <div className="dialog-form">
          <Dropzone accept=".xlsx,.xls,.csv" label="Drop an .xlsx or .csv file" onFile={(file) => {
            readSheet(file).then((parsed) => loadRows(parsed, file.name)).catch(() => setMessage('Could not read that file.'));
          }} />
          <button type="button" className="btn" onClick={() => loadRows(SHEET_ROWS, 'Google Sheet – sample visitor list')}>Connect Google Sheet</button>
          {message && <p>{message}</p>}
        </div>
      )}
      {step === 1 && (
        <div>
          <p>{fileName} · {num(rows.length)} rows</p>
          <label>Tag all rows with asset
            <select value={assetId} onChange={(event) => setAssetId(event.target.value)}>
              <option value="">Do not tag</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
          </label>
          <label>Tag all rows with activation
            <select value={activationId} onChange={(event) => setActivationId(event.target.value)}>
              <option value="">Do not tag</option>
              {allActivations.filter((act) => !assetId || act.assetId === assetId).slice(0, 40).map((act) => <option key={act.id} value={act.id}>{act.name}</option>)}
            </select>
          </label>
          <DataTable
            columns={[
              { key: 'header', label: 'Source column' },
              { key: 'sample', label: 'Sample' },
              { key: 'target', label: 'Profile field', format: (_value, row) => (
                <select aria-label={`Map ${row.header}`} value={mapping[row.header] || ''} onChange={(event) => setMapping({ ...mapping, [row.header]: event.target.value })}>
                  <option value="">Ignore column</option>
                  {FIELDS.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                </select>
              ) },
            ]}
            rows={headers.map((header) => ({ id: header, header, sample: String(rows[0][header] ?? ''), target: mapping[header] || '' }))}
            exportName="import-mapping"
          />
          <button type="button" className="btn" onClick={() => setStep(2)}>Continue</button>
        </div>
      )}
      {step === 2 && (
        <div>
          <p>Valid rows {num(valid.length)} · Invalid phone or email {num(invalid.filter((row) => row.errors.some((item) => /phone|email/i.test(item))).length)} · Missing required {num(invalid.filter((row) => row.errors.includes('Missing name')).length)} · Unrecognised postcodes {num(invalid.filter((row) => row.errors.includes('Unrecognised postcode')).length)}</p>
          <button type="button" className="btn" onClick={() => exportCsv({ filename: 'import-errors', columns: [{ label: 'Row', key: 'index' }, { label: 'Errors', key: 'errors' }], rows: invalid.map((row) => ({ ...row, errors: row.errors.join('; ') })) })}>Download error list</button>
          <DataTable columns={[{ key: 'index', label: 'Row' }, { key: 'fullName', label: 'Name' }, { key: 'errors', label: 'Errors', format: (value) => value.join(', ') }]} rows={invalid.map((row) => ({ ...row, id: row.index }))} exportName="import-errors-preview" empty="No invalid rows." />
          <button type="button" className="btn" onClick={() => setStep(3)}>Continue</button>
        </div>
      )}
      {step === 3 && (
        <div>
          <p>{num(merges.length)} duplicates will be merged into existing profiles.</p>
          <DataTable columns={[{ key: 'fullName', label: 'Incoming name' }, { key: 'mobile', label: 'Mobile' }, { key: 'existingId', label: 'Existing profile' }]} rows={merges.slice(0, 5).map((row) => ({ ...row, id: row.index }))} exportName="import-merge-sample" empty="No duplicates in this file." />
          <button type="button" className="btn" onClick={() => setStep(4)}>Continue</button>
        </div>
      )}
      {step === 4 && (
        <form className="dialog-form" onSubmit={(event) => { event.preventDefault(); setStep(5); }}>
          <label><input type="radio" name="consent" checked={consentMode === 'captured'} onChange={() => setConsentMode('captured')} /> Consent captured at source (Google Form had consent)</label>
          <label><input type="radio" name="consent" checked={consentMode === 'unknown'} onChange={() => setConsentMode('unknown')} /> Consent unknown – exclude from marketing exports until re-consented</label>
          <button type="submit" className="btn">Continue</button>
        </form>
      )}
      {step === 5 && (
        <div>
          <p>{fileName}: create {num(creates.length)}, merge {num(merges.length)}, reject {num(invalid.length)}. Consent: {consentMode === 'unknown' ? 'Consent unknown' : 'Consent captured at source'}.</p>
          <button type="button" className="btn" onClick={confirm}>Confirm and import</button>
        </div>
      )}
      <h2>Import history</h2>
      <div className="table-toolbar"><SearchBox value={query} onChange={setQuery} placeholder="Search import files" /></div>
      <DataTable
        columns={[
          { key: 'fileName', label: 'File' },
          { key: 'uploadedBy', label: 'Uploaded by' },
          { key: 'uploadedAt', label: 'Uploaded', format: dateTime },
          { key: 'rowsTotal', label: 'Rows', align: 'right', format: num, total: 'sum' },
          { key: 'rowsImported', label: 'Imported', align: 'right', format: num, total: 'sum' },
          { key: 'duplicatesMerged', label: 'Merged', align: 'right', format: num, total: 'sum' },
          { key: 'rowsRejected', label: 'Rejected', align: 'right', format: num, total: 'sum' },
          { key: 'status', label: 'Status' },
          { key: 'consentMode', label: 'Consent', format: (value) => (value === 'unknown' ? 'Consent unknown' : 'Consent captured at source') },
        ]}
        rows={history}
        totals
        exportName="import-history"
        pageSizes={[25, 50, 100]}
        empty="No import jobs."
      />
    </section>
  );
}
