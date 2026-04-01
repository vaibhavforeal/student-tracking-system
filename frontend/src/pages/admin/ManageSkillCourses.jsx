import { useState, useEffect } from 'react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineEye,
  HiOutlineTag, HiOutlineX, HiOutlineLightBulb,
} from 'react-icons/hi';

export default function ManageSkillCourses() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', difficulty: 'beginner',
    duration: '', provider: '', link: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Category management
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');
  const [catDeleteTarget, setCatDeleteTarget] = useState(null);

  // Enrollment viewer
  const [enrollments, setEnrollments] = useState(null);
  const [enrollCourse, setEnrollCourse] = useState(null);
  const [loadingEnroll, setLoadingEnroll] = useState(false);

  const fetchData = async () => {
    try {
      const params = {};
      if (filterCat) params.categoryId = filterCat;
      if (filterDiff) params.difficulty = filterDiff;
      const [courseRes, catRes] = await Promise.all([
        client.get('/admin/skill-courses', { params }),
        client.get('/admin/skill-course-categories'),
      ]);
      setCourses(courseRes.data.skillCourses);
      setCategories(catRes.data.categories);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterCat, filterDiff]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); } }, [error]);
  useEffect(() => { if (catError) { const t = setTimeout(() => setCatError(''), 4000); return () => clearTimeout(t); } }, [catError]);

  const openCreate = () => {
    setEditing(null); setError('');
    setForm({ title: '', description: '', categoryId: categories[0]?.id || '', difficulty: 'beginner', duration: '', provider: '', link: '' });
    setShowModal(true);
  };
  const openEdit = (c) => {
    setEditing(c); setError('');
    setForm({
      title: c.title, description: c.description, categoryId: c.categoryId,
      difficulty: c.difficulty, duration: c.duration,
      provider: c.provider || '', link: c.link || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await client.put(`/admin/skill-courses/${editing.id}`, form);
      else await client.post('/admin/skill-courses', form);
      setShowModal(false); fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save skill course');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/admin/skill-courses/${deleteTarget}`);
      setDeleteTarget(null); fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    } finally { setDeleting(false); }
  };

  // Category handlers
  const handleAddCategory = async (e) => {
    e.preventDefault(); setCatSaving(true); setCatError('');
    try {
      await client.post('/admin/skill-course-categories', { name: catName });
      setCatName(''); fetchData();
    } catch (err) {
      setCatError(err.response?.data?.error || 'Failed to add category');
    } finally { setCatSaving(false); }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await client.delete(`/admin/skill-course-categories/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete category');
    }
  };

  // Enrollment viewer
  const openEnrollments = async (course) => {
    setEnrollCourse(course); setLoadingEnroll(true);
    try {
      const res = await client.get(`/admin/skill-courses/${course.id}/enrollments`);
      setEnrollments(res.data.enrollments);
    } catch (err) { console.error(err); setEnrollments([]); }
    finally { setLoadingEnroll(false); }
  };

  const closeEnrollments = () => { setEnrollCourse(null); setEnrollments(null); };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const diffColor = { beginner: 'badge-green', intermediate: 'badge-amber', advanced: 'badge-red' };
  const diffLabel = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Skill Enhancement Courses</h1>
          <p className="page-subtitle">Manage skill courses that students can enroll in</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={() => setShowCatModal(true)}>
            <HiOutlineTag /> Categories
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <HiOutlinePlus /> Add Course
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="filter-group" style={{ display: 'flex', gap: 'var(--space-3)' }}>
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

      {/* Table */}
      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th><th>Category</th><th>Difficulty</th><th>Duration</th>
                <th>Provider</th><th>Enrolled</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state"><HiOutlineLightBulb size={40} style={{ color: 'var(--color-gray-300)', marginBottom: 'var(--space-3)' }} /><p>No skill courses yet. Click "Add Course" to create one.</p></div></td></tr>
              ) : courses.map((c) => (
                <tr key={c.id} style={{ opacity: c.isActive ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 500 }}>
                    {c.title}
                    {c.link && (
                      <a href={c.link} target="_blank" rel="noopener noreferrer"
                        style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--font-xs)', color: 'var(--color-sky-500)' }}>
                        ↗
                      </a>
                    )}
                  </td>
                  <td><span className="badge badge-purple">{c.category?.name}</span></td>
                  <td><span className={`badge ${diffColor[c.difficulty] || 'badge-gray'}`}>{diffLabel[c.difficulty]}</span></td>
                  <td>{c.duration}</td>
                  <td>{c.provider || '—'}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEnrollments(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <HiOutlineEye /> {c._count?.enrollments || 0}
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${c.isActive ? 'badge-green' : 'badge-gray'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} title="Edit"><HiOutlinePencil /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(c.id)} title="Delete"
                      style={{ color: 'var(--color-danger)' }}><HiOutlineTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Course Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Skill Course' : 'Add Skill Course'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px',
                    backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                    fontSize: '0.9rem', fontWeight: 500,
                  }}>⚠️ {error}</div>
                )}
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required placeholder="e.g. Introduction to Python" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required placeholder="Brief description of the course..." rows={3}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                      <option value="">Select Category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select className="form-select" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <input className="form-input" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      required placeholder="e.g. 4 weeks" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Provider (optional)</label>
                    <input className="form-input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}
                      placeholder="e.g. Coursera, Udemy" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">External Link (optional)</label>
                  <input className="form-input" type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
                    placeholder="https://..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Manage Categories</h2>
              <button className="btn btn-ghost" onClick={() => setShowCatModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {catError && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                  fontSize: '0.9rem', fontWeight: 500,
                }}>⚠️ {catError}</div>
              )}
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <input className="form-input" value={catName} onChange={(e) => setCatName(e.target.value)}
                  placeholder="New category name" required style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary" disabled={catSaving}>
                  {catSaving ? '...' : 'Add'}
                </button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {categories.length === 0 ? (
                  <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>
                    No categories yet
                  </p>
                ) : categories.map((c) => (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)',
                  }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                        {c._count?.skillCourses || 0} courses
                      </span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteCategory(c.id)}
                      style={{ color: 'var(--color-danger)' }} title="Delete category">
                      <HiOutlineTrash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Viewer Modal */}
      {enrollCourse && (
        <div className="modal-overlay" onClick={closeEnrollments}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Enrollments — {enrollCourse.title}</h2>
              <button className="btn btn-ghost" onClick={closeEnrollments}>✕</button>
            </div>
            <div className="modal-body">
              {loadingEnroll ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}><div className="spinner" /></div>
              ) : enrollments?.length === 0 ? (
                <p style={{ color: 'var(--color-gray-400)', textAlign: 'center', padding: 'var(--space-6)' }}>
                  No students enrolled yet.
                </p>
              ) : (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>Student</th><th>Enrollment No</th><th>Batch</th><th>Status</th><th>Enrolled</th></tr></thead>
                    <tbody>
                      {enrollments?.map((e) => (
                        <tr key={e.id}>
                          <td style={{ fontWeight: 500 }}>{e.student?.firstName} {e.student?.lastName}</td>
                          <td><span className="badge badge-sky">{e.student?.enrollmentNo}</span></td>
                          <td>{e.student?.batch?.name} · {e.student?.section?.name}</td>
                          <td>
                            <span className={`badge ${e.status === 'enrolled' ? 'badge-sky' : e.status === 'completed' ? 'badge-green' : 'badge-gray'}`}>
                              {e.status}
                            </span>
                          </td>
                          <td style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
                            {new Date(e.enrolledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Skill Course?"
        message="This will soft-delete the skill course. Existing enrollments will remain in the database."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
