import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar, StatusBadge } from '../../components/ui/DesignHelpers';

export default function NotificationHistory() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await client.get(`/whatsapp/notification-logs?${params}`);
      setLogs(data.logs || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 0);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rd-content-inner">
      <PageHead title="Notification History" sub="Log of all WhatsApp messages sent to parents">
        <button className="rd-btn rd-btn-ghost" onClick={fetchLogs}><Icon name="refresh" /> Refresh</button>
      </PageHead>

      <div className="rd-toolbar">
        <select className="rd-chip-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="sent">Sent</option><option value="failed">Failed</option><option value="pending">Pending</option>
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{total} total records</span>
      </div>

      <div className="rd-card fade-up">
        {loading ? <div className="loading-container"><div className="spinner spinner-lg" /></div> : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--faint)' }}>
            <Icon name="bell" style={{ width: 40, height: 40, margin: '0 auto 16px', display: 'block', opacity: 0.5 }} />
            <p>No notifications sent yet.</p>
          </div>
        ) : (
          <>
            <div className="rd-table-wrap">
              <table className="rd-tbl">
                <thead><tr><th>Date</th><th>Student</th><th>Parent</th><th>Phone</th><th>Type</th><th>Status</th><th>Error</th></tr></thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 13, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{formatDate(log.sentAt)}</td>
                      <td>
                        <div className="rd-cell-name">
                          <MiniAvatar name={`${log.student?.firstName || ''} ${log.student?.lastName || ''}`} size={30} />
                          <div>
                            <div className="rd-name-main">{log.student?.firstName} {log.student?.lastName}</div>
                            <div className="rd-name-sub">{log.student?.enrollmentNo}</div>
                          </div>
                        </div>
                      </td>
                      <td><div style={{ fontWeight: 500, fontSize: 13.5 }}>{log.parent?.name}</div><div style={{ fontSize: 12, color: 'var(--faint)' }}>{log.parent?.relation}</div></td>
                      <td style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>+{log.sentTo}</td>
                      <td><span className="rd-badge" style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}>{log.type}</span></td>
                      <td>
                        {log.status === 'sent' ? <span className="rd-badge" style={{ color: 'var(--good)', background: 'var(--good-soft)' }}><Icon name="check" style={{ width: 13, height: 13 }} /> Sent</span>
                        : log.status === 'failed' ? <span className="rd-badge" style={{ color: 'var(--bad)', background: 'var(--bad-soft)' }}><Icon name="alertTriangle" style={{ width: 13, height: 13 }} /> Failed</span>
                        : <span className="rd-badge" style={{ color: 'var(--muted)', background: 'var(--surface-3)' }}>Pending</span>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--bad)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.errorMsg || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="rd-btn rd-btn-ghost rd-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
                  <button className="rd-btn rd-btn-ghost rd-btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
