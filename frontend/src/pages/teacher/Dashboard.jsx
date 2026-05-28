import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import {
  HiOutlineAcademicCap, HiOutlineClipboardList, HiOutlineChartBar,
  HiOutlineUserGroup, HiOutlineBookOpen,
} from 'react-icons/hi';

export default function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [sRes, aRes] = await Promise.all([
          client.get('/teacher/dashboard-stats'),
          client.get('/teacher/my-courses'),
        ]);
        setStats(sRes.data.stats);
        setAssignments(aRes.data.assignments);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const statCards = [
    { label: 'Sections', value: stats?.totalSections || 0, icon: HiOutlineClipboardList, color: 'var(--color-sky-500)' },
    { label: 'Courses', value: stats?.totalCourses || 0, icon: HiOutlineBookOpen, color: 'var(--color-purple-500)' },
    { label: 'Students', value: stats?.totalStudents || 0, icon: HiOutlineAcademicCap, color: 'var(--color-sky-600)' },
    { label: 'Assignments', value: stats?.totalAssignments || 0, icon: HiOutlineUserGroup, color: 'var(--color-purple-600)' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.name || 'Teacher'}</h1>
          <p className="page-subtitle">Here's an overview of your assigned classes</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
        {statCards.map((s) => (
          <div key={s.label} className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={24} style={{ color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>{s.value}</div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
        <div className="card" style={{ padding: 'var(--space-6)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={() => navigate('/teacher/attendance')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
            <HiOutlineClipboardList size={28} style={{ color: 'var(--color-sky-500)' }} />
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Mark Attendance</h3>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>Record daily attendance for your assigned classes</p>
        </div>
        <div className="card" style={{ padding: 'var(--space-6)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={() => navigate('/teacher/marks')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
            <HiOutlineChartBar size={28} style={{ color: 'var(--color-purple-500)' }} />
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Grade Students</h3>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>Enter marks for assessments, exams, and assignments</p>
        </div>
      </div>

      {/* My Courses Table */}
      <div className="card">
        <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>My Assigned Courses</h3>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Section</th>
                <th>Batch</th>
                <th>Academic Year</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan="4"><div className="empty-state"><p>No courses assigned yet. Contact admin.</p></div></td></tr>
              ) : assignments.map((a) => (
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
    </div>
  );
}
