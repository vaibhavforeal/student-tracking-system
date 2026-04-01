import { useState, useEffect } from 'react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  HiOutlineLightBulb, HiOutlineSearch, HiOutlineExternalLink,
  HiOutlineClock, HiOutlineAcademicCap, HiOutlineCheckCircle,
  HiOutlineXCircle, HiOutlineBookOpen,
} from 'react-icons/hi';

export default function SkillCourses() {
  const [tab, setTab] = useState('browse'); // browse | my
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [confirmDrop, setConfirmDrop] = useState(null);

  const fetchBrowse = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCat) params.categoryId = filterCat;
      if (filterDiff) params.difficulty = filterDiff;
      if (search) params.search = search;
      const res = await client.get('/student/skill-courses', { params });
      setCourses(res.data.skillCourses);
      setCategories(res.data.categories);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMy = async () => {
    setLoading(true);
    try {
      const res = await client.get('/student/skill-courses/my');
      setMyEnrollments(res.data.enrollments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'browse') fetchBrowse(); else fetchMy(); }, [tab, filterCat, filterDiff]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (tab === 'browse') fetchBrowse();
  };

  const handleEnroll = async (courseId) => {
    setActionLoading(courseId);
    try {
      await client.post(`/student/skill-courses/${courseId}/enroll`);
      if (tab === 'browse') fetchBrowse(); else fetchMy();
    } catch (err) { alert(err.response?.data?.error || 'Failed to enroll'); }
    finally { setActionLoading(''); }
  };

  const handleDrop = async () => {
    if (!confirmDrop) return;
    setActionLoading(confirmDrop);
    try {
      await client.put(`/student/skill-courses/${confirmDrop}/drop`);
      setConfirmDrop(null);
      if (tab === 'browse') fetchBrowse(); else fetchMy();
    } catch (err) { alert(err.response?.data?.error || 'Failed to drop'); }
    finally { setActionLoading(''); }
  };

  const handleComplete = async (courseId) => {
    setActionLoading(courseId);
    try {
      await client.put(`/student/skill-courses/${courseId}/complete`);
      if (tab === 'browse') fetchBrowse(); else fetchMy();
    } catch (err) { alert(err.response?.data?.error || 'Failed to mark complete'); }
    finally { setActionLoading(''); }
  };

  const diffColor = { beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#ef4444' };
  const diffBadge = { beginner: 'badge-green', intermediate: 'badge-amber', advanced: 'badge-red' };
  const diffLabel = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  const statusBadge = { enrolled: 'badge-sky', completed: 'badge-green', dropped: 'badge-gray' };

  const enrolledCount = tab === 'browse'
    ? courses.filter((c) => c.myStatus === 'enrolled').length
    : myEnrollments.filter((e) => e.status === 'enrolled').length;
  const completedCount = tab === 'browse'
    ? courses.filter((c) => c.myStatus === 'completed').length
    : myEnrollments.filter((e) => e.status === 'completed').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Skill Enhancement Courses</h1>
          <p className="page-subtitle">
            Browse and enroll in courses to enhance your skills
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-6)',
        flexWrap: 'wrap',
      }}>
        <div className="card" style={{
          padding: 'var(--space-4) var(--space-5)', display: 'flex',
          alignItems: 'center', gap: 'var(--space-3)', flex: '1 1 180px',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-lg)',
            background: 'rgba(56, 189, 248, 0.12)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <HiOutlineBookOpen size={20} style={{ color: 'var(--color-sky-500)' }} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{enrolledCount}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)' }}>Enrolled</div>
          </div>
        </div>
        <div className="card" style={{
          padding: 'var(--space-4) var(--space-5)', display: 'flex',
          alignItems: 'center', gap: 'var(--space-3)', flex: '1 1 180px',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-lg)',
            background: 'rgba(34, 197, 94, 0.12)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <HiOutlineCheckCircle size={20} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{completedCount}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)' }}>Completed</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-5)',
        borderBottom: '2px solid var(--color-gray-100)', paddingBottom: 0,
      }}>
        {['browse', 'my'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: 'var(--space-3) var(--space-5)',
            fontWeight: tab === t ? 600 : 400,
            color: tab === t ? 'var(--color-sky-600)' : 'var(--color-gray-500)',
            borderBottom: tab === t ? '2px solid var(--color-sky-500)' : '2px solid transparent',
            background: 'none', border: 'none', cursor: 'pointer',
            marginBottom: '-2px', fontSize: 'var(--font-sm)',
            transition: 'all var(--transition-fast)',
          }}>
            {t === 'browse' ? '🔍 Browse Catalog' : '📚 My Courses'}
          </button>
        ))}
      </div>

      {/* Filters + Search (browse tab) */}
      {tab === 'browse' && (
        <div className="toolbar">
          <div className="filter-group" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <div style={{ position: 'relative' }}>
                <HiOutlineSearch size={16} style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-gray-400)',
                }} />
                <input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses..." style={{ paddingLeft: 32, width: 220 }} />
              </div>
              <button type="submit" className="btn btn-secondary btn-sm">Search</button>
            </form>
            <select className="form-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ width: 'auto' }}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="form-select" value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)} style={{ width: 'auto' }}>
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container"><div className="spinner spinner-lg" /></div>
      ) : tab === 'browse' ? (
        /* ── BROWSE CATALOG ── */
        courses.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
            <HiOutlineLightBulb size={48} style={{ color: 'var(--color-gray-300)', marginBottom: 'var(--space-3)' }} />
            <p style={{ color: 'var(--color-gray-500)' }}>No courses found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-5)',
          }}>
            {courses.map((c) => (
              <div key={c.id} className="card" style={{
                padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                {/* Color strip */}
                <div style={{
                  height: 4,
                  background: `linear-gradient(90deg, ${diffColor[c.difficulty]}, ${diffColor[c.difficulty]}88)`,
                }} />
                <div style={{ padding: 'var(--space-5)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <span className="badge badge-purple" style={{ fontSize: 'var(--font-xs)' }}>{c.category?.name}</span>
                    <span className={`badge ${diffBadge[c.difficulty]}`}>{diffLabel[c.difficulty]}</span>
                  </div>
                  {/* Title */}
                  <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-gray-900)' }}>
                    {c.title}
                  </h3>
                  {/* Description */}
                  <p style={{
                    fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)',
                    marginBottom: 'var(--space-4)', flex: 1,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {c.description}
                  </p>
                  {/* Meta */}
                  <div style={{
                    display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)',
                    fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <HiOutlineClock size={14} /> {c.duration}
                    </span>
                    {c.provider && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <HiOutlineAcademicCap size={14} /> {c.provider}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <HiOutlineBookOpen size={14} /> {c._count?.enrollments || 0} enrolled
                    </span>
                  </div>
                  {/* Action */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {c.myStatus === 'enrolled' ? (
                      <span className="badge badge-sky" style={{ padding: '6px 12px', flex: 1, textAlign: 'center' }}>
                        ✓ Enrolled
                      </span>
                    ) : c.myStatus === 'completed' ? (
                      <span className="badge badge-green" style={{ padding: '6px 12px', flex: 1, textAlign: 'center' }}>
                        ✓ Completed
                      </span>
                    ) : (
                      <button className="btn btn-primary" style={{ flex: 1 }}
                        onClick={() => handleEnroll(c.id)} disabled={actionLoading === c.id}>
                        {actionLoading === c.id ? 'Enrolling...' : 'Enroll Now'}
                      </button>
                    )}
                    {c.link && (
                      <a href={c.link} target="_blank" rel="noopener noreferrer"
                        className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <HiOutlineExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── MY COURSES ── */
        myEnrollments.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
            <HiOutlineBookOpen size={48} style={{ color: 'var(--color-gray-300)', marginBottom: 'var(--space-3)' }} />
            <p style={{ color: 'var(--color-gray-500)' }}>You haven't enrolled in any courses yet.</p>
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => setTab('browse')}>
              Browse Catalog
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {myEnrollments.map((e) => {
              const c = e.skillCourse;
              return (
                <div key={e.id} className="card" style={{
                  padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-5)',
                  alignItems: 'flex-start', flexWrap: 'wrap',
                }}>
                  {/* Color dot */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-lg)', flexShrink: 0,
                    background: `linear-gradient(135deg, ${diffColor[c?.difficulty]}22, ${diffColor[c?.difficulty]}44)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <HiOutlineLightBulb size={22} style={{ color: diffColor[c?.difficulty] }} />
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
                      <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600, margin: 0 }}>{c?.title}</h3>
                      <span className={`badge ${statusBadge[e.status]}`}>{e.status}</span>
                    </div>
                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-2)' }}>
                      {c?.category?.name} · {diffLabel[c?.difficulty]} · {c?.duration}
                      {c?.provider && ` · ${c.provider}`}
                    </div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                      Enrolled {new Date(e.enrolledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {e.completedAt && (
                        <> · Completed {new Date(e.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
                    {e.status === 'enrolled' && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => handleComplete(e.skillCourseId)}
                          disabled={actionLoading === e.skillCourseId}
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HiOutlineCheckCircle size={16} /> Complete
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDrop(e.skillCourseId)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-danger)' }}>
                          <HiOutlineXCircle size={16} /> Drop
                        </button>
                      </>
                    )}
                    {(e.status === 'dropped' || e.status === 'completed') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEnroll(e.skillCourseId)}
                        disabled={actionLoading === e.skillCourseId}>
                        Re-Enroll
                      </button>
                    )}
                    {c?.link && (
                      <a href={c.link} target="_blank" rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm" title="Open course link">
                        <HiOutlineExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      <ConfirmDialog
        open={!!confirmDrop}
        title="Drop Course?"
        message="Are you sure you want to drop this course? You can re-enroll later."
        onConfirm={handleDrop}
        onCancel={() => setConfirmDrop(null)}
        loading={actionLoading !== ''}
      />
    </div>
  );
}
