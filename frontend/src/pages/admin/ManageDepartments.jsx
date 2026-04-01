import { useState, useEffect } from 'react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchDepartments = async () => {
    try {
      const { data } = await client.get('/admin/departments');
      setDepartments(data.departments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDepartments(); }, []);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const openCreate = () => { setEditing(null); setError(''); setForm({ name: '', code: '' }); setShowModal(true); };
  const openEdit = (dept) => { setEditing(dept); setError(''); setForm({ name: dept.name, code: dept.code }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) {
        await client.put(`/admin/departments/${editing.id}`, form);
      } else {
        await client.post('/admin/departments', form);
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save department');
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/admin/departments/${deleteTarget}`);
      setDeleteTarget(null);
      fetchDepartments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete department');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Departments</h1>
          <p className="page-subtitle">Manage academic departments</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <HiOutlinePlus /> Add Department
        </button>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Batches</th>
                <th>Courses</th>
                <th>Staff</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan="6"><div className="empty-state"><p>No departments yet.</p></div></td></tr>
              ) : departments.map((dept) => (
                <tr key={dept.id}>
                  <td><span className="badge badge-sky">{dept.code}</span></td>
                  <td style={{ fontWeight: 500 }}>{dept.name}</td>
                  <td>{dept._count?.batches || 0}</td>
                  <td>{dept._count?.courses || 0}</td>
                  <td>{dept._count?.staff || 0}</td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dept)} title="Edit">
                      <HiOutlinePencil />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(dept.id)} title="Delete"
                      style={{ color: 'var(--color-danger)' }}>
                      <HiOutlineTrash />
                    </button>
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
            <div className="modal-header">
              <h2>{editing ? 'Edit Department' : 'Add Department'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px',
                    backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                    fontSize: '0.9rem', fontWeight: 500,
                  }}>
                    ⚠️ {error}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Department Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Computer Science & Engineering" />
                </div>
                <div className="form-group">
                  <label className="form-label">Code</label>
                  <input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. CSE" />
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Department?"
        message="This will soft-delete the department. Related batches, courses, and staff will need to be reassigned."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
