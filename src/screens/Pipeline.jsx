import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { go } from '../router.js';
import Filters from '../components/Filters.jsx';
import Num from '../components/Num.jsx';
import SourceIcon from '../components/SourceIcon.jsx';
import { LostDialog, SignedDialog, commitStage } from '../components/MoveDialogs.jsx';
import { PIPELINE_STAGES } from '../data/config.js';
import { daysInStage, filteredEnquiries, liveAssets, pipelineSummary } from '../data/selectors.js';
import { date, num, rm } from '../format.js';

const EMPTY_FILTERS = { asset: '', campaign: '', source: '', officer: '' };

export default function Pipeline() {
  const { state, dispatch, data } = useStore();
  const canEdit = state.role === 'leasing';
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [pending, setPending] = useState(null);
  const [pulse, setPulse] = useState(false);
  const assets = useMemo(() => liveAssets(data, state), [data, state]);
  const summary = useMemo(() => pipelineSummary(data, state, filters), [data, state, filters]);
  const enquiries = useMemo(() => filteredEnquiries(data, state, filters), [data, state, filters]);
  const byId = useMemo(() => new Map(enquiries.map((enquiry) => [enquiry.id, enquiry])), [enquiries]);
  const sources = useMemo(() => [...new Set(filteredEnquiries(data, state, {}).map((enquiry) => enquiry.source).filter(Boolean))].sort(), [data, state]);

  useEffect(() => {
    if (!pulse) return undefined;
    const timer = setTimeout(() => setPulse(false), 5000);
    return () => clearTimeout(timer);
  }, [pulse]);

  const simulate = () => {
    if (state.heroStage) return;
    dispatch({ type: 'simulateHero' });
    setPulse(true);
  };

  useEffect(() => {
    if (!canEdit) return undefined;
    const onKey = (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyE') {
        e.preventDefault();
        if (!state.heroStage) {
          dispatch({ type: 'simulateHero' });
          setPulse(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit, dispatch, state.heroStage]);

  const requestMove = (enquiry, stage) => {
    if (!canEdit || !enquiry || enquiry.stage === stage) return;
    if (stage === 'Signed' || stage === 'Lost') {
      setPending({ enquiry, stage });
      return;
    }
    commitStage(dispatch, enquiry, stage);
  };

  const closeDialog = () => setPending(null);

  return (
    <section>
      <div className="screen-head">
        <div>
          <h1 className="page-title">Enquiry pipeline</h1>
          <p className="lead">No retyping, no lost WhatsApp. The enquiry knows which ad it came from.</p>
          <p data-testid="pipeline-open">
            Open <Num value={summary.open} format={num} watch="pipeline:open" />
            {' · '}
            Open pipeline value <Num value={summary.openValue} format={rm} watch="pipeline:open-value" />
          </p>
        </div>
        {canEdit && (
          <button type="button" className="btn btn-primary" data-testid="simulate-enquiry" onClick={simulate}>
            Simulate enquiry
          </button>
        )}
      </div>
      <Filters
        fields={['asset', 'campaign', 'source', 'officer']}
        value={filters}
        onChange={setFilters}
        assets={assets}
        campaigns={data.campaigns.map((item) => ({ id: item.id, name: item.short }))}
        sources={sources}
        officers={Object.values(data.officers)}
      />
      <div className="board">
        {PIPELINE_STAGES.map((stage) => (
          <section
            key={stage}
            className="pipe-col"
            data-testid={`column-${stage}`}
            onDragOver={canEdit ? (e) => { e.preventDefault(); } : undefined}
            onDrop={canEdit ? (e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              requestMove(byId.get(id), stage);
            } : undefined}
          >
            <header className="pipe-col-head">
              <h2>{stage}</h2>
              <span data-testid={`count-${stage}`}><Num value={summary.counts[stage] || 0} format={num} watch={`pipeline:${stage}`} /></span>
            </header>
            <div className="pipe-cards">
              {enquiries.filter((enquiry) => enquiry.stage === stage).map((enquiry) => {
                const asset = assets.find((item) => item.id === enquiry.asset);
                const officer = data.officers[enquiry.officer];
                const campaign = data.campaigns.find((item) => item.id === enquiry.campaign);
                return (
                  <article
                    key={enquiry.id}
                    className={`pipe-card${pulse && enquiry.hero && enquiry.stage === 'New' ? ' is-new' : ''}`}
                    draggable={canEdit}
                    data-testid={enquiry.hero ? 'hero-card' : undefined}
                    onDragStart={canEdit ? (e) => {
                      e.dataTransfer.setData('text/plain', enquiry.id);
                      e.dataTransfer.effectAllowed = 'move';
                    } : undefined}
                  >
                    <a
                      className="pipe-card-main"
                      href={`#/enquiry/${enquiry.id}`}
                      aria-label={`${enquiry.business}, ${asset?.name || ''}, lot ${enquiry.lot || ''}, ${enquiry.source || ''}`}
                      onClick={(e) => { e.preventDefault(); go('enquiry', enquiry.id); }}
                    >
                      <strong>{enquiry.business}</strong>
                      <span>{asset?.short || '–'}{enquiry.lot ? ` · ${enquiry.lot}` : ''}</span>
                      <span className="source-line">
                        <SourceIcon source={enquiry.source} />
                        <span>{enquiry.source || '–'}{campaign ? ` · ${campaign.short}` : ''}</span>
                      </span>
                      <span>{officer?.name || '–'}</span>
                      <span>{num(daysInStage(enquiry))} days in stage</span>
                      <span>Follow-up {date(enquiry.nextFollowUp)}</span>
                    </a>
                    {canEdit && (
                      <label className="move-to">
                        Move to
                        <select
                          aria-label={`Move ${enquiry.business}`}
                          value=""
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next) requestMove(enquiry, next);
                          }}
                        >
                          <option value="">Move to…</option>
                          {PIPELINE_STAGES.filter((item) => item !== enquiry.stage).map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <SignedDialog
        open={pending?.stage === 'Signed'}
        enquiry={pending?.enquiry}
        onClose={closeDialog}
        onConfirm={(extra) => {
          commitStage(dispatch, pending.enquiry, 'Signed', extra);
          closeDialog();
        }}
      />
      <LostDialog
        open={pending?.stage === 'Lost'}
        onClose={closeDialog}
        onConfirm={(extra) => {
          commitStage(dispatch, pending.enquiry, 'Lost', extra);
          closeDialog();
        }}
      />
    </section>
  );
}
