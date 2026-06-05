import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check, Clipboard, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import SyllabusEditor from '../../components/SyllabusEditor';
import Icon from '../../components/ui/Icon';
import { PageHead, DeptTag, StatTile } from '../../components/ui/DesignHelpers';

const EMPTY_FORM = { code: '', name: '', credits: '3', semester: '1', type: 'theory', isMandatory: false, departments: [] };
const TYPE_BADGE = { theory: { color: 'var(--accent)', bg: 'var(--accent-soft)' }, lab: { color: 'var(--good)', bg: 'var(--good-soft)' }, elective: { color: 'var(--warn)', bg: 'var(--warn-soft)' } };

export default function ManageCourses() {
  const navigate = useNavigate();
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [syllabusModal, setSyllabusModal] = useState(null);
  const [savingSyllabus, setSavingSyllabus] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, deptRes] = await Promise.all([
        client.get('/admin/courses', { params: filterDept ? { departmentId: filterDept } : {} }),
        client.get('/admin/departments'),
      ]);
      setCourses(courseRes.data.courses);
      setDepartments(deptRes.data.departments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterDept]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); } }, [error]);

  const openCreate = () => { setEditing(null); setError(''); setActiveTab(0); setForm({ ...EMPTY_FORM, departments: departments.length > 0 ? [{ departmentId: departments[0].id, units: [] }] : [] }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setError(''); setForm({ code: c.code, name: c.name, credits: c.credits.toString(), semester: c.semester.toString(), type: c.type, isMandatory: c.isMandatory, departments: [] }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await client.put(`/admin/courses/${editing.id}`, { code: form.code, name: form.name, credits: form.credits, semester: form.semester, type: form.type });
      else await client.post('/admin/courses', { code: form.code, name: form.name, credits: form.credits, semester: form.semester, type: form.type, isMandatory: form.isMandatory, departments: form.departments });
      setShowModal(false); fetchData();
    } catch (err) { setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save course'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; setDeleting(true); try { await client.delete(`/admin/courses/${deleteTarget}`); setDeleteTarget(null); fetchData(); } catch (err) { alert(err.response?.data?.error || 'Failed to delete course'); } finally { setDeleting(false); } };

  const openSyllabusEditor = (courseId, departmentId, departmentName, existingUnits) => { setSyllabusModal({ courseId, departmentId, departmentName, units: (existingUnits || []).map(u => ({ number: u.number, title: u.title, hours: u.hours || '', topics: (u.topics || []).map(t => ({ order: t.order, title: t.title, description: t.description || '' })) })) }); };
  const saveSyllabus = async () => { if (!syllabusModal) return; setSavingSyllabus(true); try { await client.put(`/admin/courses/${syllabusModal.courseId}/departments/${syllabusModal.departmentId}/syllabus`, { units: syllabusModal.units }); setSyllabusModal(null); fetchData(); } catch (err) { alert(err.response?.data?.error || 'Failed to save syllabus'); } finally { setSavingSyllabus(false); } };

  const setDeptUnits = (deptIdx, units) => { const updated = form.departments.map((d, i) => (i === deptIdx ? { ...d, units } : d)); setForm({ ...form, departments: updated }); };
  const setDeptId = (deptIdx, departmentId) => { const updated = form.departments.map((d, i) => (i === deptIdx ? { ...d, departmentId } : d)); setForm({ ...form, departments: updated }); };
  const toggleMandatory = (val) => { if (val) { setForm({ ...form, isMandatory: true, departments: departments.map(d => ({ departmentId: d.id, units: [] })) }); setActiveTab(0); } else { setForm({ ...form, isMandatory: false, departments: [{ departmentId: departments[0]?.id || '', units: [] }] }); } };
  const copyFromDept = (targetIdx, sourceIdx) => { if (sourceIdx === '' || sourceIdx === undefined) return; const src = form.departments[parseInt(sourceIdx)]; if (!src) return; const updated = form.departments.map((d, i) => i === targetIdx ? { ...d, units: JSON.parse(JSON.stringify(src.units)) } : d); setForm({ ...form, departments: updated }); };

  useEffect(() => { if (location.state?.openAddModal) { openCreate(); navigate(location.pathname, { replace: true, state: {} }); } }, [location.state, navigate, location.pathname]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const filtered = searchQ ? courses.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase()) || c.code.toLowerCase().includes(searchQ.toLowerCase())) : courses;

  return (
    <div className="rd-content-inner">
      <PageHead title="Courses" sub="Manage academic courses">
        <button className="rd-btn rd-btn-primary" onClick={openCreate}><Icon name="plus" /> Add Course</button>
      </PageHead>

      {/* ─── Stat tiles ─── */}
      <div className="rd-stat-grid" style={{ marginBottom: '20px' }}>
        <StatTile icon="book" label="Total Courses" value={courses.length}
          tint="var(--info)" soft="var(--info-soft)" delay={0} />
      </div>

      <div className="rd-toolbar">
        <div className="rd-search">
          <Icon name="search" />
          <input placeholder="Search courses…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        </div>
        <select className="rd-chip-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="rd-card fade-up">
        <div className="rd-table-wrap">
          <table className="rd-tbl">
            <thead><tr><th>Code</th><th>Course</th><th>Departments</th><th>Credits</th><th>Semester</th><th>Type</th><th>Syllabus</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state"><p>No courses found.</p></div></td></tr>
              ) : filtered.map(c => {
                const tb = TYPE_BADGE[c.type] || { color: 'var(--muted)', bg: 'var(--surface-3)' };
                return (
                  <tr key={c.id}>
                    <td><span className="rd-badge rd-badge-id">{c.code}</span></td>
                    <td><span style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {c.isMandatory && <span className="rd-badge" style={{ color: 'var(--accent)', background: 'var(--accent-soft)', fontSize: 11 }}>Mandatory</span>}
                        {(c.departments || []).map(d => <span key={d.id} className="rd-badge rd-badge-id" style={{ fontSize: 11 }}>{d.code || d.name}</span>)}
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{c.credits}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Sem {c.semester}</span></td>
                    <td><span className="rd-badge" style={{ color: tb.color, background: tb.bg }}>{c.type}</span></td>
                    <td>
                      {c.needsSyllabusCount > 0 ? (
                        <button className="rd-badge" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', cursor: 'pointer', border: 'none' }}
                          onClick={() => { const cd = c.courseDepartments?.find(cd => cd._count?.units === 0); if (cd) openSyllabusEditor(c.id, cd.department.id, cd.department.name, []); }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={14} /> {c.needsSyllabusCount} need{c.needsSyllabusCount === 1 ? 's' : ''} syllabus</span>
                        </button>
                      ) : c.courseDepartments?.length > 0 ? (
                        <span style={{ color: 'var(--good)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Complete</span>
                      ) : null}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="rd-row-act" style={{ justifyContent: 'flex-end', opacity: 1 }}>
                        <button className="rd-icon-btn" onClick={() => openEdit(c)} title="Edit"><Icon name="edit" /></button>
                        {c.courseDepartments?.map(cd => (
                          <button key={cd.department.id} className="rd-btn rd-btn-ghost rd-btn-sm" onClick={() => openSyllabusEditor(c.id, cd.department.id, cd.department.name, cd.units || [])} title={`Syllabus: ${cd.department.name}`}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clipboard size={14} /> {cd.department.code}</span>
                          </button>
                        ))}
                        <button className="rd-icon-btn" onClick={() => setDeleteTarget(c.id)} title="Delete" style={{ color: 'var(--bad)' }}><Icon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Create / Edit Course Modal ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: editing ? 560 : 720 }}>
            <div className="modal-header"><h2>{editing ? 'Edit Course' : 'Add Course'}</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: '70vh', overflowY: 'auto' }}>
                {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bad-soft)', border: '1px solid var(--bad)', color: 'var(--bad)', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} /> {error}</div>}

                {!editing && (
                  <div className="form-group">
                    <label className="form-label">Course Scope</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', border: !form.isMandatory ? '2px solid var(--accent)' : '2px solid var(--border)', background: !form.isMandatory ? 'var(--accent-soft)' : 'var(--surface)', transition: 'all .15s' }}>
                        <input type="radio" name="scope" checked={!form.isMandatory} onChange={() => toggleMandatory(false)} style={{ accentColor: 'var(--accent)' }} />
                        <span style={{ fontWeight: 500, fontSize: 14 }}>Department-specific</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', border: form.isMandatory ? '2px solid var(--accent)' : '2px solid var(--border)', background: form.isMandatory ? 'var(--accent-soft)' : 'var(--surface)', transition: 'all .15s' }}>
                        <input type="radio" name="scope" checked={form.isMandatory} onChange={() => toggleMandatory(true)} style={{ accentColor: 'var(--accent)' }} />
                        <span style={{ fontWeight: 500, fontSize: 14 }}>Mandatory (all departments)</span>
                      </label>
                    </div>
                  </div>
                )}

                {editing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="rd-badge" style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}>{form.isMandatory ? 'Mandatory' : 'Department-specific'}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>Cannot be changed after creation</span>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group"><label className="form-label">Course Code</label><input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required placeholder="e.g. CS101" /></div>
                  <div className="form-group"><label className="form-label">Course Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Data Structures" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Credits</label><input className="form-input" type="number" min="1" max="10" value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Semester</label><input className="form-input" type="number" min="1" max="8" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="theory">Theory</option><option value="lab">Lab</option><option value="elective">Elective</option></select></div>
                </div>

                {!editing && (
                  <>
                    {!form.isMandatory ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="form-group"><label className="form-label">Department</label><select className="form-select" value={form.departments[0]?.departmentId || ''} onChange={e => setDeptId(0, e.target.value)} required><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                        <div className="form-group"><label className="form-label">Syllabus (optional)</label><SyllabusEditor units={form.departments[0]?.units || []} onChange={units => setDeptUnits(0, units)} /></div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label className="form-label">Syllabus per Department</label>
                        <div className="rd-seg full" style={{ flexWrap: 'wrap' }}>
                          {form.departments.map((dept, idx) => { const d = departments.find(x => x.id === dept.departmentId); const hasContent = dept.units.length > 0; return (
                            <button key={dept.departmentId} type="button" className={activeTab === idx ? 'on' : ''} onClick={() => setActiveTab(idx)} style={{ position: 'relative' }}>
                              {d?.code || d?.name || 'Dept'}{!hasContent && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 99, background: 'var(--warn)' }} />}
                            </button>
                          ); })}
                        </div>
                        {form.departments[activeTab] && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {form.departments.length > 1 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>Copy syllabus from:</span>
                                <select className="form-select" style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }} value="" onChange={e => copyFromDept(activeTab, e.target.value)}>
                                  <option value="">Select...</option>
                                  {form.departments.map((dept, idx) => { if (idx === activeTab) return null; const d = departments.find(x => x.id === dept.departmentId); return <option key={idx} value={idx} disabled={dept.units.length === 0}>{d?.code || d?.name} {dept.units.length === 0 ? '(empty)' : `(${dept.units.length} units)`}</option>; })}
                                </select>
                              </div>
                            )}
                            <SyllabusEditor units={form.departments[activeTab].units} onChange={units => setDeptUnits(activeTab, units)} />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {syllabusModal && (
        <div className="modal-overlay" onClick={() => setSyllabusModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header"><h2>Edit Syllabus <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>— {syllabusModal.departmentName}</span></h2><button className="btn btn-ghost" onClick={() => setSyllabusModal(null)}><X size={20} /></button></div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}><SyllabusEditor units={syllabusModal.units} onChange={units => setSyllabusModal({ ...syllabusModal, units })} /></div>
            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setSyllabusModal(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={saveSyllabus} disabled={savingSyllabus}>{savingSyllabus ? 'Saving...' : 'Save Syllabus'}</button></div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Course?" message="This will soft-delete the course." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}
