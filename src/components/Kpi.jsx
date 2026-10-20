import Num from './Num.jsx';
import Term from './Term.jsx';

export default function Kpi({ label, term, value, format, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{term ? <Term id={term}>{label}</Term> : label}</div>
      <div className="kpi-value"><Num value={value} format={format} /></div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}
