import { useState, useEffect } from 'react';
import client from '../../api/client';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function ManageBatches() {
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', departmentId: '', degree: '', startYear: '', endYear: '' });
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');

  const fetchData = async () => {
    try {
      const [batchRes, deptRes] = await Promise.all([
        client.get('/admin/batches', { params: filterDept ? { departmentId: filterDept } : {} }),
        client.get('/admin/departments'),
      ]);
      setBatches(batchRes.data.batches);
      setDepartments(deptRes.data.departments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterDept]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', departmentId: departments[0]?.id || '', degree: '', startYear: new Date().getFullYear().toString(), endYear: (new Date().getFullYear() + 4).toString() });
    setShowModal(true);
  };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ name: b.name, departmentId: b.departmentId, degree: b.degree, startYear: b.startYear.toString(), endYear: b.endYear.toString() });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await client.put(`/admin/batches/${editing.id}`, form);
      else await client.post('/admin/batches', form);
      setShowModal(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this batch?')) return;
    await client.delete(`/admin/batches/${id}`);
    fetchData();
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Batches</h1>
          <p className="page-subtitle">Manage student batches</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Add Batch</button>
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
            <thead><tr><th>Name</th><th>Department</th><th>Degree</th><th>Year</th><th>Sections</th><th>Students</th><th>Actions</th></tr></thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><p>No batches yet.</p></div></td></tr>
              ) : batches.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 500 }}>{b.name}</td>
                  <td><span className="badge badge-purple">{b.department?.name}</span></td>
                  <td>{b.degree}</td>
                  <td>{b.startYear}–{b.endYear}</td>
                  <td>{b._count?.sections || 0}</td>
                  <td>{b._count?.students || 0}</td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}><HiOutlinePencil /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(b.id)} style={{ color: 'var(--color-danger)' }}><HiOutlineTrash /></button>
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
              <h2>{editing ? 'Edit Batch' : 'Add Batch'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Batch Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. CSE 2024-28" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
                    <option value="">Select Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Degree</label>
                  <input className="form-input" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} required placeholder="e.g. B.Tech" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Year</label>
                    <input className="form-input" type="number" value={form.startYear} onChange={(e) => setForm({ ...form, startYear: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Year</label>
                    <input className="form-input" type="number" value={form.endYear} onChange={(e) => setForm({ ...form, endYear: e.target.value })} required />
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
