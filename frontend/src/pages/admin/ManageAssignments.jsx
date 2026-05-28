import { useState, useEffect } from 'react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id }
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ staffId: '', courseId: '', sectionId: '', academicYear: '' });

  const fetchData = async () => {
    try {
      const [aRes, sRes, cRes, secRes] = await Promise.all([
        client.get('/admin/class-assignments'),
        client.get('/admin/staff'),
        client.get('/admin/courses'),
        client.get('/admin/sections'),
      ]);
      setAssignments(aRes.data.assignments);
      setStaff(sRes.data.staff);
      setCourses(cRes.data.courses);
      setSections(secRes.data.sections);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await client.post('/admin/class-assignments', form);
      setShowForm(false);
      setForm({ staffId: '', courseId: '', sectionId: '', academicYear: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create assignment. Please try again.');
    } finally { setSaving(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/admin/class-assignments/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove assignment.');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Class Assignments</h1>
          <p className="page-subtitle">Assign teachers to sections &amp; courses</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setError(''); }}>
          <HiOutlinePlus /> Assign Teacher
        </button>
      </div>

      {/* Inline error */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header">
            <h3 className="card-title">New Assignment</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Teacher (Staff) *</label>
                  <select className="form-select" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} required>
                    <option value="">Select Teacher</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.user?.name || s.employeeId} ({s.employeeId})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Course *</label>
                  <select className="form-select" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
                    <option value="">Select Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Section *</label>
                  <select className="form-select" value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value, academicYear: '' })} required>
                    <option value="">Select Section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} {s.batch ? `(${s.batch.degree || ''} — ${s.batch.name})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Academic Year *</label>
                  <select className="form-select" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} required disabled={!form.sectionId}>
                    <option value="">{form.sectionId ? 'Select Year' : 'Select a section first'}</option>
                    {(() => {
                      const sec = sections.find((s) => s.id === form.sectionId);
                      if (!sec?.batch?.startYear || !sec?.batch?.endYear) return null;
                      const years = [];
                      for (let y = sec.batch.startYear; y < sec.batch.endYear; y++) {
                        years.push(`${y}-${String(y + 1).slice(-2)}`);
                      }
                      return years.map((yr) => <option key={yr} value={yr}>{yr}</option>);
                    })()}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setError(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Assign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Course</th>
                <th>Section</th>
                <th>Academic Year</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan="5"><div className="empty-state"><p>No assignments yet. Click "Assign Teacher" to get started.</p></div></td></tr>
              ) : assignments.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>
                    {a.staff?.user?.name || '—'}
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>{a.staff?.employeeId}</div>
                  </td>
                  <td>
                    <span className="badge badge-purple">{a.course?.code}</span>
                    <span style={{ marginLeft: 'var(--space-2)' }}>{a.course?.name}</span>
                  </td>
                  <td>
                    {a.section?.name}
                    {a.section?.batch && (
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                        {a.section.batch.degree} — {a.section.batch.name}
                      </div>
                    )}
                  </td>
                  <td><span className="badge badge-sky">{a.academicYear}</span></td>
                  <td className="actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setDeleteTarget(a)}
                      style={{ color: 'var(--color-danger)' }}
                      title="Remove assignment"
                    >
                      <HiOutlineTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Assignment?"
        message={`Remove ${deleteTarget?.staff?.user?.name || 'this teacher'} from ${deleteTarget?.course?.code} — ${deleteTarget?.section?.name}? This cannot be undone.`}
        confirmText="Remove"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
