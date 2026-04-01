import { useState, useEffect } from 'react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function ManageSections() {
  const [sections, setSections] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', batchId: '' });
  const [saving, setSaving] = useState(false);
  const [filterBatch, setFilterBatch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [secRes, batchRes] = await Promise.all([
        client.get('/admin/sections', { params: filterBatch ? { batchId: filterBatch } : {} }),
        client.get('/admin/batches'),
      ]);
      setSections(secRes.data.sections);
      setBatches(batchRes.data.batches);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterBatch]);

  const openCreate = () => { setEditing(null); setForm({ name: '', batchId: batches[0]?.id || '' }); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, batchId: s.batchId }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await client.put(`/admin/sections/${editing.id}`, form);
      else await client.post('/admin/sections', form);
      setShowModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/admin/sections/${deleteTarget}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete section');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Sections</h1><p className="page-subtitle">Manage batch sections</p></div>
        <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Add Section</button>
      </div>

      <div className="toolbar">
        <div className="filter-group">
          <select className="form-select" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All Batches</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Batch</th><th>Department</th><th>Students</th><th>Actions</th></tr></thead>
            <tbody>
              {sections.length === 0 ? (
                <tr><td colSpan="5"><div className="empty-state"><p>No sections yet.</p></div></td></tr>
              ) : sections.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>{s.batch?.name}</td>
                  <td><span className="badge badge-purple">{s.batch?.department?.name}</span></td>
                  <td>{s._count?.students || 0}</td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} title="Edit"><HiOutlinePencil /></button>
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
            <div className="modal-header"><h2>{editing ? 'Edit Section' : 'Add Section'}</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Section Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Section A" />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch</label>
                  <select className="form-select" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} required>
                    <option value="">Select Batch</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
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
        title="Delete Section?"
        message="This will soft-delete the section. Students assigned to this section will need to be reassigned."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
