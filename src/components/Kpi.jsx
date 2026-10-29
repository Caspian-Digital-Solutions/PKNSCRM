import Num from './Num.jsx';
import Term from './Term.jsx';

function Spark({ points }) {
  if (!points?.length) return null;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? 100 / (points.length - 1) : 100;
  const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${index * step} ${28 - (point / max) * 24}`).join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 28" aria-hidden="true">
      <path d={d} fill="none" stroke="#9CA3AF" strokeWidth="1.5" />
    </svg>
  );
}

export default function Kpi({ label, term, formula, value, format, sub, href, testId, spark }) {
  const figure = <Num value={value} format={format} watch={testId} />;
  return (
    <div className="kpi" data-testid={testId}>
      <div className="kpi-label">{formula || term ? <Term id={term} formula={formula}>{label}</Term> : label}</div>
      <div className="kpi-value">{href ? <a className="kpi-hit" href={href}>{figure}</a> : figure}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
      <Spark points={spark} />
    </div>
  );
}
