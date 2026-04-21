import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import {
  HiOutlineAcademicCap, HiOutlineChartBar, HiOutlineClipboardList,
  HiOutlineBookOpen, HiOutlineBadgeCheck, HiOutlineClock,
} from 'react-icons/hi';

export default function AcademicRecord() {
  const params = useParams();
  const user = useAuthStore((s) => s.user);

  const [studentId, setStudentId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [marksData, setMarksData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [activeTab, setActiveTab] = useState('marks');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Resolve student ID
  useEffect(() => {
    if (params.id) {
      // Admin or teacher viewing a specific student
      setStudentId(params.id);
    } else if (user?.role === 'student') {
      // Student viewing own record — need to fetch own student id
      client.get('/student/profile')
        .then(r => setStudentId(r.data.student.id))
        .catch(() => setError('Could not load your profile'));
    }
  }, [params.id, user]);

  // Load summary
  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    client.get(`/academic/students/${studentId}/summary`)
      .then(r => {
        setSummary(r.data);
        setError('');
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load academic data'))
      .finally(() => setLoading(false));
  }, [studentId]);

  // Load marks
  useEffect(() => {
    if (!studentId) return;
    const semParam = selectedSemester ? `?semester=${selectedSemester}` : '';
    client.get(`/academic/students/${studentId}/marks${semParam}`)
      .then(r => setMarksData(r.data))
      .catch(() => {});
  }, [studentId, selectedSemester]);

  // Load attendance
  useEffect(() => {
    if (!studentId) return;
    client.get(`/academic/students/${studentId}/attendance`)
      .then(r => setAttendanceData(r.data))
      .catch(() => {});
  }, [studentId]);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const student = summary?.student;
  const stats = summary?.stats;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <HiOutlineAcademicCap className="page-title-icon" />
            Academic Record
          </h1>
          {student && (
            <p className="page-subtitle">
              {student.firstName} {student.lastName} — {student.enrollmentNo}
              {student.batch && ` · ${student.batch.name} (${student.batch.degree})`}
              {student.section && ` · Section ${student.section.name}`}
            </p>
          )}
        </div>
        {student && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-info">Semester {student.semester}</span>
            <span className={`badge ${student.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
              {student.status}
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard
            icon={<HiOutlineClipboardList />}
            label="Attendance"
            value={`${stats.attendancePercent}%`}
            color={stats.attendancePercent >= 75 ? '#10b981' : stats.attendancePercent >= 60 ? '#f59e0b' : '#ef4444'}
          />
          <StatCard
            icon={<HiOutlineChartBar />}
            label="Avg Marks"
            value={`${stats.avgMarksPercent}%`}
            color={stats.avgMarksPercent >= 60 ? '#10b981' : stats.avgMarksPercent >= 40 ? '#f59e0b' : '#ef4444'}
          />
          <StatCard
            icon={<HiOutlineBookOpen />}
            label="Courses"
            value={stats.totalCourses}
            color="#6366f1"
          />
          <StatCard
            icon={<HiOutlineBadgeCheck />}
            label="Assessments"
            value={stats.totalAssessments}
            color="#8b5cf6"
          />
          <StatCard
            icon={<HiOutlineClock />}
            label="Classes Attended"
            value={`${stats.presentClasses + stats.lateClasses}/${stats.totalClasses}`}
            color="#0ea5e9"
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-nav" style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        <button
          className={`tab-btn ${activeTab === 'marks' ? 'active' : ''}`}
          onClick={() => setActiveTab('marks')}
          style={tabStyle(activeTab === 'marks')}
        >
          <HiOutlineChartBar style={{ marginRight: '0.35rem' }} />
          Marks
        </button>
        <button
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
          style={tabStyle(activeTab === 'attendance')}
        >
          <HiOutlineClipboardList style={{ marginRight: '0.35rem' }} />
          Attendance
        </button>
      </div>

      {/* Marks Tab */}
      {activeTab === 'marks' && marksData && (
        <div>
          {/* Semester filter */}
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label className="form-label" style={{ margin: 0 }}>Filter by Semester:</label>
            <select className="form-select" style={{ width: 'auto' }} value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
              <option value="">All Semesters</option>
              {marksData.semesters?.map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
            <span className="badge badge-ghost">{marksData.totalAssessments} assessment(s)</span>
          </div>

          {marksData.courseMarks?.length > 0 ? (
            marksData.courseMarks.map((cm, i) => (
              <div className="card" key={i} style={{ marginBottom: '1rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>
                      {cm.course.code} — {cm.course.name}
                    </h3>
                    <span className="badge badge-ghost" style={{ marginRight: '0.5rem' }}>Sem {cm.semester}</span>
                    <span className="badge badge-ghost">{cm.course.type}</span>
                    <span className="badge badge-ghost" style={{ marginLeft: '0.5rem' }}>{cm.course.credits} credits</span>
                  </div>
                  <div style={{
                    width: '50px', height: '50px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', color: '#fff',
                    background: cm.averagePercent >= 60 ? 'linear-gradient(135deg, #10b981, #059669)' :
                      cm.averagePercent >= 40 ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                        'linear-gradient(135deg, #ef4444, #dc2626)',
                  }}>
                    {cm.averagePercent}%
                  </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Assessment</th>
                          <th>Obtained</th>
                          <th>Max</th>
                          <th>%</th>
                          <th>Graded By</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cm.assessments.map((a, j) => (
                          <tr key={j}>
                            <td>
                              <span className="badge badge-info">{a.assessmentType}</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{a.marksObtained}</td>
                            <td>{a.maxMarks}</td>
                            <td>
                              <span style={{
                                fontWeight: 600,
                                color: a.percentage >= 60 ? '#10b981' : a.percentage >= 40 ? '#f59e0b' : '#ef4444',
                              }}>
                                {a.percentage}%
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{a.gradedBy}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{a.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="No marks data available for the selected filters." />
          )}
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && attendanceData && (
        <div>
          {/* Course-wise summary */}
          {attendanceData.courseSummary?.length > 0 ? (
            <>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Course-wise Attendance Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {attendanceData.courseSummary.map((cs, i) => (
                  <div className="card" key={i}>
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <h4 style={{ marginBottom: '0.25rem', fontSize: '0.95rem' }}>{cs.courseCode}</h4>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{cs.courseName}</p>
                        </div>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.8rem', color: '#fff',
                          background: cs.percentage >= 75 ? 'linear-gradient(135deg, #10b981, #059669)' :
                            cs.percentage >= 60 ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                              'linear-gradient(135deg, #ef4444, #dc2626)',
                        }}>
                          {cs.percentage}%
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-secondary)', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px', width: `${cs.percentage}%`,
                          background: cs.percentage >= 75 ? '#10b981' : cs.percentage >= 60 ? '#f59e0b' : '#ef4444',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Present: {cs.present}</span>
                        <span>Late: {cs.late}</span>
                        <span>Absent: {cs.absent}</span>
                        <span>Total: {cs.total}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent records table */}
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Recent Attendance Records</h3>
              <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Course</th>
                          <th>Status</th>
                          <th>Marked By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.records?.slice(0, 50).map((r, i) => (
                          <tr key={i}>
                            <td>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td>{r.courseCode} — {r.courseName}</td>
                            <td>
                              <span className={`badge ${r.status === 'present' ? 'badge-success' : r.status === 'late' ? 'badge-warning' : 'badge-danger'}`}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{r.markedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState message="No attendance data available." />
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${color}15`, color, fontSize: '1.5rem', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="card">
      <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
        <HiOutlineAcademicCap style={{ fontSize: '3rem', color: 'var(--text-secondary)', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
      </div>
    </div>
  );
}

function tabStyle(isActive) {
  return {
    padding: '0.75rem 1.25rem',
    border: 'none',
    background: isActive ? 'var(--primary)' : 'transparent',
    color: isActive ? '#fff' : 'var(--text-secondary)',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 400,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  };
}
