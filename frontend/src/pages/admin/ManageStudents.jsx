import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import client from '../../api/client';
import { HiOutlinePlus, HiOutlineEye, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ enrollmentNo: '', email: '', password: '', firstName: '', lastName: '', dob: '', gender: 'male', phone: '', address: '', batchId: '', sectionId: '', semester: '1' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/teacher') ? '/teacher' : '/admin';

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
    setForm({ enrollmentNo: '', email: '', password: '', firstName: '', lastName: '', dob: '', gender: 'male', phone: '', address: '', batchId: batches[0]?.id || '', sectionId: sections[0]?.id || '', semester: '1' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await client.post('/admin/students', form);
      setShowModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || err.response?.data?.message || 'Error creating student'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    await client.delete(`/admin/students/${id}`); fetchData();
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
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`${basePath}/students/${s.id}`)} title="View Details"><HiOutlineEye /></button>
                    {basePath === '/admin' && <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)} style={{ color: 'var(--color-danger)' }}><HiOutlineTrash /></button>}
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header"><h2>Add Student</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
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
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
