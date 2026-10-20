import { useStore } from '../store.jsx';
import { ASSETS } from '../data/config.js';
import { campaignChannels, totalRow, statusCounts, leasingKpis, medianFirstResponseHours } from '../data/metrics.js';
import { num, rm, rm2, pct, x } from '../format.js';

// Internal reconciliation view (not in the navigation): #/data-check
export default function DataCheck() {
  const { data } = useStore();
  const p = statusCounts(data.units);
  const camps = data.campaigns.map((c) => ({ c, t: totalRow(campaignChannels(c, data.signed)) }));
  const all = totalRow(camps.map((r) => r.t));
  const k = leasingKpis(data.units);
  return (
    <section>
      <h1 className="page-title">Data check</h1>
      <p className="muted">Generated dummy data reconciled against Confluence page 06. Internal view; not part of the demo.</p>
      <h2 className="section-title">Asset register</h2>
      <table className="table">
        <thead><tr><th>Asset</th><th className="r">Units</th><th className="r">Occupied</th><th className="r">Reserved</th><th className="r">Vacant</th><th className="r">Under redev.</th><th className="r">Occupancy</th></tr></thead>
        <tbody>
          {ASSETS.map((a) => { const c = statusCounts(data.units.filter((u) => u.asset === a.id)); return (
            <tr key={a.id}><td>{a.name}</td><td className="r">{num(c.total)}</td><td className="r">{num(c.Occupied)}</td><td className="r">{num(c.Reserved)}</td><td className="r">{num(c.Vacant)}</td><td className="r">{num(c['Under redevelopment'])}</td><td className="r">{pct(c.occupancy)}</td></tr>
          ); })}
          <tr className="total"><td>Portfolio</td><td className="r">{num(p.total)}</td><td className="r">{num(p.Occupied)}</td><td className="r">{num(p.Reserved)}</td><td className="r">{num(p.Vacant)}</td><td className="r">{num(p['Under redevelopment'])}</td><td className="r">{pct(p.occupancy)}</td></tr>
        </tbody>
      </table>
      <h2 className="section-title">Campaigns</h2>
      <table className="table">
        <thead><tr><th>Campaign</th><th className="r">Spend</th><th className="r">Paid enquiries</th><th className="r">Viewings</th><th className="r">Signed</th><th className="r">First-year rent</th><th className="r">CPL</th><th className="r">ROAS</th></tr></thead>
        <tbody>
          {camps.map(({ c, t }) => (
            <tr key={c.id}><td>{c.name}</td><td className="r">{rm(t.spend)}</td><td className="r">{num(t.enquiries)}</td><td className="r">{num(t.viewings)}</td><td className="r">{num(t.signed)}</td><td className="r">{rm(t.firstYearValue)}</td><td className="r">{rm2(t.cpl)}</td><td className="r">{x(t.roas)}</td></tr>
          ))}
          <tr className="total"><td>All campaigns</td><td className="r">{rm(all.spend)}</td><td className="r">{num(all.enquiries)}</td><td className="r">{num(all.viewings)}</td><td className="r">{num(all.signed)}</td><td className="r">{rm(all.firstYearValue)}</td><td className="r">{rm2(all.cpl)}</td><td className="r">{x(all.roas)}</td></tr>
        </tbody>
      </table>
      <h2 className="section-title">Leasing and pipeline</h2>
      <table className="table narrow">
        <tbody>
          <tr><td>Enquiry records</td><td className="r">{num(data.enquiries.length)}</td></tr>
          <tr><td>Median first response</td><td className="r">{medianFirstResponseHours(data.enquiries).toFixed(1)} hours</td></tr>
          <tr><td>WALE (by rent)</td><td className="r">{k.wale.toFixed(2)} years</td></tr>
          <tr><td>Median days vacant</td><td className="r">{num(k.medianDaysVacant)}</td></tr>
          <tr><td>Renewal rate (October)</td><td className="r">{pct(k.renewalRate)}</td></tr>
        </tbody>
      </table>
    </section>
  );
}
