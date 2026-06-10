import { useState, useEffect } from 'react';
import { AlertTriangle, X, Check, Clipboard, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { PageHead, Meter } from '../../components/ui/DesignHelpers';
import { deptColor } from '../../components/ui/DesignUtils';
import { toast as toastAlert } from '../../store/toastStore';

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
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const fetchDepartments = async () => {
    try { const { data } = await client.get('/admin/departments'); setDepartments(data.departments); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDepartments(); }, []);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); } }, [error]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 6000); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => { if (location.state?.openAddModal) { openCreate(); navigate(location.pathname, { replace: true, state: {} }); } }, [location.state, navigate, location.pathname]);

  const openCreate = () => { setEditing(null); setError(''); setForm({ name: '', code: '' }); setShowModal(true); };
  const openEdit = (dept) => { setEditing(dept); setError(''); setForm({ name: dept.name, code: dept.code }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) { await client.put(`/admin/departments/${editing.id}`, form); toastAlert.success('Department updated successfully!'); }
      else {
        const res = await client.post('/admin/departments', form);
        const dept = res.data.department;
        if (dept._mandatoryCount && dept._mandatoryCount > 0) setToast(`${dept._mandatoryCount} mandatory course(s) need syllabus for "${dept.name}".`);
        toastAlert.success('Department created successfully!');
      }
      setShowModal(false); fetchDepartments();
    } catch (err) { setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save department'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await client.delete(`/admin/departments/${deleteTarget}`); setDeleteTarget(null); fetchDepartments(); toastAlert.success('Department deleted successfully'); }
    catch (err) { toastAlert.error(err.response?.data?.error || 'Failed to delete department'); }
    finally { setDeleting(false); }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="rd-content-inner">
      <PageHead title="Departments" sub="Manage academic departments">
        <button className="rd-btn rd-btn-primary" onClick={openCreate}><Icon name="plus" /> Add Department</button>
      </PageHead>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '12px 20px', borderRadius: 'var(--r-lg)', maxWidth: 400, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 500, boxShadow: 'var(--shadow-lg-rd)', display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn 0.3s ease' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clipboard size={16} /> {toast}</span>
          <button onClick={() => navigate('/admin/courses')} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View Courses <ArrowRight size={14} /></button>
          <button onClick={() => setToast('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, padding: '0 4px', display: 'flex' }}><X size={16} /></button>
        </div>
      )}

      {/* ─── Department Cards Grid ─── */}
      {departments.length === 0 ? (
        <div className="rd-card rd-card-pad"><div className="empty-state"><p>No departments yet.</p></div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--gap)' }}>
          {departments.map((dept, i) => (
            <div className="rd-card fade-up" key={dept.id} style={{ animationDelay: `${i * 60}ms`, overflow: 'hidden' }}>
              {/* Color accent strip */}
              <div style={{ height: 4, background: deptColor(dept.code) }} />
              <div className="rd-card-pad">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: deptColor(dept.code), display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, letterSpacing: '-.5px' }}>
                      {dept.code}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{dept.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 2 }}>
                        HOD: {dept.hod?.user?.name || 'Not assigned'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="rd-icon-btn" onClick={() => openEdit(dept)} title="Edit"><Icon name="edit" /></button>
                    <button className="rd-icon-btn" onClick={() => setDeleteTarget(dept.id)} title="Delete" style={{ color: 'var(--bad)' }}><Icon name="trash" /></button>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div style={{ textAlign: 'center', padding: '8px 0', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{dept._count?.batches || 0}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 600 }}>Batches</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 0', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{dept._count?.courseDepartments || 0}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 600 }}>Courses</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 0', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{dept._count?.staff || 0}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 600 }}>Staff</div>
                  </div>
                </div>

                {/* Avg attendance */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>
                  <span>Avg Attendance</span>
                </div>
                <Meter value={dept.attendancePercentage ?? 0} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editing ? 'Edit Department' : 'Add Department'}</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {error && <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--bad-soft)', border: '1px solid var(--bad)', color: 'var(--bad)', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} /> {error}</div>}
                <div className="form-group"><label className="form-label">Department Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Computer Science & Engineering" /></div>
                <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required placeholder="e.g. CSE" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Department?" message="This will soft-delete the department. Related batches, courses, and staff will need to be reassigned." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}
