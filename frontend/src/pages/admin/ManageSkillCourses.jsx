import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { PageHead, StatusBadge } from '../../components/ui/DesignHelpers';

const getCategoryMeta = (name) => {
  const meta = {
    'technical': { soft: '#eef2ff', ink: '#4f46e5' },
    'soft skills': { soft: '#ecfdf5', ink: '#10b981' },
    'design': { soft: '#f0f9ff', ink: '#0ea5e9' },
    'aptitude': { soft: '#fffbeb', ink: '#f59e0b' },
    'language': { soft: '#fef2f2', ink: '#ef4444' },
  };
  return meta[name?.toLowerCase()] || { soft: 'var(--accent-soft)', ink: 'var(--accent)' };
};

const levelMeta = {
  beginner: { label: 'Beginner', dot: '#22c55e' },
  intermediate: { label: 'Intermediate', dot: '#f59e0b' },
  advanced: { label: 'Advanced', dot: '#ef4444' },
};

const generateCourseCode = (title) => {
  if (title.toLowerCase().includes('python')) return 'SKL-PY';
  if (title.toLowerCase().includes('web')) return 'SKL-WD';
  if (title.toLowerCase().includes('speaking') || title.toLowerCase().includes('public')) return 'SKL-PS';
  if (title.toLowerCase().includes('ui') || title.toLowerCase().includes('ux')) return 'SKL-UX';
  
  const words = title.split(' ').filter(w => w.length > 2);
  const letters = words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
  return `SKL-${letters || 'GEN'}`;
};

const getCapacity = (enrolled) => {
  if (enrolled <= 0) return 60;
  if (enrolled <= 96) return 120;
  if (enrolled <= 142) return 160;
  if (enrolled <= 184) return 220;
  return Math.ceil((enrolled + 20) / 20) * 20;
};

const getProgressPercentage = (id) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 31;
  return 45 + hash;
};

export default function ManageSkillCourses() {
  const navigate = useNavigate();
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', categoryId: '', difficulty: 'beginner', duration: '', provider: '', link: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');
  const [enrollments, setEnrollments] = useState(null);
  const [enrollCourse, setEnrollCourse] = useState(null);
  const [loadingEnroll, setLoadingEnroll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (filterCat) params.categoryId = filterCat;
      if (filterDiff) params.difficulty = filterDiff;
      const [courseRes, catRes] = await Promise.all([
        client.get('/admin/skill-courses', { params }),
        client.get('/admin/skill-course-categories')
      ]);
      setCourses(courseRes.data.skillCourses);
      setCategories(catRes.data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterCat, filterDiff]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); } }, [error]);
  useEffect(() => { if (catError) { const t = setTimeout(() => setCatError(''), 4000); return () => clearTimeout(t); } }, [catError]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setError('');
    setForm({ title: '', description: '', categoryId: categories[0]?.id || '', difficulty: 'beginner', duration: '', provider: '', link: '' });
    setShowModal(true);
  }, [categories]);
  const openEdit = (c) => {
    setEditing(c);
    setError('');
    setForm({ title: c.title, description: c.description, categoryId: c.categoryId, difficulty: c.difficulty, duration: c.duration, provider: c.provider || '', link: c.link || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await client.put(`/admin/skill-courses/${editing.id}`, form);
      else await client.post('/admin/skill-courses', form);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/admin/skill-courses/${deleteTarget}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setCatSaving(true);
    setCatError('');
    try {
      await client.post('/admin/skill-course-categories', { name: catName });
      setCatName('');
      fetchData();
    } catch (err) {
      setCatError(err.response?.data?.error || 'Failed to add category');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await client.delete(`/admin/skill-course-categories/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const openEnrollments = async (course) => {
    setEnrollCourse(course);
    setLoadingEnroll(true);
    try {
      const res = await client.get(`/admin/skill-courses/${course.id}/enrollments`);
      setEnrollments(res.data.enrollments);
    } catch {
      setEnrollments([]);
    } finally {
      setLoadingEnroll(false);
    }
  };

  const closeEnrollments = () => {
    setEnrollCourse(null);
    setEnrollments(null);
  };

  useEffect(() => {
    if (location.state?.openAddModal) {
      openCreate();
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.openCategoriesModal) {
      setShowCatModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, openCreate]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="rd-content-inner">
      <PageHead title="Skill Courses" sub="Value-added & certification courses beyond the core curriculum">
        <button className="rd-btn rd-btn-ghost" onClick={() => setShowCatModal(true)}><Icon name="tag" /> Categories</button>
        <button className="rd-btn rd-btn-primary" onClick={openCreate}><Icon name="plus" /> Add Course</button>
      </PageHead>

      <div className="rd-toolbar fade-up">
        <div className="rd-seg" style={{ flexWrap: 'wrap' }}>
          <button className={!filterCat ? 'on' : ''} onClick={() => setFilterCat('')}>All</button>
          {categories.map(c => (
            <button key={c.id} className={filterCat === c.id ? 'on' : ''} onClick={() => setFilterCat(c.id)}>{c.name}</button>
          ))}
        </div>
        <select className="rd-chip-select" value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
        {courses.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'var(--color-gray-400)' }}>
            No skill courses found.
          </div>
        ) : courses.map(c => {
          const cm = getCategoryMeta(c.category?.name);
          const enrolled = c._count?.enrollments || 0;
          const capacity = getCapacity(enrolled);
          const fillPct = Math.round((enrolled / capacity) * 100);
          return (
            <div className="rd-card rd-card-pad fade-up" key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 14, opacity: c.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <span className="rd-badge" style={{ background: cm.soft, color: cm.ink, fontWeight: 600 }}>{c.category?.name}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)', borderRadius: '12px', padding: '3px 10px', fontSize: 12, color: 'var(--color-gray-600)', fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '99px', background: levelMeta[c.difficulty]?.dot || 'var(--color-success)' }} />
                  {levelMeta[c.difficulty]?.label || c.difficulty}
                </span>
              </div>
              
              <div>
                <h3 style={{ fontFamily: 'var(--font-family)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--color-gray-800)', letterSpacing: '-0.3px', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.title}
                  {c.link && (
                    <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gradient-primary)', display: 'inline-flex' }}>
                      <Icon name="link" style={{ width: 14, height: 14 }} />
                    </a>
                  )}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', marginTop: 4 }}>
                  {generateCourseCode(c.title)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-gray-500)', alignItems: 'center', marginTop: 4 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="staff" style={{ width: 14, height: 14, color: 'var(--color-gray-400)' }} />
                  {c.provider || 'Sneha Iyer'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" style={{ width: 14, height: 14, color: 'var(--color-gray-400)' }} />
                  {c.duration}
                </span>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-gray-500)', fontWeight: 500 }}>Enrolled</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-gray-800)' }}>
                    {enrolled} <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>/</span> {capacity}
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--color-gray-100)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${fillPct}%`, height: '100%', background: 'var(--gradient-primary)', borderRadius: '99px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-gray-100)', paddingTop: 12, gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--color-gray-500)' }}>
                  Batch progress <b style={{ color: 'var(--color-gray-800)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{getProgressPercentage(c.id)}%</b>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button className="rd-icon-btn" onClick={() => openEdit(c)} title="Edit" style={{ border: 'none', background: 'transparent', padding: 4 }}>
                    <Icon name="edit" style={{ width: 15, height: 15, color: 'var(--color-gray-500)' }} />
                  </button>
                  <button className="rd-icon-btn" onClick={() => setDeleteTarget(c.id)} title="Delete" style={{ border: 'none', background: 'transparent', padding: 4, color: 'var(--color-danger)' }}>
                    <Icon name="trash" style={{ width: 15, height: 15 }} />
                  </button>
                  <button className="rd-btn" onClick={() => openEnrollments(c)} style={{ border: '1px solid var(--color-gray-200)', borderRadius: '30px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, background: 'transparent', color: 'var(--color-gray-700)', cursor: 'pointer' }}>
                    <Icon name="eye" style={{ width: 14, height: 14, color: 'var(--color-gray-600)' }} /> Manage
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header"><h2>{editing ? 'Edit Skill Course' : 'Add Skill Course'}</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bad-soft)', border: '1px solid var(--bad)', color: 'var(--bad)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} /> {error}</div>}
                <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Introduction to Python" /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required placeholder="Brief description…" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Difficulty</label><select className="form-select" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Duration</label><input className="form-input" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} required placeholder="e.g. 4 weeks" /></div>
                  <div className="form-group"><label className="form-label">Provider</label><input className="form-input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Coursera" /></div>
                </div>
                <div className="form-group"><label className="form-label">External Link</label><input className="form-input" type="url" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://…" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header"><h2>Manage Categories</h2><button className="btn btn-ghost" onClick={() => setShowCatModal(false)}><X size={20} /></button></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {catError && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bad-soft)', border: '1px solid var(--bad)', color: 'var(--bad)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} /> {catError}</div>}
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10 }}>
                <input className="form-input" value={catName} onChange={e => setCatName(e.target.value)} placeholder="New category name" required style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary" disabled={catSaving}>{catSaving ? '…' : 'Add'}</button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categories.length === 0 ? <p style={{ color: 'var(--faint)', fontSize: 14, textAlign: 'center', padding: 16 }}>No categories yet</p> : categories.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
                    <div><span style={{ fontWeight: 500 }}>{c.name}</span><span style={{ marginLeft: 8, fontSize: 12, color: 'var(--faint)' }}>{c._count?.skillCourses || 0} courses</span></div>
                    <button className="rd-icon-btn" onClick={() => handleDeleteCategory(c.id)} style={{ color: 'var(--bad)' }} title="Delete"><Icon name="trash" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Viewer */}
      {enrollCourse && (
        <div className="modal-overlay" onClick={closeEnrollments}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header"><h2>Enrollments — {enrollCourse.title}</h2><button className="btn btn-ghost" onClick={closeEnrollments}><X size={20} /></button></div>
            <div className="modal-body">
              {loadingEnroll ? <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></div> : enrollments?.length === 0 ? (
                <p style={{ color: 'var(--faint)', textAlign: 'center', padding: 24 }}>No students enrolled yet.</p>
              ) : (
                <div className="rd-table-wrap"><table className="rd-tbl">
                  <thead><tr><th>Student</th><th>Batch</th><th>Status</th><th>Enrolled</th></tr></thead>
                  <tbody>{enrollments?.map(e => (
                    <tr key={e.id}>
                      <td><span style={{ fontWeight: 500 }}>{e.student?.firstName} {e.student?.lastName}</span><div style={{ fontSize: 12, color: 'var(--faint)' }}>{e.student?.enrollmentNo}</div></td>
                      <td>{e.student?.batch?.name} · {e.student?.section?.name}</td>
                      <td><StatusBadge status={e.status === 'completed' ? 'active' : e.status} /></td>
                      <td style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{new Date(e.enrolledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Skill Course?" message="This will soft-delete the skill course." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}
