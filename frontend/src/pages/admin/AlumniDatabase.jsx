import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar, StatTile } from '../../components/ui/DesignHelpers';
import { toast } from '../../store/toastStore';

export default function AlumniDatabase() {
  const [alumni, setAlumni] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revertTarget, setRevertTarget] = useState(null);
  const [reverting, setReverting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [previewAlumni, setPreviewAlumni] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ graduationDate: '', graduationYear: '', currentEmployer: '', currentJobTitle: '', linkedInUrl: '', alumniEmail: '', notes: '' });
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const params = { search, departmentId: selectedDept, batchId: selectedBatch, graduationYear: selectedYear, page, limit: 15 };
      const [alumniRes, statsRes, deptRes, batchRes] = await Promise.all([
        client.get('/admin/alumni', { params }), client.get('/admin/alumni/stats'),
        client.get('/admin/departments'), client.get('/admin/batches'),
      ]);
      setAlumni(alumniRes.data.alumni); setTotalPages(alumniRes.data.totalPages); setTotalCount(alumniRes.data.total);
      setStats(statsRes.data.stats); setDepartments(deptRes.data.departments); setBatches(batchRes.data.batches);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [search, selectedDept, selectedBatch, selectedYear, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRevert = async () => {
    if (!revertTarget) return; setReverting(true);
    try { await client.post(`/admin/alumni/${revertTarget}/revert`); setRevertTarget(null); if (previewAlumni?.id === revertTarget) setPreviewAlumni(null); fetchData(); toast.success('Alumni reverted to active student.'); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to revert'); } finally { setReverting(false); }
  };

  const handleOpenPreview = (student) => {
    setPreviewAlumni(student); setEditing(false);
    const p = student.alumniProfile || {};
    setEditForm({ graduationDate: p.graduationDate ? new Date(p.graduationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], graduationYear: p.graduationYear || new Date().getFullYear(), currentEmployer: p.currentEmployer || '', currentJobTitle: p.currentJobTitle || '', linkedInUrl: p.linkedInUrl || '', alumniEmail: p.alumniEmail || '', notes: p.notes || '' });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await client.put(`/admin/alumni/${previewAlumni.id}`, editForm); setEditing(false);
      const { data } = await client.get('/admin/alumni', { params: { search: previewAlumni.enrollmentNo } });
      if (data.alumni?.length > 0) setPreviewAlumni(data.alumni[0]); fetchData(); toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); } finally { setSaving(false); }
  };

  const handleExportCSV = () => {
    if (alumni.length === 0) return toast.warning('No records to export');
    const headers = ['Enrollment No','First Name','Last Name','Email','Phone','Degree','Batch','Department','Semester','Graduation Year','Current Employer','Job Title','Alumni Email','LinkedIn'];
    const rows = alumni.map(a => { const p = a.alumniProfile || {}; return [a.enrollmentNo,a.firstName,a.lastName,a.user?.email||'',a.phone,a.batch?.degree||'',a.batch?.name||'',a.batch?.department?.name||'',a.semester,p.graduationYear||'',p.currentEmployer||'',p.currentJobTitle||'',p.alumniEmail||'',p.linkedInUrl||'']; });
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `Alumni_${new Date().getFullYear()}.csv`; document.body.appendChild(link); link.click(); link.remove();
  };

  if (loading && page === 1 && alumni.length === 0) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const total = stats?.totalAlumni || 0;
  const employed = stats?.employment?.employed || 0;
  const rate = total > 0 ? Math.round((employed / total) * 100) : 0;
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 7 }, (_, i) => currentYear - i);

  return (
    <div className="rd-content-inner">
      <PageHead title="Alumni Database" sub="Track and manage graduated student profiles">
        <button className="rd-btn rd-btn-ghost" onClick={handleExportCSV}><Icon name="download" /> Export CSV</button>
      </PageHead>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
        <StatTile label="Total Alumni" value={total} icon="cap" compact />
        <StatTile label="Employed" value={employed} icon="briefcase" good compact />
        <StatTile label="Higher Ed / Others" value={stats?.employment?.unemployed || 0} icon="book" compact />
        <StatTile label="Employment Rate" value={`${rate}%`} icon="chart" accent compact />
      </div>

      {/* Filters */}
      <div className="rd-toolbar">
        <div className="rd-search">
          <Icon name="search" />
          <input placeholder="Search name, enrollment, company…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="rd-chip-select" value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setSelectedBatch(''); setPage(1); }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="rd-chip-select" value={selectedBatch} onChange={e => { setSelectedBatch(e.target.value); setPage(1); }}>
          <option value="">All Batches</option>
          {batches.filter(b => !selectedDept || b.departmentId === selectedDept).map(b => <option key={b.id} value={b.id}>{b.degree} — {b.name}</option>)}
        </select>
        <select className="rd-chip-select" value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setPage(1); }}>
          <option value="">All Years</option>
          {graduationYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rd-card fade-up">
        <div className="rd-table-wrap">
          <table className="rd-tbl">
            <thead><tr><th>Student</th><th>Department & Batch</th><th>Graduation</th><th>Employer</th><th>Job Title</th><th>LinkedIn</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {alumni.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><p>No alumni found.</p></div></td></tr>
              ) : alumni.map(alum => {
                const prof = alum.alumniProfile || {};
                return (
                  <tr key={alum.id}>
                    <td>
                      <div className="rd-cell-name">
                        <MiniAvatar name={`${alum.firstName} ${alum.lastName}`} />
                        <div><div className="rd-name-main">{alum.firstName} {alum.lastName}</div><div className="rd-name-sub">{alum.enrollmentNo}</div></div>
                      </div>
                    </td>
                    <td><div style={{ fontWeight: 500, fontSize: 13.5 }}>{alum.batch?.department?.name || '—'}</div><div style={{ fontSize: 12, color: 'var(--faint)' }}>{alum.batch?.degree} {alum.batch?.name}</div></td>
                    <td><div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 13.5 }}>Class of {prof.graduationYear || '—'}</div><div style={{ fontSize: 12, color: 'var(--faint)' }}>{prof.graduationDate ? new Date(prof.graduationDate).toLocaleDateString() : '—'}</div></td>
                    <td style={{ fontWeight: 500, fontSize: 13.5 }}>{prof.currentEmployer || '—'}</td>
                    <td>{prof.currentJobTitle || '—'}</td>
                    <td>{prof.linkedInUrl ? <a href={prof.linkedInUrl} target="_blank" rel="noreferrer" className="rd-badge" style={{ color: 'var(--info)', background: 'var(--info-soft)', textDecoration: 'none' }}>LinkedIn</a> : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="rd-row-act" style={{ justifyContent: 'flex-end', opacity: 1 }}>
                        <button className="rd-icon-btn" onClick={() => handleOpenPreview(alum)} title="View"><Icon name="eye" /></button>
                        <button className="rd-icon-btn" onClick={() => setRevertTarget(alum.id)} title="Revert" style={{ color: 'var(--bad)' }}><Icon name="arrowUp" style={{ transform: 'rotate(-90deg)' }} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Showing {alumni.length} of {totalCount} alumni</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="rd-btn rd-btn-ghost rd-btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="rd-btn rd-btn-ghost rd-btn-sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewAlumni && (
        <div className="modal-overlay" onClick={() => setPreviewAlumni(null)} style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header"><h2>Alumni Details</h2><button className="btn btn-ghost" onClick={() => setPreviewAlumni(null)}>✕</button></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <MiniAvatar name={`${previewAlumni.firstName} ${previewAlumni.lastName}`} size={56} />
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, color: 'var(--ink)' }}>{previewAlumni.firstName} {previewAlumni.lastName}</h3>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className="rd-badge rd-badge-id">{previewAlumni.enrollmentNo}</span>
                    <span className="rd-badge" style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}>Class of {previewAlumni.alumniProfile?.graduationYear}</span>
                    <span className="rd-badge" style={{ color: 'var(--muted)', background: 'var(--surface-3)' }}>{previewAlumni.batch?.department?.name}</span>
                  </div>
                </div>
              </div>

              {editing ? (
                <form onSubmit={handleUpdateProfile}>
                  <div className="form-row"><div className="form-group"><label className="form-label">Graduation Date *</label><input type="date" className="form-input" value={editForm.graduationDate} onChange={e => setEditForm({ ...editForm, graduationDate: e.target.value })} required /></div><div className="form-group"><label className="form-label">Graduation Year *</label><input type="number" className="form-input" value={editForm.graduationYear} onChange={e => setEditForm({ ...editForm, graduationYear: parseInt(e.target.value) })} required /></div></div>
                  <div className="form-row" style={{ marginTop: 12 }}><div className="form-group"><label className="form-label">Current Employer</label><input className="form-input" value={editForm.currentEmployer} onChange={e => setEditForm({ ...editForm, currentEmployer: e.target.value })} placeholder="e.g. Google" /></div><div className="form-group"><label className="form-label">Current Job Title</label><input className="form-input" value={editForm.currentJobTitle} onChange={e => setEditForm({ ...editForm, currentJobTitle: e.target.value })} placeholder="e.g. SDE" /></div></div>
                  <div className="form-row" style={{ marginTop: 12 }}><div className="form-group"><label className="form-label">Alumni Email</label><input type="email" className="form-input" value={editForm.alumniEmail} onChange={e => setEditForm({ ...editForm, alumniEmail: e.target.value })} /></div><div className="form-group"><label className="form-label">LinkedIn URL</label><input type="url" className="form-input" value={editForm.linkedInUrl} onChange={e => setEditForm({ ...editForm, linkedInUrl: e.target.value })} /></div></div>
                  <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Notes</label><textarea className="form-input" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} /></div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                  </div>
                </form>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    {[['Current Employer', previewAlumni.alumniProfile?.currentEmployer], ['Job Title', previewAlumni.alumniProfile?.currentJobTitle], ['Graduation', previewAlumni.alumniProfile?.graduationDate ? new Date(previewAlumni.alumniProfile.graduationDate).toLocaleDateString() : null], ['Alumni Email', previewAlumni.alumniProfile?.alumniEmail], ['LinkedIn', previewAlumni.alumniProfile?.linkedInUrl ? <a href={previewAlumni.alumniProfile.linkedInUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>View LinkedIn</a> : null], ['Phone', previewAlumni.phone]].map(([label, val], i) => (
                      <div key={i}><div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div><div style={{ fontWeight: 500, color: 'var(--ink)' }}>{val || '—'}</div></div>
                    ))}
                  </div>
                  {previewAlumni.alumniProfile?.notes && <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', marginBottom: 20 }}><div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div><p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>{previewAlumni.alumniProfile.notes}</p></div>}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button className="rd-btn rd-btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => setRevertTarget(previewAlumni.id)}>Revert to Student</button>
                    <button className="rd-btn rd-btn-ghost" onClick={() => navigate(`/admin/students/${previewAlumni.id}`)}>Academic Record</button>
                    <button className="rd-btn rd-btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!revertTarget} title="Revert Alumni Status?" message="This will change the student status back to 'active' and permanently delete their post-graduation profile data." onConfirm={handleRevert} onCancel={() => setRevertTarget(null)} loading={reverting} />
    </div>
  );
}
