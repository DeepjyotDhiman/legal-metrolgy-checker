import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import dashboardService, { type DashboardSummary } from '../../services/dashboard';
import inspectionsService from '../../services/inspections';
import type { InspectionResponse } from '../../types/inspection';

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

export default function DashboardPage() {
  const [summary, setSummary]         = useState<DashboardSummary | null>(null);
  const [inspections, setInspections] = useState<InspectionResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, list] = await Promise.all([
        dashboardService.getSummary().catch(() => null),
        inspectionsService.list().catch(() => []),
      ]);
      setSummary(sum);
      setInspections(list);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load inspection data from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalInspections = summary?.total_inspections ?? inspections.length;
  const compliantCount = summary?.compliant_count ?? inspections.filter(i => (i.final_result || i.preliminary_result) === 'COMPLIANT').length;
  const nonCompliantCount = summary?.non_compliant_count ?? inspections.filter(i => (i.final_result || i.preliminary_result) === 'NON_COMPLIANT').length;
  const reviewCount = summary?.pending_review_count ?? inspections.filter(i => i.status === 'REVIEW_REQUIRED').length;

  const kpis = [
    { label: 'Total Inspections', value: totalInspections, sub: 'Packaged commodity records', mod: '' },
    { label: 'Compliant',         value: compliantCount,  sub: `${totalInspections ? Math.round((compliantCount / totalInspections) * 100) : 0}% compliance rate`, mod: 'kpi-card--pass' },
    { label: 'Non-Compliant',     value: nonCompliantCount, sub: `${totalInspections ? Math.round((nonCompliantCount / totalInspections) * 100) : 0}% violation rate`,  mod: 'kpi-card--fail' },
    { label: 'Needs Review',      value: reviewCount,     sub: 'Pending officer decision', mod: 'kpi-card--review' },
  ];

  const recentInspections = inspections.slice(0, 7);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Inspection Dashboard</h1>
          <p className="page-header__sub">Overview of packaged commodity inspections</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--secondary btn--sm" onClick={loadData} disabled={loading}>
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

        {/* KPI Row */}
        <div className="kpi-grid">
          {kpis.map(({ label, value, sub, mod }) => (
            <div key={label} className={`kpi-card ${mod}`}>
              <div className="kpi-card__label">{label}</div>
              <div className="kpi-card__value">{value}</div>
              <div className="kpi-card__sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--sp-4)' }}>
          {/* Recent Inspections Table */}
          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Recent Inspections</div>
                <div className="card__sub">Latest inspection records in database</div>
              </div>
              <Link to="/inspections" className="btn btn--secondary btn--sm">View All</Link>
            </div>
            <div className="table-wrap">
              {loading && inspections.length === 0 ? (
                <div style={{ padding: 'var(--sp-8)', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 'var(--fs-13)' }}>
                  Loading inspection records…
                </div>
              ) : recentInspections.length === 0 ? (
                <div style={{ padding: 'var(--sp-8)', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: 'var(--fs-13)' }}>
                  No inspections recorded yet. Start by creating a <Link to="/inspections/new" style={{ color: 'var(--c-accent)', fontWeight: 600 }}>New Inspection</Link>.
                </div>
              ) : (
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
                    {recentInspections.map(row => (
                      <tr key={row.id}>
                        <td className="col-id font-mono text-xs">{row.id}</td>
                        <td style={{ fontWeight: 500 }}>{row.product_category}</td>
                        <td className="text-sm text-muted">{formatDate(row.created_at)}</td>
                        <td>{statusBadge(row.status)}</td>
                        <td>
                          {row.final_result ? (
                            statusBadge(row.final_result)
                          ) : row.preliminary_result ? (
                            statusBadge(row.preliminary_result)
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="col-action">
                          <Link to={`/inspections/${row.id}`} className="btn btn--ghost btn--sm">
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right column: Inspection status breakdown & guidelines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="card">
              <div className="card__header">
                <div className="card__title">Status Breakdown</div>
              </div>
              <div className="card__body">
                {[
                  ['Draft Inspections', summary?.draft_count ?? 0, 'var(--c-text-muted)'],
                  ['Under Review', summary?.pending_review_count ?? 0, 'var(--c-review)'],
                  ['Completed', summary?.completed_count ?? 0, 'var(--c-pass)'],
                ].map(([label, val, color]) => (
                  <div
                    key={String(label)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--sp-3)',
                      paddingBottom: 'var(--sp-3)',
                      borderBottom: '1px solid var(--c-border-light)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--fs-13)', color: 'var(--c-text-muted)' }}>{label}</span>
                    <span style={{ fontSize: 'var(--fs-14)', fontWeight: 700, color: String(color) }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--sp-1)' }}>
                  <span style={{ fontSize: 'var(--fs-13)', color: 'var(--c-text-muted)' }}>System Authority</span>
                  <span className="badge badge--pass"><span className="badge-dot" />LMPC Compliant</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card__header">
                <div className="card__title">Operational Notice</div>
              </div>
              <div className="card__body">
                <p style={{ fontSize: 'var(--fs-12)', color: 'var(--c-text-muted)', lineHeight: 1.6 }}>
                  Officers must physically or digitally verify mandatory declarations under the Legal Metrology (Packaged Commodities) Rules, 2011 before issuing violation notices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
