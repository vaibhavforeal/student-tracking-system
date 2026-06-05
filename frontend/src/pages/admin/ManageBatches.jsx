import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { PageHead, DeptTag, Meter, StatTile } from '../../components/ui/DesignHelpers';

export default function ManageBatches() {
  const navigate = useNavigate();
  const location = useLocation();
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', departmentId: '', degree: '', startYear: '', endYear: '' });
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [batchRes, deptRes] = await Promise.all([
        client.get('/admin/batches', { params: filterDept ? { departmentId: filterDept } : {} }),
        client.get('/admin/departments'),
      ]);
      setBatches(batchRes.data.batches);
      setDepartments(deptRes.data.departments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterDept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ name: '', departmentId: departments[0]?.id || '', degree: '', startYear: new Date().getFullYear().toString(), endYear: (new Date().getFullYear() + 4).toString() }); setShowModal(true); };
  const openEdit = (b) => { setEditing(b); setForm({ name: b.name, departmentId: b.departmentId, degree: b.degree, startYear: b.startYear.toString(), endYear: b.endYear.toString() }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { if (editing) await client.put(`/admin/batches/${editing.id}`, form); else await client.post('/admin/batches', form); setShowModal(false); fetchData(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await client.delete(`/admin/batches/${deleteTarget}`); setDeleteTarget(null); fetchData(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete batch'); } finally { setDeleting(false); }
  };

  useEffect(() => { if (location.state?.openAddModal) { openCreate(); navigate(location.pathname, { replace: true, state: {} }); } }, [location.state, navigate, location.pathname]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const now = new Date().getFullYear();

  return (
    <div className="rd-content-inner">
      <PageHead title="Batches" sub="Manage student batches">
        <button className="rd-btn rd-btn-primary" onClick={openCreate}><Icon name="plus" /> Add Batch</button>
      </PageHead>


      <div className="rd-toolbar">
        <select className="rd-chip-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="rd-card fade-up">
        <div className="rd-table-wrap">
          <table className="rd-tbl">
            <thead><tr><th>Batch</th><th>Department</th><th>Degree</th><th>Year</th><th>Sections</th><th>Students</th><th>Progress</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state"><p>No batches yet.</p></div></td></tr>
              ) : batches.map(b => {
                const totalYears = b.endYear - b.startYear;
                const elapsed = Math.min(Math.max(now - b.startYear, 0), totalYears);
                const progress = totalYears > 0 ? Math.round((elapsed / totalYears) * 100) : 0;
                return (
                  <tr key={b.id}>
                    <td><span style={{ fontWeight: 600, fontSize: 13.5 }}>{b.name}</span></td>
                    <td><DeptTag code={b.department?.code || b.department?.name || '—'} /></td>
                    <td><span className="rd-badge rd-badge-id">{b.degree}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{b.startYear}–{b.endYear}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{b._count?.sections || 0}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{b._count?.students || 0}</span></td>
                    <td style={{ minWidth: 130 }}><Meter value={progress} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="rd-row-act" style={{ justifyContent: 'flex-end', opacity: 1 }}>
                        <button className="rd-icon-btn" onClick={() => openEdit(b)} title="Edit"><Icon name="edit" /></button>
                        <button className="rd-icon-btn" onClick={() => setDeleteTarget(b.id)} title="Delete" style={{ color: 'var(--bad)' }}><Icon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editing ? 'Edit Batch' : 'Add Batch'}</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group"><label className="form-label">Batch Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. CSE 2024-28" /></div>
                <div className="form-group"><label className="form-label">Department</label><select className="form-select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} required><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Degree</label><input className="form-input" value={form.degree} onChange={e => setForm({ ...form, degree: e.target.value })} required placeholder="e.g. B.Tech" /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start Year</label><input className="form-input" type="number" value={form.startYear} onChange={e => setForm({ ...form, startYear: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">End Year</label><input className="form-input" type="number" value={form.endYear} onChange={e => setForm({ ...form, endYear: e.target.value })} required /></div>
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

      <ConfirmDialog open={!!deleteTarget} title="Delete Batch?" message="This will soft-delete the batch. Related sections and students will need to be reassigned." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}
