import { useState, useEffect } from 'react';
import client from '../../api/client';
import { HiOutlineClipboardList, HiOutlineCheck, HiOutlineX, HiOutlineClock } from 'react-icons/hi';

const statusStyles = {
  present: { bg: '#ecfdf5', color: '#16a34a', label: 'Present', Icon: HiOutlineCheck },
  absent: { bg: '#fef2f2', color: '#dc2626', label: 'Absent', Icon: HiOutlineX },
  late: { bg: '#fffbeb', color: '#d97706', label: 'Late', Icon: HiOutlineClock },
};

export default function MyAttendance() {
  const [data, setData] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = {};
      if (courseId) params.courseId = courseId;
      if (month) params.month = month;
      const { data: d } = await client.get('/student/attendance', { params });
      setData(d);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAttendance(); }, [courseId, month]);

  if (loading && !data) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const records = data?.records || [];
  const courseSummary = data?.courseSummary || [];
  const courses = data?.courses || [];

  const totalAll = courseSummary.reduce((s, c) => s + c.total, 0);
  const presentAll = courseSummary.reduce((s, c) => s + c.present, 0);
  const absentAll = courseSummary.reduce((s, c) => s + c.absent, 0);
  const lateAll = courseSummary.reduce((s, c) => s + c.late, 0);
  const overallPct = totalAll > 0 ? Math.round(((presentAll + lateAll) / totalAll) * 100) : 0;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Attendance</h1>
          <p className="page-subtitle">Track your attendance across all courses</p>
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { val: totalAll, label: 'Total Classes', color: 'var(--color-gray-900)' },
          { val: presentAll, label: 'Present', color: '#16a34a' },
          { val: absentAll, label: 'Absent', color: '#dc2626' },
          { val: lateAll, label: 'Late', color: '#d97706' },
        ].map((c) => (
          <div key={c.label} className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: c.color }}>{c.val}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)' }}>{c.label}</div>
          </div>
        ))}
        <div className="card" style={{
          padding: 'var(--space-4)', textAlign: 'center',
          background: overallPct >= 75 ? '#ecfdf5' : overallPct >= 50 ? '#fffbeb' : '#fef2f2',
        }}>
          <div style={{
            fontSize: 'var(--font-2xl)', fontWeight: 700,
            color: overallPct >= 75 ? '#16a34a' : overallPct >= 50 ? '#d97706' : '#dc2626',
          }}>{overallPct}%</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)' }}>Overall %</div>
        </div>
      </div>

      {/* Per-Course Breakdown */}
      {courseSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-gray-100)' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Per-Course Breakdown</h3>
          </div>
          <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {courseSummary.map((cs) => (
              <div key={cs.courseId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ minWidth: '180px', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className="badge badge-purple">{cs.courseCode}</span>
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>{cs.courseName}</span>
                </div>
                <div style={{ flex: 1, height: 10, borderRadius: 'var(--radius-full)', background: 'var(--color-gray-100)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${cs.percentage}%`, height: '100%', borderRadius: 'var(--radius-full)',
                    background: cs.percentage >= 75 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : cs.percentage >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, minWidth: 45, textAlign: 'right', color: cs.percentage >= 75 ? '#16a34a' : cs.percentage >= 50 ? '#d97706' : '#dc2626' }}>{cs.percentage}%</span>
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', minWidth: 80, textAlign: 'right' }}>{cs.present + cs.late}/{cs.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Filter by Course</label>
              <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">All Courses</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Filter by Month</label>
              <input className="form-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      {loading ? (
        <div className="loading-container"><div className="spinner spinner-lg" /></div>
      ) : records.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state"><HiOutlineClipboardList size={48} style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }} /><p>No attendance records found.</p></div></div></div>
      ) : (
        <div className="card">
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Attendance Records</h3>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>{records.length} records</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>#</th><th>Date</th><th>Course</th><th style={{ textAlign: 'center' }}>Status</th><th>Marked By</th></tr></thead>
              <tbody>
                {records.map((r, i) => {
                  const st = statusStyles[r.status] || statusStyles.present;
                  return (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                      <td><span className="badge badge-purple">{r.courseCode}</span> <span style={{ fontSize: 'var(--font-sm)' }}>{r.courseName}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: st.bg, color: st.color, padding: '3px 14px', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: 'var(--font-xs)' }}>
                          <st.Icon size={14} /> {st.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-sm)' }}>{r.markedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
