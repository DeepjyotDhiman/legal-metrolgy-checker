import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import complianceService from '../../services/compliance';
import type { ReportResponse } from '../../types/compliance';
import { IcoPrint, IcoDownload } from '../../components/ui/Icons';

function statusCell(s: string) {
  const map: Record<string, [string, string]> = {
    PASS:            ['badge--pass',   'PASS'],
    FAIL:            ['badge--fail',   'FAIL'],
    REVIEW:          ['badge--review', 'REVIEW'],
    COMPLIANT:       ['badge--pass',   'COMPLIANT'],
    NON_COMPLIANT:   ['badge--fail',   'NON-COMPLIANT'],
    REVIEW_REQUIRED: ['badge--review', 'REVIEW REQUIRED'],
  };
  const [cls, label] = map[s] ?? ['badge--draft', s];
  return <span className={`badge ${cls}`}><span className="badge-dot" />{label}</span>;
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport]   = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await complianceService.getReport(id);
      setReport(data);
    } catch {
      try {
        const data = await complianceService.getInspectionReport(id);
        setReport(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load report from server.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${report.inspection_id || id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const data = report?.data;
  const fields = data?.extracted_fields || [];
  const checks = data?.compliance_checks || [];
  const reviews = data?.reviews || [];

  const fieldsMap = fields.reduce((acc, f) => {
    acc[f.field_name] = f.field_value;
    return acc;
  }, {} as Record<string, string>);

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Inspection Report</h1>
          <p className="page-header__sub font-mono">{report?.id || id}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--secondary" onClick={handlePrint}>
            <IcoPrint size={14} /> Print Report
          </button>
          <button className="btn btn--secondary" onClick={handleDownloadJSON} disabled={!report}>
            <IcoDownload size={14} /> Download JSON
          </button>
          <Link to={`/inspections/${report?.inspection_id || id}`} className="btn btn--primary">
            Back to Inspection
          </Link>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert--error" style={{ marginBottom: 'var(--sp-4)' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 'var(--sp-10)', textAlign: 'center', color: 'var(--c-text-muted)' }}>
            Generating report document…
          </div>
        ) : !report ? (
          <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
            <p style={{ color: 'var(--c-text-muted)' }}>Report not found.</p>
          </div>
        ) : (
          <div className="report-doc">
            {/* Report Header */}
            <div className="report-doc__header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div
                    style={{
                      fontSize: 'var(--fs-11)',
                      color: 'rgba(255,255,255,.6)',
                      letterSpacing: '.5px',
                      marginBottom: 'var(--sp-1)',
                      textTransform: 'uppercase',
                    }}
                  >
                    GOVERNMENT OF INDIA — LEGAL METROLOGY DEPARTMENT
                  </div>
                  <div className="report-doc__header-title">Packaged Commodity Inspection Report</div>
                  <div className="report-doc__header-sub">Under Legal Metrology (Packaged Commodities) Rules, 2011</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--fs-22)', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
                    TriNetra
                  </div>
                  <div style={{ fontSize: 'var(--fs-11)', color: 'rgba(255,255,255,.6)' }}>
                    Statutory Inspection System
                  </div>
                </div>
              </div>
              <div className="report-doc__header-meta">
                {[
                  ['Report ID', report.id],
                  ['Inspection ID', report.inspection_id],
                  ['Generated On', formatDate(report.generated_at)],
                  ['Commodity Category', data?.product_category || 'General Packaged Commodity'],
                ].map(([label, val]) => (
                  <div key={label} className="report-doc__header-meta-item">
                    <span className="report-doc__header-meta-label">{label}</span>
                    <span className="report-doc__header-meta-val font-mono">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-doc__body">
              {/* Statutory Verdict Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--sp-4) var(--sp-5)',
                  background:
                    data?.final_result === 'COMPLIANT'
                      ? 'var(--c-pass-bg)'
                      : data?.final_result === 'NON_COMPLIANT'
                      ? 'var(--c-fail-bg)'
                      : 'var(--c-review-bg)',
                  border: `1px solid ${
                    data?.final_result === 'COMPLIANT'
                      ? 'var(--c-pass-border)'
                      : data?.final_result === 'NON_COMPLIANT'
                      ? 'var(--c-fail-border)'
                      : 'var(--c-review-border)'
                  }`,
                  borderRadius: 'var(--r-md)',
                  marginBottom: 'var(--sp-6)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 'var(--fs-11)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--c-text-muted)',
                    }}
                  >
                    Official Determination
                  </div>
                  <div style={{ fontSize: 'var(--fs-18)', fontWeight: 800, marginTop: 2 }}>
                    {data?.final_result || data?.preliminary_result || 'Under Review'}
                  </div>
                </div>
                <div>{statusCell(data?.final_result || data?.preliminary_result || 'REVIEW')}</div>
              </div>

              {/* Extracted Statutory Declarations */}
              <div className="report-doc__section">
                <div className="report-doc__section-title">Mandatory Packaging Declarations</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)' }}>
                  {[
                    ['Product Name / Brand', fieldsMap['product_name'] || fieldsMap['brand'] || '—'],
                    ['MRP (Maximum Retail Price)', fieldsMap['mrp'] || '—'],
                    ['Net Quantity', fieldsMap['net_quantity'] || '—'],
                    ['Manufacturer Name', fieldsMap['manufacturer_name'] || '—'],
                    ['Manufacturer Address', fieldsMap['manufacturer_address'] || '—'],
                    ['Date of Manufacture / Packing', fieldsMap['mfg_date'] || '—'],
                    ['Consumer Care Details', fieldsMap['consumer_care'] || '—'],
                    ['Country of Origin', fieldsMap['country_of_origin'] || '—'],
                  ].map(([label, val]) => (
                    <div
                      key={label}
                      style={{
                        padding: 'var(--sp-3)',
                        background: 'var(--c-surface-sunken)',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--c-border-light)',
                      }}
                    >
                      <div style={{ fontSize: 'var(--fs-11)', color: 'var(--c-text-muted)', fontWeight: 600 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 'var(--fs-13)', fontWeight: 600, color: 'var(--c-text)', marginTop: 2 }}>
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Evaluation Findings */}
              <div className="report-doc__section">
                <div className="report-doc__section-title">
                  Legal Metrology Rule Engine Evaluation ({checks.length} Rules)
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rule Code</th>
                      <th>Status</th>
                      <th>Severity</th>
                      <th>Statutory Verification Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--sp-4)', color: 'var(--c-text-muted)' }}>
                          No rule checks recorded.
                        </td>
                      </tr>
                    ) : (
                      checks.map(c => (
                        <tr key={c.id || c.rule_id}>
                          <td className="col-id font-mono text-xs font-bold">{c.rule?.rule_code || c.rule_id}</td>
                          <td>{statusCell(c.status)}</td>
                          <td>
                            <span
                              style={{
                                fontSize: 'var(--fs-11)',
                                fontWeight: 600,
                                color:
                                  c.severity === 'HIGH'
                                    ? 'var(--c-fail)'
                                    : c.severity === 'MEDIUM'
                                    ? 'var(--c-review)'
                                    : 'var(--c-text-muted)',
                              }}
                            >
                              {c.severity}
                            </span>
                          </td>
                          <td style={{ fontSize: 'var(--fs-12)', color: 'var(--c-text)' }}>{c.explanation}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Officer Reviews */}
              {reviews.length > 0 && (
                <div className="report-doc__section">
                  <div className="report-doc__section-title">Inspecting Officer Determination &amp; Remarks</div>
                  {reviews.map(r => (
                    <div
                      key={r.id}
                      style={{
                        padding: 'var(--sp-4)',
                        background: 'var(--c-surface-sunken)',
                        borderRadius: 'var(--r-md)',
                        border: '1px solid var(--c-border-light)',
                        marginBottom: 'var(--sp-3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                        <span style={{ fontSize: 'var(--fs-12)', fontWeight: 700 }}>
                          Decision: {statusCell(r.decision)}
                        </span>
                        <span style={{ fontSize: 'var(--fs-11)', color: 'var(--c-text-muted)' }}>
                          Recorded {formatDate(r.reviewed_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: 'var(--fs-13)', color: 'var(--c-text)', whiteSpace: 'pre-wrap' }}>
                        {r.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Official Seal / Audit Disclaimer */}
              <div
                style={{
                  marginTop: 'var(--sp-8)',
                  paddingTop: 'var(--sp-4)',
                  borderTop: '1px dashed var(--c-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  fontSize: 'var(--fs-11)',
                  color: 'var(--c-text-muted)',
                }}
              >
                <div>
                  Generated automatically by TriNetra Legal Metrology Verification System.<br />
                  Evidence hash and audit trails are immutably logged in accordance with statutory compliance guidelines.
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--c-text)' }}>Legal Metrology Division</div>
                  Department of Consumer Affairs
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
