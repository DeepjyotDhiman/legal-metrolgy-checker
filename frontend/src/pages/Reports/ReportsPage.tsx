import { Link } from 'react-router-dom';

const REPORTS = [
  { id:'RPT-2026-000247', inspection:'LM-2026-000247', product:'Premium Basmati Rice',       date:'18 Sep 2026', officer:'Rajesh Kumar', decision:'REVIEW_REQUIRED' },
  { id:'RPT-2026-000246', inspection:'LM-2026-000246', product:'Fortified Atta (5 kg)',      date:'18 Sep 2026', officer:'Priya Sharma', decision:'COMPLIANT' },
  { id:'RPT-2026-000245', inspection:'LM-2026-000245', product:'Cold Pressed Mustard Oil',   date:'17 Sep 2026', officer:'Amit Singh',   decision:'NON_COMPLIANT' },
  { id:'RPT-2026-000244', inspection:'LM-2026-000244', product:'Packaged Drinking Water',    date:'17 Sep 2026', officer:'Rajesh Kumar', decision:'COMPLIANT' },
  { id:'RPT-2026-000243', inspection:'LM-2026-000243', product:'Refined Sunflower Oil',      date:'16 Sep 2026', officer:'Priya Sharma', decision:'COMPLIANT' },
  { id:'RPT-2026-000240', inspection:'LM-2026-000240', product:'Natural Mineral Water',      date:'15 Sep 2026', officer:'Priya Sharma', decision:'COMPLIANT' },
  { id:'RPT-2026-000239', inspection:'LM-2026-000239', product:'Red Label Tea (500 g)',      date:'14 Sep 2026', officer:'Amit Singh',   decision:'NON_COMPLIANT' },
  { id:'RPT-2026-000238', inspection:'LM-2026-000238', product:'Cashew Nuts (250 g)',        date:'14 Sep 2026', officer:'Rajesh Kumar', decision:'COMPLIANT' },
];

function badge(s: string) {
  const map: Record<string, [string, string]> = {
    COMPLIANT:       ['badge--pass',   'COMPLIANT'],
    NON_COMPLIANT:   ['badge--fail',   'NON-COMPLIANT'],
    REVIEW_REQUIRED: ['badge--review', 'REVIEW REQUIRED'],
  };
  const [cls, label] = map[s] ?? ['badge--draft', s];
  return <span className={`badge ${cls}`}><span className="badge-dot" />{label}</span>;
}

export default function ReportsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Reports</h1>
          <p className="page-header__sub">Generated inspection reports and compliance certificates</p>
        </div>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card__header">
            <div className="card__title">Inspection Reports</div>
            <div className="card__sub">{REPORTS.length} reports generated</div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Inspection ID</th>
                  <th>Product</th>
                  <th>Generated</th>
                  <th>Officer</th>
                  <th>Final Decision</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {REPORTS.map(r => (
                  <tr key={r.id}>
                    <td className="col-id">{r.id}</td>
                    <td className="col-id">{r.inspection}</td>
                    <td style={{fontWeight:500}}>{r.product}</td>
                    <td className="text-sm text-muted">{r.date}</td>
                    <td className="text-sm">{r.officer}</td>
                    <td>{badge(r.decision)}</td>
                    <td className="col-action">
                      <div style={{display:'flex', gap:'var(--sp-1)', justifyContent:'flex-end'}}>
                        <Link to={`/reports/${r.id}`} className="btn btn--ghost btn--sm">View</Link>
                        <button className="btn btn--secondary btn--sm">Download</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
