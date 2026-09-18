import { Link } from 'react-router-dom';

/* ── Realistic sample data ──────────────────────────────────────────────── */
const KPI = [
  { label: 'Total Inspections', value: 247, sub: 'This financial year', mod: '' },
  { label: 'Compliant',         value: 183, sub: '74.1% compliance rate',  mod: 'kpi-card--pass' },
  { label: 'Non-Compliant',     value: 38,  sub: '15.4% failure rate',     mod: 'kpi-card--fail' },
  { label: 'Needs Review',      value: 26,  sub: 'Pending officer decision',mod: 'kpi-card--review' },
];

const INSPECTIONS = [
  { id: 'LM-2026-000247', product: 'Premium Basmati Rice', mfr: 'Agro Foods India Pvt Ltd',    date: '18 Sep 2026', officer: 'Rajesh Kumar',  status: 'REVIEW_REQUIRED' },
  { id: 'LM-2026-000246', product: 'Fortified Atta (5 kg)',mfr: 'National Foods Ltd',           date: '18 Sep 2026', officer: 'Priya Sharma',  status: 'COMPLIANT' },
  { id: 'LM-2026-000245', product: 'Cold Pressed Mustard Oil', mfr: 'Prakash Oils Pvt Ltd',    date: '17 Sep 2026', officer: 'Amit Singh',    status: 'NON_COMPLIANT' },
  { id: 'LM-2026-000244', product: 'Packaged Drinking Water', mfr: 'Pure Life Beverages Ltd',  date: '17 Sep 2026', officer: 'Rajesh Kumar',  status: 'COMPLIANT' },
  { id: 'LM-2026-000243', product: 'Refined Sunflower Oil', mfr: 'Adani Wilmar Ltd',            date: '16 Sep 2026', officer: 'Priya Sharma',  status: 'COMPLIANT' },
  { id: 'LM-2026-000242', product: 'Iodised Salt (1 kg)',   mfr: 'Hindustan Unilever Ltd',      date: '16 Sep 2026', officer: 'Amit Singh',    status: 'DRAFT' },
  { id: 'LM-2026-000241', product: 'Toned Milk Powder',     mfr: 'Mother Dairy Fruit & Veg',   date: '15 Sep 2026', officer: 'Rajesh Kumar',  status: 'ANALYZING' },
];

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const CHART_DATA = [42, 56, 38, 61, 73, 48];
const MAX_VAL = Math.max(...CHART_DATA);

function statusBadge(s: string) {
  const map: Record<string, [string, string]> = {
    COMPLIANT:       ['badge--pass',   'COMPLIANT'],
    NON_COMPLIANT:   ['badge--fail',   'NON-COMPLIANT'],
    REVIEW_REQUIRED: ['badge--review', 'REVIEW REQUIRED'],
    DRAFT:           ['badge--draft',  'DRAFT'],
    ANALYZING:       ['badge--proc',   'ANALYZING'],
  };
  const [cls, label] = map[s] ?? ['badge--draft', s];
  return <span className={`badge ${cls}`}><span className="badge-dot" />{label}</span>;
}

/* ── Simple SVG bar chart ─────────────────────────────────────────────── */
function ActivityChart() {
  const W = 260; const H = 100; const BAR_W = 28; const GAP = 10;
  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} width="100%" style={{overflow:'visible'}}>
      {CHART_DATA.map((v, i) => {
        const barH = (v / MAX_VAL) * H;
        const x = i * (BAR_W + GAP);
        return (
          <g key={i}>
            <rect x={x} y={H - barH} width={BAR_W} height={barH}
                  rx={3} fill="var(--c-accent)" opacity={i === CHART_DATA.length - 1 ? 1 : 0.45} />
            <text x={x + BAR_W / 2} y={H - barH - 5} textAnchor="middle"
                  fontSize={10} fill="var(--c-text-muted)">{v}</text>
            <text x={x + BAR_W / 2} y={H + 18} textAnchor="middle"
                  fontSize={10} fill="var(--c-text-light)">{MONTHS[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Inspection Dashboard</h1>
          <p className="page-header__sub">Overview of packaged commodity inspections — FY 2026–27</p>
        </div>
        <div className="page-header__actions">
          <Link to="/inspections/new" className="btn btn--primary">
            + New Inspection
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Row */}
        <div className="kpi-grid">
          {KPI.map(({ label, value, sub, mod }) => (
            <div key={label} className={`kpi-card ${mod}`}>
              <div className="kpi-card__label">{label}</div>
              <div className="kpi-card__value">{value}</div>
              <div className="kpi-card__sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:'var(--sp-4)'}}>

          {/* Recent Inspections Table */}
          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Recent Inspections</div>
                <div className="card__sub">Latest 7 inspection records</div>
              </div>
              <Link to="/inspections" className="btn btn--secondary btn--sm">View All</Link>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Inspection ID</th>
                    <th>Product</th>
                    <th>Manufacturer</th>
                    <th>Date</th>
                    <th>Officer</th>
                    <th>Status</th>
                    <th className="col-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {INSPECTIONS.map(row => (
                    <tr key={row.id}>
                      <td className="col-id">{row.id}</td>
                      <td style={{fontWeight:500}}>{row.product}</td>
                      <td className="text-muted text-sm">{row.mfr}</td>
                      <td className="text-sm text-muted">{row.date}</td>
                      <td className="text-sm">{row.officer}</td>
                      <td>{statusBadge(row.status)}</td>
                      <td className="col-action">
                        <Link to={`/inspections/${row.id}`} className="btn btn--ghost btn--sm">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div style={{display:'flex', flexDirection:'column', gap:'var(--sp-4)'}}>
            {/* Chart card */}
            <div className="card">
              <div className="card__header">
                <div className="card__title">Monthly Activity</div>
              </div>
              <div className="card__body" style={{paddingBottom:'var(--sp-3)'}}>
                <ActivityChart />
              </div>
            </div>

            {/* Quick stats */}
            <div className="card">
              <div className="card__header">
                <div className="card__title">Today's Summary</div>
              </div>
              <div className="card__body">
                {[
                  ['Inspections Today',  '12'],
                  ['Reports Generated',  '8'],
                  ['Pending Reviews',    '4'],
                  ['Avg. Confidence',    '91.4%'],
                ].map(([label, val]) => (
                  <div key={label} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--sp-3)', paddingBottom:'var(--sp-3)', borderBottom:'1px solid var(--c-border-light)'}}>
                    <span style={{fontSize:'var(--fs-13)', color:'var(--c-text-muted)'}}>{label}</span>
                    <span style={{fontSize:'var(--fs-14)', fontWeight:600, color:'var(--c-text)'}}>{val}</span>
                  </div>
                ))}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontSize:'var(--fs-13)', color:'var(--c-text-muted)'}}>System Status</span>
                  <span className="badge badge--pass"><span className="badge-dot"/>Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
