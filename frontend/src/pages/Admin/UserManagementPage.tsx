import { useState, useEffect, useCallback } from 'react';
import usersService from '../../services/users';
import type { UserResponse } from '../../types/auth';

export default function UserManagementPage() {
  const [users, setUsers]       = useState<UserResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'approve' | 'reject';
    user: UserResponse;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.list();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load user records from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (user: UserResponse) => {
    setActionLoading(user.id);
    try {
      await usersService.approve(user.id);
      setConfirmDialog(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve user.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (user: UserResponse) => {
    setActionLoading(user.id);
    try {
      await usersService.reject(user.id);
      setConfirmDialog(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reject user.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingUsers  = users.filter(u => !u.is_active);
  const activeUsers   = users.filter(u => u.is_active);

  const formatDate = (iso: string) => {
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
          <h1 className="page-header__title">User Management</h1>
          <p className="page-header__sub">Review officer registration requests and maintain authorized system access</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--secondary btn--sm" onClick={fetchUsers} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh Records'}
          </button>
        </div>
      </div>

      <div className="page-body space-y-6">
        {error && (
          <div className="alert alert--error">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Pending Requests Section ───────────────────────────── */}
        <div className="card">
          <div className="card__header flex items-center justify-between">
            <div>
              <div className="card__title">Pending Registration Requests</div>
              <div className="card__sub">New officer accounts requiring administrative verification and activation</div>
            </div>
            <span className={`badge ${pendingUsers.length > 0 ? 'badge--review' : 'badge--draft'}`}>
              <span className="badge-dot" />
              {pendingUsers.length} Pending
            </span>
          </div>

          <div className="table-wrap">
            {pendingUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No pending officer registration requests. All accounts are up to date.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Officer Name</th>
                    <th>Official Email</th>
                    <th>Role Assigned</th>
                    <th>Registered At</th>
                    <th>Status</th>
                    <th style={{textAlign:'right'}}>Administrative Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(u => (
                    <tr key={u.id}>
                      <td className="font-semibold text-slate-800">{u.name}</td>
                      <td className="font-mono text-xs text-slate-600">{u.email}</td>
                      <td>
                        <span className="badge badge--draft">{u.role}</span>
                      </td>
                      <td className="text-xs text-slate-500">{formatDate(u.created_at)}</td>
                      <td>
                        <span className="badge badge--review">
                          <span className="badge-dot" /> PENDING APPROVAL
                        </span>
                      </td>
                      <td style={{textAlign:'right'}}>
                        <div className="inline-flex gap-2">
                          <button
                            className="btn btn--primary btn--sm"
                            disabled={actionLoading === u.id}
                            onClick={() => setConfirmDialog({ type: 'approve', user: u })}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn--secondary btn--sm text-red-600 hover:text-red-800"
                            disabled={actionLoading === u.id}
                            onClick={() => setConfirmDialog({ type: 'reject', user: u })}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Active Personnel Section ───────────────────────────── */}
        <div className="card">
          <div className="card__header flex items-center justify-between">
            <div>
              <div className="card__title">Authorized Personnel</div>
              <div className="card__sub">Active officers and administrators authorized for Legal Metrology inspections</div>
            </div>
            <span className="badge badge--pass">
              <span className="badge-dot" />
              {activeUsers.length} Active
            </span>
          </div>

          <div className="table-wrap">
            {activeUsers.length === 0 && !loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active users found.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Member Since</th>
                    <th style={{textAlign:'right'}}>Access Control</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map(u => (
                    <tr key={u.id}>
                      <td className="font-semibold text-slate-800">{u.name}</td>
                      <td className="font-mono text-xs text-slate-600">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'badge--proc' : 'badge--draft'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge--pass">
                          <span className="badge-dot" /> ACTIVE
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">{formatDate(u.created_at)}</td>
                      <td style={{textAlign:'right'}}>
                        {u.role !== 'ADMIN' && (
                          <button
                            className="btn btn--secondary btn--sm text-red-600 hover:text-red-800"
                            disabled={actionLoading === u.id}
                            onClick={() => setConfirmDialog({ type: 'reject', user: u })}
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ─────────────────────────────────── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {confirmDialog.type === 'approve' ? 'Confirm User Approval' : 'Confirm Account Action'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmDialog.type === 'approve'
                ? `Are you sure you want to approve and grant Legal Metrology inspection authority to "${confirmDialog.user.name}" (${confirmDialog.user.email})?`
                : `Are you sure you want to reject / deactivate the account for "${confirmDialog.user.name}" (${confirmDialog.user.email})?`}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => setConfirmDialog(null)}
                disabled={actionLoading !== null}
              >
                Cancel
              </button>
              <button
                className={`btn btn--sm ${confirmDialog.type === 'approve' ? 'btn--navy' : 'btn--primary bg-red-700 hover:bg-red-800'}`}
                disabled={actionLoading !== null}
                onClick={() =>
                  confirmDialog.type === 'approve'
                    ? handleApprove(confirmDialog.user)
                    : handleReject(confirmDialog.user)
                }
              >
                {actionLoading !== null
                  ? 'Processing…'
                  : confirmDialog.type === 'approve'
                  ? 'Confirm Approval'
                  : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
