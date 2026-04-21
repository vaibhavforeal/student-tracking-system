import { useState, useEffect } from 'react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

const DESIGNATION_OPTIONS = ['HOD', 'Professor', 'Assistant Professor', 'Teacher'];

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ employeeId: '', name: '', email: '', password: '', departmentId: '', designation: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [staffRes, deptRes] = await Promise.all([
        client.get('/admin/staff', { params: filterDept ? { departmentId: filterDept } : {} }),
        client.get('/admin/departments'),
      ]);
      setStaff(staffRes.data.staff);
      setDepartments(deptRes.data.departments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterDept]);

  const openCreate = () => { setEditing(null); setForm({ employeeId: '', name: '', email: '', password: '', departmentId: '', designation: '', phone: '' }); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ employeeId: s.employeeId, name: s.user?.name || '', email: s.user?.email || '', password: '', departmentId: s.departmentId || '', designation: s.designation, phone: s.phone }); setShowModal(true); };

  const handleDesignationChange = (value) => {
    setForm(prev => ({
      ...prev,
      designation: value,
      // Clear departmentId when switching away from HOD
      departmentId: value === 'HOD' ? prev.departmentId : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      // Don't send departmentId for non-HOD designations
      if (payload.designation !== 'HOD') {
        delete payload.departmentId;
      }
      if (editing) await client.put(`/admin/staff/${editing.id}`, payload);
      else await client.post('/admin/staff', payload);
      setShowModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/admin/staff/${deleteTarget}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete staff member');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Staff</h1><p className="page-subtitle">Manage teaching staff</p></div>
        <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Add Staff</button>
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
            <thead><tr><th>Employee ID</th><th>Name</th><th>Email</th><th>Department</th><th>Designation</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><p>No staff members yet.</p></div></td></tr>
              ) : staff.map((s) => (
                <tr key={s.id}>
                  <td><span className="badge badge-purple">{s.employeeId}</span></td>
                  <td style={{ fontWeight: 500 }}>{s.user?.name}</td>
                  <td>{s.user?.email}</td>
                  <td>{s.department?.name || '—'}</td>
                  <td>{s.designation}</td>
                  <td>{s.phone}</td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><HiOutlinePencil /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(s.id)} title="Delete" style={{ color: 'var(--color-danger)' }}><HiOutlineTrash /></button>
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
            <div className="modal-header"><h2>{editing ? 'Edit Staff' : 'Add Staff'}</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Employee ID</label>
                    <input className="form-input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required disabled={!!editing} placeholder="e.g. EMP001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Full name" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="email@sts.com" />
                  </div>
                  {!editing && (
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Set password" />
                    </div>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <select className="form-select" value={form.designation} onChange={(e) => handleDesignationChange(e.target.value)} required>
                      <option value="">Select Designation</option>
                      {DESIGNATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  {form.designation === 'HOD' && (
                    <div className="form-group">
                      <label className="form-label">Department</label>
                      <select className="form-select" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
                        <option value="">Select Department</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="Phone number" />
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Staff Member?"
        message="This will soft-delete the staff member, remove their class assignments, and deactivate their user account."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
