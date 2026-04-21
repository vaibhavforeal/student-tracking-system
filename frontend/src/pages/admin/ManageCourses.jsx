import { useState, useEffect } from 'react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import SyllabusEditor from '../../components/SyllabusEditor';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineExclamation } from 'react-icons/hi';

const EMPTY_FORM = {
  code: '', name: '', credits: '3', semester: '1', type: 'theory',
  isMandatory: false,
  departments: [], // [{ departmentId, units: [] }]
};

export default function ManageCourses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0); // for mandatory course dept tabs

  // Syllabus editor modal (for editing syllabus of an existing course)
  const [syllabusModal, setSyllabusModal] = useState(null); // { courseId, departmentId, departmentName, units }
  const [savingSyllabus, setSavingSyllabus] = useState(false);

  const fetchData = async () => {
    try {
      const [courseRes, deptRes] = await Promise.all([
        client.get('/admin/courses', { params: filterDept ? { departmentId: filterDept } : {} }),
        client.get('/admin/departments'),
      ]);
      setCourses(courseRes.data.courses);
      setDepartments(deptRes.data.departments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterDept]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const openCreate = () => {
    setEditing(null);
    setError('');
    setActiveTab(0);
    setForm({
      ...EMPTY_FORM,
      departments: departments.length > 0 ? [{ departmentId: departments[0].id, units: [] }] : [],
    });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setError('');
    setForm({
      code: c.code,
      name: c.name,
      credits: c.credits.toString(),
      semester: c.semester.toString(),
      type: c.type,
      isMandatory: c.isMandatory,
      departments: [], // not editable on edit - only shared fields
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        // Edit: only shared fields
        await client.put(`/admin/courses/${editing.id}`, {
          code: form.code, name: form.name, credits: form.credits,
          semester: form.semester, type: form.type,
        });
      } else {
        // Create: include departments + syllabus
        await client.post('/admin/courses', {
          code: form.code, name: form.name, credits: form.credits,
          semester: form.semester, type: form.type,
          isMandatory: form.isMandatory,
          departments: form.departments,
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save course');
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/admin/courses/${deleteTarget}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete course');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Syllabus modal handlers ───
  const openSyllabusEditor = (courseId, departmentId, departmentName, existingUnits) => {
    setSyllabusModal({
      courseId, departmentId, departmentName,
      units: (existingUnits || []).map((u) => ({
        number: u.number,
        title: u.title,
        hours: u.hours || '',
        topics: (u.topics || []).map((t) => ({
          order: t.order,
          title: t.title,
          description: t.description || '',
        })),
      })),
    });
  };

  const saveSyllabus = async () => {
    if (!syllabusModal) return;
    setSavingSyllabus(true);
    try {
      await client.put(
        `/admin/courses/${syllabusModal.courseId}/departments/${syllabusModal.departmentId}/syllabus`,
        { units: syllabusModal.units }
      );
      setSyllabusModal(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save syllabus');
    } finally {
      setSavingSyllabus(false);
    }
  };

  // ─── Form department helpers (create mode) ───
  const setDeptUnits = (deptIdx, units) => {
    const updated = form.departments.map((d, i) => (i === deptIdx ? { ...d, units } : d));
    setForm({ ...form, departments: updated });
  };

  const setDeptId = (deptIdx, departmentId) => {
    const updated = form.departments.map((d, i) => (i === deptIdx ? { ...d, departmentId } : d));
    setForm({ ...form, departments: updated });
  };

  const toggleMandatory = (val) => {
    if (val) {
      // Mandatory: one tab per department
      setForm({
        ...form,
        isMandatory: true,
        departments: departments.map((d) => ({ departmentId: d.id, units: [] })),
      });
      setActiveTab(0);
    } else {
      // Dept-specific: single department
      setForm({
        ...form,
        isMandatory: false,
        departments: [{ departmentId: departments[0]?.id || '', units: [] }],
      });
    }
  };

  const copyFromDept = (targetIdx, sourceIdx) => {
    if (sourceIdx === '' || sourceIdx === undefined) return;
    const src = form.departments[parseInt(sourceIdx)];
    if (!src) return;
    const updated = form.departments.map((d, i) =>
      i === targetIdx ? { ...d, units: JSON.parse(JSON.stringify(src.units)) } : d
    );
    setForm({ ...form, departments: updated });
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const typeColor = { theory: 'badge-sky', lab: 'badge-purple', elective: 'badge-amber' };

  return (
    <div>
      <div className="page-header">
        <div><h1>Courses</h1><p className="page-subtitle">Manage academic courses</p></div>
        <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Add Course</button>
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
            <thead><tr>
              <th>Code</th><th>Name</th><th>Departments</th><th>Credits</th>
              <th>Semester</th><th>Type</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {courses.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state"><p>No courses yet.</p></div></td></tr>
              ) : courses.map((c) => (
                <tr key={c.id}>
                  <td><span className="badge badge-sky">{c.code}</span></td>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {c.isMandatory && (
                        <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>Mandatory</span>
                      )}
                      {(c.departments || []).map((d) => (
                        <span key={d.id} className="badge badge-sky" style={{ fontSize: '0.7rem' }}>{d.code || d.name}</span>
                      ))}
                    </div>
                  </td>
                  <td>{c.credits}</td>
                  <td>Sem {c.semester}</td>
                  <td><span className={`badge ${typeColor[c.type] || 'badge-gray'}`}>{c.type}</span></td>
                  <td>
                    {c.needsSyllabusCount > 0 && (
                      <button
                        className="badge badge-amber"
                        style={{
                          cursor: 'pointer', border: 'none', display: 'inline-flex',
                          alignItems: 'center', gap: '3px', fontSize: '0.72rem',
                        }}
                        title="Click to add syllabus for departments missing it"
                        onClick={() => {
                          // Find first dept with no units
                          const cd = c.courseDepartments?.find((cd) => cd._count?.units === 0);
                          if (cd) openSyllabusEditor(c.id, cd.department.id, cd.department.name, []);
                        }}
                      >
                        <HiOutlineExclamation size={12} />
                        {c.needsSyllabusCount} need{c.needsSyllabusCount === 1 ? 's' : ''} syllabus
                      </button>
                    )}
                    {c.needsSyllabusCount === 0 && c.courseDepartments?.length > 0 && (
                      <span style={{ fontSize: '0.78rem', color: '#22c55e' }}>✓</span>
                    )}
                  </td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} title="Edit"><HiOutlinePencil /></button>
                    {/* Syllabus edit per-department */}
                    {c.courseDepartments?.map((cd) => (
                      <button
                        key={cd.department.id}
                        className="btn btn-ghost btn-sm"
                        onClick={() => openSyllabusEditor(c.id, cd.department.id, cd.department.name, cd.units || [])}
                        title={`Edit syllabus for ${cd.department.name}`}
                        style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                      >
                        📋 {cd.department.code}
                      </button>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(c.id)} title="Delete" style={{ color: 'var(--color-danger)' }}><HiOutlineTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Create / Edit Course Modal ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: editing ? '560px' : '720px' }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Course' : 'Add Course'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: '70vh', overflowY: 'auto' }}>
                {error && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px',
                    backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                    fontSize: '0.9rem', fontWeight: 500,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Mandatory toggle (only on create) */}
                {!editing && (
                  <div className="form-group">
                    <label className="form-label">Course Scope</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                        borderRadius: '8px', cursor: 'pointer',
                        border: !form.isMandatory ? '2px solid #818cf8' : '2px solid #e2e8f0',
                        background: !form.isMandatory ? '#f0f0ff' : '#fff',
                        transition: 'all 0.15s',
                      }}>
                        <input
                          type="radio" name="scope" checked={!form.isMandatory}
                          onChange={() => toggleMandatory(false)}
                          style={{ accentColor: '#818cf8' }}
                        />
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Department-specific</span>
                      </label>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                        borderRadius: '8px', cursor: 'pointer',
                        border: form.isMandatory ? '2px solid #818cf8' : '2px solid #e2e8f0',
                        background: form.isMandatory ? '#f0f0ff' : '#fff',
                        transition: 'all 0.15s',
                      }}>
                        <input
                          type="radio" name="scope" checked={form.isMandatory}
                          onChange={() => toggleMandatory(true)}
                          style={{ accentColor: '#818cf8' }}
                        />
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Mandatory (all departments)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Show locked badge on edit */}
                {editing && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', borderRadius: '8px',
                    background: form.isMandatory ? '#f0f0ff' : '#f0f7ff',
                    border: '1px solid #e2e8f0',
                  }}>
                    <span className={`badge ${form.isMandatory ? 'badge-purple' : 'badge-sky'}`}>
                      {form.isMandatory ? 'Mandatory' : 'Department-specific'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Cannot be changed after creation</span>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. CS101" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Name</label>
                    <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Data Structures" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Credits</label>
                    <input className="form-input" type="number" min="1" max="10" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <input className="form-input" type="number" min="1" max="8" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="theory">Theory</option>
                      <option value="lab">Lab</option>
                      <option value="elective">Elective</option>
                    </select>
                  </div>
                </div>

                {/* Department + Syllabus section (create only) */}
                {!editing && (
                  <>
                    {!form.isMandatory ? (
                      /* ── Department-specific: single dept + syllabus ── */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">Department</label>
                          <select
                            className="form-select"
                            value={form.departments[0]?.departmentId || ''}
                            onChange={(e) => setDeptId(0, e.target.value)}
                            required
                          >
                            <option value="">Select Department</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ marginBottom: '6px' }}>Syllabus (optional)</label>
                          <SyllabusEditor
                            units={form.departments[0]?.units || []}
                            onChange={(units) => setDeptUnits(0, units)}
                          />
                        </div>
                      </div>
                    ) : (
                      /* ── Mandatory: tabs for each department ── */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label className="form-label">Syllabus per Department</label>
                        {/* Tab bar */}
                        <div style={{
                          display: 'flex', flexWrap: 'wrap', gap: '4px',
                          borderBottom: '2px solid #e2e8f0', paddingBottom: '0',
                        }}>
                          {form.departments.map((dept, idx) => {
                            const d = departments.find((x) => x.id === dept.departmentId);
                            const hasContent = dept.units.length > 0;
                            return (
                              <button
                                key={dept.departmentId}
                                type="button"
                                onClick={() => setActiveTab(idx)}
                                style={{
                                  padding: '6px 14px', fontSize: '0.82rem', fontWeight: 500,
                                  border: 'none', borderBottom: activeTab === idx ? '2px solid #818cf8' : '2px solid transparent',
                                  background: activeTab === idx ? '#f0f0ff' : 'transparent',
                                  color: activeTab === idx ? '#818cf8' : '#64748b',
                                  cursor: 'pointer', borderRadius: '6px 6px 0 0',
                                  transition: 'all 0.15s',
                                  position: 'relative',
                                }}
                              >
                                {d?.code || d?.name || 'Dept'}
                                {!hasContent && (
                                  <span style={{
                                    position: 'absolute', top: '-2px', right: '-2px',
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: '#f59e0b',
                                  }} />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Active tab content */}
                        {form.departments[activeTab] && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Copy from dropdown */}
                            {form.departments.length > 1 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Copy syllabus from:</span>
                                <select
                                  className="form-select"
                                  style={{ width: 'auto', padding: '4px 8px', fontSize: '0.82rem' }}
                                  value=""
                                  onChange={(e) => copyFromDept(activeTab, e.target.value)}
                                >
                                  <option value="">Select...</option>
                                  {form.departments.map((dept, idx) => {
                                    if (idx === activeTab) return null;
                                    const d = departments.find((x) => x.id === dept.departmentId);
                                    return (
                                      <option key={idx} value={idx} disabled={dept.units.length === 0}>
                                        {d?.code || d?.name} {dept.units.length === 0 ? '(empty)' : `(${dept.units.length} units)`}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}
                            <SyllabusEditor
                              units={form.departments[activeTab].units}
                              onChange={(units) => setDeptUnits(activeTab, units)}
                            />
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

      {/* ─── Syllabus Editor Modal (for existing courses) ─── */}
      {syllabusModal && (
        <div className="modal-overlay" onClick={() => setSyllabusModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h2>
                Edit Syllabus
                <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b', marginLeft: '8px' }}>
                  — {syllabusModal.departmentName}
                </span>
              </h2>
              <button className="btn btn-ghost" onClick={() => setSyllabusModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <SyllabusEditor
                units={syllabusModal.units}
                onChange={(units) => setSyllabusModal({ ...syllabusModal, units })}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSyllabusModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveSyllabus} disabled={savingSyllabus}>
                {savingSyllabus ? 'Saving...' : 'Save Syllabus'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Course?"
        message="This will soft-delete the course. Related class assignments, marks, and attendance records may be affected."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
