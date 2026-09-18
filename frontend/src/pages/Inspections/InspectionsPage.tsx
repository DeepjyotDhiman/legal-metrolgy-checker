import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import inspectionsService from '../../services/inspections';
import type { InspectionResponse } from '../../types/inspection';
import { IcoSearch, IcoFilter } from '../../components/ui/Icons';

const STATUS_OPTIONS = [
  { value: '',               label: 'All Statuses' },
  { value: 'COMPLIANT',      label: 'Compliant' },
  { value: 'NON_COMPLIANT',  label: 'Non-Compliant' },
  { value: 'REVIEW_REQUIRED',label: 'Review Required' },
  { value: 'DRAFT',          label: 'Draft' },
  { value: 'UPLOADED',       label: 'Uploaded' },
  { value: 'ANALYZING',      label: 'Analyzing' },
  { value: 'COMPLETED',      label: 'Completed' },
];

function statusBadge(s: string) {
  const map: Record<string, [string, string]> = {
    COMPLIANT:       ['badge--pass',   'COMPLIANT'],
    NON_COMPLIANT:   ['badge--fail',   'NON-COMPLIANT'],
    REVIEW_REQUIRED: ['badge--review', 'REVIEW REQUIRED'],
    DRAFT:           ['badge--draft',  'DRAFT'],
    UPLOADED:        ['badge--proc',   'UPLOADED'],
    ANALYZING:       ['badge--proc',   'ANALYZING'],
    COMPLETED:       ['badge--pass',   'COMPLETED'],
  };
  const [cls, label] = map[s] ?? ['badge--draft', s];
  return <span className={`badge ${cls}`}><span className="badge-dot" />{label}</span>;
}

const PAGE_SIZE = 10;

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<InspectionResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inspectionsService.list();
      setInspections(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch inspections from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const filtered = inspections.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.id.toLowerCase().includes(q) || r.product_category.toLowerCase().includes(q);
    const matchS = !status || r.status === status || r.final_result === status || r.preliminary_result === status;
    return matchQ && matchS;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Inspections</h1>
          <p className="page-header__sub">All packaged commodity inspection records</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--secondary btn--sm" onClick={fetchInspections} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link to="/inspections/new" className="btn btn--primary">
            + New Inspection
          </Link>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert--error" style={{ marginBottom: 'var(--sp-4)' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <div className="card">
          {/* Filters */}
          <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--c-border-light)' }}>
            <div className="filter-bar">
              <div className="search-wrap">
                <span className="search-icon"><IcoSearch size={14} /></span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by ID or product category…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {(search || status) && (
                <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-13)', color: 'var(--c-text-muted)' }}>
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Table */}
          {loading && inspections.length === 0 ? (
            <div style={{ padding: 'var(--sp-10)', textAlign: 'center', color: 'var(--c-text-muted)' }}>
              Loading inspections…
            </div>
          ) : pageData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <IcoFilter size={32} />
              </div>
              <div className="empty-state__title">
                {inspections.length === 0 ? 'No inspections recorded yet' : 'No inspections match the selected filters'}
              </div>
              <div className="empty-state__sub">
                {inspections.length === 0 ? (
                  <Link to="/inspections/new" style={{ color: 'var(--c-accent)', fontWeight: 600 }}>
                    Click here to create the first inspection
                  </Link>
                ) : (
                  'Try adjusting your search or clear the filters to see all records.'
                )}
              </div>
              {inspections.length > 0 && (
                <button className="btn btn--secondary btn--sm" style={{ marginTop: 'var(--sp-4)' }} onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Inspection ID</th>
                      <th>Category</th>
                      <th>Created Date</th>
                      <th>Status</th>
                      <th>Verdict</th>
                      <th className="col-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map(r => (
                      <tr key={r.id}>
                        <td className="col-id font-mono text-xs">{r.id}</td>
                        <td style={{ fontWeight: 500 }}>{r.product_category}</td>
                        <td className="text-sm text-muted">{formatDate(r.created_at)}</td>
                        <td>{statusBadge(r.status)}</td>
                        <td>
                          {r.final_result ? (
                            statusBadge(r.final_result)
                          ) : r.preliminary_result ? (
                            statusBadge(r.preliminary_result)
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="col-action">
                          <div style={{ display: 'flex', gap: 'var(--sp-1)', justifyContent: 'flex-end' }}>
                            <Link to={`/inspections/${r.id}`} className="btn btn--ghost btn--sm">
                              View
                            </Link>
                            {r.status === 'REVIEW_REQUIRED' && (
                              <Link to={`/inspections/${r.id}`} className="btn btn--secondary btn--sm">
                                Review
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <span>
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="pagination__btns">
                    <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                      ‹ Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        className={`pagination__btn${page === i + 1 ? ' active' : ''}`}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button className="pagination__btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                      Next ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
