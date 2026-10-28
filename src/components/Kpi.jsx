import Num from './Num.jsx';
import Term from './Term.jsx';

export default function Kpi({ label, term, formula, value, format, sub, href, testId }) {
  const figure = <Num value={value} format={format} watch={testId} />;
  return (
    <div className="kpi" data-testid={testId}>
      <div className="kpi-label">{formula || term ? <Term id={term} formula={formula}>{label}</Term> : label}</div>
      <div className="kpi-value">{href ? <a className="kpi-hit" href={href}>{figure}</a> : figure}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}
