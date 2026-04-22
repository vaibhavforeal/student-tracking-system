import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import {
  HiOutlineMail, HiOutlineMailOpen, HiOutlineSearch,
  HiOutlineFilter, HiOutlineArchive, HiOutlineReply,
  HiOutlineTag, HiOutlineClock, HiOutlineUser,
  HiOutlineAcademicCap, HiOutlineChevronLeft,
  HiOutlineCheckCircle, HiOutlineExclamation,
} from 'react-icons/hi';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General', color: 'var(--color-sky-500)' },
  { value: 'academics', label: 'Academics', color: 'var(--color-purple-500)' },
  { value: 'infrastructure', label: 'Infrastructure', color: 'var(--color-warning)' },
  { value: 'faculty', label: 'Faculty', color: 'var(--color-indigo-500)' },
  { value: 'suggestion', label: 'Suggestion', color: 'var(--color-success)' },
  { value: 'complaint', label: 'Complaint', color: 'var(--color-danger)' },
  { value: 'other', label: 'Other', color: 'var(--color-gray-500)' },
];

const STATUS_TABS = [
  { value: 'unread', label: 'Unread', icon: HiOutlineMail },
  { value: 'read', label: 'Read', icon: HiOutlineMailOpen },
  { value: 'archived', label: 'Archived', icon: HiOutlineArchive },
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
      setFeedbacks(data.feedbacks);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setUnreadCount(data.unreadCount);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [statusFilter, categoryFilter, search, page]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const openFeedback = async (id) => {
    try {
      const { data } = await client.get(`/admin/feedback/${id}`);
      setSelectedFeedback(data.feedback);
      setReplyText(data.feedback.adminReply || '');
      // Refresh list to update read status
      fetchFeedbacks();
    } catch (err) { console.error(err); }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      const { data } = await client.put(`/admin/feedback/${selectedFeedback.id}/reply`, { reply: replyText });
      setSelectedFeedback({ ...selectedFeedback, adminReply: data.feedback.adminReply, repliedAt: data.feedback.repliedAt });
      fetchFeedbacks();
    } catch (err) { console.error(err); alert(err.response?.data?.error || 'Failed to send reply'); }
    finally { setReplying(false); }
  };

  const handleArchive = async (id) => {
    setActionLoading(id);
    try {
      await client.put(`/admin/feedback/${id}/archive`);
      if (selectedFeedback?.id === id) setSelectedFeedback(null);
      fetchFeedbacks();
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleToggleRead = async (id) => {
    setActionLoading(id);
    try {
      await client.put(`/admin/feedback/${id}/read`);
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, isRead: !selectedFeedback.isRead });
      }
      fetchFeedbacks();
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const getCategoryInfo = (cat) => CATEGORIES.find((c) => c.value === cat) || CATEGORIES[1];

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatFullDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  // ─── Detail View ─────────────────────────────
  if (selectedFeedback) {
    const fb = selectedFeedback;
    const cat = getCategoryInfo(fb.category);
    return (
      <div>
        <button
          className="btn btn-ghost"
          onClick={() => setSelectedFeedback(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}
        >
          <HiOutlineChevronLeft size={18} /> Back to Inbox
        </button>

        <div className="card">
          {/* Feedback header */}
          <div style={{
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '1px solid var(--color-gray-100)',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.03), rgba(56, 189, 248, 0.03))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <span style={{
                    fontSize: 'var(--font-xs)', padding: '2px 10px', borderRadius: 'var(--radius-full)',
                    background: `${cat.color}15`, color: cat.color, fontWeight: 500,
                  }}>
                    {cat.label}
                  </span>
                  {fb.adminReply && (
                    <span className="badge badge-success" style={{ fontSize: 'var(--font-xs)' }}>Replied</span>
                  )}
                </div>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{fb.subject}</h2>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-400)', marginTop: 'var(--space-1)' }}>
                  <HiOutlineClock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {formatFullDate(fb.createdAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleToggleRead(fb.id)}
                  title={fb.isRead ? 'Mark as unread' : 'Mark as read'}
                  style={{ fontSize: 'var(--font-sm)' }}
                >
                  {fb.isRead ? <HiOutlineMail size={16} /> : <HiOutlineMailOpen size={16} />}
                  {fb.isRead ? 'Unread' : 'Read'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleArchive(fb.id)}
                  title={fb.isArchived ? 'Unarchive' : 'Archive'}
                  style={{ fontSize: 'var(--font-sm)' }}
                >
                  <HiOutlineArchive size={16} />
                  {fb.isArchived ? 'Unarchive' : 'Archive'}
                </button>
              </div>
            </div>
          </div>

          {/* Student info */}
          {fb.student && (
            <div style={{
              padding: 'var(--space-4) var(--space-6)',
              borderBottom: '1px solid var(--color-gray-100)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
              background: 'var(--color-gray-50)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--color-purple-500), var(--color-sky-500))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 600, fontSize: 'var(--font-sm)',
              }}>
                {fb.student.firstName?.charAt(0)}{fb.student.lastName?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{fb.student.firstName} {fb.student.lastName}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)' }}>
                  {fb.student.enrollmentNo} · Semester {fb.student.semester}
                  {fb.student.batch && ` · ${fb.student.batch.department?.name}`}
                  {fb.student.section && ` · ${fb.student.section.name}`}
                </div>
              </div>
              {fb.student.user?.email && (
                <div style={{ marginLeft: 'auto', fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                  {fb.student.user.email}
                </div>
              )}
            </div>
          )}

          {/* Message body */}
          <div style={{ padding: 'var(--space-6)' }}>
            <div style={{
              padding: 'var(--space-5)',
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--font-base)',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              color: 'var(--color-gray-700)',
            }}>
              {fb.message}
            </div>

            {/* Existing reply */}
            {fb.adminReply && (
              <div style={{
                marginTop: 'var(--space-5)',
                padding: 'var(--space-5)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05))',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                  color: 'var(--color-success)', fontWeight: 600,
                }}>
                  <HiOutlineCheckCircle size={18} />
                  Your Reply
                  {fb.repliedAt && (
                    <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--font-xs)' }}>
                      · {formatFullDate(fb.repliedAt)}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 'var(--font-sm)', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', color: 'var(--color-gray-700)',
                }}>
                  {fb.adminReply}
                </div>
              </div>
            )}

            {/* Reply form */}
            <div style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <HiOutlineReply size={16} />
                {fb.adminReply ? 'Update Reply' : 'Reply to Student'}
              </label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Write your response..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ resize: 'vertical', minHeight: 100 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleReply}
                  disabled={replying || !replyText.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                >
                  {replying ? <div className="spinner" /> : <HiOutlineReply size={16} />}
                  {replying ? 'Sending...' : fb.adminReply ? 'Update Reply' : 'Send Reply'}
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
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <HiOutlineMail size={28} style={{ color: 'var(--color-purple-500)' }} />
          Student Feedback
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--color-danger)',
              color: '#fff',
              fontSize: 'var(--font-xs)',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              minWidth: 20,
              textAlign: 'center',
            }}>
              {unreadCount}
            </span>
          )}
        </h1>
        <p className="page-subtitle">View and respond to student thoughts, suggestions, and feedback</p>
      </div>

      {/* Status tabs */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-1)',
        marginBottom: 'var(--space-5)',
        background: 'var(--color-gray-100)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-1)',
        width: 'fit-content',
      }}>
        {STATUS_TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--font-sm)',
              fontWeight: statusFilter === value ? 600 : 400,
              background: statusFilter === value ? '#fff' : 'transparent',
              color: statusFilter === value ? 'var(--color-purple-600)' : 'var(--color-gray-500)',
              boxShadow: statusFilter === value ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Icon size={16} />
            {label}
            {value === 'unread' && unreadCount > 0 && (
              <span style={{
                background: 'var(--color-danger)',
                color: '#fff',
                fontSize: '10px',
                padding: '0 5px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <HiOutlineSearch size={16} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-gray-400)',
          }} />
          <input
            className="form-input"
            placeholder="Search by subject, message, or student..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="form-input"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: 180 }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Feedback list */}
      <div className="card">
        {loading ? (
          <div className="loading-container"><div className="spinner spinner-lg" /></div>
        ) : feedbacks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-10) var(--space-6)',
            color: 'var(--color-gray-400)',
          }}>
            <HiOutlineMail size={48} style={{ marginBottom: 'var(--space-3)', opacity: 0.5 }} />
            <p style={{ fontSize: 'var(--font-lg)', fontWeight: 500 }}>No feedback found</p>
            <p style={{ fontSize: 'var(--font-sm)' }}>
              {statusFilter === 'unread' ? 'All caught up! No unread feedback.' : 'No feedback matching your filters.'}
            </p>
          </div>
        ) : (
          <>
            {feedbacks.map((fb) => {
              const cat = getCategoryInfo(fb.category);
              return (
                <div
                  key={fb.id}
                  onClick={() => openFeedback(fb.id)}
                  style={{
                    padding: 'var(--space-4) var(--space-5)',
                    borderBottom: '1px solid var(--color-gray-50)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    transition: 'background var(--transition-fast)',
                    background: !fb.isRead ? 'rgba(139, 92, 246, 0.02)' : 'transparent',
                    fontWeight: !fb.isRead ? 500 : 400,
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-gray-50)'}
                  onMouseOut={(e) => e.currentTarget.style.background = !fb.isRead ? 'rgba(139, 92, 246, 0.02)' : 'transparent'}
                >
                  {/* Unread dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: !fb.isRead ? 'var(--color-purple-500)' : 'transparent',
                  }} />

                  {/* Student avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-full)', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--color-purple-500), var(--color-sky-500))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 'var(--font-xs)', fontWeight: 600,
                  }}>
                    {fb.student?.firstName?.charAt(0)}{fb.student?.lastName?.charAt(0)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                      <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-gray-900)' }}>
                        {fb.student?.firstName} {fb.student?.lastName}
                      </span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                        {fb.student?.enrollmentNo}
                      </span>
                      <span style={{
                        fontSize: '10px', padding: '1px 6px', borderRadius: 'var(--radius-full)',
                        background: `${cat.color}15`, color: cat.color, fontWeight: 500,
                      }}>
                        {cat.label}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 'var(--font-sm)',
                      color: !fb.isRead ? 'var(--color-gray-900)' : 'var(--color-gray-600)',
                      fontWeight: !fb.isRead ? 600 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {fb.subject}
                    </div>
                    <div style={{
                      fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginTop: 2,
                    }}>
                      {fb.message.substring(0, 100)}{fb.message.length > 100 ? '...' : ''}
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)', flexShrink: 0 }}>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', whiteSpace: 'nowrap' }}>
                      {formatDate(fb.createdAt)}
                    </span>
                    {fb.adminReply && (
                      <span style={{
                        fontSize: '10px', padding: '1px 6px', borderRadius: 'var(--radius-full)',
                        background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 2,
                      }}>
                        <HiOutlineReply size={10} /> Replied
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: 'var(--space-1)' }}
                      onClick={() => handleArchive(fb.id)}
                      title={fb.isArchived ? 'Unarchive' : 'Archive'}
                      disabled={actionLoading === fb.id}
                    >
                      <HiOutlineArchive size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: 'var(--space-4) var(--space-5)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: '1px solid var(--color-gray-100)',
              }}>
                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
                  Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total}
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                  <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
