import { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import client from '../../api/client';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar, initials } from '../../components/ui/DesignHelpers';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General', color: 'var(--info)' },
  { value: 'academics', label: 'Academics', color: 'var(--accent)' },
  { value: 'infrastructure', label: 'Infrastructure', color: 'var(--warn)' },
  { value: 'faculty', label: 'Faculty', color: '#9b3d8f' },
  { value: 'suggestion', label: 'Suggestion', color: 'var(--good)' },
  { value: 'complaint', label: 'Complaint', color: 'var(--bad)' },
  { value: 'other', label: 'Other', color: 'var(--faint)' },
];

const STATUS_TABS = [
  { value: 'unread', label: 'Unread', icon: 'mail' },
  { value: 'read', label: 'Read', icon: 'eye' },
  { value: 'archived', label: 'Archived', icon: 'folder' },
];

export default function ManageFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('unread');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: statusFilter, category: categoryFilter, search, page, limit: 15 };
      const { data } = await client.get('/admin/feedback', { params });
      setFeedbacks(data.feedbacks); setTotal(data.total); setTotalPages(data.totalPages); setUnreadCount(data.unreadCount);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [statusFilter, categoryFilter, search, page]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const openFeedback = async (id) => { try { const { data } = await client.get(`/admin/feedback/${id}`); setSelectedFeedback(data.feedback); setReplyText(data.feedback.adminReply || ''); fetchFeedbacks(); } catch (err) { console.error(err); } };
  const handleReply = async () => { if (!replyText.trim()) return; setReplying(true); try { const { data } = await client.put(`/admin/feedback/${selectedFeedback.id}/reply`, { reply: replyText }); setSelectedFeedback({ ...selectedFeedback, adminReply: data.feedback.adminReply, repliedAt: data.feedback.repliedAt }); fetchFeedbacks(); } catch (err) { alert(err.response?.data?.error || 'Failed to send reply'); } finally { setReplying(false); } };
  const handleArchive = async (id) => { setActionLoading(id); try { await client.put(`/admin/feedback/${id}/archive`); if (selectedFeedback?.id === id) setSelectedFeedback(null); fetchFeedbacks(); } catch (err) { console.error(err); } finally { setActionLoading(null); } };
  const handleToggleRead = async (id) => { setActionLoading(id); try { await client.put(`/admin/feedback/${id}/read`); if (selectedFeedback?.id === id) setSelectedFeedback({ ...selectedFeedback, isRead: !selectedFeedback.isRead }); fetchFeedbacks(); } catch (err) { console.error(err); } finally { setActionLoading(null); } };

  const getCategoryInfo = (cat) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[1];
  const formatDate = (d) => { if (!d) return '—'; const diff = Date.now() - new Date(d); if (diff < 60000) return 'Just now'; if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
  const formatFullDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  // ─── Detail View ─────────────────────────────
  if (selectedFeedback) {
    const fb = selectedFeedback;
    const cat = getCategoryInfo(fb.category);
    return (
      <div className="rd-content-inner">
        <button className="rd-btn rd-btn-ghost" onClick={() => setSelectedFeedback(null)} style={{ marginBottom: 'var(--gap)' }}>
          <Icon name="arrowUp" style={{ transform: 'rotate(-90deg)', width: 16, height: 16 }} /> Back to Inbox
        </button>

        <div className="rd-card fade-up">
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--accent-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="rd-badge" style={{ background: `color-mix(in srgb, ${cat.color} 10%, transparent)`, color: cat.color }}>{cat.label}</span>
                  {fb.adminReply && <span className="rd-badge" style={{ color: 'var(--good)', background: 'var(--good-soft)' }}>Replied</span>}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{fb.subject}</h2>
                <div style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 4 }}>
                  <Icon name="clock" style={{ width: 13, height: 13, verticalAlign: 'middle', marginRight: 4 }} />{formatFullDate(fb.createdAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="rd-btn rd-btn-ghost rd-btn-sm" onClick={() => handleToggleRead(fb.id)}>
                  <Icon name={fb.isRead ? 'mail' : 'eye'} style={{ width: 15, height: 15 }} /> {fb.isRead ? 'Unread' : 'Read'}
                </button>
                <button className="rd-btn rd-btn-ghost rd-btn-sm" onClick={() => handleArchive(fb.id)}>
                  <Icon name="folder" style={{ width: 15, height: 15 }} /> {fb.isArchived ? 'Unarchive' : 'Archive'}
                </button>
              </div>
            </div>
          </div>

          {/* Student info */}
          {fb.student && (
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)' }}>
              <MiniAvatar name={`${fb.student.firstName} ${fb.student.lastName}`} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{fb.student.firstName} {fb.student.lastName}</div>
                <div style={{ fontSize: 12, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
                  {fb.student.enrollmentNo} · Sem {fb.student.semester}{fb.student.batch ? ` · ${fb.student.batch.department?.name}` : ''}{fb.student.section ? ` · ${fb.student.section.name}` : ''}
                </div>
              </div>
              {fb.student.user?.email && <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--faint)' }}>{fb.student.user.email}</div>}
            </div>
          )}

          {/* Message + Reply */}
          <div style={{ padding: 24 }}>
            <div style={{ padding: 20, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{fb.message}</div>

            {fb.adminReply && (
              <div style={{ marginTop: 20, padding: 20, background: 'var(--good-soft)', borderRadius: 'var(--r-md)', border: '1px solid color-mix(in srgb, var(--good) 20%, transparent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--good)', fontWeight: 600, fontSize: 14 }}>
                  <Check size={14} style={{ display: 'inline', marginBottom: -2 }} /> Your Reply{fb.repliedAt && <span style={{ fontWeight: 400, color: 'var(--faint)', fontSize: 12 }}>· {formatFullDate(fb.repliedAt)}</span>}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{fb.adminReply}</div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="mail" style={{ width: 16, height: 16 }} /> {fb.adminReply ? 'Update Reply' : 'Reply to Student'}
              </label>
              <textarea className="form-input" rows={4} placeholder="Write your response…" value={replyText} onChange={e => setReplyText(e.target.value)} style={{ resize: 'vertical', minHeight: 100 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="rd-btn rd-btn-primary" onClick={handleReply} disabled={replying || !replyText.trim()}>
                  {replying ? 'Sending…' : fb.adminReply ? 'Update Reply' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── List View ───────────────────────────────
  return (
    <div className="rd-content-inner">
      <PageHead title="Student Feedback" sub="View and respond to student thoughts, suggestions, and feedback">
        {unreadCount > 0 && <span className="rd-badge" style={{ background: 'var(--bad)', color: '#fff', fontSize: 13, padding: '4px 12px' }}>{unreadCount} unread</span>}
      </PageHead>

      <div className="rd-toolbar">
        <div className="rd-seg">
          {STATUS_TABS.map(tab => (
            <button key={tab.value} className={statusFilter === tab.value ? 'on' : ''} onClick={() => { setStatusFilter(tab.value); setPage(1); }}>
              <Icon name={tab.icon} style={{ width: 15, height: 15 }} /> {tab.label}
              {tab.value === 'unread' && unreadCount > 0 && <span style={{ background: 'var(--bad)', color: '#fff', fontSize: 10, padding: '0 5px', borderRadius: 99, fontWeight: 600 }}>{unreadCount}</span>}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div className="rd-search">
          <Icon name="search" />
          <input placeholder="Search feedback…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="rd-chip-select" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="rd-card fade-up">
        {loading ? <div className="loading-container"><div className="spinner spinner-lg" /></div> : feedbacks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--faint)' }}>
            <Icon name="mail" style={{ width: 48, height: 48, margin: '0 auto 16px', display: 'block', opacity: 0.5 }} />
            <p style={{ fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-display)' }}>No feedback found</p>
            <p style={{ fontSize: 14 }}>{statusFilter === 'unread' ? 'All caught up!' : 'No feedback matching your filters.'}</p>
          </div>
        ) : (
          <>
            <div className="rd-panel-list">
              {feedbacks.map(fb => {
                const cat = getCategoryInfo(fb.category);
                return (
                  <div key={fb.id} onClick={() => openFeedback(fb.id)} style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'background .12s', background: !fb.isRead ? 'var(--accent-soft)' : 'transparent' }} onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'} onMouseOut={e => e.currentTarget.style.background = !fb.isRead ? 'var(--accent-soft)' : 'transparent'}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: !fb.isRead ? 'var(--accent)' : 'transparent', flexShrink: 0 }} />
                    <MiniAvatar name={`${fb.student?.firstName || ''} ${fb.student?.lastName || ''}`} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{fb.student?.firstName} {fb.student?.lastName}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{fb.student?.enrollmentNo}</span>
                        <span className="rd-badge" style={{ background: `color-mix(in srgb, ${cat.color} 10%, transparent)`, color: cat.color, fontSize: 10 }}>{cat.label}</span>
                      </div>
                      <div style={{ fontSize: 13.5, color: !fb.isRead ? 'var(--ink)' : 'var(--muted)', fontWeight: !fb.isRead ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fb.subject}</div>
                      <div style={{ fontSize: 12, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{fb.message.substring(0, 100)}{fb.message.length > 100 ? '…' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{formatDate(fb.createdAt)}</span>
                      {fb.adminReply && <span className="rd-badge" style={{ color: 'var(--good)', background: 'var(--good-soft)', fontSize: 10 }}>Replied</span>}
                    </div>
                    <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                      <button className="rd-icon-btn" onClick={() => handleArchive(fb.id)} title={fb.isArchived ? 'Unarchive' : 'Archive'} disabled={actionLoading === fb.id}>
                        <Icon name="folder" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="rd-btn rd-btn-ghost rd-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                  <button className="rd-btn rd-btn-ghost rd-btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
