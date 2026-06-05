import { useState, useEffect } from 'react';
import client from '../../api/client';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar } from '../../components/ui/DesignHelpers';

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

  useEffect(() => {
    client.get('/whatsapp/status').then(({ data }) => setWaStatus(data));
    client.get('/admin/batches').then(({ data }) => setBatches(data.batches || []));
  }, []);

  useEffect(() => { if (!selectedBatch) { setSections([]); return; } client.get('/admin/sections').then(({ data }) => setSections((data.sections || []).filter(s => s.batchId === selectedBatch))); setSelectedSection(''); setStudents([]); setSelectedStudents([]); }, [selectedBatch]);
  useEffect(() => { if (!selectedSection) { setStudents([]); return; } client.get(`/admin/students?sectionId=${selectedSection}&limit=200`).then(({ data }) => setStudents(data.students || [])); setSelectedStudents([]); setResults(null); }, [selectedSection]);

  const toggleStudent = (id) => setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const toggleAll = () => { if (selectedStudents.length === students.length) setSelectedStudents([]); else setSelectedStudents(students.map(s => s.id)); };

  const handleSendBulk = async () => {
    if (selectedStudents.length === 0) return alert('Select at least one student');
    if (!confirm(`Send attendance reports via WhatsApp for ${selectedStudents.length} student(s)?`)) return;
    setSending(true); setResults(null);
    try { const { data } = await client.post('/whatsapp/send-attendance-bulk', { studentIds: selectedStudents }); setResults(data); }
    catch (err) { alert(err.response?.data?.error || 'Failed to send'); } finally { setSending(false); }
  };

  const handleSendSingle = async (studentId) => {
    setSending(true);
    try { const { data } = await client.post(`/whatsapp/send-attendance/${studentId}`); alert(`Sent to ${data.results?.length || 0} parent(s) — Overall: ${data.overallAttendance}`); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); } finally { setSending(false); }
  };

  const getParentPhones = (s) => (s.parents || []).map(p => p.phone).join(', ') || 'No parents';

  if (waStatus && !waStatus.configured) {
    return (
      <div className="rd-content-inner">
        <PageHead title="WhatsApp Attendance" sub="Send attendance reports to parents" />
        <div className="rd-card rd-card-pad fade-up" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Icon name="alertTriangle" style={{ width: 48, height: 48, color: 'var(--warn)', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>WhatsApp Not Configured</h2>
          <p style={{ color: 'var(--muted)', maxWidth: 500, margin: '0 auto', fontSize: 14 }}>
            Add your <strong>WHATSAPP_PHONE_NUMBER_ID</strong> and <strong>WHATSAPP_ACCESS_TOKEN</strong> to the <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>.env</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rd-content-inner">
      <PageHead title="WhatsApp Attendance" sub="Send attendance reports to parents via WhatsApp" />

      {/* Filters */}
      <div className="rd-card rd-card-pad fade-up" style={{ marginBottom: 'var(--gap)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="filter" style={{ width: 16, height: 16, color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Select Students</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Batch</label>
            <select className="form-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
              <option value="">Select Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.degree})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <select className="form-select" value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedBatch}>
              <option value="">Select Section</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {students.length > 0 && (
        <div className="rd-card fade-up" style={{ marginBottom: 'var(--gap)' }}>
          <div className="rd-card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{students.length} Students · {selectedStudents.length} Selected</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="rd-btn rd-btn-ghost rd-btn-sm" onClick={toggleAll}>{selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}</button>
              <button className="rd-btn rd-btn-sm" onClick={handleSendBulk} disabled={sending || selectedStudents.length === 0}
                style={{ background: '#25D366', color: '#fff', border: 'none', opacity: sending || selectedStudents.length === 0 ? 0.5 : 1 }}>
                <Icon name="whatsapp" style={{ width: 15, height: 15 }} /> {sending ? 'Sending…' : `Send to ${selectedStudents.length}`}
              </button>
            </div>
          </div>
          <div className="rd-table-wrap">
            <table className="rd-tbl">
              <thead><tr><th style={{ width: 40 }}><input type="checkbox" checked={selectedStudents.length === students.length && students.length > 0} onChange={toggleAll} style={{ accentColor: 'var(--accent)' }} /></th><th>Student</th><th>Sem</th><th>Parent Phones</th><th style={{ width: 80 }}>Send</th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td><input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} style={{ accentColor: 'var(--accent)' }} /></td>
                    <td>
                      <div className="rd-cell-name">
                        <MiniAvatar name={`${s.firstName} ${s.lastName}`} size={30} />
                        <div>
                          <div className="rd-name-main">{s.firstName} {s.lastName}</div>
                          <div className="rd-name-sub">{s.enrollmentNo}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="rd-badge" style={{ color: 'var(--info)', background: 'var(--info-soft)' }}>Sem {s.semester}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{getParentPhones(s)}</td>
                    <td>
                      <button className="rd-icon-btn" onClick={() => handleSendSingle(s.id)} disabled={sending} title="Send to parents" style={{ color: '#25D366' }}>
                        <Icon name="whatsapp" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="rd-card fade-up">
          <div className="rd-card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="rd-card-title">Send Results</div>
          </div>
          <div className="rd-card-pad">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={{ textAlign: 'center', padding: '14px 12px', background: 'var(--info-soft)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--info)' }}>{results.totalStudents}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Students</div>
              </div>
              <div style={{ textAlign: 'center', padding: '14px 12px', background: 'var(--good-soft)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--good)' }}>{results.totalMessagesSent}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Sent</div>
              </div>
              <div style={{ textAlign: 'center', padding: '14px 12px', background: results.totalFailed > 0 ? 'var(--bad-soft)' : 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: results.totalFailed > 0 ? 'var(--bad)' : 'var(--faint)' }}>{results.totalFailed}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Failed</div>
              </div>
            </div>

            {results.details?.length > 0 && (
              <div className="rd-table-wrap">
                <table className="rd-tbl">
                  <thead><tr><th>Student</th><th>ID</th><th>Sent</th><th>Failed</th><th>Status</th></tr></thead>
                  <tbody>
                    {results.details.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{d.studentName}</td>
                        <td><span className="rd-badge rd-badge-id">{d.enrollmentNo}</span></td>
                        <td style={{ color: 'var(--good)', fontWeight: 600 }}>{d.parentsSent}</td>
                        <td style={{ color: d.parentsFailed > 0 ? 'var(--bad)' : 'var(--faint)', fontWeight: 600 }}>{d.parentsFailed}</td>
                        <td>
                          {d.parentsSent > 0 ? <span className="rd-badge" style={{ color: 'var(--good)', background: 'var(--good-soft)' }}><Icon name="check" style={{ width: 13, height: 13 }} /> Sent</span>
                          : <span className="rd-badge" style={{ color: 'var(--bad)', background: 'var(--bad-soft)' }}><Icon name="alertTriangle" style={{ width: 13, height: 13 }} /> No Parents</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
