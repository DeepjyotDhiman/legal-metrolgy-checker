import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IcoSearch, IcoFilter } from '../../components/ui/Icons';

const ALL_DATA = [
  { id:'LM-2026-000247', product:'Premium Basmati Rice',      mfr:'Agro Foods India Pvt Ltd',    date:'18 Sep 2026', officer:'Rajesh Kumar', updated:'18 Sep 2026', status:'REVIEW_REQUIRED' },
  { id:'LM-2026-000246', product:'Fortified Atta (5 kg)',     mfr:'National Foods Ltd',           date:'18 Sep 2026', officer:'Priya Sharma', updated:'18 Sep 2026', status:'COMPLIANT' },
  { id:'LM-2026-000245', product:'Cold Pressed Mustard Oil',  mfr:'Prakash Oils Pvt Ltd',        date:'17 Sep 2026', officer:'Amit Singh',   updated:'17 Sep 2026', status:'NON_COMPLIANT' },
  { id:'LM-2026-000244', product:'Packaged Drinking Water',   mfr:'Pure Life Beverages Ltd',     date:'17 Sep 2026', officer:'Rajesh Kumar', updated:'17 Sep 2026', status:'COMPLIANT' },
  { id:'LM-2026-000243', product:'Refined Sunflower Oil',     mfr:'Adani Wilmar Ltd',            date:'16 Sep 2026', officer:'Priya Sharma', updated:'16 Sep 2026', status:'COMPLIANT' },
  { id:'LM-2026-000242', product:'Iodised Salt (1 kg)',       mfr:'Hindustan Unilever Ltd',      date:'16 Sep 2026', officer:'Amit Singh',   updated:'16 Sep 2026', status:'DRAFT' },
  { id:'LM-2026-000241', product:'Toned Milk Powder',         mfr:'Mother Dairy F&V Pvt Ltd',    date:'15 Sep 2026', officer:'Rajesh Kumar', updated:'15 Sep 2026', status:'ANALYZING' },
  { id:'LM-2026-000240', product:'Natural Mineral Water',     mfr:'Bisleri International Ltd',   date:'15 Sep 2026', officer:'Priya Sharma', updated:'15 Sep 2026', status:'COMPLIANT' },
  { id:'LM-2026-000239', product:'Red Label Tea (500 g)',     mfr:'Hindustan Unilever Ltd',      date:'14 Sep 2026', officer:'Amit Singh',   updated:'14 Sep 2026', status:'NON_COMPLIANT' },
  { id:'LM-2026-000238', product:'Cashew Nuts (250 g)',       mfr:'Carnival Nuts Pvt Ltd',       date:'14 Sep 2026', officer:'Rajesh Kumar', updated:'14 Sep 2026', status:'COMPLIANT' },
  { id:'LM-2026-000237', product:'Refined Sugar (1 kg)',      mfr:'Balrampur Chini Mills',       date:'13 Sep 2026', officer:'Priya Sharma', updated:'14 Sep 2026', status:'REVIEW_REQUIRED' },
  { id:'LM-2026-000236', product:'Whole Wheat Biscuits',      mfr:'Britannia Industries Ltd',    date:'13 Sep 2026', officer:'Amit Singh',   updated:'13 Sep 2026', status:'COMPLIANT' },
];

const STATUS_OPTIONS = [
  { value: '',               label: 'All Statuses' },
  { value: 'COMPLIANT',      label: 'Compliant' },
  { value: 'NON_COMPLIANT',  label: 'Non-Compliant' },
  { value: 'REVIEW_REQUIRED',label: 'Review Required' },
  { value: 'DRAFT',          label: 'Draft' },
  { value: 'ANALYZING',      label: 'Analyzing' },
];

const OFFICER_OPTIONS = [
  { value: '', label: 'All Officers' },
  { value: 'Rajesh Kumar', label: 'Rajesh Kumar' },
  { value: 'Priya Sharma', label: 'Priya Sharma' },
  { value: 'Amit Singh',   label: 'Amit Singh' },
];

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

const PAGE_SIZE = 8;

export default function InspectionsPage() {
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [officer, setOfficer] = useState('');
  const [page,    setPage]    = useState(1);

  const filtered = ALL_DATA.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.id.toLowerCase().includes(q) || r.product.toLowerCase().includes(q) || r.mfr.toLowerCase().includes(q);
    const matchS = !status  || r.status  === status;
    const matchO = !officer || r.officer === officer;
    return matchQ && matchS && matchO;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => { setSearch(''); setStatus(''); setOfficer(''); setPage(1); };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Inspections</h1>
          <p className="page-header__sub">All packaged commodity inspection records</p>
        </div>
        <div className="page-header__actions">
          <Link to="/inspections/new" className="btn btn--primary">+ New Inspection</Link>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          {/* Filters */}
          <div style={{padding:'var(--sp-4) var(--sp-5)', borderBottom:'1px solid var(--c-border-light)'}}>
            <div className="filter-bar">
              <div className="search-wrap">
                <span className="search-icon"><IcoSearch size={14} /></span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by ID, product or manufacturer…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select className="filter-select" value={officer} onChange={e => { setOfficer(e.target.value); setPage(1); }}>
                {OFFICER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="date" className="filter-select" style={{color:'var(--c-text-mid)'}} />
              {(search || status || officer) && (
                <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
              <span style={{marginLeft:'auto', fontSize:'var(--fs-13)', color:'var(--c-text-muted)'}}>
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Table */}
          {pageData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <IcoFilter size={32} />
              </div>
              <div className="empty-state__title">No inspections match the selected filters</div>
              <div className="empty-state__sub">Try adjusting your search or clear the filters to see all records.</div>
              <button className="btn btn--secondary btn--sm" style={{marginTop:'var(--sp-4)'}} onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Inspection ID</th>
                      <th>Product</th>
                      <th>Manufacturer</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Officer</th>
                      <th>Last Updated</th>
                      <th className="col-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map(r => (
                      <tr key={r.id}>
                        <td className="col-id">{r.id}</td>
                        <td style={{fontWeight:500}}>{r.product}</td>
                        <td className="text-sm text-muted">{r.mfr}</td>
                        <td className="text-sm text-muted">{r.date}</td>
                        <td>{statusBadge(r.status)}</td>
                        <td className="text-sm">{r.officer}</td>
                        <td className="text-sm text-muted">{r.updated}</td>
                        <td className="col-action">
                          <div style={{display:'flex', gap:'var(--sp-1)', justifyContent:'flex-end'}}>
                            <Link to={`/inspections/${r.id}`} className="btn btn--ghost btn--sm">View</Link>
                            {r.status === 'REVIEW_REQUIRED' && (
                              <Link to={`/inspections/${r.id}`} className="btn btn--secondary btn--sm">Review</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                <div className="pagination__btns">
                  <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                  {Array.from({length: totalPages}, (_, i) => (
                    <button key={i+1} className={`pagination__btn${page === i+1 ? ' active' : ''}`} onClick={() => setPage(i+1)}>
                      {i+1}
                    </button>
                  ))}
                  <button className="pagination__btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
