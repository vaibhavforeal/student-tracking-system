import { useState, useEffect } from 'react';
import client from '../../api/client';
import { HiOutlineChartBar, HiOutlineAcademicCap } from 'react-icons/hi';

const perfBadge = (pct) => {
  if (pct >= 75) return { cls: 'badge badge-green', label: 'High' };
  if (pct >= 50) return { cls: 'badge badge-amber', label: 'Mid' };
  return { cls: 'badge badge-red', label: 'Low' };
};

const typeLabel = {
  internal: 'Internal',
  midterm: 'Midterm',
  final: 'Final',
  assignment: 'Assignment',
  lab: 'Lab',
};

export default function MyMarks() {
  const [data, setData] = useState(null);
  const [semester, setSemester] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMarks = async (sem) => {
    setLoading(true);
    try {
      const params = sem ? { semester: sem } : {};
      const { data: d } = await client.get('/student/marks', { params });
      setData(d);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMarks(semester); }, [semester]);

  if (loading && !data) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const courseMarks = data?.courseMarks || [];
  const semesters = data?.semesters || [];

  // Overall average
  const overallAvg = courseMarks.length > 0
    ? Math.round(courseMarks.reduce((s, c) => s + c.averagePercent, 0) / courseMarks.length)
    : 0;
  const overallBadge = perfBadge(overallAvg);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Marks</h1>
          <p className="page-subtitle">View your assessment scores across all courses</p>
        </div>
      </div>

      {/* Filters & Summary Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ minWidth: '200px' }}>
              <label className="form-label">Semester</label>
              <select className="form-select" value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="">All Semesters</option>
                {semesters.map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
                {courseMarks.length} course{courseMarks.length !== 1 ? 's' : ''} · {data?.totalAssessments || 0} assessments
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-gray-700)' }}>Overall:</span>
                <span style={{
                  fontSize: 'var(--font-lg)', fontWeight: 700,
                  color: overallAvg >= 75 ? 'var(--color-success)' : overallAvg >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                }}>
                  {overallAvg}%
                </span>
                <span className={overallBadge.cls}>{overallBadge.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Cards */}
      {loading ? (
        <div className="loading-container"><div className="spinner spinner-lg" /></div>
      ) : courseMarks.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <HiOutlineChartBar size={48} style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }} />
              <p>No marks recorded yet.</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {courseMarks.map((cm, idx) => {
            const badge = perfBadge(cm.averagePercent);
            return (
              <div key={idx} className="card">
                {/* Course Header */}
                <div style={{
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: '1px solid var(--color-gray-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <HiOutlineAcademicCap size={20} style={{ color: 'var(--color-purple-500)' }} />
                    <span className="badge badge-purple">{cm.course.code}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{cm.course.name}</span>
                    <span className="badge badge-gray">Sem {cm.semester}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>Avg:</span>
                    <span style={{
                      fontWeight: 700, fontSize: 'var(--font-lg)',
                      color: cm.averagePercent >= 75 ? 'var(--color-success)' : cm.averagePercent >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                    }}>
                      {cm.averagePercent}%
                    </span>
                    <span className={badge.cls}>{badge.label}</span>
                  </div>
                </div>

                {/* Assessments Table */}
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Assessment</th>
                        <th>Marks Obtained</th>
                        <th>Max Marks</th>
                        <th>Percentage</th>
                        <th>Graded By</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cm.assessments.map((a) => {
                        const aBadge = perfBadge(a.percentage);
                        return (
                          <tr key={a.id}>
                            <td>
                              <span className="badge badge-sky">{typeLabel[a.assessmentType] || a.assessmentType}</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{a.marksObtained}</td>
                            <td>{a.maxMarks}</td>
                            <td>
                              <span style={{
                                fontWeight: 600,
                                color: a.percentage >= 75 ? 'var(--color-success)' : a.percentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                              }}>
                                {a.percentage}%
                              </span>
                            </td>
                            <td style={{ color: 'var(--color-gray-500)' }}>{a.gradedBy}</td>
                            <td style={{ color: 'var(--color-gray-500)', fontStyle: a.remarks ? 'normal' : 'italic' }}>
                              {a.remarks || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
