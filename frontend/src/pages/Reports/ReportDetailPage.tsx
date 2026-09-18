import { useParams } from 'react-router-dom';
import { IcoPrint, IcoDownload } from '../../components/ui/Icons';

const COMPLIANCE = [
  { rule:'LM-R-001', name:'MRP Declaration',          status:'PASS',   severity:'HIGH',   explanation:'MRP ₹349.00 clearly printed inclusive of taxes. Compliant with Rule 18.' },
  { rule:'LM-R-002', name:'Net Quantity',              status:'PASS',   severity:'HIGH',   explanation:'Net quantity 5 kg declared. Metric units used. Compliant with Rule 7.' },
  { rule:'LM-R-003', name:'Manufacturer Name/Address', status:'PASS',   severity:'HIGH',   explanation:'KRBL Limited, New Delhi – 110001. Full address present.' },
  { rule:'LM-R-004', name:'Month/Year of Manufacture', status:'REVIEW', severity:'MEDIUM', explanation:'Detected "Aug 2026". Officer physically verified and confirmed.' },
  { rule:'LM-R-005', name:'Best Before / Expiry',      status:'REVIEW', severity:'MEDIUM', explanation:'Detected "Aug 2027". Officer verified against physical label.' },
  { rule:'LM-R-006', name:'Consumer Helpline Number',  status:'FAIL',   severity:'LOW',    explanation:'Consumer helpline number absent from label. Non-compliant per Rule 28(k).' },
  { rule:'LM-R-007', name:'FSSAI License Number',      status:'PASS',   severity:'HIGH',   explanation:'FSSAI Lic. 10016011002733 present and format validated.' },
];

function statusCell(s: string) {
  const map: Record<string, [string, string]> = {
    PASS:   ['badge--pass',   'PASS'],
    FAIL:   ['badge--fail',   'FAIL'],
    REVIEW: ['badge--review', 'REVIEW'],
  };
  const [cls, label] = map[s] ?? ['badge--draft', s];
  return <span className={`badge ${cls}`}><span className="badge-dot" />{label}</span>;
}

export default function ReportDetailPage() {
  const { id } = useParams<{id:string}>();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Inspection Report</h1>
          <p className="page-header__sub">{id ?? 'RPT-2026-000247'}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--secondary"><IcoPrint size={14} /> Print</button>
          <button className="btn btn--secondary"><IcoDownload size={14} /> Download PDF</button>
          <button className="btn btn--primary">Generate Updated Report</button>
        </div>
      </div>

      <div className="page-body">
        <div className="report-doc">
          {/* Report Header */}
          <div className="report-doc__header">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:'var(--fs-11)', color:'rgba(255,255,255,.5)', letterSpacing:'.5px', marginBottom:'var(--sp-1)'}}>GOVERNMENT OF INDIA — LEGAL METROLOGY DEPARTMENT</div>
                <div className="report-doc__header-title">Packaged Commodity Inspection Report</div>
                <div className="report-doc__header-sub">Legal Metrology (Packaged Commodities) Rules, 2011</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'var(--fs-22)', fontWeight:800, color:'#fff', letterSpacing:'-1px'}}>TriNetra</div>
                <div style={{fontSize:'var(--fs-11)', color:'rgba(255,255,255,.5)'}}>Inspection Management System</div>
              </div>
            </div>
            <div className="report-doc__header-meta">
              {[
                ['Report ID',       id ?? 'RPT-2026-000247'],
                ['Inspection ID',   'LM-2026-000247'],
                ['Generated On',    '18 Sep 2026, 16:42 IST'],
                ['Status',          'REVIEW REQUIRED'],
              ].map(([l,v]) => (
                <div key={l} className="report-doc__meta-item">
                  <div className="report-doc__meta-label">{l}</div>
                  <div className="report-doc__meta-value">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 1: Inspection Information */}
          <div className="report-doc__section">
            <div className="report-doc__section-title">
              <span className="report-doc__section-num">1</span>
              Inspection Information
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)'}}>
              {[
                ['Inspection ID',      'LM-2026-000247'],
                ['Inspection Date',    '18 September 2026'],
                ['Inspection Location','Karol Bagh Market, New Delhi'],
                ['Inspecting Officer', 'Rajesh Kumar, LM Officer'],
                ['Product Category',   'Food Product — Packaged Grain'],
                ['Reference No.',      'DEL/LM/2026/09/247'],
              ].map(([l,v]) => (
                <div key={l} className="meta-item">
                  <span className="meta-item__label">{l}</span>
                  <span className="meta-item__value">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Product Details */}
          <div className="report-doc__section">
            <div className="report-doc__section-title">
              <span className="report-doc__section-num">2</span>
              Product Information
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)'}}>
              {[
                ['Product Name',     'Premium Basmati Rice'],
                ['Brand',            'India Gate'],
                ['Manufacturer',     'KRBL Limited'],
                ['Address',          '5E Hansalaya Building, New Delhi – 110001'],
                ['Batch / Lot No.',  'BT-2026-09-A1'],
                ['Net Quantity',     '5 kg'],
                ['MRP (incl. taxes)','₹349.00'],
                ['Mfg. Date',        'August 2026'],
                ['Best Before',      'August 2027'],
                ['FSSAI Lic. No.',   '10016011002733'],
              ].map(([l,v]) => (
                <div key={l} className="meta-item">
                  <span className="meta-item__label">{l}</span>
                  <span className="meta-item__value">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Evidence */}
          <div className="report-doc__section">
            <div className="report-doc__section-title">
              <span className="report-doc__section-num">3</span>
              Product Evidence
            </div>
            <div style={{display:'flex', gap:'var(--sp-4)', flexWrap:'wrap'}}>
              {['Front Label', 'Back Label', 'Batch Marking'].map((lbl, i) => (
                <div key={i} style={{width:140}}>
                  <div style={{width:140, height:105, background:`hsl(${215+i*10},18%,91%)`, borderRadius:'var(--r-md)', border:'1px solid var(--c-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'var(--fs-11)', color:'var(--c-text-light)', marginBottom:4}}>
                    Image {i+1}
                  </div>
                  <div style={{fontSize:'var(--fs-11)', fontWeight:600, color:'var(--c-text-mid)', textAlign:'center'}}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Extracted Declarations */}
          <div className="report-doc__section">
            <div className="report-doc__section-title">
              <span className="report-doc__section-num">4</span>
              Extracted Declarations (OCR)
            </div>
            <table className="data-table" style={{border:'1px solid var(--c-border)', borderRadius:'var(--r-md)', overflow:'hidden'}}>
              <thead>
                <tr>
                  <th>Mandatory Declaration</th>
                  <th>Extracted Value</th>
                  <th>OCR Confidence</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Product Name',      'Premium Basmati Rice', '98%'],
                  ['Net Quantity',      '5 kg',                 '97%'],
                  ['MRP',               '₹349.00',              '99%'],
                  ['Manufacturer',      'KRBL Limited, New Delhi','94%'],
                  ['Mfg. Date',         'Aug 2026',             '91%'],
                  ['Best Before',       'Aug 2027',             '89%'],
                  ['FSSAI Lic. No.',    '10016011002733',       '96%'],
                ].map(([l,v,c]) => (
                  <tr key={l}>
                    <td style={{fontWeight:500}}>{l}</td>
                    <td className="text-mono">{v}</td>
                    <td style={{fontSize:'var(--fs-12)', color:'var(--c-text-muted)'}}>{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 5: Compliance Findings */}
          <div className="report-doc__section">
            <div className="report-doc__section-title">
              <span className="report-doc__section-num">5</span>
              Compliance Findings
            </div>
            <table className="data-table" style={{border:'1px solid var(--c-border)', borderRadius:'var(--r-md)', overflow:'hidden'}}>
              <thead>
                <tr><th>Rule</th><th>Requirement</th><th>Result</th><th>Severity</th><th>Finding</th></tr>
              </thead>
              <tbody>
                {COMPLIANCE.map(c => (
                  <tr key={c.rule}>
                    <td className="col-id">{c.rule}</td>
                    <td style={{fontWeight:500, fontSize:'var(--fs-12)'}}>{c.name}</td>
                    <td>{statusCell(c.status)}</td>
                    <td style={{fontSize:'var(--fs-11)', fontWeight:600, color: c.severity==='HIGH'?'var(--c-fail)':c.severity==='MEDIUM'?'var(--c-review)':'var(--c-text-muted)'}}>{c.severity}</td>
                    <td style={{fontSize:'var(--fs-12)', color:'var(--c-text-muted)', maxWidth:280}}>{c.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 6: Officer Review */}
          <div className="report-doc__section">
            <div className="report-doc__section-title">
              <span className="report-doc__section-num">6</span>
              Officer Review &amp; Decision
            </div>
            <div className="alert alert--warning" style={{marginBottom:'var(--sp-4)'}}>
              This inspection is pending officer review. Final decision has not been recorded.
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)'}}>
              {[
                ['Reviewing Officer',  'Rajesh Kumar'],
                ['Review Date',        'Pending'],
                ['Final Decision',     'Pending'],
                ['Officer Notes',      '—'],
              ].map(([l,v]) => (
                <div key={l} className="meta-item">
                  <span className="meta-item__label">{l}</span>
                  <span className="meta-item__value">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Audit Information */}
          <div className="report-doc__section" style={{background:'var(--c-surface-alt)'}}>
            <div className="report-doc__section-title">
              <span className="report-doc__section-num">7</span>
              Audit &amp; System Information
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'var(--sp-3)'}}>
              {[
                ['Record Created',       '18 Sep 2026, 09:14 IST'],
                ['Last Modified',        '18 Sep 2026, 16:42 IST'],
                ['System Version',       'TriNetra v0.1.0'],
                ['OCR Engine',           'PaddleOCR 2.7'],
                ['Rules Version',        'LMPC Rules 2011 v1.1'],
                ['Digital Signature',    'Pending Officer Sign-off'],
              ].map(([l,v]) => (
                <div key={l} className="meta-item">
                  <span className="meta-item__label">{l}</span>
                  <span className="meta-item__value" style={{fontSize:'var(--fs-12)'}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:'var(--sp-5)', paddingTop:'var(--sp-4)', borderTop:'1px solid var(--c-border)', display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
              <div style={{fontSize:'var(--fs-11)', color:'var(--c-text-light)', lineHeight:1.6}}>
                This report is generated by TriNetra — an AI-assisted inspection system.<br />
                All compliance findings are advisory. Final legal determination rests with the inspecting officer.
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{width:160, height:1, background:'var(--c-border-dark)', marginBottom:4}} />
                <div style={{fontSize:'var(--fs-11)', color:'var(--c-text-muted)'}}>Signature of Inspecting Officer</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
