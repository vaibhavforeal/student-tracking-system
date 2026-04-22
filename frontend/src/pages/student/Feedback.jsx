import { useState, useEffect } from 'react';
import client from '../../api/client';
import {
  HiOutlineLightBulb, HiOutlinePaperAirplane, HiOutlineClock,
  HiOutlineCheckCircle, HiOutlineReply, HiOutlineTag,
  HiOutlineChat,
} from 'react-icons/hi';

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'var(--color-sky-500)' },
  { value: 'academics', label: 'Academics', color: 'var(--color-purple-500)' },
  { value: 'infrastructure', label: 'Infrastructure', color: 'var(--color-warning)' },
  { value: 'faculty', label: 'Faculty', color: 'var(--color-indigo-500)' },
  { value: 'suggestion', label: 'Suggestion', color: 'var(--color-success)' },
  { value: 'complaint', label: 'Complaint', color: 'var(--color-danger)' },
  { value: 'other', label: 'Other', color: 'var(--color-gray-500)' },
];

export default function StudentFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ subject: '', message: '', category: 'general' });
  const [successMsg, setSuccessMsg] = useState('');

  const fetchFeedbacks = async () => {
    try {
      const { data } = await client.get('/student/feedback');
      setFeedbacks(data.feedbacks);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFeedbacks(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;
    setSubmitting(true);
    try {
      await client.post('/student/feedback', form);
      setForm({ subject: '', message: '', category: 'general' });
      setShowForm(false);
      setSuccessMsg('Your feedback has been submitted successfully! 🎉');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchFeedbacks();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to submit feedback');
    }
    finally { setSubmitting(false); }
  };

  const getCategoryInfo = (cat) => CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <HiOutlineLightBulb size={28} style={{ color: 'var(--color-purple-500)' }} />
            Space for Thought
          </h1>
          <p className="page-subtitle">Share your thoughts, suggestions, or feedback with the college administration</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <HiOutlineChat size={18} />
          {showForm ? 'Cancel' : 'New Feedback'}
        </button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.08))',
          border: '1px solid var(--color-success)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-success)',
          fontWeight: 500,
          marginBottom: 'var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          animation: 'fadeIn 0.3s ease',
        }}>
          <HiOutlineCheckCircle size={20} />
          {successMsg}
        </div>
      )}

      {/* Feedback Form */}
      {showForm && (
        <div className="card" style={{
          marginBottom: 'var(--space-6)',
          animation: 'fadeIn 0.3s ease',
          border: '2px solid var(--color-purple-200)',
        }}>
          <div style={{
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '1px solid var(--color-gray-100)',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.04), rgba(56, 189, 248, 0.04))',
          }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <HiOutlinePaperAirplane size={20} style={{ color: 'var(--color-purple-500)' }} />
              Share Your Thoughts
            </h3>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input
                  className="form-input"
                  placeholder="What's on your mind?"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="form-label">Message *</label>
              <textarea
                className="form-input"
                rows={5}
                placeholder="Write your feedback in detail..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                maxLength={2000}
                style={{ resize: 'vertical', minHeight: 120 }}
              />
              <div style={{ textAlign: 'right', fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', marginTop: 'var(--space-1)' }}>
                {form.message.length} / 2000
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !form.subject.trim() || !form.message.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                {submitting ? <div className="spinner" /> : <HiOutlinePaperAirplane size={16} />}
                {submitting ? 'Sending...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feedback History */}
      <div className="card">
        <div style={{
          padding: 'var(--space-5) var(--space-6)',
          borderBottom: '1px solid var(--color-gray-100)',
        }}>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>
            Your Feedback History
            {feedbacks.length > 0 && (
              <span className="badge badge-sky" style={{ marginLeft: 'var(--space-2)' }}>{feedbacks.length}</span>
            )}
          </h3>
        </div>
        <div style={{ padding: 'var(--space-4) var(--space-6)' }}>
          {feedbacks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-10) var(--space-6)',
              color: 'var(--color-gray-400)',
            }}>
              <HiOutlineLightBulb size={48} style={{ marginBottom: 'var(--space-3)', opacity: 0.5 }} />
              <p style={{ fontSize: 'var(--font-lg)', fontWeight: 500 }}>No feedback submitted yet</p>
              <p style={{ fontSize: 'var(--font-sm)' }}>Your voice matters! Share your first thought with us.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {feedbacks.map((fb) => {
                const cat = getCategoryInfo(fb.category);
                const isExpanded = expandedId === fb.id;
                return (
                  <div
                    key={fb.id}
                    style={{
                      border: '1px solid var(--color-gray-100)',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      transition: 'all var(--transition-fast)',
                      ...(fb.adminReply ? { borderLeftWidth: 3, borderLeftColor: 'var(--color-success)' } : {}),
                    }}
                  >
                    {/* Header — clickable */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                      style={{
                        padding: 'var(--space-4) var(--space-5)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        background: isExpanded ? 'var(--color-gray-50)' : 'transparent',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 'var(--font-xs)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: `${cat.color}15`,
                            color: cat.color,
                            fontWeight: 500,
                          }}>
                            {cat.label}
                          </span>
                          {fb.adminReply && (
                            <span style={{
                              fontSize: 'var(--font-xs)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--color-success)',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <HiOutlineReply size={12} /> Replied
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isExpanded ? 'normal' : 'nowrap' }}>
                          {fb.subject}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-gray-400)', fontSize: 'var(--font-xs)', whiteSpace: 'nowrap' }}>
                        <HiOutlineClock size={14} />
                        {formatDate(fb.createdAt)}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 var(--space-5) var(--space-5)',
                        animation: 'fadeIn 0.2s ease',
                      }}>
                        <div style={{
                          padding: 'var(--space-4)',
                          background: 'var(--color-gray-50)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--font-sm)',
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                          color: 'var(--color-gray-700)',
                        }}>
                          {fb.message}
                        </div>

                        {/* Admin reply */}
                        {fb.adminReply && (
                          <div style={{
                            marginTop: 'var(--space-4)',
                            padding: 'var(--space-4)',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05))',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                              marginBottom: 'var(--space-2)',
                              color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--font-sm)',
                            }}>
                              <HiOutlineReply size={16} />
                              Admin Response
                              {fb.repliedAt && (
                                <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--font-xs)' }}>
                                  · {formatDate(fb.repliedAt)}
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: 'var(--font-sm)',
                              lineHeight: 1.7,
                              whiteSpace: 'pre-wrap',
                              color: 'var(--color-gray-700)',
                            }}>
                              {fb.adminReply}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
