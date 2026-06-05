import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import BarcodeGenerator from '../../components/BarcodeGenerator';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar, DeptTag, Meter, StatusBadge, initials, hueFor, StatTile } from '../../components/ui/DesignHelpers';
import * as XLSX from 'xlsx';

const API_BASE = 'http://localhost:5000';

const STATUS_TABS = ['all', 'active', 'inactive', 'graduated'];

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
  const [statusTab, setStatusTab] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [drawerStudent, setDrawerStudent] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/teacher') ? '/teacher' : '/admin';
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importHeaders, setImportHeaders] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const importFileRef = useRef(null);

  // Bulk barcode print state
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  const fetchData = useCallback(async () => {
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
  }, [page, filterBatch, search, basePath]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => { setPage(1); fetchData(); };

  const openCreate = () => {
    setForm({ enrollmentNo: '', email: '', firstName: '', lastName: '', dob: '', gender: 'male', phone: '', address: '', batchId: batches[0]?.id || '', sectionId: sections[0]?.id || '', semester: '1', photoUrl: '' });
    setPhotoPreview(null);
    setShowModal(true);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await client.post('/admin/upload/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((prev) => ({ ...prev, photoUrl: data.photoUrl }));
    } catch {
      alert('Failed to upload photo. Please try again.');
      setPhotoPreview(null);
    } finally { setUploadingPhoto(false); }
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
      setDeleteTarget(null); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete student'); }
    finally { setDeleting(false); }
  };

  // ─── Bulk Import Handlers ──────────────────────────────────
  const openImportModal = () => { setShowImportModal(true); setImportStep(1); setImportFile(null); setImportPreview([]); setImportHeaders([]); setImportResult(null); setDragOver(false); };
  const handleImportFileSelect = (file) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { alert('Please select a CSV, XLS, or XLSX file'); return; }
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if (!rows.length) { alert('No data rows found'); setImportFile(null); return; }
        setImportHeaders(Object.keys(rows[0]));
        setImportPreview(rows);
        setImportStep(2);
      } catch { alert('Failed to parse file'); setImportFile(null); }
    };
    reader.readAsArrayBuffer(file);
  };
  const handleImportDrop = (e) => { e.preventDefault(); setDragOver(false); handleImportFileSelect(e.dataTransfer?.files?.[0]); };
  const handleImportSubmit = async () => {
    if (!importFile) return; setImporting(true);
    try {
      const fd = new FormData(); fd.append('file', importFile);
      const { data } = await client.post('/admin/students/bulk-import', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
      setImportResult({ success: true, data }); setImportStep(3); fetchData();
    } catch (err) {
      const d = err.response?.data;
      setImportResult({ success: false, data: d?.errors ? d : { error: d?.error || err.message || 'Import failed' } }); setImportStep(3);
    } finally { setImporting(false); }
  };
  const downloadTemplate = async (fmt) => {
    try {
      const { data } = await client.get(`/admin/students/sample-template?format=${fmt}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = `student_import_template.${fmt}`; a.click(); window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download template'); }
  };
  const formatFileSize = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

  useEffect(() => {
    if (location.state?.openAddModal) { openCreate(); navigate(location.pathname, { replace: true, state: {} }); }
    else if (location.state?.openImportModal) { openImportModal(); navigate(location.pathname, { replace: true, state: {} }); }
    else if (location.state?.openBarcodeModal) { setShowBarcodeModal(true); navigate(location.pathname, { replace: true, state: {} }); }
  }, [location.state, navigate, location.pathname]);

  // Filter by status tab
  const filteredStudents = statusTab === 'all' ? students : students.filter(s => s.status === statusTab);
  const statusCounts = { all: students.length, active: students.filter(s => s.status === 'active').length, inactive: students.filter(s => s.status === 'inactive').length, graduated: students.filter(s => s.status === 'graduated').length };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="rd-content-inner">
      <PageHead title="Students" sub={basePath === '/teacher' ? 'View your assigned students' : 'Manage student records'}>
        {basePath === '/admin' && (
          <>
            <button className="rd-btn rd-btn-ghost" onClick={() => setShowBarcodeModal(true)}>
              <Icon name="printer" /> Print Barcodes
            </button>
            <button className="rd-btn rd-btn-ghost" onClick={openImportModal}>
              <Icon name="upload" /> Import
            </button>
            <button className="rd-btn rd-btn-primary" onClick={openCreate}>
              <Icon name="plus" /> Add Student
            </button>
          </>
        )}
      </PageHead>

      {/* ─── Stat tiles ─── */}
      <div className="rd-stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '20px' }}>
        <StatTile icon="cap" label="Active Students" value={statusCounts.active}
          tint="var(--good)" soft="var(--good-soft)" delay={0} />
        <StatTile icon="cap" label="Inactive" value={statusCounts.inactive}
          tint="var(--warn)" soft="var(--warn-soft)" delay={60} />
      </div>

      {/* ─── Toolbar ─── */}
      <div className="rd-toolbar">
        <div className="rd-seg">
          {STATUS_TABS.map(tab => (
            <button key={tab} className={statusTab === tab ? 'on' : ''} onClick={() => setStatusTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{statusCounts[tab]}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div className="rd-search">
          <Icon name="search" />
          <input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <kbd>⏎</kbd>
        </div>
        <select className="rd-chip-select" value={filterBatch} onChange={e => { setFilterBatch(e.target.value); setPage(1); }}>
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.degree} — {b.name}</option>)}
        </select>
      </div>

      {/* ─── Table ─── */}
      <div className="rd-card fade-up">
        <div className="rd-table-wrap">
          <table className="rd-tbl">
            <thead>
              <tr>
                <th>Student</th>
                <th>Department</th>
                <th>Batch / Section</th>
                <th>Semester</th>
                <th>Attendance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><p>No students found.</p></div></td></tr>
              ) : filteredStudents.map(s => (
                <tr key={s.id} onClick={() => setDrawerStudent(s)}>
                  <td>
                    <div className="rd-cell-name">
                      <MiniAvatar name={`${s.firstName} ${s.lastName}`} />
                      <div>
                        <div className="rd-name-main">{s.firstName} {s.lastName}</div>
                        <div className="rd-name-sub">{s.enrollmentNo}</div>
                      </div>
                    </div>
                  </td>
                  <td><DeptTag code={s.batch?.department?.code || s.batch?.degree || '—'} /></td>
                  <td>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.batch?.name || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--faint)' }}>{s.section?.name || '—'}</div>
                  </td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Sem {s.semester}</span></td>
                  <td style={{ minWidth: 140 }}><Meter value={s.attendancePercentage ?? 0} /></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div className="rd-row-act" style={{ justifyContent: 'flex-end', opacity: 1 }}>
                      <button className="rd-icon-btn" onClick={() => setDrawerStudent(s)} title="Quick View"><Icon name="eye" /></button>
                      <button className="rd-icon-btn" onClick={() => navigate(`${basePath}/students/${s.id}`)} title="Full Details"><Icon name="edit" /></button>
                      {basePath === '/admin' && <button className="rd-icon-btn" onClick={() => setDeleteTarget(s.id)} title="Delete" style={{ color: 'var(--bad)' }}><Icon name="trash" /></button>}
                    </div>
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

      {/* ═══ STUDENT DRAWER ═══ */}
      {drawerStudent && (
        <>
          <div className="rd-scrim" onClick={() => setDrawerStudent(null)} />
          <div className="rd-drawer">
            <div className="rd-drawer-hero">
              <button onClick={() => setDrawerStudent(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 99, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}>
                <Icon name="x" style={{ width: 16, height: 16 }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, border: '2px solid rgba(255,255,255,.4)', overflow: 'hidden', background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}>
                  {drawerStudent.photoUrl ? (
                    <img src={`${API_BASE}${drawerStudent.photoUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>{initials(drawerStudent.firstName, drawerStudent.lastName)}</span>
                  )}
                </div>
                <div>
                  <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>{drawerStudent.firstName} {drawerStudent.lastName}</h2>
                  <div style={{ marginTop: 6, display: 'inline-block', background: 'rgba(255,255,255,.2)', padding: '3px 12px', borderRadius: 20, fontSize: 13, color: '#fff', fontWeight: 600 }}>
                    {drawerStudent.enrollmentNo}
                  </div>
                </div>
              </div>
            </div>
            <div className="rd-drawer-body">
              <div className="rd-kv-grid" style={{ marginBottom: 20 }}>
                <div><div className="rd-kv-k">Batch</div><div className="rd-kv-v">{drawerStudent.batch?.degree || drawerStudent.batch?.name || '—'}</div></div>
                <div><div className="rd-kv-k">Section</div><div className="rd-kv-v">{drawerStudent.section?.name || '—'}</div></div>
                <div><div className="rd-kv-k">Semester</div><div className="rd-kv-v">Sem {drawerStudent.semester}</div></div>
                <div><div className="rd-kv-k">Department</div><div className="rd-kv-v">{drawerStudent.batch?.department?.name || '—'}</div></div>
                <div><div className="rd-kv-k">Email</div><div className="rd-kv-v" style={{ fontSize: 13 }}>{drawerStudent.email || '—'}</div></div>
                <div><div className="rd-kv-k">Phone</div><div className="rd-kv-v">{drawerStudent.phone || '—'}</div></div>
                <div><div className="rd-kv-k">Blood Group</div><div className="rd-kv-v">{drawerStudent.health?.bloodGroup || 'N/A'}</div></div>
                <div><div className="rd-kv-k">Status</div><div className="rd-kv-v"><StatusBadge status={drawerStudent.status} /></div></div>
              </div>
              <button className="rd-btn rd-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setDrawerStudent(null); navigate(`${basePath}/students/${drawerStudent.id}`); }}>
                View Full Profile →
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ CREATE STUDENT MODAL ═══ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header"><h2>Add Student</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-2)' }}>
                  <div onClick={() => fileInputRef.current?.click()} style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', border: '3px dashed var(--color-gray-200)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: photoPreview ? 'none' : 'var(--color-gray-100)', transition: 'all var(--transition-fast)', position: 'relative' }}>
                    {photoPreview ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <HiOutlineCamera size={24} style={{ color: 'var(--color-gray-400)' }} />}
                    {uploadingPhoto && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  <div>
                    <p style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 4 }}>Student Photo</p>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', lineHeight: 1.4 }}>Click the circle to upload.<br />JPG, PNG, or WebP • Max 5MB</p>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Unique ID</label><input className="form-input" value={form.enrollmentNo} onChange={e => setForm({ ...form, enrollmentNo: e.target.value })} required placeholder="e.g. 2024CSE001" /></div>
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">First Name</label><input className="form-input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Last Name</label><input className="form-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} required /><span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', marginTop: 4, display: 'block' }}>Default password will be DOB (DDMMYYYY)</span></div>
                  <div className="form-group"><label className="form-label">Gender</label><select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Semester</label><input className="form-input" type="number" min="1" max="8" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Batch</label><select className="form-select" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })} required><option value="">Select Batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.degree} — {b.name}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Section</label><select className="form-select" value={form.sectionId} onChange={e => setForm({ ...form, sectionId: e.target.value })} required><option value="">Select Section</option>{sections.filter(s => !form.batchId || s.batchId === form.batchId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
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

      <ConfirmDialog open={!!deleteTarget} title="Delete Student?" message="This will soft-delete the student and deactivate their user account." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />

      {/* ═══ BULK IMPORT MODAL ═══ */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => !importing && setShowImportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header"><h2>Import Students</h2><button className="btn btn-ghost" onClick={() => !importing && setShowImportModal(false)} disabled={importing}><X size={20} /></button></div>
            <div className="import-steps">
              <div className={`import-step ${importStep === 1 ? 'active' : importStep > 1 ? 'completed' : ''}`}><span className="import-step-number">{importStep > 1 ? <HiOutlineCheckCircle size={16} /> : '1'}</span><span>Upload</span></div>
              <div className={`import-step-connector ${importStep > 1 ? 'active' : ''}`} />
              <div className={`import-step ${importStep === 2 ? 'active' : importStep > 2 ? 'completed' : ''}`}><span className="import-step-number">{importStep > 2 ? <HiOutlineCheckCircle size={16} /> : '2'}</span><span>Preview</span></div>
              <div className={`import-step-connector ${importStep > 2 ? 'active' : ''}`} />
              <div className={`import-step ${importStep === 3 ? 'active' : ''}`}><span className="import-step-number">3</span><span>Result</span></div>
            </div>
            <div className="modal-body">
              {importStep === 1 && (
                <div>
                  <div className={`import-dropzone ${dragOver ? 'drag-over' : ''}`} onClick={() => importFileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleImportDrop}>
                    <div className="import-dropzone-icon"><Icon name="upload" style={{ width: 28, height: 28 }} /></div>
                    <div className="import-dropzone-text"><strong>Click to upload</strong> or drag and drop<br />CSV, XLS, or XLSX • Max 500 rows • 10MB limit</div>
                    <input type="file" ref={importFileRef} accept=".csv,.xlsx,.xls" onChange={e => handleImportFileSelect(e.target.files[0])} style={{ display: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-5)' }}>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', fontWeight: 500 }}>Need a template? Download one below:</div>
                    <div className="import-sample-buttons">
                      <button className="btn-sample" onClick={() => downloadTemplate('xlsx')}><Icon name="download" style={{ width: 14, height: 14 }} /> XLSX</button>
                      <button className="btn-sample" onClick={() => downloadTemplate('csv')}><Icon name="download" style={{ width: 14, height: 14 }} /> CSV</button>
                    </div>
                  </div>
                </div>
              )}
              {importStep === 2 && !importing && (
                <div>
                  {importFile && (
                    <div className="import-file-info" style={{ marginBottom: 'var(--space-4)' }}>
                      <div className="file-icon"><Icon name="report" /></div>
                      <div className="file-details"><div className="file-name">{importFile.name}</div><div className="file-size">{formatFileSize(importFile.size)}</div></div>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setImportStep(1); setImportFile(null); setImportPreview([]); }}><Icon name="x" style={{ width: 14, height: 14 }} /></button>
                    </div>
                  )}
                  <div className="import-preview-count">Found <strong>{importPreview.length}</strong> student{importPreview.length !== 1 ? 's' : ''} to import{importPreview.length > 10 && <span> (showing first 10)</span>}</div>
                  <div className="import-preview-wrapper">
                    <table className="import-preview-table">
                      <thead><tr><th>#</th>{importHeaders.map(h => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>{importPreview.slice(0, 10).map((row, i) => (<tr key={i}><td style={{ color: 'var(--color-gray-400)', fontWeight: 600 }}>{i + 1}</td>{importHeaders.map(h => <td key={h}>{String(row[h] || '')}</td>)}</tr>))}</tbody>
                    </table>
                  </div>
                </div>
              )}
              {importStep === 2 && importing && (
                <div className="import-loading"><div className="spinner spinner-lg" /><div className="import-loading-text">Importing {importPreview.length} students...</div></div>
              )}
              {importStep === 3 && importResult && (
                <div className="import-result">
                  {importResult.success ? (
                    <><div className="import-result-icon success"><HiOutlineCheckCircle /></div><h3>Import Successful!</h3><p>{importResult.data.message}</p></>
                  ) : (
                    <><div className="import-result-icon error"><HiOutlineExclamationCircle /></div><h3>{importResult.data.errors ? 'Validation Failed' : 'Import Failed'}</h3>
                      <p>{importResult.data.errors ? `${importResult.data.errorCount} error(s) in ${importResult.data.totalRows} rows.` : importResult.data.error}</p>
                      {importResult.data.errors && (<div className="import-errors-list">{importResult.data.errors.map((err, i) => (<div key={i} className="import-error-item"><span className="import-error-row">Row {err.row}</span><span className="import-error-field">{err.field}</span><span>{err.message}</span></div>))}</div>)}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {importStep === 1 && <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>}
              {importStep === 2 && !importing && (<><button className="btn btn-secondary" onClick={() => { setImportStep(1); setImportFile(null); setImportPreview([]); }}>Back</button><button className="btn btn-primary" onClick={handleImportSubmit}><Icon name="upload" style={{ width: 14, height: 14 }} /> Import {importPreview.length} Student{importPreview.length !== 1 ? 's' : ''}</button></>)}
              {importStep === 3 && (<>{!importResult?.success && <button className="btn btn-secondary" onClick={() => { setImportStep(1); setImportFile(null); setImportPreview([]); setImportResult(null); }}>Try Again</button>}<button className="btn btn-primary" onClick={() => setShowImportModal(false)}>Done</button></>)}
            </div>
          </div>
        </div>
      )}

      {/* ═══ BULK BARCODE PRINT MODAL ═══ */}
      {showBarcodeModal && (
        <div className="modal-overlay" onClick={() => setShowBarcodeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header no-print"><h2>Print Barcodes</h2><button className="btn btn-ghost" onClick={() => setShowBarcodeModal(false)}><X size={20} /></button></div>
            <div className="modal-body">
              <p className="no-print" style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
                Generating barcodes for <strong>{students.length}</strong> student{students.length !== 1 ? 's' : ''} on the current page.
              </p>
              <div className="barcode-print-grid" id="barcode-bulk-print-area">
                {students.map(s => (
                  <div key={s.id} className="barcode-strip">
                    <div className="barcode-strip-name">{s.firstName} {s.lastName}</div>
                    <BarcodeGenerator value={s.enrollmentNo} width={1.5} height={40} displayValue fontSize={10} />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer no-print">
              <button className="btn btn-secondary" onClick={() => setShowBarcodeModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}><Icon name="printer" style={{ width: 14, height: 14 }} /> Print All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
