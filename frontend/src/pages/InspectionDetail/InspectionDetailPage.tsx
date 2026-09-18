import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import inspectionsService from '../../services/inspections';
import type { InspectionDetailResponse } from '../../types/inspection';
import OCRWorkstation from '../../components/ocr/OCRWorkstation';

const TABS = ['Overview', 'Evidence', 'OCR Results', 'Compliance', 'Officer Review', 'Report'];

function statusBadge(s: string) {
  const map: Record<string, [string, string]> = {
    COMPLIANT:       ['badge--pass',   'COMPLIANT'],
    NON_COMPLIANT:   ['badge--fail',   'NON-COMPLIANT'],
    REVIEW_REQUIRED: ['badge--review', 'REVIEW REQUIRED'],
    DRAFT:           ['badge--draft',  'DRAFT'],
    UPLOADED:        ['badge--proc',   'UPLOADED'],
    ANALYZING:       ['badge--proc',   'ANALYZING'],
    COMPLETED:       ['badge--pass',   'COMPLETED'],
    PASS:            ['badge--pass',   'PASS'],
    FAIL:            ['badge--fail',   'FAIL'],
    REVIEW:          ['badge--review', 'REVIEW'],
  };
  const [cls, label] = map[s] ?? ['badge--draft', s];
  return <span className={`badge ${cls}`}><span className="badge-dot" />{label}</span>;
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState('Overview');

  const [inspection, setInspection]   = useState<InspectionDetailResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Analysis state
  const [analyzing, setAnalyzing]     = useState(false);

  // Review submission state
  const [decision, setDecision]       = useState<string>('');
  const [notes,    setNotes]          = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await inspectionsService.getById(id);
      setInspection(data);
      if (data.final_result) {
        setDecision(data.final_result);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load inspection detail from server.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleTriggerAnalysis = async () => {
    if (!id) return;
    setAnalyzing(true);
    setError(null);
    try {
      await inspectionsService.analyze(id);
      await fetchDetail();
      setTab('Compliance');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to analyze packaging. Ensure images are uploaded.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!id || !decision) return;
    setSavingReview(true);
    setError(null);
    try {
      await inspectionsService.submitReview(id, { decision, comment: notes });
      setReviewSuccess(true);
      await fetchDetail();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record officer decision.');
    } finally {
      setSavingReview(false);
    }
  };

  const formatDate = (iso?: string | null) => {
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

  const fieldsMap = (inspection?.extracted_fields || []).reduce((acc, f) => {
    acc[f.field_name] = f.field_value;
    return acc;
  }, {} as Record<string, string>);

  const checks = inspection?.compliance_checks || [];
  const passCount = checks.filter(c => c.status === 'PASS').length;
  const failCount = checks.filter(c => c.status === 'FAIL').length;
  const reviewCount = checks.filter(c => c.status === 'REVIEW').length;

  const displayId = id || 'Inspection';
  const productName = fieldsMap['product_name'] || fieldsMap['brand'] || inspection?.product_category || 'Packaged Commodity';

  return (
    <div className="page">
      {/* Status Bar Header */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ fontSize: 'var(--fs-12)', color: 'var(--c-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
            {displayId}
          </div>
          <h1 className="page-header__title">{productName}</h1>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', marginTop: 4 }}>
            {inspection && statusBadge(inspection.status)}
            {inspection?.final_result && (
              <span style={{ fontSize: 'var(--fs-12)', fontWeight: 600, color: 'var(--c-text-muted)' }}>
                Verdict: {statusBadge(inspection.final_result)}
              </span>
            )}
            <span style={{ fontSize: 'var(--fs-13)', color: 'var(--c-text-muted)' }}>
              Created {formatDate(inspection?.created_at)}
            </span>
          </div>
        </div>
        <div className="page-header__actions">
          <button
            className="btn btn--secondary btn--sm"
            onClick={handleTriggerAnalysis}
            disabled={analyzing || loading}
          >
            {analyzing ? 'Analyzing OCR…' : 'Trigger Analysis'}
          </button>
          <Link to={`/reports/${id}`} className="btn btn--secondary btn--sm">
            View Report
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', padding: '0 var(--sp-6)' }}>
        <div className="tabs__list" style={{ borderBottom: 'none' }}>
          {TABS.map(t => (
            <button
              key={t}
              className={`tabs__tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
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

        {loading && !inspection ? (
          <div style={{ padding: 'var(--sp-10)', textAlign: 'center', color: 'var(--c-text-muted)' }}>
            Loading inspection records…
          </div>
        ) : (
          <>
            {/* ── Overview Tab ── */}
            {tab === 'Overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
                <div className="card">
                  <div className="card__header">
                    <div className="card__title">Inspection Information</div>
                    <div className="card__sub">Commodity details extracted from packaging evidence</div>
                  </div>
                  <div className="card__body">
                    <div className="meta-list">
                      {[
                        ['Inspection ID', inspection?.id || '—'],
                        ['Product Category', inspection?.product_category || 'General Packaged Commodity'],
                        ['MRP', fieldsMap['mrp'] || 'Pending OCR extraction'],
                        ['Net Quantity', fieldsMap['net_quantity'] || 'Pending OCR extraction'],
                        ['Manufacturer Name', fieldsMap['manufacturer_name'] || 'Pending OCR extraction'],
                        ['Manufacturer Address', fieldsMap['manufacturer_address'] || 'Pending OCR extraction'],
                        ['Date of Mfg', fieldsMap['mfg_date'] || 'Pending OCR extraction'],
                        ['Consumer Care', fieldsMap['consumer_care'] || 'Pending OCR extraction'],
                        ['Country of Origin', fieldsMap['country_of_origin'] || 'Pending OCR extraction'],
                      ].map(([l, v]) => (
                        <div key={l} className="meta-item">
                          <span className="meta-item__label">{l}</span>
                          <span className="meta-item__value">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                  <div className="card">
                    <div className="card__header">
                      <div className="card__title">Inspection Metadata</div>
                    </div>
                    <div className="card__body">
                      <div className="meta-list">
                        {[
                          ['Current Status', inspection ? statusBadge(inspection.status) : '—'],
                          ['Preliminary Verdict', inspection?.preliminary_result ? statusBadge(inspection.preliminary_result) : 'Awaiting Analysis'],
                          ['Final Officer Verdict', inspection?.final_result ? statusBadge(inspection.final_result) : 'Under Human Review'],
                          ['Evidence Images', `${inspection?.images?.length || 0} file(s) uploaded`],
                          ['Created Timestamp', formatDate(inspection?.created_at)],
                          ['Completed Timestamp', formatDate(inspection?.completed_at)],
                        ].map(([l, v]) => (
                          <div key={String(l)} className="meta-item">
                            <span className="meta-item__label">{l}</span>
                            <span className="meta-item__value">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card__header">
                      <div className="card__title">Compliance Summary</div>
                    </div>
                    <div className="card__body">
                      {[
                        ['Checks Passed', passCount, 'var(--c-pass)'],
                        ['Checks Failed', failCount, 'var(--c-fail)'],
                        ['Under Review', reviewCount, 'var(--c-review)'],
                      ].map(([label, val, color]) => (
                        <div
                          key={String(label)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 'var(--sp-3) 0',
                            borderBottom: '1px solid var(--c-border-light)',
                          }}
                        >
                          <span style={{ fontSize: 'var(--fs-13)', color: 'var(--c-text-muted)' }}>{label}</span>
                          <span style={{ fontSize: 'var(--fs-18)', fontWeight: 700, color: String(color) }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Evidence & OCR Workstation ── */}
            {(tab === 'Evidence' || tab === 'OCR Results') && id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                <OCRWorkstation
                  inspectionId={id}
                  initialMode="WORKSTATION"
                />
              </div>
            )}

            {/* ── Compliance Findings Tab ── */}
            {tab === 'Compliance' && (
              <div className="card">
                <div className="card__header flex items-center justify-between">
                  <div>
                    <div className="card__title">Deterministic Compliance Findings</div>
                    <div className="card__sub">Rule evaluation under Legal Metrology (Packaged Commodities) Rules, 2011</div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    {statusBadge('PASS')}
                    <span style={{ fontSize: 'var(--fs-12)', fontWeight: 700, marginRight: 'var(--sp-2)' }}>{passCount}</span>
                    {statusBadge('FAIL')}
                    <span style={{ fontSize: 'var(--fs-12)', fontWeight: 700, marginRight: 'var(--sp-2)' }}>{failCount}</span>
                    {statusBadge('REVIEW')}
                    <span style={{ fontSize: 'var(--fs-12)', fontWeight: 700 }}>{reviewCount}</span>
                  </div>
                </div>

                <div className="table-wrap">
                  {checks.length === 0 ? (
                    <div style={{ padding: 'var(--sp-8)', textAlign: 'center', color: 'var(--c-text-muted)' }}>
                      No compliance checks evaluated yet.{' '}
                      <button
                        className="btn btn--secondary btn--sm"
                        onClick={handleTriggerAnalysis}
                        disabled={analyzing}
                      >
                        {analyzing ? 'Analyzing…' : 'Run Rule Engine Analysis'}
                      </button>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rule Code</th>
                          <th>Evaluation Status</th>
                          <th>Severity</th>
                          <th>Statutory Message &amp; Explanation</th>
                          <th>Legal Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checks.map(c => (
                          <tr key={c.id || c.rule_id}>
                            <td className="col-id font-mono text-xs font-bold">
                              {c.rule?.rule_code || c.rule_id}
                            </td>
                            <td>{statusBadge(c.status)}</td>
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
                            <td style={{ fontSize: 'var(--fs-12)', color: 'var(--c-text)' }}>
                              {c.explanation}
                            </td>
                            <td style={{ fontSize: 'var(--fs-12)', color: 'var(--c-text-muted)', maxWidth: 280 }}>
                              {c.rule?.legal_reference || 'LMPC Rules 2011'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ── Officer Review Tab ── */}
            {tab === 'Officer Review' && (
              <div className="review-layout" style={{ paddingTop: 'var(--sp-4)' }}>
                {/* Left: Product Info Summary */}
                <div className="review-col">
                  <div className="card">
                    <div className="card__header">
                      <div className="card__title">Inspection Summary</div>
                    </div>
                    <div className="card__body">
                      <div className="meta-list">
                        {[
                          ['Inspection ID', inspection?.id || '—'],
                          ['Category', inspection?.product_category || '—'],
                          ['Uploaded Images', `${inspection?.images?.length || 0} file(s)`],
                          ['Preliminary Verdict', inspection?.preliminary_result || 'Awaiting Analysis'],
                          ['Current Status', inspection?.status || '—'],
                        ].map(([l, v]) => (
                          <div key={l} className="meta-item">
                            <span className="meta-item__label">{l}</span>
                            <span className="meta-item__value">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card__header">
                      <div className="card__title">Rule Engine Results</div>
                    </div>
                    <div className="card__body">
                      {['PASS', 'FAIL', 'REVIEW'].map(s => {
                        const count = checks.filter(c => c.status === s).length;
                        return (
                          <div key={s} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                            {statusBadge(s)}
                            <span style={{ fontWeight: 600, fontSize: 'var(--fs-16)' }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Center: Findings Preview */}
                <div className="review-col">
                  <div className="card">
                    <div className="card__header">
                      <div className="card__title">Rule Engine Findings</div>
                      <div className="card__sub">Automated advisory evaluation for officer verification</div>
                    </div>
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Rule</th>
                            <th>Status</th>
                            <th>Finding</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checks.length === 0 ? (
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'center', padding: 'var(--sp-6)', color: 'var(--c-text-muted)' }}>
                                No findings to display. Run analysis first.
                              </td>
                            </tr>
                          ) : (
                            checks.map(c => (
                              <tr key={c.id || c.rule_id}>
                                <td className="col-id font-mono text-xs">{c.rule?.rule_code || c.rule_id}</td>
                                <td>{statusBadge(c.status)}</td>
                                <td style={{ fontSize: 'var(--fs-12)', color: 'var(--c-text-muted)' }}>{c.explanation}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right: Officer Decision Panel */}
                <div className="review-col">
                  <div className="decision-panel">
                    <div
                      style={{
                        fontSize: 'var(--fs-14)',
                        fontWeight: 700,
                        color: 'var(--c-text)',
                        marginBottom: 'var(--sp-4)',
                        paddingBottom: 'var(--sp-3)',
                        borderBottom: '1px solid var(--c-border-light)',
                      }}
                    >
                      Officer Final Determination
                    </div>

                    {reviewSuccess && (
                      <div className="alert alert--pass" style={{ marginBottom: 'var(--sp-3)' }}>
                        Decision recorded successfully. Inspection is finalized.
                      </div>
                    )}

                    <div style={{ fontSize: 'var(--fs-12)', color: 'var(--c-text-muted)', marginBottom: 'var(--sp-3)' }}>
                      Select statutory compliance decision:
                    </div>

                    {[
                      { value: 'COMPLIANT', label: 'Compliant (LMPC Rules Satisfied)', cls: 'pass' },
                      { value: 'NON_COMPLIANT', label: 'Non-Compliant (Notice to be Issued)', cls: 'fail' },
                      { value: 'ACTION_REQUIRED', label: 'Action Required / Laboratory Testing', cls: 'review' },
                    ].map(o => (
                      <div
                        key={o.value}
                        className={`decision-option${decision === o.value ? ` selected--${o.cls}` : ''}`}
                        onClick={() => setDecision(o.value)}
                      >
                        <input type="radio" readOnly checked={decision === o.value} style={{ flexShrink: 0 }} />
                        {o.label}
                      </div>
                    ))}

                    <div style={{ marginTop: 'var(--sp-4)' }}>
                      <label className="form-label" style={{ marginBottom: 'var(--sp-2)', display: 'block' }}>
                        Officer Inspection Notes <span className="form-required">*</span>
                      </label>
                      <textarea
                        className="form-textarea"
                        placeholder="Record statutory observations, basis for final determination, and evidence reviewed…"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        style={{ minHeight: 110 }}
                      />
                    </div>

                    <div className="alert alert--warning" style={{ marginTop: 'var(--sp-3)' }}>
                      The inspecting officer is the sole statutory decision-maker. Automated OCR and rule findings are decision support only.
                    </div>

                    <div style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-2)', flexDirection: 'column' }}>
                      <button
                        className="btn btn--navy btn--full"
                        disabled={!decision || savingReview}
                        onClick={handleSubmitReview}
                      >
                        {savingReview ? 'Submitting Verdict…' : 'Confirm Official Determination'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Report Tab ── */}
            {tab === 'Report' && (
              <div style={{ textAlign: 'center', padding: 'var(--sp-10) var(--sp-6)' }}>
                <h2 style={{ fontSize: 'var(--fs-16)', fontWeight: 700, marginBottom: 'var(--sp-2)' }}>
                  Statutory Inspection Report
                </h2>
                <p style={{ color: 'var(--c-text-muted)', marginBottom: 'var(--sp-4)', maxWidth: 460, margin: '0 auto var(--sp-4)' }}>
                  View the official Legal Metrology inspection report with complete chain-of-custody evidence, extracted declarations, and officer determinations.
                </p>
                <Link to={`/reports/${id}`} className="btn btn--primary">
                  Open Official Inspection Report
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
