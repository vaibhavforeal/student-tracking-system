import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import { HiOutlinePlus, HiOutlineEye, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineX, HiOutlineCamera, HiOutlineHeart } from 'react-icons/hi';

const API_BASE = 'http://localhost:5000';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ enrollmentNo: '', email: '', firstName: '', lastName: '', dob: '', gender: 'male', phone: '', address: '', batchId: '', sectionId: '', semester: '1', photoUrl: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/teacher') ? '/teacher' : '/admin';
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const params = { page, limit: 15, ...(search && { search }), ...(filterBatch && { batchId: filterBatch }) };
      const isTeacherView = basePath === '/teacher';
      const [studRes, batchRes, secRes] = await Promise.all([
        client.get(`${basePath}/students`, { params }),
        isTeacherView ? { data: { batches: [] } } : client.get('/admin/batches'),
        isTeacherView ? { data: { sections: [] } } : client.get('/admin/sections'),
      ]);
      setStudents(studRes.data.students);
      setTotalPages(studRes.data.totalPages);
      setBatches(batchRes.data.batches);
      setSections(secRes.data.sections);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, filterBatch]);

  const handleSearch = () => { setPage(1); fetchData(); };

  const openCreate = () => {
    setForm({ enrollmentNo: '', email: '', firstName: '', lastName: '', dob: '', gender: 'male', phone: '', address: '', batchId: batches[0]?.id || '', sectionId: sections[0]?.id || '', semester: '1', photoUrl: '' });
    setPhotoPreview(null);
    setShowModal(true);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await client.post('/admin/upload/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, photoUrl: data.photoUrl }));
    } catch (err) {
      alert('Failed to upload photo. Please try again.');
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await client.post('/admin/students', form);
      setShowModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || err.response?.data?.message || 'Error creating student'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/admin/students/${deleteTarget}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  const statusColor = { active: 'badge-green', inactive: 'badge-gray', graduated: 'badge-sky', dropped: 'badge-red' };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Students</h1><p className="page-subtitle">{basePath === '/teacher' ? 'View your assigned students' : 'Manage student records'}</p></div>
        {basePath === '/admin' && <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Add Student</button>}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <HiOutlineSearch className="search-icon" />
          <input className="form-input" placeholder="Search students..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        </div>
        <div className="filter-group">
          <select className="form-select" value={filterBatch} onChange={(e) => { setFilterBatch(e.target.value); setPage(1); }} style={{ width: 'auto' }}>
            <option value="">All Batches</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.degree} — {b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Enrollment</th><th>Name</th><th>Batch</th><th>Section</th><th>Semester</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><p>No students found.</p></div></td></tr>
              ) : students.map((s) => (
                <tr key={s.id}>
                  <td><span className="badge badge-sky">{s.enrollmentNo}</span></td>
                  <td style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</td>
                  <td>{s.batch?.degree ? `${s.batch.degree} — ${s.batch.name}` : s.batch?.name}</td>
                  <td>{s.section?.name}</td>
                  <td>Sem {s.semester}</td>
                  <td><span className={`badge ${statusColor[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setPreviewStudent(s)} title="Quick Preview" style={{ color: 'var(--color-purple-500)' }}><HiOutlineEye /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`${basePath}/students/${s.id}`)} title="Full Details"><HiOutlinePencil /></button>
                    {basePath === '/admin' && <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(s.id)} title="Delete" style={{ color: 'var(--color-danger)' }}><HiOutlineTrash /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i + 1} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>

      {/* ═══ CREATE STUDENT MODAL ═══ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header"><h2>Add Student</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Photo Upload */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-2)' }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '88px', height: '88px', borderRadius: '50%', overflow: 'hidden',
                      border: '3px dashed var(--color-gray-200)', cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: photoPreview ? 'none' : 'linear-gradient(135deg, var(--color-sky-50), var(--color-purple-50))',
                      transition: 'all var(--transition-fast)', position: 'relative',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-sky-400)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-gray-200)'}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <HiOutlineCamera size={24} style={{ color: 'var(--color-gray-400)' }} />
                      </div>
                    )}
                    {uploadingPhoto && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div className="spinner" />
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  <div>
                    <p style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: '4px' }}>Student Photo</p>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', lineHeight: 1.4 }}>
                      Click the circle to upload.<br />JPG, PNG, or WebP • Max 5MB
                    </p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Enrollment No</label>
                    <input className="form-input" value={form.enrollmentNo} onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })} required placeholder="e.g. 2024CSE001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input className="form-input" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required />
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', marginTop: '4px', display: 'block' }}>Default password will be DOB (DDMMYYYY)</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <input className="form-input" type="number" min="1" max="8" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Batch</label>
                    <select className="form-select" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} required>
                      <option value="">Select Batch</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.degree} — {b.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <select className="form-select" value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })} required>
                      <option value="">Select Section</option>
                      {sections.filter((s) => !form.batchId || s.batchId === form.batchId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || uploadingPhoto}>{saving ? 'Saving...' : 'Create Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ STUDENT PREVIEW MODAL ═══ */}
      {previewStudent && (
        <StudentPreviewModal student={previewStudent} onClose={() => setPreviewStudent(null)} onViewFull={() => { setPreviewStudent(null); navigate(`${basePath}/students/${previewStudent.id}`); }} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Student?"
        message="This will soft-delete the student and deactivate their user account. This action can be reversed by an admin."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STUDENT PREVIEW MODAL — Quick view of key details
   ═══════════════════════════════════════════════════════ */
function StudentPreviewModal({ student, onClose, onViewFull }) {
  const diseases = Array.isArray(student.health?.diseases) ? student.health.diseases : [];
  const allergies = Array.isArray(student.health?.allergies) ? student.health.allergies : [];
  const hasHealthIssues = diseases.length > 0 || allergies.length > 0;

  const getInitials = (first, last) => {
    return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(4px)' }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '440px', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Top gradient banner */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #38bdf8)',
          padding: 'var(--space-6) var(--space-6) var(--space-8)',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 'var(--space-3)', right: 'var(--space-3)',
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <HiOutlineX size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
            {/* Profile Photo */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.5)', overflow: 'hidden',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              {student.photoUrl ? (
                <img
                  src={`${API_BASE}${student.photoUrl}`}
                  alt={`${student.firstName} ${student.lastName}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div style={{
                display: student.photoUrl ? 'none' : 'flex',
                alignItems: 'center', justifyContent: 'center',
                width: '100%', height: '100%',
                fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                letterSpacing: '1px',
              }}>
                {getInitials(student.firstName, student.lastName)}
              </div>
            </div>

            {/* Name & Enrollment */}
            <div>
              <h2 style={{
                color: '#fff', fontSize: 'var(--font-xl)', fontWeight: 700,
                margin: 0, lineHeight: 1.2,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}>
                {student.firstName} {student.lastName}
              </h2>
              <div style={{
                marginTop: 'var(--space-2)',
                display: 'inline-block',
                background: 'rgba(255,255,255,0.2)',
                padding: '3px 10px', borderRadius: '20px',
                fontSize: 'var(--font-sm)', color: '#fff', fontWeight: 600,
                letterSpacing: '0.3px',
              }}>
                {student.enrollmentNo}
              </div>
            </div>
          </div>
        </div>

        {/* Details body */}
        <div style={{ padding: 'var(--space-5) var(--space-6)' }}>
          {/* Class & Section */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)',
            marginBottom: 'var(--space-5)',
          }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-sky-50)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-sky-100)',
            }}>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                Class / Batch
              </div>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-800)', fontWeight: 600 }}>
                {student.batch?.degree ? `${student.batch.degree}` : student.batch?.name || '—'}
              </div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)' }}>
                {student.batch?.name || ''} • Sem {student.semester}
              </div>
            </div>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-purple-50)', borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(139,92,246,0.15)',
            }}>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                Section
              </div>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-800)', fontWeight: 600 }}>
                {student.section?.name || '—'}
              </div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)' }}>
                {student.batch?.department?.name || ''}
              </div>
            </div>
          </div>

          {/* Blood Group */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            background: student.health?.bloodGroup ? 'linear-gradient(135deg, #fef2f2, #fce7f3)' : 'var(--color-gray-50)',
            borderRadius: 'var(--radius-md)',
            border: student.health?.bloodGroup ? '1px solid #fecdd3' : '1px solid var(--color-gray-100)',
            marginBottom: 'var(--space-4)',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: student.health?.bloodGroup ? 'linear-gradient(135deg, #ef4444, #ec4899)' : 'var(--color-gray-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <HiOutlineHeart size={18} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blood Group</div>
              <div style={{ fontSize: 'var(--font-base)', color: 'var(--color-gray-800)', fontWeight: 700 }}>
                {student.health?.bloodGroup || 'Not recorded'}
              </div>
            </div>
          </div>

          {/* Health Issues */}
          {hasHealthIssues && (
            <div style={{
              padding: 'var(--space-4)',
              background: '#fffbeb',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #fde68a',
              marginBottom: 'var(--space-4)',
            }}>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
                ⚠ Health Concerns
              </div>
              {diseases.length > 0 && (
                <div style={{ marginBottom: allergies.length > 0 ? 'var(--space-3)' : 0 }}>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)', marginBottom: '4px' }}>Diseases / Conditions</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {diseases.map((d, i) => (
                      <span key={i} style={{
                        padding: '2px 10px', borderRadius: '12px',
                        background: '#fef2f2', border: '1px solid #fecdd3',
                        fontSize: 'var(--font-xs)', color: '#b91c1c', fontWeight: 500,
                      }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {allergies.length > 0 && (
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)', marginBottom: '4px' }}>Allergies</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {allergies.map((a, i) => (
                      <span key={i} style={{
                        padding: '2px 10px', borderRadius: '12px',
                        background: '#fff7ed', border: '1px solid #fed7aa',
                        fontSize: 'var(--font-xs)', color: '#c2410c', fontWeight: 500,
                      }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasHealthIssues && !student.health?.bloodGroup && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-gray-100)',
              marginBottom: 'var(--space-4)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-400)', margin: 0 }}>No health information recorded yet</p>
            </div>
          )}

          {/* Status */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-gray-100)',
            marginBottom: 'var(--space-5)',
          }}>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>Status</span>
            <span className={`badge ${student.status === 'active' ? 'badge-green' : student.status === 'dropped' ? 'badge-red' : 'badge-gray'}`}>
              {student.status}
            </span>
          </div>

          {/* View Full Profile button */}
          <button
            className="btn btn-primary"
            onClick={onViewFull}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            View Full Profile →
          </button>
        </div>
      </div>
    </div>
  );
}
