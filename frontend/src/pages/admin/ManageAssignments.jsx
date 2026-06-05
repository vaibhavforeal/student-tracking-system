import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar, DeptTag } from '../../components/ui/DesignHelpers';

export default function ManageAssignments() {
  const navigate = useNavigate();
  const location = useLocation();
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ staffId: '', courseId: '', sectionId: '', academicYear: '' });

  const fetchData = async () => {
    try {
      const [aRes, sRes, cRes, secRes] = await Promise.all([
        client.get('/admin/class-assignments'), client.get('/admin/staff'),
        client.get('/admin/courses'), client.get('/admin/sections'),
      ]);
      setAssignments(aRes.data.assignments); setStaff(sRes.data.staff);
      setCourses(cRes.data.courses); setSections(secRes.data.sections);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try { await client.post('/admin/class-assignments', form); setShowForm(false); setForm({ staffId: '', courseId: '', sectionId: '', academicYear: '' }); fetchData(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to create assignment.'); } finally { setSaving(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await client.delete(`/admin/class-assignments/${deleteTarget.id}`); setDeleteTarget(null); fetchData(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to remove assignment.'); setDeleteTarget(null); } finally { setDeleting(false); }
  };

  useEffect(() => { if (location.state?.openAddModal) { setShowForm(true); setError(''); navigate(location.pathname, { replace: true, state: {} }); } }, [location.state, navigate, location.pathname]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="rd-content-inner">
      <PageHead title="Class Mapping" sub="Assign teachers to sections & courses">
        <button className="rd-btn rd-btn-primary" onClick={() => { setShowForm(!showForm); setError(''); }}>
          <Icon name="plus" /> Assign Teacher
        </button>
      </PageHead>

      {error && <div className="rd-card rd-card-pad fade-up" style={{ marginBottom: 'var(--gap)', background: 'var(--bad-soft)', borderColor: 'var(--bad)', color: 'var(--bad)' }}>⚠️ {error}</div>}

      {showForm && (
        <div className="rd-card rd-card-pad fade-up" style={{ marginBottom: 'var(--gap)' }}>
          <div className="rd-card-title" style={{ marginBottom: 14 }}>New Assignment</div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Teacher (Staff) *</label>
                <select className="form-select" value={form.staffId} onChange={e => setForm({ ...form, staffId: e.target.value })} required>
                  <option value="">Select Teacher</option>{staff.map(s => <option key={s.id} value={s.id}>{s.user?.name || s.employeeId} ({s.employeeId})</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Course *</label>
                <select className="form-select" value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })} required>
                  <option value="">Select Course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
              <div className="form-group"><label className="form-label">Section *</label>
                <select className="form-select" value={form.sectionId} onChange={e => setForm({ ...form, sectionId: e.target.value, academicYear: '' })} required>
                  <option value="">Select Section</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name} {s.batch ? `(${s.batch.degree || ''} — ${s.batch.name})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Academic Year *</label>
                <select className="form-select" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} required disabled={!form.sectionId}>
                  <option value="">{form.sectionId ? 'Select Year' : 'Select a section first'}</option>
                  {(() => { const sec = sections.find(s => s.id === form.sectionId); if (!sec?.batch?.startYear || !sec?.batch?.endYear) return null; const years = []; for (let y = sec.batch.startYear; y < sec.batch.endYear; y++) years.push(`${y}-${String(y + 1).slice(-2)}`); return years.map(yr => <option key={yr} value={yr}>{yr}</option>); })()}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="rd-btn rd-btn-ghost" onClick={() => { setShowForm(false); setError(''); }}>Cancel</button>
              <button type="submit" className="rd-btn rd-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Assign'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="rd-card fade-up">
        <div className="rd-table-wrap">
          <table className="rd-tbl">
            <thead><tr><th>Teacher</th><th>Course</th><th>Section</th><th>Year</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan="5"><div className="empty-state"><p>No assignments yet. Click "Assign Teacher" to get started.</p></div></td></tr>
              ) : assignments.map(a => (
                <tr key={a.id}>
                  <td>
                    <div className="rd-cell-name">
                      <MiniAvatar name={a.staff?.user?.name || 'Staff'} />
                      <div>
                        <div className="rd-name-main">{a.staff?.user?.name || '—'}</div>
                        <div className="rd-name-sub">{a.staff?.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="rd-badge rd-badge-id">{a.course?.code}</span>
                      <span style={{ fontWeight: 500, fontSize: 13.5 }}>{a.course?.name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{a.section?.name}</div>
                    {a.section?.batch && <div style={{ fontSize: 12, color: 'var(--faint)' }}>{a.section.batch.degree} — {a.section.batch.name}</div>}
                  </td>
                  <td><span className="rd-badge" style={{ color: 'var(--info)', background: 'var(--info-soft)' }}>{a.academicYear}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="rd-icon-btn" onClick={() => setDeleteTarget(a)} title="Remove" style={{ color: 'var(--bad)' }}>
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog open={!!deleteTarget} title="Remove Assignment?" message={`Remove ${deleteTarget?.staff?.user?.name || 'this teacher'} from ${deleteTarget?.course?.code} — ${deleteTarget?.section?.name}?`} confirmText="Remove" loading={deleting} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
