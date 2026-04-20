import { useState, useEffect } from 'react';
import client from '../../api/client';
import {
  HiOutlinePaperAirplane, HiOutlineCheck, HiOutlineExclamation,
  HiOutlineRefresh, HiOutlineFilter,
} from 'react-icons/hi';

export default function WhatsAppSend() {
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [waStatus, setWaStatus] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Check WhatsApp status on mount
  useEffect(() => {
    client.get('/whatsapp/status').then(({ data }) => setWaStatus(data));
    client.get('/admin/batches').then(({ data }) => setBatches(data.batches || []));
  }, []);

  // Load sections when batch changes
  useEffect(() => {
    if (!selectedBatch) { setSections([]); return; }
    client.get('/admin/sections').then(({ data }) => {
      const filtered = (data.sections || []).filter((s) => s.batchId === selectedBatch);
      setSections(filtered);
    });
    setSelectedSection('');
    setStudents([]);
    setSelectedStudents([]);
  }, [selectedBatch]);

  // Load students when section changes
  useEffect(() => {
    if (!selectedSection) { setStudents([]); return; }
    client.get(`/admin/students?sectionId=${selectedSection}&limit=200`).then(({ data }) => {
      setStudents(data.students || []);
    });
    setSelectedStudents([]);
    setResults(null);
  }, [selectedSection]);

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedStudents.length === students.length) setSelectedStudents([]);
    else setSelectedStudents(students.map((s) => s.id));
  };

  const handleSendBulk = async () => {
    if (selectedStudents.length === 0) { alert('Please select at least one student'); return; }
    if (!confirm(`Send attendance reports via WhatsApp for ${selectedStudents.length} student(s)?`)) return;

    setSending(true);
    setResults(null);
    setProgress({ current: 0, total: selectedStudents.length });

    try {
      const { data } = await client.post('/whatsapp/send-attendance-bulk', {
        studentIds: selectedStudents,
      });
      setResults(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send messages');
    } finally {
      setSending(false);
    }
  };

  const handleSendSingle = async (studentId) => {
    setSending(true);
    try {
      const { data } = await client.post(`/whatsapp/send-attendance/${studentId}`);
      alert(`Sent to ${data.results?.length || 0} parent(s) — Overall: ${data.overallAttendance}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const getParentPhones = (student) => {
    return (student.parents || []).map((p) => p.phone).join(', ') || 'No parents';
  };

  if (waStatus && !waStatus.configured) {
    return (
      <div>
        <div className="page-header"><h1>WhatsApp Attendance</h1></div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <HiOutlineExclamation size={48} style={{ color: 'var(--color-warning)', marginBottom: 'var(--space-4)' }} />
            <h2 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-gray-700)' }}>WhatsApp Not Configured</h2>
            <p style={{ color: 'var(--color-gray-500)', maxWidth: '500px', margin: '0 auto' }}>
              WhatsApp API credentials are not set up yet. Please add your <strong>WHATSAPP_PHONE_NUMBER_ID</strong> and <strong>WHATSAPP_ACCESS_TOKEN</strong> to the <code>.env</code> file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>WhatsApp Attendance</h1>
          <p className="page-subtitle">Send attendance reports to parents via WhatsApp</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <HiOutlineFilter size={18} style={{ color: 'var(--color-sky-500)' }} />
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>Select Students</h3>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Batch</label>
              <select className="form-select" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.degree})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-select" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedBatch}>
                <option value="">Select Section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {students.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>
                {students.length} Students • {selectedStudents.length} Selected
              </h3>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
                  {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  className="btn btn-sm"
                  onClick={handleSendBulk}
                  disabled={sending || selectedStudents.length === 0}
                  style={{
                    background: '#25D366', color: '#fff', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    opacity: sending || selectedStudents.length === 0 ? 0.5 : 1,
                  }}
                >
                  {sending ? <HiOutlineRefresh className="spin" /> : <HiOutlinePaperAirplane />}
                  {sending ? 'Sending...' : `Send to ${selectedStudents.length} Student(s)`}
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === students.length && students.length > 0}
                        onChange={toggleAll}
                      />
                    </th>
                    <th>Enrollment</th>
                    <th>Name</th>
                    <th>Semester</th>
                    <th>Parent Phones</th>
                    <th style={{ width: '100px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                        />
                      </td>
                      <td><span className="badge badge-sky">{s.enrollmentNo}</span></td>
                      <td style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</td>
                      <td>{s.semester}</td>
                      <td style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
                        {getParentPhones(s)}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleSendSingle(s.id)}
                          disabled={sending}
                          title="Send to this student's parents"
                          style={{ color: '#25D366' }}
                        >
                          <HiOutlinePaperAirplane />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
              Send Results
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <div style={{
                padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: 'var(--color-sky-600)' }}>{results.totalStudents}</div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>Students</div>
              </div>
              <div style={{
                padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: '#16a34a' }}>{results.totalMessagesSent}</div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>Messages Sent</div>
              </div>
              <div style={{
                padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
                background: results.totalFailed > 0
                  ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)'
                  : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: results.totalFailed > 0 ? '#dc2626' : 'var(--color-gray-400)' }}>{results.totalFailed}</div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>Failed</div>
              </div>
            </div>

            {results.details && results.details.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Enrollment</th>
                    <th>Sent</th>
                    <th>Failed</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.details.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{d.studentName}</td>
                      <td><span className="badge badge-sky">{d.enrollmentNo}</span></td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{d.parentsSent}</td>
                      <td style={{ color: d.parentsFailed > 0 ? '#dc2626' : 'var(--color-gray-400)', fontWeight: 600 }}>{d.parentsFailed}</td>
                      <td>
                        {d.parentsSent > 0 ? (
                          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <HiOutlineCheck size={14} /> Sent
                          </span>
                        ) : (
                          <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <HiOutlineExclamation size={14} /> No Parents
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
