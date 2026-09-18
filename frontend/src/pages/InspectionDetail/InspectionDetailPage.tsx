import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

/* ── Mock data for one inspection ───────────────────────────────────────── */
const MOCK = {
  id: 'LM-2026-000247',
  product: 'Premium Basmati Rice',
  brand: 'India Gate',
  manufacturer: 'KRBL Limited, 5E, Hansalaya Building, New Delhi – 110001',
  batchNo: 'BT-2026-09-A1',
  netQty: '5 kg',
  mrp: '₹349.00',
  mfgDate: 'Aug 2026',
  bestBefore: 'Aug 2027',
  location: 'Karol Bagh Market, Delhi',
  date: '18 Sep 2026',
  officer: 'Rajesh Kumar',
  status: 'REVIEW_REQUIRED',
};

const FIELDS = [
  { name: 'Product Name',     value: 'Premium Basmati Rice', confidence: 0.98 },
  { name: 'Brand',            value: 'India Gate',           confidence: 0.99 },
  { name: 'Net Quantity',     value: '5 kg',                 confidence: 0.97 },
  { name: 'MRP',              value: '₹349.00',              confidence: 0.99 },
  { name: 'Manufacturer',     value: 'KRBL Limited, New Delhi', confidence: 0.94 },
  { name: 'Mfg Date',         value: 'Aug 2026',             confidence: 0.91 },
  { name: 'Best Before',      value: 'Aug 2027',             confidence: 0.89 },
  { name: 'FSSAI Lic. No.',   value: '10016011002733',        confidence: 0.96 },
  { name: 'Country of Origin',value: 'India',                confidence: 0.99 },
];

const COMPLIANCE = [
  { rule:'LM-R-001', name:'MRP Declaration',        status:'PASS',   severity:'HIGH',   explanation:'MRP clearly printed as ₹349.00 (incl. taxes). Format conforms to Rule 18.' },
  { rule:'LM-R-002', name:'Net Quantity',            status:'PASS',   severity:'HIGH',   explanation:'Net quantity declared as 5 kg. Units in metric. Compliant with Rule 7.' },
  { rule:'LM-R-003', name:'Manufacturer Name/Address',status:'PASS',  severity:'HIGH',   explanation:'Complete name and address present: KRBL Limited, New Delhi – 110001.' },
  { rule:'LM-R-004', name:'Month/Year of Manufacture',status:'REVIEW',severity:'MEDIUM','explanation':'Mfg. date "Aug 2026" detected. OCR confidence 91% — officer to verify.' },
  { rule:'LM-R-005', name:'Best Before / Expiry',    status:'REVIEW', severity:'MEDIUM', explanation:'Best Before "Aug 2027" detected. Officer to physically verify label.' },
  { rule:'LM-R-006', name:'Consumer Helpline',       status:'FAIL',   severity:'LOW',    explanation:'Consumer helpline number not detected on label. Mandatory per Rule 28.' },
  { rule:'LM-R-007', name:'FSSAI License No.',       status:'PASS',   severity:'HIGH',   explanation:'FSSAI Lic. No. 10016011002733 detected and format validated.' },
];

const TABS = ['Overview', 'Evidence', 'OCR Results', 'Compliance', 'Officer Review', 'Report'];

function statusBadge(s: string) {
  const map: Record<string, [string, string]> = {
    COMPLIANT:       ['badge--pass',   'COMPLIANT'],
    NON_COMPLIANT:   ['badge--fail',   'NON-COMPLIANT'],
    REVIEW_REQUIRED: ['badge--review', 'REVIEW REQUIRED'],
    DRAFT:           ['badge--draft',  'DRAFT'],
    ANALYZING:       ['badge--proc',   'ANALYZING'],
    PASS:            ['badge--pass',   'PASS'],
    FAIL:            ['badge--fail',   'FAIL'],
    REVIEW:          ['badge--review', 'REVIEW'],
  };
  const [cls, label] = map[s] ?? ['badge--draft', s];
  return <span className={`badge ${cls}`}><span className="badge-dot" />{label}</span>;
}

function confBar(c: number) {
  const color = c >= 0.95 ? 'var(--c-pass)' : c >= 0.85 ? 'var(--c-review)' : 'var(--c-fail)';
  return (
    <div style={{display:'flex', alignItems:'center', gap:'var(--sp-2)'}}>
      <div style={{width:60, height:5, background:'var(--c-border)', borderRadius:3, overflow:'hidden'}}>
        <div style={{width:`${c*100}%`, height:'100%', background:color, borderRadius:3}} />
      </div>
      <span style={{fontSize:'var(--fs-11)', color:'var(--c-text-muted)'}}>{(c*100).toFixed(0)}%</span>
    </div>
  );
}

/* ── Review tab with decision panel ────────────────────────────────────── */
function ReviewTab() {
  const [decision, setDecision] = useState<string>('');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const opts = [
    { value: 'COMPLIANT',       label: 'Compliant',              cls: 'pass' },
    { value: 'NON_COMPLIANT',   label: 'Non-Compliant',          cls: 'fail' },
    { value: 'ACTION_REQUIRED', label: 'Requires Further Action',cls: 'review' },
  ];

  const handleConfirm = async () => {
    if (!decision) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
  };

  return (
    <div className="review-layout" style={{paddingTop:'var(--sp-4)'}}>
      {/* Left: product info */}
      <div className="review-col">
        <div className="card">
          <div className="card__header"><div className="card__title">Product Information</div></div>
          <div className="card__body">
            <div className="meta-list">
              {[
                ['Inspection ID', MOCK.id],
                ['Product',       MOCK.product],
                ['Brand',         MOCK.brand],
                ['Net Quantity',  MOCK.netQty],
                ['MRP',           MOCK.mrp],
                ['Batch No.',     MOCK.batchNo],
                ['Location',      MOCK.location],
                ['Date',          MOCK.date],
                ['Officer',       MOCK.officer],
              ].map(([l,v]) => (
                <div key={l} className="meta-item">
                  <span className="meta-item__label">{l}</span>
                  <span className="meta-item__value">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__header"><div className="card__title">Compliance Summary</div></div>
          <div className="card__body">
            {['PASS','FAIL','REVIEW'].map(s => {
              const count = COMPLIANCE.filter(c => c.status === s).length;
              return (
                <div key={s} style={{display:'flex', justifyContent:'space-between', marginBottom:'var(--sp-3)'}}>
                  {statusBadge(s)}<span style={{fontWeight:600, fontSize:'var(--fs-16)'}}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center: findings */}
      <div className="review-col">
        <div className="card">
          <div className="card__header">
            <div className="card__title">Compliance Findings</div>
            <div className="card__sub">Review all findings before recording decision</div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Rule</th><th>Check</th><th>Result</th><th>Severity</th><th>Explanation</th></tr></thead>
              <tbody>
                {COMPLIANCE.map(c => (
                  <tr key={c.rule}>
                    <td className="col-id">{c.rule}</td>
                    <td style={{fontWeight:500, fontSize:'var(--fs-12)'}}>{c.name}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td><span style={{fontSize:'var(--fs-11)', fontWeight:600, color: c.severity==='HIGH'?'var(--c-fail)':c.severity==='MEDIUM'?'var(--c-review)':'var(--c-text-muted)'}}>{c.severity}</span></td>
                    <td style={{fontSize:'var(--fs-12)', color:'var(--c-text-muted)', maxWidth:280}}>{c.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right: decision panel */}
      <div className="review-col">
        <div className="decision-panel">
          <div style={{fontSize:'var(--fs-14)', fontWeight:700, color:'var(--c-text)', marginBottom:'var(--sp-4)', paddingBottom:'var(--sp-3)', borderBottom:'1px solid var(--c-border-light)'}}>
            Officer Final Decision
          </div>

          <div style={{fontSize:'var(--fs-12)', color:'var(--c-text-muted)', marginBottom:'var(--sp-3)'}}>
            Select your compliance determination:
          </div>

          {opts.map(o => (
            <div
              key={o.value}
              className={`decision-option${decision === o.value ? ` selected--${o.cls}` : ''}`}
              onClick={() => setDecision(o.value)}
            >
              <input type="radio" readOnly checked={decision === o.value} style={{flexShrink:0}} />
              {o.label}
            </div>
          ))}

          <div style={{marginTop:'var(--sp-4)'}}>
            <label className="form-label" style={{marginBottom:'var(--sp-2)', display:'block'}}>Officer Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Record your observations, evidence reviewed, and basis for decision…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{minHeight:100}}
            />
          </div>

          <div className="alert alert--warning" style={{marginTop:'var(--sp-3)'}}>
            The officer is the final decision-maker. AI findings are advisory only.
          </div>

          <div style={{marginTop:'var(--sp-4)', display:'flex', gap:'var(--sp-2)', flexDirection:'column'}}>
            <button
              className="btn btn--navy btn--full"
              disabled={!decision || saving}
              onClick={handleConfirm}
            >
              {saving ? 'Saving decision…' : 'Confirm Decision'}
            </button>
            <button className="btn btn--secondary btn--full">
              Save Review Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function InspectionDetailPage() {
  const { id } = useParams<{id: string}>();
  const [tab, setTab] = useState('Overview');

  const displayId = id || MOCK.id;

  return (
    <div className="page">
      {/* Status bar */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{fontSize:'var(--fs-12)', color:'var(--c-text-muted)', fontFamily:'var(--font-mono)', marginBottom:4}}>{displayId}</div>
          <h1 className="page-header__title">{MOCK.product}</h1>
          <div style={{display:'flex', gap:'var(--sp-3)', alignItems:'center', marginTop:4}}>
            {statusBadge(MOCK.status)}
            <span style={{fontSize:'var(--fs-13)', color:'var(--c-text-muted)'}}>Inspected {MOCK.date} by {MOCK.officer}</span>
          </div>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--secondary btn--sm">Trigger Analysis</button>
          <Link to="/reports/RPT-2026-000247" className="btn btn--secondary btn--sm">View Report</Link>
          <button className="btn btn--primary btn--sm">Generate Report</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:'var(--c-surface)', borderBottom:'1px solid var(--c-border)', padding:'0 var(--sp-6)'}}>
        <div className="tabs__list" style={{borderBottom:'none'}}>
          {TABS.map(t => (
            <button key={t} className={`tabs__tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {/* ── Overview ── */}
        {tab === 'Overview' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-4)'}}>
            <div className="card">
              <div className="card__header"><div className="card__title">Inspection Information</div></div>
              <div className="card__body">
                <div className="meta-list">
                  {[
                    ['Inspection ID',    MOCK.id],
                    ['Product Name',     MOCK.product],
                    ['Brand',           MOCK.brand],
                    ['Manufacturer',    MOCK.manufacturer],
                    ['Batch No.',       MOCK.batchNo],
                    ['Net Quantity',    MOCK.netQty],
                    ['MRP',             MOCK.mrp],
                    ['Mfg. Date',       MOCK.mfgDate],
                    ['Best Before',     MOCK.bestBefore],
                  ].map(([l,v]) => (
                    <div key={l} className="meta-item">
                      <span className="meta-item__label">{l}</span>
                      <span className="meta-item__value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'var(--sp-4)'}}>
              <div className="card">
                <div className="card__header"><div className="card__title">Inspection Metadata</div></div>
                <div className="card__body">
                  <div className="meta-list">
                    {[
                      ['Location',  MOCK.location],
                      ['Date',      MOCK.date],
                      ['Officer',   MOCK.officer],
                      ['Status',    MOCK.status],
                    ].map(([l,v]) => (
                      <div key={l} className="meta-item">
                        <span className="meta-item__label">{l}</span>
                        <span className="meta-item__value">{l === 'Status' ? statusBadge(v) : v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card__header"><div className="card__title">Compliance Summary</div></div>
                <div className="card__body">
                  {[
                    ['Checks Passed', COMPLIANCE.filter(c=>c.status==='PASS').length,   'var(--c-pass)'],
                    ['Checks Failed', COMPLIANCE.filter(c=>c.status==='FAIL').length,   'var(--c-fail)'],
                    ['Under Review',  COMPLIANCE.filter(c=>c.status==='REVIEW').length, 'var(--c-review)'],
                  ].map(([label, val, color]) => (
                    <div key={String(label)} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'var(--sp-3) 0', borderBottom:'1px solid var(--c-border-light)'}}>
                      <span style={{fontSize:'var(--fs-13)', color:'var(--c-text-muted)'}}>{label}</span>
                      <span style={{fontSize:'var(--fs-18)', fontWeight:700, color: String(color)}}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Evidence ── */}
        {tab === 'Evidence' && (
          <div className="card">
            <div className="card__header">
              <div className="card__title">Product Label Images</div>
              <div className="card__sub">Evidence uploaded for this inspection</div>
            </div>
            <div className="card__body">
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'var(--sp-4)'}}>
                {['Front Label', 'Back Label', 'Bottom Seal'].map((lbl, i) => (
                  <div key={i} style={{border:'1px solid var(--c-border)', borderRadius:'var(--r-lg)', overflow:'hidden'}}>
                    <div style={{aspectRatio:'4/3', background:`hsl(${220+i*15},20%,93%)`, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-text-light)', fontSize:'var(--fs-12)'}}>
                      Image placeholder
                    </div>
                    <div style={{padding:'var(--sp-2) var(--sp-3)', fontSize:'var(--fs-12)', fontWeight:600, color:'var(--c-text-mid)', borderTop:'1px solid var(--c-border-light)'}}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── OCR Results ── */}
        {tab === 'OCR Results' && (
          <div className="card">
            <div className="card__header">
              <div className="card__title">Extracted Declarations</div>
              <div className="card__sub">Fields extracted via OCR with confidence scores</div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Field</th><th>Extracted Value</th><th>Confidence</th><th>Source</th></tr></thead>
                <tbody>
                  {FIELDS.map(f => (
                    <tr key={f.name}>
                      <td style={{fontWeight:600, fontSize:'var(--fs-12)', color:'var(--c-text-mid)'}}>{f.name}</td>
                      <td style={{fontWeight:500}}>{f.value}</td>
                      <td>{confBar(f.confidence)}</td>
                      <td className="text-sm text-muted">Front Label</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Compliance ── */}
        {tab === 'Compliance' && (
          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Compliance Findings</div>
                <div className="card__sub">Rule-based checks against LMPC Rules 2011</div>
              </div>
              <div style={{display:'flex', gap:'var(--sp-2)'}}>
                {statusBadge('PASS')}<span style={{fontSize:'var(--fs-12)', fontWeight:700}}>{COMPLIANCE.filter(c=>c.status==='PASS').length}</span>
                {statusBadge('FAIL')}<span style={{fontSize:'var(--fs-12)', fontWeight:700}}>{COMPLIANCE.filter(c=>c.status==='FAIL').length}</span>
                {statusBadge('REVIEW')}<span style={{fontSize:'var(--fs-12)', fontWeight:700}}>{COMPLIANCE.filter(c=>c.status==='REVIEW').length}</span>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Rule Code</th><th>Check</th><th>Result</th><th>Severity</th><th>Explanation</th></tr></thead>
                <tbody>
                  {COMPLIANCE.map(c => (
                    <tr key={c.rule}>
                      <td className="col-id">{c.rule}</td>
                      <td style={{fontWeight:500}}>{c.name}</td>
                      <td>{statusBadge(c.status)}</td>
                      <td><span style={{fontSize:'var(--fs-11)', fontWeight:600, color: c.severity==='HIGH'?'var(--c-fail)':c.severity==='MEDIUM'?'var(--c-review)':'var(--c-text-muted)'}}>{c.severity}</span></td>
                      <td style={{fontSize:'var(--fs-12)', color:'var(--c-text-muted)', maxWidth:320}}>{c.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Officer Review ── */}
        {tab === 'Officer Review' && <ReviewTab />}

        {/* ── Report ── */}
        {tab === 'Report' && (
          <div style={{textAlign:'center', padding:'var(--sp-10) var(--sp-6)'}}>
            <p style={{color:'var(--c-text-muted)', marginBottom:'var(--sp-4)'}}>No report generated yet for this inspection.</p>
            <button className="btn btn--primary">Generate Inspection Report</button>
          </div>
        )}
      </div>
    </div>
  );
}
