import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar, DeptTag, StatusBadge } from '../../components/ui/DesignHelpers';
import { initials } from '../../components/ui/DesignUtils';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const DESIGNATION_OPTIONS = ['HOD', 'Professor', 'Assistant Professor', 'Teacher'];
const DESG_COLORS = { HOD: 'var(--accent)', Professor: 'var(--good)', 'Assistant Professor': 'var(--info)', Teacher: 'var(--warn)' };

export default function ManageStaff() {
  const navigate = useNavigate();
  const location = useLocation();
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ employeeId: '', name: '', email: '', password: '', departmentId: '', designation: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [drawerStaff, setDrawerStaff] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [staffRes, deptRes] = await Promise.all([
        client.get('/admin/staff', { params: filterDept ? { departmentId: filterDept } : {} }),
        client.get('/admin/departments'),
      ]);
      setStaff(staffRes.data.staff);
      setDepartments(deptRes.data.departments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterDept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ employeeId: '', name: '', email: '', password: '', departmentId: '', designation: '', phone: '' }); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ employeeId: s.employeeId, name: s.user?.name || '', email: s.user?.email || '', password: '', departmentId: s.departmentId || '', designation: s.designation, phone: s.phone }); setShowModal(true); };

  const handleDesignationChange = (value) => setForm(prev => ({ ...prev, designation: value, departmentId: value === 'HOD' ? prev.departmentId : '' }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form }; if (payload.designation !== 'HOD') delete payload.departmentId;
      if (editing) await client.put(`/admin/staff/${editing.id}`, payload);
      else await client.post('/admin/staff', payload);
      setShowModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await client.delete(`/admin/staff/${deleteTarget}`); setDeleteTarget(null); fetchData(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete staff member'); }
    finally { setDeleting(false); }
  };

  useEffect(() => {
    if (location.state?.openAddModal) { openCreate(); navigate(location.pathname, { replace: true, state: {} }); }
  }, [location.state, navigate, location.pathname]);

  const filtered = searchQ ? staff.filter(s => (s.user?.name || '').toLowerCase().includes(searchQ.toLowerCase()) || (s.employeeId || '').toLowerCase().includes(searchQ.toLowerCase())) : staff;

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="rd-content-inner">
      <PageHead title="Staff" sub="Manage teaching staff">
        <button className="rd-btn rd-btn-primary" onClick={openCreate}><Icon name="plus" /> Add Staff</button>
      </PageHead>

      <div className="rd-toolbar">
        <div className="rd-search">
          <Icon name="search" />
          <input placeholder="Search staff…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        </div>
        <select className="rd-chip-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="rd-card fade-up">
        <div className="rd-table-wrap">
          <table className="rd-tbl">
            <thead><tr><th>Staff Member</th><th>Department</th><th>Designation</th><th>Phone</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="5"><div className="empty-state"><p>No staff members found.</p></div></td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} onClick={() => setDrawerStaff(s)}>
                  <td>
                    <div className="rd-cell-name">
                      <MiniAvatar name={s.user?.name || 'Staff'} />
                      <div>
                        <div className="rd-name-main">{s.user?.name}</div>
                        <div className="rd-name-sub">{s.employeeId} · {s.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><DeptTag code={s.department?.code || s.department?.name || '—'} /></td>
                  <td>
                    <span className="rd-badge" style={{ color: DESG_COLORS[s.designation] || 'var(--muted)', background: 'var(--surface-3)' }}>
                      {s.designation}
                    </span>
                  </td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{s.phone}</span></td>
                  <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div className="rd-row-act" style={{ justifyContent: 'flex-end', opacity: 1 }}>
                      <button className="rd-icon-btn" onClick={() => setDrawerStaff(s)} title="Quick View"><Icon name="eye" /></button>
                      <button className="rd-icon-btn" onClick={() => openEdit(s)} title="Edit Staff"><Icon name="edit" /></button>
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
            <div className="modal-header"><h2>{editing ? 'Edit Staff' : 'Add Staff'}</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Employee ID</label><input className="form-input" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required disabled={!!editing} placeholder="e.g. EMP001" /></div>
                  <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                  {!editing && <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></div>}
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Designation</label><select className="form-select" value={form.designation} onChange={e => handleDesignationChange(e.target.value)} required><option value="">Select Designation</option>{DESIGNATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  {form.designation === 'HOD' && <div className="form-group"><label className="form-label">Department</label><select className="form-select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })} required><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>}
                </div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Staff Member?" message="This will soft-delete the staff member and deactivate their user account." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />

      {/* ═══ STAFF DRAWER ═══ */}
      {drawerStaff && (
        <>
          <div className="rd-scrim" onClick={() => setDrawerStaff(null)} />
          <div className="rd-drawer">
            <div className="rd-drawer-hero">
              <button onClick={() => setDrawerStaff(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 99, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}>
                <Icon name="x" style={{ width: 16, height: 16 }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, border: '2px solid rgba(255,255,255,.4)', overflow: 'hidden', background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}>
                  {drawerStaff.photoUrl ? (
                    <img src={`${API_BASE}${drawerStaff.photoUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>{initials(drawerStaff.user?.name || 'S')}</span>
                  )}
                </div>
                <div>
                  <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>{drawerStaff.user?.name}</h2>
                  <div style={{ marginTop: 6, display: 'inline-block', background: 'rgba(255,255,255,.2)', padding: '3px 12px', borderRadius: 20, fontSize: 13, color: '#fff', fontWeight: 600 }}>
                    {drawerStaff.employeeId}
                  </div>
                </div>
              </div>
            </div>
            <div className="rd-drawer-body">
              <div className="rd-kv-grid" style={{ marginBottom: 20 }}>
                <div><div className="rd-kv-k">Designation</div><div className="rd-kv-v"><span className="rd-badge" style={{ color: DESG_COLORS[drawerStaff.designation] || 'var(--muted)', background: 'var(--surface-3)' }}>{drawerStaff.designation}</span></div></div>
                <div><div className="rd-kv-k">Department</div><div className="rd-kv-v">{drawerStaff.department?.name || '—'}</div></div>
                <div><div className="rd-kv-k">Email</div><div className="rd-kv-v" style={{ fontSize: 13 }}>{drawerStaff.user?.email || '—'}</div></div>
                <div><div className="rd-kv-k">Phone</div><div className="rd-kv-v">{drawerStaff.phone || '—'}</div></div>
                <div><div className="rd-kv-k">Blood Group</div><div className="rd-kv-v">{drawerStaff.personalDetails?.bloodGroup || 'N/A'}</div></div>
                <div><div className="rd-kv-k">Health (Diseases)</div><div className="rd-kv-v">{drawerStaff.personalDetails?.diseases?.length > 0 ? drawerStaff.personalDetails.diseases.join(', ') : 'None'}</div></div>
                <div><div className="rd-kv-k">Allergies</div><div className="rd-kv-v">{drawerStaff.personalDetails?.allergies?.length > 0 ? drawerStaff.personalDetails.allergies.join(', ') : 'None'}</div></div>
                <div><div className="rd-kv-k">Education</div><div className="rd-kv-v">{drawerStaff.education?.[0] ? `${drawerStaff.education[0].degree} (${drawerStaff.education[0].yearOfPass})` : 'N/A'}</div></div>
                <div style={{ gridColumn: '1 / -1' }}><div className="rd-kv-k">Status</div><div className="rd-kv-v"><StatusBadge status={drawerStaff.user?.isActive ? 'active' : 'inactive'} /></div></div>
              </div>
              <button className="rd-btn rd-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setDrawerStaff(null); navigate(`/admin/staff/${drawerStaff.id}`); }}>
                View Full Profile →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
