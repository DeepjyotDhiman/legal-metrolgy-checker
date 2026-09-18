import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import complianceService from '../../services/compliance';
import type { ReportResponse } from '../../types/compliance';
import { IcoDocument } from '../../components/ui/Icons';

function badge(s: string) {
  const map: Record<string, [string, string]> = {
    COMPLIANT:       ['badge--pass',   'COMPLIANT'],
    NON_COMPLIANT:   ['badge--fail',   'NON-COMPLIANT'],
    REVIEW_REQUIRED: ['badge--review', 'REVIEW REQUIRED'],
    COMPLETED:       ['badge--pass',   'COMPLETED'],
    DRAFT:           ['badge--draft',  'DRAFT'],
  };
  const [cls, label] = map[s] ?? ['badge--draft', s];
  return <span className={`badge ${cls}`}><span className="badge-dot" />{label}</span>;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await complianceService.listReports();
      setReports(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch inspection reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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
          <h1 className="page-header__title">Reports</h1>
          <p className="page-header__sub">Official inspection reports and statutory compliance records</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--secondary btn--sm" onClick={fetchReports} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh Reports'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert--error" style={{ marginBottom: 'var(--sp-4)' }}>
            {error}
          </div>
        )}

        <div className="card">
          <div className="card__header flex items-center justify-between">
            <div>
              <div className="card__title">Inspection Reports</div>
              <div className="card__sub">
                {reports.length} report{reports.length !== 1 ? 's' : ''} available
              </div>
            </div>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: 'var(--sp-10)', textAlign: 'center', color: 'var(--c-text-muted)' }}>
                Loading inspection reports…
              </div>
            ) : reports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <IcoDocument size={32} />
                </div>
                <div className="empty-state__title">No reports generated yet</div>
                <div className="empty-state__sub">
                  Inspect a packaged commodity and record an officer determination to generate an official report.
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Inspection ID</th>
                    <th>Category</th>
                    <th>Generated Date</th>
                    <th>Compliance Verdict</th>
                    <th className="col-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td className="col-id font-mono text-xs font-bold">{r.id}</td>
                      <td className="col-id font-mono text-xs">{r.inspection_id}</td>
                      <td style={{ fontWeight: 500 }}>{r.data?.product_category || 'General Packaged Commodity'}</td>
                      <td className="text-sm text-muted">{formatDate(r.generated_at)}</td>
                      <td>
                        {badge(
                          r.data?.final_result ||
                            r.data?.preliminary_result ||
                            r.data?.status ||
                            'PENDING',
                        )}
                      </td>
                      <td className="col-action">
                        <Link to={`/reports/${r.inspection_id || r.id}`} className="btn btn--ghost btn--sm">
                          View Report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
