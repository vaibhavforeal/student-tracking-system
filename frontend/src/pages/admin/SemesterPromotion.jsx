import { useState, useEffect } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import client from '../../api/client';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar } from '../../components/ui/DesignHelpers';

export default function SemesterPromotion() {
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [fromSemester, setFromSemester] = useState('');
  const [toSemester, setToSemester] = useState('');
  const [autoGraduate, setAutoGraduate] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { client.get('/admin/batches').then(r => setBatches(r.data.batches)).catch(() => {}); }, []);
  useEffect(() => { if (batchId) { client.get(`/admin/sections?batchId=${batchId}`).then(r => setSections(r.data.sections)).catch(() => {}); } else { setSections([]); } setSectionId(''); setPreview(null); setResult(null); }, [batchId]);
  useEffect(() => { if (fromSemester) setToSemester(String(parseInt(fromSemester) + 1)); setPreview(null); setResult(null); }, [fromSemester]);

  const handlePreview = async () => {
    if (!batchId || !fromSemester || !toSemester) { setError('Please select batch and semesters'); return; }
    setLoading(true); setError(''); setResult(null);
    try { const res = await client.post('/admin/students/promote?dryRun=true', { batchId, sectionId: sectionId || undefined, fromSemester, toSemester }); setPreview(res.data); }
    catch (err) { setError(err.response?.data?.error || 'Failed to preview'); } finally { setLoading(false); }
  };

  const handlePromote = async () => {
    if (!batchId || !fromSemester || !toSemester) return; setLoading(true); setError('');
    try { const res = await client.post('/admin/students/promote', { batchId, sectionId: sectionId || undefined, fromSemester, toSemester, autoGraduate }); setResult(res.data); setPreview(null); }
    catch (err) { setError(err.response?.data?.error || 'Promotion failed'); } finally { setLoading(false); }
  };

  return (
    <div className="rd-content-inner">
      <PageHead title="Semester Promotion" sub="Promote students from one semester to the next" />

      {/* Criteria Card */}
      <div className="rd-card rd-card-pad fade-up" style={{ marginBottom: 'var(--gap)' }}>
        <div className="rd-card-title" style={{ marginBottom: 16 }}>Promotion Criteria</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Batch *</label>
            <select className="form-select" value={batchId} onChange={e => setBatchId(e.target.value)}>
              <option value="">Select Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.degree} ({b.department?.name})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Section (optional)</label>
            <select className="form-select" value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!batchId}>
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">From Semester *</label>
            <select className="form-select" value={fromSemester} onChange={e => setFromSemester(e.target.value)}>
              <option value="">Select</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">To Semester *</label>
            <select className="form-select" value={toSemester} onChange={e => setToSemester(e.target.value)}>
              <option value="">Select</option>
              {[2,3,4,5,6,7,8,9].filter(s => s > parseInt(fromSemester || '0')).map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>

        {parseInt(toSemester) > 8 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', fontSize: 14, color: 'var(--muted)' }}>
            <input type="checkbox" checked={autoGraduate} onChange={e => setAutoGraduate(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            Auto-mark as graduated (semester {toSemester} exceeds 8-semester limit)
          </label>
        )}

        {error && <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--bad-soft)', color: 'var(--bad)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} /> {error}</div>}

        <div style={{ marginTop: 16 }}>
          <button className="rd-btn rd-btn-ghost" onClick={handlePreview} disabled={loading || !batchId || !fromSemester || !toSemester}>
            {loading && !preview ? 'Loading…' : 'Preview Students'}
          </button>
        </div>
      </div>

      {/* Preview Table */}
      {preview && preview.students && preview.students.length > 0 && (
        <div className="rd-card fade-up" style={{ marginBottom: 'var(--gap)' }}>
          <div className="rd-card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="rd-card-title">
              <Icon name="users" style={{ width: 16, height: 16, marginRight: 8 }} /> Preview — {preview.eligible} student(s) eligible
            </div>
            <span className="rd-badge" style={{ color: 'var(--info)', background: 'var(--info-soft)' }}>Sem {preview.fromSemester} → Sem {preview.toSemester}</span>
          </div>
          <div className="rd-table-wrap">
            <table className="rd-tbl">
              <thead><tr><th>#</th><th>Student</th><th>Batch</th><th>Section</th><th>Current</th><th>→ New</th></tr></thead>
              <tbody>
                {preview.students.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--faint)', fontSize: 13 }}>{i + 1}</td>
                    <td>
                      <div className="rd-cell-name">
                        <MiniAvatar name={`${s.firstName} ${s.lastName}`} size={30} />
                        <div>
                          <div className="rd-name-main">{s.firstName} {s.lastName}</div>
                          <div className="rd-name-sub">{s.enrollmentNo}</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.batch?.name}</td>
                    <td>{s.section?.name}</td>
                    <td><span className="rd-badge" style={{ color: 'var(--warn)', background: 'var(--warn-soft)' }}>Sem {s.semester}</span></td>
                    <td><span className="rd-badge" style={{ color: 'var(--good)', background: 'var(--good-soft)' }}>Sem {preview.toSemester}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="rd-btn rd-btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
            <button className="rd-btn rd-btn-primary" onClick={handlePromote} disabled={loading}>
              <Icon name="arrowUp" style={{ width: 15, height: 15 }} /> {loading ? 'Promoting…' : `Promote ${preview.eligible} Student(s)`}
            </button>
          </div>
        </div>
      )}

      {preview && preview.students && preview.students.length === 0 && (
        <div className="rd-card rd-card-pad fade-up" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Icon name="cap" style={{ width: 48, height: 48, margin: '0 auto 16px', display: 'block', opacity: 0.4, color: 'var(--faint)' }} />
          <p style={{ color: 'var(--faint)' }}>No active students found in semester {fromSemester} for the selected batch.</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rd-card rd-card-pad fade-up" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 99, background: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <Icon name="arrowUp" style={{ color: '#fff', width: 26, height: 26 }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>Promotion Complete!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>{result.message}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '12px 24px', background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', minWidth: 120 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{result.promoted}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Promoted</div>
            </div>
            <div style={{ padding: '12px 24px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', minWidth: 120 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>{result.fromSemester} → {result.toSemester}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Semester Change</div>
            </div>
            {result.graduated && (
              <div style={{ padding: '12px 24px', background: 'var(--good-soft)', borderRadius: 'var(--r-md)', minWidth: 120 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--good)' }}><Check size={24} /></div>
                <div style={{ fontSize: 12, color: 'var(--good)', fontWeight: 600 }}>Graduated</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
