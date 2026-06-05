import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { PageHead, StatusBadge } from '../../components/ui/DesignHelpers';

const getCategoryMeta = (name) => {
  const meta = {
    'technical': { soft: 'var(--accent-soft)', ink: 'var(--accent)' },
    'soft skills': { soft: 'var(--good-soft)', ink: 'var(--good)' },
    'design': { soft: 'var(--info-soft)', ink: 'var(--info)' },
    'aptitude': { soft: 'var(--warn-soft)', ink: 'var(--warn)' },
    'language': { soft: 'var(--bad-soft)', ink: 'var(--bad)' },
  };
  return meta[name?.toLowerCase()] || { soft: 'var(--accent-soft)', ink: 'var(--accent)' };
};

const levelMeta = {
  beginner: { label: 'Beginner', dot: 'var(--good)' },
  intermediate: { label: 'Intermediate', dot: 'var(--warn)' },
  advanced: { label: 'Advanced', dot: 'var(--bad)' },
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

  const openCreate = () => {
    setEditing(null);
    setError('');
    setForm({ title: '', description: '', categoryId: categories[0]?.id || '', difficulty: 'beginner', duration: '', provider: '', link: '' });
    setShowModal(true);
  };
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
  }, [location.state, navigate, location.pathname]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="rd-content-inner">
      <PageHead title="Skill Courses" sub="Value-added & certification courses beyond the core curriculum">
        <button className="rd-btn rd-btn-ghost" onClick={() => setShowCatModal(true)}><Icon name="tag" /> Categories</button>
        <button className="rd-btn rd-btn-primary" onClick={openCreate}><Icon name="plus" /> Add Course</button>
      </PageHead>

      <div className="rd-toolbar fade-up">
        <div className="rd-seg" style={{ flexWrap: 'wrap' }}>
          <button className={!filterCat ? 'on' : ''} onClick={() => setFilterCat('')}>All Categories</button>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
        {courses.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'var(--color-gray-400)' }}>
            No skill courses found.
          </div>
        ) : courses.map(c => {
          const cm = getCategoryMeta(c.category?.name);
          return (
            <div className="rd-card rd-card-pad fade-up" key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 14, opacity: c.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <span className="rd-badge" style={{ background: cm.soft, color: cm.ink }}>{c.category?.name}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="rd-badge rd-badge-inactive" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span className="rd-badge-dot" style={{ background: levelMeta[c.difficulty]?.dot || 'var(--good)' }} />
                    {levelMeta[c.difficulty]?.label || c.difficulty}
                  </span>
                  <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-family)', fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-.2px', lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.title}
                  {c.link && (
                    <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gradient-primary)', display: 'inline-flex' }}>
                      <Icon name="link" style={{ width: 14, height: 14 }} />
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-gray-500)', marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {c.description}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--color-gray-500)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="briefcase" style={{ width: 14, height: 14, color: 'var(--color-gray-400)' }} />
                  {c.provider || 'No provider'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" style={{ width: 14, height: 14, color: 'var(--color-gray-400)' }} />
                  {c.duration}
                </span>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-gray-100)', paddingTop: 12 }}>
                <button className="rd-btn rd-btn-ghost rd-btn-sm" onClick={() => openEnrollments(c)} style={{ padding: '4px 8px' }}>
                  <Icon name="users" style={{ width: 14, height: 14 }} />
                  <span style={{ fontWeight: 600, marginLeft: 4 }}>{c._count?.enrollments || 0} enrolled</span>
                </button>
                <div className="rd-row-act" style={{ gap: 4 }}>
                  <button className="rd-icon-btn" onClick={() => openEdit(c)} title="Edit"><Icon name="edit" style={{ width: 16, height: 16 }} /></button>
                  <button className="rd-icon-btn" onClick={() => setDeleteTarget(c.id)} title="Delete" style={{ color: 'var(--bad)' }}><Icon name="trash" style={{ width: 16, height: 16 }} /></button>
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

