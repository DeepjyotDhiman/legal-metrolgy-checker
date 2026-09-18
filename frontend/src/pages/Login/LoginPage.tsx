import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Invalid credentials. Please verify your email and password and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      {/* ── Brand Panel ─────────────────────────────────── */}
      <div className="login-brand">
        <div>
          <div className="login-brand__seal">TN</div>
          <div className="login-brand__title">TriNetra</div>
          <div className="login-brand__sub">
            Legal Metrology Packaged Commodity<br />
            Inspection &amp; Compliance System
          </div>

          <div className="login-brand__features">
            {[
              ['OCR-assisted label scanning', 'Automated extraction of mandatory declarations from product labels'],
              ['Rule-based compliance checks', 'Deterministic verification against LMPC Rules 2011'],
              ['Officer review workflow', 'Structured human review with final decision authority'],
              ['Audit-ready reporting', 'Inspection records with full evidence chain'],
            ].map(([title, desc]) => (
              <div key={title} className="login-brand__feature">
                <span className="login-brand__feature-icon">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div className="login-brand__feature-text">
                  <strong style={{color:'rgba(255,255,255,.85)'}}>{title}</strong><br />{desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="login-brand__govt">
          Ministry of Consumer Affairs, Food &amp; Public Distribution<br />
          Government of India — For Official Use Only
        </div>
      </div>

      {/* ── Form Panel ──────────────────────────────────── */}
      <div className="login-form-wrap">
        <div className="login-form-card">
          <div className="login-form-header">
            <div className="login-form-title">Sign In</div>
            <div className="login-form-sub">Use your department credentials to continue</div>
          </div>

          {error && (
            <div className="alert alert--error" style={{marginBottom:'var(--sp-4)'}}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form-stack">
            <div className="form-field">
              <label htmlFor="login-email" className="form-label">
                Email Address <span className="form-required">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="officer@trinetra.gov.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="login-password" className="form-label">
                Password <span className="form-required">*</span>
              </label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn--navy btn--lg btn--full"
              disabled={loading}
              style={{marginTop:'var(--sp-2)'}}
            >
              {loading ? 'Authenticating…' : 'Sign In to TriNetra'}
            </button>
          </form>

          <div className="login-notice">
            🔒 Authorized personnel only. Unauthorized access is an offence under<br />
            the Information Technology Act, 2000.
          </div>
        </div>
      </div>
    </div>
  );
}
