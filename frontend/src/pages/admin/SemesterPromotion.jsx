import { useState, useEffect } from 'react';
import client from '../../api/client';
import { HiOutlineArrowUp, HiOutlineAcademicCap, HiOutlineUserGroup, HiOutlineExclamation } from 'react-icons/hi';

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

  // Load batches on mount
  useEffect(() => {
    client.get('/admin/batches').then(r => setBatches(r.data.batches)).catch(() => {});
  }, []);

  // Load sections when batch changes
  useEffect(() => {
    if (batchId) {
      client.get(`/admin/sections?batchId=${batchId}`).then(r => setSections(r.data.sections)).catch(() => {});
    } else {
      setSections([]);
    }
    setSectionId('');
    setPreview(null);
    setResult(null);
  }, [batchId]);

  // Auto-set toSemester when fromSemester changes
  useEffect(() => {
    if (fromSemester) {
      setToSemester(String(parseInt(fromSemester) + 1));
    }
    setPreview(null);
    setResult(null);
  }, [fromSemester]);

  const handlePreview = async () => {
    if (!batchId || !fromSemester || !toSemester) {
      setError('Please select batch and semesters');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await client.post('/admin/students/promote?dryRun=true', {
        batchId, sectionId: sectionId || undefined, fromSemester, toSemester,
      });
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to preview');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!batchId || !fromSemester || !toSemester) return;
    setLoading(true);
    setError('');
    try {
      const res = await client.post('/admin/students/promote', {
        batchId, sectionId: sectionId || undefined, fromSemester, toSemester, autoGraduate,
      });
      setResult(res.data);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Promotion failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedBatch = batches.find(b => b.id === batchId);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <HiOutlineArrowUp className="page-title-icon" />
            Semester Promotion
          </h1>
          <p className="page-subtitle">Promote students from one semester to the next</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Promotion Criteria</h3>
        </div>
        <div className="card-body">
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Batch */}
            <div className="form-group">
              <label className="form-label">Batch *</label>
              <select className="form-select" value={batchId} onChange={e => setBatchId(e.target.value)}>
                <option value="">Select Batch</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.degree} ({b.department?.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Section (optional) */}
            <div className="form-group">
              <label className="form-label">Section (optional)</label>
              <select className="form-select" value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!batchId}>
                <option value="">All Sections</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* From Semester */}
            <div className="form-group">
              <label className="form-label">From Semester *</label>
              <select className="form-select" value={fromSemester} onChange={e => setFromSemester(e.target.value)}>
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            {/* To Semester */}
            <div className="form-group">
              <label className="form-label">To Semester *</label>
              <select className="form-select" value={toSemester} onChange={e => setToSemester(e.target.value)}>
                <option value="">Select</option>
                {[2, 3, 4, 5, 6, 7, 8, 9].filter(s => s > parseInt(fromSemester || '0')).map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-graduate checkbox */}
          {parseInt(toSemester) > 8 && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="autoGraduate"
                checked={autoGraduate}
                onChange={e => setAutoGraduate(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="autoGraduate" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                Auto-mark as graduated (semester {toSemester} exceeds typical 8-semester limit)
              </label>
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
              <HiOutlineExclamation /> {error}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={handlePreview} disabled={loading || !batchId || !fromSemester || !toSemester}>
              {loading && !preview ? 'Loading...' : 'Preview Students'}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      {preview && preview.students && preview.students.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">
              <HiOutlineUserGroup style={{ marginRight: '0.5rem' }} />
              Preview — {preview.eligible} student(s) eligible
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-info">
                Sem {preview.fromSemester} → Sem {preview.toSemester}
              </span>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Enrollment No</th>
                    <th>Name</th>
                    <th>Batch</th>
                    <th>Section</th>
                    <th>Current Sem</th>
                    <th>→ New Sem</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.students.map((s, i) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td><span className="badge badge-ghost">{s.enrollmentNo}</span></td>
                      <td>{s.firstName} {s.lastName}</td>
                      <td>{s.batch?.name}</td>
                      <td>{s.section?.name}</td>
                      <td><span className="badge badge-warning">Sem {s.semester}</span></td>
                      <td><span className="badge badge-success">Sem {preview.toSemester}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card-body" style={{ borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handlePromote} disabled={loading}>
              <HiOutlineArrowUp style={{ marginRight: '0.25rem' }} />
              {loading ? 'Promoting...' : `Promote ${preview.eligible} Student(s)`}
            </button>
          </div>
        </div>
      )}

      {preview && preview.students && preview.students.length === 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <HiOutlineAcademicCap style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No active students found in semester {fromSemester} for the selected batch.</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary, #8b5cf6))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <HiOutlineArrowUp style={{ fontSize: '1.75rem', color: '#fff' }} />
            </div>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Promotion Complete!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{result.message}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="stat-card" style={{ minWidth: '120px' }}>
                <div className="stat-value">{result.promoted}</div>
                <div className="stat-label">Students Promoted</div>
              </div>
              <div className="stat-card" style={{ minWidth: '120px' }}>
                <div className="stat-value">{result.fromSemester} → {result.toSemester}</div>
                <div className="stat-label">Semester Change</div>
              </div>
              {result.graduated && (
                <div className="stat-card" style={{ minWidth: '120px' }}>
                  <div className="stat-value">✓</div>
                  <div className="stat-label">Marked Graduated</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
