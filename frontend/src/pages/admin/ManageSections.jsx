import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { PageHead, DeptTag, StatTile } from '../../components/ui/DesignHelpers';

export default function ManageSections() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const fetchData = useCallback(async () => {
    try {
      const [secRes, batchRes] = await Promise.all([
        client.get('/admin/sections', { params: filterBatch ? { batchId: filterBatch } : {} }),
        client.get('/admin/batches'),
      ]);
      setSections(secRes.data.sections); setBatches(batchRes.data.batches);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [filterBatch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ name: '', batchId: batches[0]?.id || '' }); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, batchId: s.batchId }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { if (editing) await client.put(`/admin/sections/${editing.id}`, form); else await client.post('/admin/sections', form); setShowModal(false); fetchData(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await client.delete(`/admin/sections/${deleteTarget}`); setDeleteTarget(null); fetchData(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); } finally { setDeleting(false); }
  };

  useEffect(() => { if (location.state?.openAddModal) { openCreate(); navigate(location.pathname, { replace: true, state: {} }); } }, [location.state, navigate, location.pathname]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="rd-content-inner">
      <PageHead title="Sections" sub="Manage batch sections">
        <button className="rd-btn rd-btn-primary" onClick={openCreate}><Icon name="plus" /> Add Section</button>
      </PageHead>

      {/* ─── Stat tiles ─── */}
      <div className="rd-stat-grid" style={{ marginBottom: '20px' }}>
        <StatTile icon="clipboard" label="Total Sections" value={sections.length}
          tint="var(--info)" soft="var(--info-soft)" delay={0} />
      </div>

      <div className="rd-toolbar">
        <select className="rd-chip-select" value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="rd-card fade-up">
        <div className="rd-table-wrap">
          <table className="rd-tbl">
            <thead><tr><th>Name</th><th>Batch</th><th>Department</th><th>Students</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {sections.length === 0 ? (
                <tr><td colSpan="5"><div className="empty-state"><p>No sections yet.</p></div></td></tr>
              ) : sections.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</td>
                  <td>{s.batch?.name}</td>
                  <td><DeptTag code={s.batch?.department?.code || s.batch?.department?.name} /></td>
                  <td><span className="rd-badge" style={{ color: 'var(--info)', background: 'var(--info-soft)' }}>{s._count?.students || 0}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="rd-row-act" style={{ justifyContent: 'flex-end', opacity: 1 }}>
                      <button className="rd-icon-btn" onClick={() => openEdit(s)} title="Edit"><Icon name="edit" /></button>
                      <button className="rd-icon-btn" onClick={() => setDeleteTarget(s.id)} title="Delete" style={{ color: 'var(--bad)' }}><Icon name="trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editing ? 'Edit Section' : 'Add Section'}</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group"><label className="form-label">Section Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Section A" /></div>
                <div className="form-group"><label className="form-label">Batch</label><select className="form-select" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })} required><option value="">Select Batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Section?" message="Students in this section will need to be reassigned." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}
