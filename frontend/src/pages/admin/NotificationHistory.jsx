import { useState, useEffect } from 'react';
import client from '../../api/client';
import { HiOutlineBell, HiOutlineCheck, HiOutlineExclamation, HiOutlineRefresh } from 'react-icons/hi';

export default function NotificationHistory() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await client.get(`/whatsapp/notification-logs?${params}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page, statusFilter]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notification History</h1>
          <p className="page-subtitle">Log of all WhatsApp messages sent to parents</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>
          <HiOutlineRefresh /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Filter by Status:</label>
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: '200px' }}>
            <option value="">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
            {total} total records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading-container"><div className="spinner spinner-lg" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <HiOutlineBell size={40} style={{ color: 'var(--color-gray-300)', marginBottom: 'var(--space-3)' }} />
              <p>No notifications sent yet.</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Student</th>
                      <th>Parent</th>
                      <th>Phone</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: 'var(--font-sm)', whiteSpace: 'nowrap' }}>
                          {formatDate(log.sentAt)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>
                            {log.student?.firstName} {log.student?.lastName}
                          </div>
                          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                            {log.student?.enrollmentNo}
                          </div>
                        </td>
                        <td>
                          <div>{log.parent?.name}</div>
                          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                            {log.parent?.relation}
                          </div>
                        </td>
                        <td style={{ fontSize: 'var(--font-sm)', fontFamily: 'monospace' }}>
                          +{log.sentTo}
                        </td>
                        <td>
                          <span className="badge badge-purple">{log.type}</span>
                        </td>
                        <td>
                          {log.status === 'sent' ? (
                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <HiOutlineCheck size={14} /> Sent
                            </span>
                          ) : log.status === 'failed' ? (
                            <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <HiOutlineExclamation size={14} /> Failed
                            </span>
                          ) : (
                            <span className="badge badge-gray">Pending</span>
                          )}
                        </td>
                        <td style={{ fontSize: 'var(--font-xs)', color: '#dc2626', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.errorMsg || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'center', gap: 'var(--space-2)',
                  marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)',
                  borderTop: '1px solid var(--color-gray-100)',
                }}>
                  <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 var(--space-3)', fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
