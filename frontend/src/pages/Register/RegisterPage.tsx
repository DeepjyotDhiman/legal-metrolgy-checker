import { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/auth';

export default function RegisterPage() {
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState<string | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [submitted, setSubmitted]             = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await authService.register(name, email, password);
      setPassword('');
      setConfirmPassword('');
      setSubmitted(true);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. Please check your details and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-[#1a2e4a] text-white font-bold text-xl mb-3 shadow-sm border border-slate-700">
          TN
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          TriNetra
        </h1>
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">
          Legal Metrology Packaged Commodity Inspection System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-lg sm:px-10">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Registration submitted. Your account is pending administrator approval.
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900 text-left space-y-1">
                <p className="font-semibold">Your account is pending administrator approval.</p>
                <p>Once approved, you can sign in using your registered email and password.</p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a2e4a] hover:bg-[#11203a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a2e4a]"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="border-b border-slate-200 pb-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900">Officer Registration</h2>
                <p className="text-xs text-slate-500 mt-1">
                  New accounts require administrator approval.
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md p-3 flex items-start space-x-2">
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
                    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Inspector Rajesh Kumar"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder-slate-400 focus:border-[#1a2e4a] focus:outline-none focus:ring-1 focus:ring-[#1a2e4a]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700">
                    Official Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="officer@department.gov.in"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder-slate-400 focus:border-[#1a2e4a] focus:outline-none focus:ring-1 focus:ring-[#1a2e4a]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder-slate-400 focus:border-[#1a2e4a] focus:outline-none focus:ring-1 focus:ring-[#1a2e4a]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-confirm" className="block text-xs font-semibold text-slate-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-confirm"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder-slate-400 focus:border-[#1a2e4a] focus:outline-none focus:ring-1 focus:ring-[#1a2e4a]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1a2e4a] hover:bg-[#11203a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a2e4a] disabled:opacity-50"
                  >
                    {loading ? 'Submitting…' : 'Submit Registration'}
                  </button>
                </div>

                <div className="text-center pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Already registered? </span>
                  <Link to="/login" className="text-xs font-semibold text-blue-700 hover:underline">
                    Sign In
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Ministry of Consumer Affairs, Food &amp; Public Distribution<br />
          Government of India — Official Portal
        </div>
      </div>
    </div>
  );
}
