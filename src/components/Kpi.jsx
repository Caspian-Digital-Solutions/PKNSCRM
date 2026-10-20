import Num from './Num.jsx';
import Term from './Term.jsx';

export default function Kpi({ label, term, value, format, sub, testId }) {
  return (
    <div className="kpi" data-testid={testId}>
      <div className="kpi-label">{term ? <Term id={term}>{label}</Term> : label}</div>
      <div className="kpi-value"><Num value={value} format={format} watch={testId} /></div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}
