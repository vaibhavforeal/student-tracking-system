import { useState, useEffect } from 'react';
import client from '../../api/client';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function ManageCourses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', credits: '3', semester: '1', type: 'theory', departmentId: '' });
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');

  const fetchData = async () => {
    try {
      const [courseRes, deptRes] = await Promise.all([
        client.get('/admin/courses', { params: filterDept ? { departmentId: filterDept } : {} }),
        client.get('/admin/departments'),
      ]);
      setCourses(courseRes.data.courses);
      setDepartments(deptRes.data.departments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterDept]);

  const openCreate = () => { setEditing(null); setForm({ code: '', name: '', credits: '3', semester: '1', type: 'theory', departmentId: departments[0]?.id || '' }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ code: c.code, name: c.name, credits: c.credits.toString(), semester: c.semester.toString(), type: c.type, departmentId: c.departmentId }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await client.put(`/admin/courses/${editing.id}`, form);
      else await client.post('/admin/courses', form);
      setShowModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this course?')) return;
    await client.delete(`/admin/courses/${id}`); fetchData();
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const typeColor = { theory: 'badge-sky', lab: 'badge-purple', elective: 'badge-amber' };

  return (
    <div>
      <div className="page-header">
        <div><h1>Courses</h1><p className="page-subtitle">Manage academic courses</p></div>
        <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Add Course</button>
      </div>

      <div className="toolbar">
        <div className="filter-group">
          <select className="form-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Credits</th><th>Semester</th><th>Type</th><th>Actions</th></tr></thead>
            <tbody>
              {courses.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><p>No courses yet.</p></div></td></tr>
              ) : courses.map((c) => (
                <tr key={c.id}>
                  <td><span className="badge badge-sky">{c.code}</span></td>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{c.department?.name}</td>
                  <td>{c.credits}</td>
                  <td>Sem {c.semester}</td>
                  <td><span className={`badge ${typeColor[c.type] || 'badge-gray'}`}>{c.type}</span></td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><HiOutlinePencil /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)} style={{ color: 'var(--color-danger)' }}><HiOutlineTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{editing ? 'Edit Course' : 'Add Course'}</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. CS101" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Name</label>
                    <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Data Structures" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
                    <option value="">Select Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Credits</label>
                    <input className="form-input" type="number" min="1" max="10" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <input className="form-input" type="number" min="1" max="8" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="theory">Theory</option>
                      <option value="lab">Lab</option>
                      <option value="elective">Elective</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
