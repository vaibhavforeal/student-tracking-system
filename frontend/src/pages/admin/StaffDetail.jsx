import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import {
  HiOutlineArrowLeft, HiOutlinePlus, HiOutlineTrash, HiOutlinePencil,
  HiOutlineUserGroup, HiOutlineAcademicCap, HiOutlineDocumentText,
  HiOutlineDownload, HiOutlineUpload, HiOutlineHeart,
} from 'react-icons/hi';

const EDUCATION_LEVELS = [
  { value: 'bachelors', label: "Bachelor's" },
  { value: 'masters', label: "Master's" },
  { value: 'mphil', label: 'M.Phil' },
  { value: 'phd', label: 'Ph.D' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'other', label: 'Other' },
];

const DOCUMENT_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'degree_certificate', label: 'Degree Certificate' },
  { value: 'experience_certificate', label: 'Experience Certificate' },
  { value: 'other', label: 'Other' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function StaffDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      const { data } = await client.get(`/admin/staff/${id}`);
      setStaff(data.staff);
    } catch (err) {
      console.error(err);
      alert('Failed to load staff details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, [id]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  if (!staff) return <div className="empty-state"><p>Staff member not found.</p></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/admin/staff')}>
            <HiOutlineArrowLeft size={20} />
          </button>
          <div>
            <h1>{staff.user?.name}</h1>
            <p className="page-subtitle">
              <span className="badge badge-purple">{staff.employeeId}</span>
              {' '}
              {staff.designation}
              {staff.department && ` • ${staff.department.name}`}
            </p>
          </div>
        </div>
      </div>

      {/* All Sections */}
      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <div className="card"><div className="card-body"><PersonalSection staff={staff} refresh={fetchStaff} /></div></div>
        <div className="card"><div className="card-body"><HealthSection staff={staff} refresh={fetchStaff} /></div></div>
        <div className="card"><div className="card-body"><EducationSection staff={staff} refresh={fetchStaff} /></div></div>
        <div className="card"><div className="card-body"><DocumentsSection staff={staff} refresh={fetchStaff} /></div></div>
        {staff.classAssignments?.length > 0 && (
          <div className="card"><div className="card-body"><AssignmentsSection staff={staff} /></div></div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Personal Details (editable)
   ═══════════════════════════════════════════════════════ */
function PersonalSection({ staff, refresh }) {
  const pd = staff.personalDetails || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dob: pd.dob ? pd.dob.substring(0, 10) : '',
    gender: pd.gender || '',
    bloodGroup: pd.bloodGroup || '',
    address: pd.address || '',
    city: pd.city || '',
    state: pd.state || '',
    pincode: pd.pincode || '',
    alternatePhone: pd.alternatePhone || '',
    joiningDate: pd.joiningDate ? pd.joiningDate.substring(0, 10) : '',
    emergencyContactName: pd.emergencyContactName || '',
    emergencyContactPhone: pd.emergencyContactPhone || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.put(`/admin/staff/${staff.id}/personal`, form);
      setEditing(false);
      refresh();
    } catch (err) { alert(err.response?.data?.error || 'Error saving personal details'); }
    finally { setSaving(false); }
  };

  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>{label}</div>
      <div style={{ fontSize: 'var(--font-base)', color: 'var(--color-gray-800)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );

  if (!editing) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <HiOutlineUserGroup size={22} style={{ color: 'var(--color-sky-500)' }} />
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Personal Details</h3>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
            <HiOutlinePencil /> Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          <Field label="Employee ID" value={staff.employeeId} />
          <Field label="Email" value={staff.user?.email} />
          <Field label="Phone" value={staff.phone} />
          <Field label="Alternate Phone" value={pd.alternatePhone} />
          <Field label="Date of Birth" value={pd.dob ? new Date(pd.dob).toLocaleDateString() : null} />
          <Field label="Gender" value={pd.gender} />
          <Field label="Blood Group" value={pd.bloodGroup} />
          <Field label="Joining Date" value={pd.joiningDate ? new Date(pd.joiningDate).toLocaleDateString() : null} />
          <Field label="Address" value={pd.address} />
          <Field label="City" value={pd.city} />
          <Field label="State" value={pd.state} />
          <Field label="Pincode" value={pd.pincode} />
          <Field label="Emergency Contact" value={pd.emergencyContactName} />
          <Field label="Emergency Phone" value={pd.emergencyContactPhone} />
          <Field label="Designation" value={staff.designation} />
          <Field label="Department" value={staff.department?.name} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <HiOutlineUserGroup size={22} style={{ color: 'var(--color-sky-500)' }} />
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Edit Personal Details</h3>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Blood Group</label>
            <select className="form-select" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">State</label>
            <input className="form-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" />
          </div>
          <div className="form-group">
            <label className="form-label">Pincode</label>
            <input className="form-input" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Alternate Phone</label>
            <input className="form-input" value={form.alternatePhone} onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })} placeholder="Alternate number" />
          </div>
          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input className="form-input" type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Emergency Contact Name</label>
            <input className="form-input" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} placeholder="e.g. John Doe" />
          </div>
          <div className="form-group">
            <label className="form-label">Emergency Contact Phone</label>
            <input className="form-input" value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} placeholder="e.g. +91-9876543210" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Personal Details'}</button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Health & Conditions
   ═══════════════════════════════════════════════════════ */
function HealthSection({ staff, refresh }) {
  const pd = staff.personalDetails || {};
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: pd.bloodGroup || '',
    diseases: Array.isArray(pd.diseases) ? pd.diseases.join(', ') : '',
    allergies: Array.isArray(pd.allergies) ? pd.allergies.join(', ') : '',
    emergencyContactName: pd.emergencyContactName || '',
    emergencyContactPhone: pd.emergencyContactPhone || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.put(`/admin/staff/${staff.id}/health`, {
        bloodGroup: form.bloodGroup,
        diseases: form.diseases ? form.diseases.split(',').map((s) => s.trim()).filter(Boolean) : [],
        allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
      });
      refresh();
      alert('Health details saved!');
    } catch (err) { alert(err.response?.data?.error || 'Error saving health details'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <HiOutlineHeart size={22} style={{ color: 'var(--color-danger)' }} />
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Health & Conditions</h3>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Blood Group</label>
            <select className="form-select" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
          <label className="form-label">Diseases / Medical Conditions</label>
          <input className="form-input" value={form.diseases} onChange={(e) => setForm({ ...form, diseases: e.target.value })} placeholder="Comma-separated, e.g. Diabetes, Hypertension" />
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>Separate multiple entries with commas</span>
        </div>
        <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
          <label className="form-label">Allergies</label>
          <input className="form-input" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Comma-separated, e.g. Peanuts, Penicillin" />
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>Separate multiple entries with commas</span>
        </div>
        <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Emergency Contact Name</label>
            <input className="form-input" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} placeholder="e.g. John Doe" />
          </div>
          <div className="form-group">
            <label className="form-label">Emergency Contact Phone</label>
            <input className="form-input" value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} placeholder="e.g. +91-9876543210" />
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-5)' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Health Details'}</button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Education History
   ═══════════════════════════════════════════════════════ */
function EducationSection({ staff, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    level: 'bachelors', degree: '', specialization: '', institution: '',
    university: '', yearOfPass: '', percentage: '', grade: '',
  });

  const records = staff.education || [];

  const levelLabel = (level) => EDUCATION_LEVELS.find((l) => l.value === level)?.label || level;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post(`/admin/staff/${staff.id}/education`, form);
      setShowForm(false);
      setForm({ level: 'bachelors', degree: '', specialization: '', institution: '', university: '', yearOfPass: '', percentage: '', grade: '' });
      refresh();
    } catch (err) { alert(err.response?.data?.error || 'Error saving education record'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (eduId) => {
    if (!confirm('Delete this education record?')) return;
    try {
      await client.delete(`/admin/staff/${staff.id}/education/${eduId}`);
      refresh();
    } catch (err) { alert('Error deleting record'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <HiOutlineAcademicCap size={22} style={{ color: 'var(--color-purple-500)' }} />
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Education History</h3>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <HiOutlinePlus /> Add Record
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Level *</label>
              <select className="form-select" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} required>
                {EDUCATION_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Degree *</label>
              <input className="form-input" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} required placeholder="e.g. B.Tech, M.Sc, Ph.D" />
            </div>
            <div className="form-group">
              <label className="form-label">Specialization</label>
              <input className="form-input" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Computer Science" />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Institution *</label>
              <input className="form-input" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required placeholder="e.g. VTU, IIT Bangalore" />
            </div>
            <div className="form-group">
              <label className="form-label">University</label>
              <input className="form-input" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} placeholder="e.g. Visvesvaraya Technological University" />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Year of Passing *</label>
              <input className="form-input" type="number" min="1970" max="2030" value={form.yearOfPass} onChange={(e) => setForm({ ...form, yearOfPass: e.target.value })} required placeholder="e.g. 2018" />
            </div>
            <div className="form-group">
              <label className="form-label">Percentage</label>
              <input className="form-input" type="number" step="0.01" min="0" max="100" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} placeholder="e.g. 85.5" />
            </div>
            <div className="form-group">
              <label className="form-label">Grade / Class</label>
              <input className="form-input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. First Class, Distinction" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      )}

      {records.length === 0 ? (
        <div className="empty-state"><p>No education records added yet.</p></div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {records.map((edu) => (
            <div key={edu.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--space-4) var(--space-5)', border: '1px solid var(--color-gray-100)',
              borderRadius: 'var(--radius-md)', background: 'var(--color-white)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
                  <span className="badge badge-purple">{levelLabel(edu.level)}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{edu.degree}</span>
                  {edu.specialization && <span style={{ color: 'var(--color-gray-500)' }}>({edu.specialization})</span>}
                </div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
                  {edu.institution}
                  {edu.university && ` • ${edu.university}`}
                  {' • '}Year: {edu.yearOfPass}
                  {edu.percentage && ` • ${parseFloat(edu.percentage).toFixed(1)}%`}
                  {edu.grade && ` • ${edu.grade}`}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(edu.id)} style={{ color: 'var(--color-danger)' }}>
                <HiOutlineTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Identity Documents
   ═══════════════════════════════════════════════════════ */
function DocumentsSection({ staff, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'aadhaar', title: '', documentNumber: '' });
  const [file, setFile] = useState(null);

  const documents = staff.documents || [];

  const typeLabel = (type) => DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { alert('Please select a file to upload'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', form.type);
      formData.append('title', form.title);
      if (form.documentNumber) formData.append('documentNumber', form.documentNumber);

      await client.post(`/admin/staff/${staff.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowForm(false);
      setForm({ type: 'aadhaar', title: '', documentNumber: '' });
      setFile(null);
      refresh();
    } catch (err) { alert(err.response?.data?.error || 'Error uploading document'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document? The file will be permanently removed.')) return;
    try {
      await client.delete(`/admin/staff/${staff.id}/documents/${docId}`);
      refresh();
    } catch (err) { alert('Error deleting document'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <HiOutlineDocumentText size={22} style={{ color: 'var(--color-sky-600)' }} />
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Identity Documents</h3>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <HiOutlineUpload /> Upload Document
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Document Type *</label>
              <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Title / Label *</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Aadhaar Card Front" />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Document Number</label>
              <input className="form-input" value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} placeholder="e.g. XXXX-XXXX-XXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">File (JPEG, PNG, PDF — max 10MB) *</label>
              <input
                className="form-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                style={{ padding: 'var(--space-2)' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setFile(null); }}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
      )}

      {documents.length === 0 ? (
        <div className="empty-state"><p>No identity documents uploaded yet.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {documents.map((doc) => (
            <div key={doc.id} style={{
              padding: 'var(--space-4) var(--space-5)',
              border: '1px solid var(--color-gray-100)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-white)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <div>
                  <span className="badge badge-sky" style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>{typeLabel(doc.type)}</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{doc.title}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(doc.id)} style={{ color: 'var(--color-danger)' }}>
                  <HiOutlineTrash />
                </button>
              </div>
              {doc.documentNumber && (
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-1)' }}>
                  No: {doc.documentNumber}
                </div>
              )}
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', marginBottom: 'var(--space-3)' }}>
                {doc.fileName} • {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString()}
              </div>
              <a
                href={`${API_BASE_URL}${doc.fileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}
              >
                <HiOutlineDownload /> View / Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION: Class Assignments (read-only)
   ═══════════════════════════════════════════════════════ */
function AssignmentsSection({ staff }) {
  const assignments = staff.classAssignments || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <HiOutlineAcademicCap size={22} style={{ color: 'var(--color-purple-600)' }} />
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Class Assignments</h3>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Course</th><th>Section</th><th>Batch</th><th>Academic Year</th></tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>
                  <span className="badge badge-purple">{a.course?.code}</span>
                  <span style={{ marginLeft: 'var(--space-2)', fontWeight: 500 }}>{a.course?.name}</span>
                </td>
                <td>{a.section?.name}</td>
                <td>{a.section?.batch?.degree} — {a.section?.batch?.name}</td>
                <td><span className="badge badge-sky">{a.academicYear}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
