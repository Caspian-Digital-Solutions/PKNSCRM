import { useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import { PageHead, SearchBox, linkTo } from '../components/bits.jsx';
import { useAmp } from '../useAmp.jsx';
import { date } from '../format.js';

export default function Forms() {
  const { forms, activations, route } = useAmp();
  const [query, setQuery] = useState('');
  const rows = forms.map((form) => {
    const act = activations.find((item) => item.id === form.activationId) || null;
    return {
      ...form,
      activation: act?.name || '–',
      fieldsCount: form.fields?.length || 0,
      submissions: act?.outcomes?.registrations || 0,
      created: date(form.createdAt),
      activeLabel: form.active ? 'Yes' : 'No',
    };
  }).filter((form) => !query || `${form.name} ${form.activation}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section>
      <PageHead title="Forms & QR" lede="Capture forms linked to activations. The consent block is part of every form." />
      <SearchBox value={query} onChange={setQuery} placeholder="Search forms" />
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'activation', label: 'Linked activation' },
          { key: 'language', label: 'Language' },
          { key: 'fieldsCount', label: 'Fields', align: 'right' },
          { key: 'submissions', label: 'Submissions', align: 'right' },
          { key: 'activeLabel', label: 'Active' },
          { key: 'created', label: 'Created' },
        ]}
        rows={rows}
        pageSizes={[25, 50, 100]}
        exportName="forms"
        onRowClick={(row) => { window.location.hash = linkTo(`form/${row.id}`, route.search); }}
      />
    </section>
  );
}
