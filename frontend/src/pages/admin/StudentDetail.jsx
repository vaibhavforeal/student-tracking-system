import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import {
  HiOutlineArrowLeft, HiOutlinePlus, HiOutlineTrash,
  HiOutlineAcademicCap, HiOutlineHeart, HiOutlineUser,
  HiOutlineLightBulb, HiOutlineBookOpen, HiOutlineDocumentText,
} from 'react-icons/hi';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isTeacher = location.pathname.startsWith('/teacher');
  const apiBase = isTeacher ? '/teacher' : '/admin';

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStudent = async () => {
    try {
      const { data } = await client.get(`${apiBase}/students/${id}`);
      setStudent(data.student);
    } catch (err) {
      console.error(err);
      alert('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudent(); }, [id]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  if (!student) return <div className="empty-state"><p>Student not found.</p></div>;

  const goBack = () => navigate(isTeacher ? '/teacher/students' : '/admin/students');

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button className="btn btn-ghost" onClick={goBack}><HiOutlineArrowLeft size={20} /></button>
          <div>
            <h1>{student.firstName} {student.lastName}</h1>
            <p className="page-subtitle">
              <span className="badge badge-sky">{student.enrollmentNo}</span>
              {' '}
              {student.batch?.name} • {student.section?.name} • Sem {student.semester}
            </p>
          </div>
        </div>
        <Link
          to={`${isTeacher ? '/teacher' : '/admin'}/students/${id}/academic`}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <HiOutlineDocumentText /> Academic Record
        </Link>
      </div>

      {/* All Sections */}
      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <div className="card"><div className="card-body"><PersonalTab student={student} /></div></div>
        <div className="card"><div className="card-body"><EducationTab student={student} apiBase={apiBase} refresh={fetchStudent} /></div></div>
        <div className="card"><div className="card-body"><SkillsTab student={student} apiBase={apiBase} refresh={fetchStudent} /></div></div>
        <div className="card"><div className="card-body"><HealthTab student={student} apiBase={apiBase} refresh={fetchStudent} /></div></div>
        <div className="card"><div className="card-body"><ParentsTab student={student} apiBase={apiBase} refresh={fetchStudent} /></div></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Personal Details
   ═══════════════════════════════════════════════════════ */
function PersonalTab({ student }) {
  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>{label}</div>
      <div style={{ fontSize: 'var(--font-base)', color: 'var(--color-gray-800)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
      <Field label="Unique ID" value={student.enrollmentNo} />
      <Field label="Email" value={student.user?.email} />
      <Field label="First Name" value={student.firstName} />
      <Field label="Last Name" value={student.lastName} />
      <Field label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : '—'} />
      <Field label="Gender" value={student.gender} />
      <Field label="Phone" value={student.phone} />
      <Field label="Address" value={student.address} />
      <Field label="Blood Group" value={student.health?.bloodGroup} />
      <Field label="Batch" value={student.batch?.name} />
      <Field label="Section" value={student.section?.name} />
      <Field label="Semester" value={student.semester} />
      <Field label="Department" value={student.batch?.department?.name} />
      <Field label="Degree" value={student.batch?.degree} />
      <Field label="Status" value={<span className={`badge ${student.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{student.status}</span>} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Previous Education
   ═══════════════════════════════════════════════════════ */
function EducationTab({ student, apiBase, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ level: 'sslc_10th', institution: '', board: '', percentage: '', yearOfPass: '' });

  const records = student.previousEducation || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post(`${apiBase}/students/${student.id}/previous-education`, form);
      setShowForm(false);
      setForm({ level: 'sslc_10th', institution: '', board: '', percentage: '', yearOfPass: '' });
      refresh();
    } catch (err) { alert(err.response?.data?.error || 'Error saving education record'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (eduId) => {
    if (!confirm('Delete this education record?')) return;
    try {
      await client.delete(`${apiBase}/students/${student.id}/previous-education/${eduId}`);
      refresh();
    } catch (err) { alert('Error deleting record'); }
  };

  const levelLabel = (level) => level === 'sslc_10th' ? '10th / SSLC' : '12th / PU';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Previous Education</h3>
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
                <option value="sslc_10th">10th / SSLC</option>
                <option value="pu_12th">12th / PU</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Institution / College *</label>
              <input className="form-input" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required placeholder="e.g. St. Joseph's School" />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Board</label>
              <input className="form-input" value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })} placeholder="e.g. CBSE, State Board" />
            </div>
            <div className="form-group">
              <label className="form-label">Percentage *</label>
              <input className="form-input" type="number" step="0.01" min="0" max="100" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} required placeholder="e.g. 85.5" />
            </div>
            <div className="form-group">
              <label className="form-label">Year of Passing *</label>
              <input className="form-input" type="number" min="2000" max="2030" value={form.yearOfPass} onChange={(e) => setForm({ ...form, yearOfPass: e.target.value })} required placeholder="e.g. 2022" />
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
                  <span style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{edu.institution}</span>
                </div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
                  {edu.board && `${edu.board} • `}Percentage: <strong>{parseFloat(edu.percentage).toFixed(1)}%</strong> • Year: {edu.yearOfPass}
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
   TAB: Skills & Interests (Skills + Hobbies + Strengths)
   ═══════════════════════════════════════════════════════ */
function SkillsTab({ student, apiBase, refresh }) {
  const [skillName, setSkillName] = useState('');
  const [hobbyForm, setHobbyForm] = useState({ type: 'hobby', name: '' });
  const [showHobbyForm, setShowHobbyForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const skills = student.skills || [];
  const hobbies = (student.hobbies || []).filter((h) => h.type === 'hobby');
  const strengths = (student.hobbies || []).filter((h) => h.type === 'strength');

  const addSkill = async (e) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    setSaving(true);
    try {
      await client.post(`${apiBase}/students/${student.id}/skills`, { name: skillName.trim(), category: 'General', level: 'beginner' });
      setSkillName('');
      refresh();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const addHobby = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post(`${apiBase}/students/${student.id}/hobbies`, hobbyForm);
      setShowHobbyForm(false);
      setHobbyForm({ type: 'hobby', name: '' });
      refresh();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const deleteSkill = async (skillId) => {
    await client.delete(`${apiBase}/students/${student.id}/skills/${skillId}`);
    refresh();
  };

  const deleteHobby = async (hobbyId) => {
    await client.delete(`${apiBase}/students/${student.id}/hobbies/${hobbyId}`);
    refresh();
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--space-8)' }}>
      {/* Skills */}
      <section>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Skills</h3>
        <form onSubmit={addSkill} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <input className="form-input" value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="e.g. Python, Public Speaking, Excel..." style={{ maxWidth: '320px' }} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !skillName.trim()}><HiOutlinePlus /> Add</button>
        </form>
        {skills.length === 0 ? <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-sm)' }}>No skills added yet.</p> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {skills.map((s) => (
              <span key={s.id} className="badge badge-sky" style={{ gap: 'var(--space-2)', paddingRight: 'var(--space-1)' }}>
                {s.name}
                <button onClick={() => deleteSkill(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'var(--font-sm)', padding: '0 var(--space-1)' }}>×</button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Hobbies & Strengths */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Hobbies & Strengths</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowHobbyForm(!showHobbyForm)}><HiOutlinePlus /> Add</button>
        </div>
        {showHobbyForm && (
          <form onSubmit={addHobby} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={hobbyForm.type} onChange={(e) => setHobbyForm({ ...hobbyForm, type: e.target.value })}>
                  <option value="hobby">Hobby</option>
                  <option value="strength">Strength</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={hobbyForm.name} onChange={(e) => setHobbyForm({ ...hobbyForm, name: e.target.value })} required placeholder="e.g. Reading, Leadership" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowHobbyForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
            </div>
          </form>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          <div>
            <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hobbies</h4>
            {hobbies.length === 0 ? <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-sm)' }}>None added.</p> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {hobbies.map((h) => (
                  <span key={h.id} className="badge badge-sky" style={{ gap: 'var(--space-2)', paddingRight: 'var(--space-1)' }}>
                    {h.name}
                    <button onClick={() => deleteHobby(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'var(--font-sm)', padding: '0 var(--space-1)' }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strengths</h4>
            {strengths.length === 0 ? <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-sm)' }}>None added.</p> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {strengths.map((h) => (
                  <span key={h.id} className="badge badge-purple" style={{ gap: 'var(--space-2)', paddingRight: 'var(--space-1)' }}>
                    {h.name}
                    <button onClick={() => deleteHobby(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'var(--font-sm)', padding: '0 var(--space-1)' }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Health
   ═══════════════════════════════════════════════════════ */
function HealthTab({ student, apiBase, refresh }) {
  const health = student.health || {};
  const [form, setForm] = useState({
    bloodGroup: health.bloodGroup || '',
    diseases: Array.isArray(health.diseases) ? health.diseases.join(', ') : '',
    allergies: Array.isArray(health.allergies) ? health.allergies.join(', ') : '',
    emergencyContactName: health.emergencyContactName || '',
    emergencyContactPhone: health.emergencyContactPhone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.put(`${apiBase}/students/${student.id}/health`, {
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
      <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-5)' }}>Health Information</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Blood Group</label>
            <select className="form-select" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
              <option value="">Select</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
          <label className="form-label">Diseases / Medical Conditions</label>
          <input className="form-input" value={form.diseases} onChange={(e) => setForm({ ...form, diseases: e.target.value })} placeholder="Comma-separated, e.g. Diabetes, Asthma" />
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>Separate multiple entries with commas</span>
        </div>
        <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
          <label className="form-label">Allergies</label>
          <input className="form-input" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Comma-separated, e.g. Peanuts, Dust" />
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
   TAB: Parents
   ═══════════════════════════════════════════════════════ */
function ParentsTab({ student, apiBase, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', relation: '', phone: '', email: '', occupation: '', annualIncome: '' });

  const parents = student.parents || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.post(`${apiBase}/students/${student.id}/parents`, form);
      setShowForm(false);
      setForm({ name: '', relation: '', phone: '', email: '', occupation: '', annualIncome: '' });
      refresh();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (parentId) => {
    if (!confirm('Delete this parent record?')) return;
    await client.delete(`${apiBase}/students/${student.id}/parents/${parentId}`);
    refresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Parent / Guardian Details</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}><HiOutlinePlus /> Add Parent</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Relation *</label>
              <input className="form-input" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} required placeholder="e.g. Father, Mother" />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Occupation</label>
              <input className="form-input" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Annual Income</label>
              <input className="form-input" type="number" value={form.annualIncome} onChange={(e) => setForm({ ...form, annualIncome: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      )}

      {parents.length === 0 ? (
        <div className="empty-state"><p>No parent records added yet.</p></div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {parents.map((p) => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--space-4) var(--space-5)', border: '1px solid var(--color-gray-100)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{p.name} <span className="badge badge-sky" style={{ marginLeft: 'var(--space-2)' }}>{p.relation}</span></div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)', marginTop: 'var(--space-1)' }}>
                  {p.phone} • {p.email} {p.occupation && `• ${p.occupation}`}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)} style={{ color: 'var(--color-danger)' }}><HiOutlineTrash /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


