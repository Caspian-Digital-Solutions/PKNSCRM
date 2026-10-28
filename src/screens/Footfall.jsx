import { TrendChart } from '../components/Charts.jsx';
import { PageHead } from '../components/bits.jsx';
import { useAmp } from '../useAmp.jsx';

export default function Footfall() {
  const { data, scope } = useAmp();
  const rows = (data.footfallPreview || []).filter((row) => row.month >= scope.from.slice(0, 7) && row.month <= scope.to.slice(0, 7));
  return (
    <section>
      <PageHead title="Footfall" actions={<span className="phase-badge">Phase 2</span>} />
      <p>Footfall and visitor counter integration. Planned for a later phase. The data model already supports per-asset daily visitor counts so the module can be switched on without restructuring.</p>
      <div className="greyed" aria-disabled="true">
        <h2>Example daily visitor counts</h2>
        <TrendChart data={rows} lines={[{ key: 'visitors', name: 'Visitors' }]} />
      </div>
    </section>
  );
}
