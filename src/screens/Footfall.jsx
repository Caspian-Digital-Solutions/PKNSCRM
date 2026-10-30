import { TrendChart } from '../components/Charts.jsx';
import { useAmp } from '../useAmp.jsx';

export default function Footfall() {
  const { data, scope } = useAmp();
  const rows = (data.footfallPreview || []).filter((row) => row.month >= scope.from.slice(0, 7) && row.month <= scope.to.slice(0, 7));
  return (
    <section>
      <div className="footfall-empty">
        <span className="phase-badge">Phase 2</span>
        <h1>Footfall</h1>
        <p>Visitor counts arrive with the counter integration. The example below shows the shape of a later chart.</p>
        <div className="greyed chart-card" aria-disabled="true">
          <h2>Example daily visitor counts</h2>
          <TrendChart data={rows} lines={[{ key: 'visitors', name: 'Visitors' }]} />
        </div>
      </div>
    </section>
  );
}
