import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { go } from '../router.js';
import DataTable from '../components/DataTable.jsx';
import Num from '../components/Num.jsx';
import { assetDetail, liveAssets } from '../data/selectors.js';
import { num, rm, rm2, pct, x, date } from '../format.js';

const STATUSES = ['Occupied', 'Reserved', 'Vacant', 'Under redevelopment'];

function lotClass(status) {
  if (status === 'Occupied') return 'occupied';
  if (status === 'Reserved') return 'reserved';
  if (status === 'Under redevelopment') return 'redev';
  return 'vacant';
}

function occupancyText(detail) {
  if (detail.eventSpace) return 'n/a, priced per day';
  if (detail.counts?.occupancy == null) return 'n/a';
  return pct(detail.counts.occupancy);
}

export default function Asset({ params }) {
  const { state, data } = useStore();
  const assetId = params?.[0] || 'kpsa';
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const detail = useMemo(() => assetDetail(data, state, assetId), [data, state, assetId]);
  const [tab, setTab] = useState('lots');
  const [lotId, setLotId] = useState(null);
  const [photo, setPhoto] = useState(null);

  useEffect(() => { setLotId(null); setTab('lots'); }, [assetId]);

  useEffect(() => {
    let cancelled = false;
    setPhoto(null);
    fetch(`/assets/${assetId}.jpg`, { method: 'HEAD' })
      .then((res) => {
        const type = res.headers.get('content-type') || '';
        if (!cancelled && res.ok && type.includes('image')) setPhoto(`/assets/${assetId}.jpg`);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [assetId]);

  if (!detail) {
    return (
      <section>
        <h1 className="page-title">Asset detail</h1>
        <p>This asset is not on the portfolio.</p>
      </section>
    );
  }

  const { asset } = detail;
  const preferred = detail.units.find((unit) => unit.id === 'kpsa:4-07') || detail.units[0] || null;
  const selected = detail.units.find((unit) => unit.id === lotId) || preferred;
  const visitorAsset = Boolean(data.visitors?.byAsset?.[asset.id]);

  const lotColumns = [
    { key: 'lot', label: 'Lot' },
    { key: 'floor', label: 'Floor', filter: 'select' },
    { key: 'use', label: 'Use', filter: 'select' },
    { key: 'size', label: 'Size (sq ft)', align: 'right', format: (value) => num(value) },
    { key: 'psf', label: 'Asking rent psf', align: 'right', format: (value) => rm2(value) },
    { key: 'rent', label: 'Asking rent per month', align: 'right', format: (value) => rm(value) },
    {
      key: 'status',
      label: 'Status',
      filter: 'select',
      format: (value, row) => <Num value={value} watch={row ? `unit:${row.id}` : undefined} />,
    },
    {
      key: 'leaseWindow',
      label: 'Lease expiry',
      filter: 'select',
      filterLabel: 'Lease expiry',
      sortValue: (row) => row.leaseExpiry || '',
      exportValue: (row) => row.leaseExpiry || '',
      format: (_value, row) => date(row?.leaseExpiry),
    },
    { key: 'daysVacant', label: 'Days vacant', align: 'right', format: (value) => num(value) },
    { key: 'openEnquiries', label: 'Open enquiries', align: 'right', format: (value) => num(value) },
    { key: 'campaign', label: 'Campaign', format: (value) => value || '–' },
  ];

  const enquiryColumns = [
    {
      key: 'business',
      label: 'Business',
      format: (value, row) => (row ? (
        <a href={`#/enquiry/${row.id}`} onClick={(event) => { event.preventDefault(); go('enquiry', row.id); }}>{value}</a>
      ) : value),
    },
    { key: 'lot', label: 'Lot' },
    { key: 'stage', label: 'Stage', filter: 'select' },
    { key: 'source', label: 'Source', filter: 'select' },
    {
      key: 'officer',
      label: 'Officer',
      format: (value) => data.officers[value]?.name || '–',
    },
    { key: 'receivedAt', label: 'Received', format: (value) => date(value) },
  ];

  const campaignColumns = [
    {
      key: 'short',
      label: 'Campaign',
      format: (value, row) => (row ? (
        <a href={`#/campaign/${row.id}`} onClick={(event) => { event.preventDefault(); go('campaign', row.id); }}>{value}</a>
      ) : value),
    },
    { key: 'spend', label: 'Spend', align: 'right', format: (value) => rm(value) },
    { key: 'enquiries', label: 'Paid enquiries', align: 'right', format: (value) => num(value) },
    { key: 'viewings', label: 'Viewings', align: 'right', format: (value) => num(value) },
    { key: 'signed', label: 'Signed', align: 'right', format: (value) => num(value) },
    { key: 'cpl', label: 'CPL', align: 'right', format: (value) => rm2(value) },
    { key: 'firstYearValue', label: 'First-year rental value', align: 'right', format: (value) => rm(value) },
    { key: 'roas', label: 'ROAS', align: 'right', format: (value) => x(value) },
  ];

  const spaceColumns = [
    { key: 'name', label: 'Space' },
    { key: 'size', label: 'Size', format: (value) => value || '–' },
    { key: 'rate', label: 'Rate', align: 'right', format: (value) => rm(value) },
    { key: 'basis', label: 'Basis', format: (value) => value || '–' },
    { key: 'status', label: 'Status', format: (value) => value || '–' },
  ];

  const grouping = asset.grouping ? (
    detail.campaign ? (
      <a href={`#/campaign/${detail.campaign.id}`} onClick={(event) => { event.preventDefault(); go('campaign', detail.campaign.id); }}>{asset.grouping}</a>
    ) : asset.grouping
  ) : '–';

  return (
    <section>
      <div className="screen-head">
        <div>
          <h1 className="page-title">Asset detail</h1>
          <p className="lead">{asset.name}</p>
        </div>
        <label className="month-select">
          Asset
          <select data-testid="asset-select" value={assetId} onChange={(event) => go('asset', event.target.value)}>
            {assets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      <div className="asset-head">
        <div className="asset-photo">
          {photo ? <img src={photo} alt="" /> : <div className="asset-photo-fallback">{asset.name}</div>}
        </div>
        <dl className="fact-grid">
          <div><dt className="fact-label">Type</dt><dd className="fact-value">{asset.type}</dd></div>
          <div><dt className="fact-label">Location</dt><dd className="fact-value">{asset.location}</dd></div>
          <div><dt className="fact-label">Managing entity</dt><dd className="fact-value">{asset.entity}</dd></div>
          <div><dt className="fact-label">Campaign grouping</dt><dd className="fact-value">{grouping}</dd></div>
          <div>
            <dt className="fact-label">{detail.eventSpace ? 'Spaces' : 'Total units'}</dt>
            <dd className="fact-value">{detail.eventSpace ? `${num(detail.spaceCount)} spaces` : num(detail.counts?.total)}</dd>
          </div>
          <div><dt className="fact-label">Net lettable area</dt><dd className="fact-value">{detail.nla == null ? '–' : `${num(detail.nla)} sq ft`}</dd></div>
          <div><dt className="fact-label">Occupancy</dt><dd className="fact-value" data-testid="asset-occupancy">{occupancyText(detail)}</dd></div>
          <div>
            <dt className="fact-label">Median days vacant</dt>
            <dd className="fact-value">{detail.medianDaysVacant == null ? '–' : `${num(detail.medianDaysVacant)} days`}</dd>
          </div>
          <div><dt className="fact-label">Officer</dt><dd className="fact-value">{detail.officer?.name || '–'}</dd></div>
        </dl>
      </div>
      {asset.note ? <p className="footnote">{asset.note}</p> : null}

      <div className="tabs" role="tablist" aria-label="Asset sections">
        {[
          ['lots', detail.eventSpace ? 'Spaces' : 'Lots'],
          ['enquiries', 'Enquiries'],
          ['campaigns', 'Campaigns'],
          ['visitors', 'Visitors'],
        ].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'lots' && detail.eventSpace && (
        <DataTable columns={spaceColumns} rows={detail.spaces} exportName={`${asset.id}-spaces`} />
      )}

      {tab === 'lots' && !detail.eventSpace && (
        <>
          <ul className="legend" data-testid="lot-legend">
            {STATUSES.map((status) => (
              <li key={status}>
                <span className={`swatch lot-${lotClass(status)}`} />
                {status}
                <Num value={detail.counts[status]} format={num} watch={`legend:${asset.id}:${status}`} />
              </li>
            ))}
          </ul>
          <div className="lot-layout">
            <div className="lot-board" data-testid="lot-grid">
              {detail.floors.map((floor) => (
                <div key={floor.floor} className="floor-row">
                  <div className="floor-label">{floor.floor}</div>
                  <div className="lot-tiles">
                    {floor.units.map((unit) => (
                      <span key={unit.id} className="lot-wrap">
                      <button
                        type="button"
                        className={`lot lot-${lotClass(unit.status)} ${selected?.id === unit.id ? 'on' : ''}`}
                        data-testid={unit.lot === '4-07' && unit.asset === 'kpsa' ? 'lot-4-07' : undefined}
                        onClick={() => setLotId(unit.id)}
                      >
                        <span>{unit.lot}</span>
                        {unit.id === 'kpsa:4-07' ? <Num value={unit.status} watch={`unit:${unit.id}`} className="lot-status" /> : null}
                      </button>
                      <span className="lot-pop">
                        <strong>Lot {unit.lot}</strong>
                        <span>{unit.use}, {num(unit.size)} sq ft</span>
                        <span>{rm(unit.rent)} a month</span>
                        <span>{unit.status}</span>
                        <span>{num(unit.openEnquiryIds?.length || 0)} open enquiries</span>
                      </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <aside className="lot-panel">
              {selected ? (
                <>
                  <h2>Lot {selected.lot}</h2>
                  <dl className="fact-grid">
                    <div><dt className="fact-label">Floor</dt><dd className="fact-value">{selected.floor}</dd></div>
                    <div><dt className="fact-label">Use</dt><dd className="fact-value">{selected.use}</dd></div>
                    <div><dt className="fact-label">Size</dt><dd className="fact-value">{num(selected.size)} sq ft</dd></div>
                    <div><dt className="fact-label">Asking rent psf</dt><dd className="fact-value">{rm2(selected.psf)}</dd></div>
                    <div><dt className="fact-label">Asking rent per month</dt><dd className="fact-value">{rm(selected.rent)}</dd></div>
                    <div>
                      <dt className="fact-label">Status</dt>
                      <dd className="fact-value" data-testid="lot-status"><Num value={selected.status} watch={`unit:${selected.id}`} /></dd>
                    </div>
                    <div><dt className="fact-label">Lease start</dt><dd className="fact-value">{date(selected.leaseStart)}</dd></div>
                    <div><dt className="fact-label">Lease expiry</dt><dd className="fact-value">{date(selected.leaseExpiry)}</dd></div>
                    <div><dt className="fact-label">Days vacant</dt><dd className="fact-value">{selected.daysVacant == null ? '–' : `${num(selected.daysVacant)} days`}</dd></div>
                  </dl>
                  <h3 className="section-title">Open enquiries</h3>
                  {selected.openEnquiryIds.length ? (
                    <ul className="recent">
                      {selected.openEnquiryIds.map((id) => {
                        const enquiry = detail.enquiries.find((item) => item.id === id);
                        return (
                          <li key={id}>
                            <a href={`#/enquiry/${id}`} onClick={(event) => { event.preventDefault(); go('enquiry', id); }}>
                              {enquiry?.business || id}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="footnote">No open enquiries for this lot.</p>}
                  <h3 className="section-title">Campaign</h3>
                  {detail.marketing.byCampaign.length ? detail.marketing.byCampaign.map((campaign) => (
                    <p key={campaign.id}>
                      <a href={`#/campaign/${campaign.id}`} onClick={(event) => { event.preventDefault(); go('campaign', campaign.id); }}>{campaign.name}</a>
                    </p>
                  )) : <p className="footnote">No paid campaign covers this asset.</p>}
                </>
              ) : <p>No lots on this asset.</p>}
            </aside>
          </div>
          <h2 className="section-title">Lots</h2>
          <DataTable columns={lotColumns} rows={detail.units} exportName={`${asset.id}-lots`} onRowClick={(row) => setLotId(row.id)} pageSize={25} />
        </>
      )}

      {tab === 'enquiries' && (
        <DataTable columns={enquiryColumns} rows={detail.enquiries} exportName={`${asset.id}-enquiries`} />
      )}

      {tab === 'campaigns' && (
        detail.marketing.byCampaign.length ? (
          <DataTable columns={campaignColumns} rows={detail.marketing.byCampaign} exportName={`${asset.id}-campaigns`} />
        ) : <p className="footnote">No paid campaign covers this asset.</p>
      )}

      {tab === 'visitors' && (
        <div>
          <p className="footnote">Future phase. Visitor counting is not connected.</p>
          {visitorAsset ? (
            <p><a href={`#/visitors/${asset.id}`} onClick={(event) => { event.preventDefault(); go('visitors', asset.id); }}>Open the visitor view</a></p>
          ) : null}
        </div>
      )}
    </section>
  );
}
