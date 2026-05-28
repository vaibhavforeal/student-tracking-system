import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import {
  HiOutlineAcademicCap, HiOutlineChartBar, HiOutlineClipboardList,
  HiOutlineUser, HiOutlineBookOpen, HiOutlineMail, HiOutlinePhone,
  HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineLightBulb,
  HiOutlineChat,
} from 'react-icons/hi';

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          client.get('/student/dashboard-stats'),
          client.get('/student/profile'),
        ]);
        setStats(sRes.data.stats);
        setProfile(pRes.data.student);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const statCards = [
    {
      label: 'Attendance',
      value: `${stats?.attendancePercent || 0}%`,
      icon: HiOutlineClipboardList,
      color: stats?.attendancePercent >= 75 ? 'var(--color-success)' : stats?.attendancePercent >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
      subtitle: `${stats?.presentClasses || 0} of ${stats?.totalClasses || 0} classes`,
    },
    {
      label: 'Avg. Marks',
      value: `${stats?.avgMarksPercent || 0}%`,
      icon: HiOutlineChartBar,
      color: stats?.avgMarksPercent >= 75 ? 'var(--color-success)' : stats?.avgMarksPercent >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
      subtitle: 'Across all assessments',
    },
    {
      label: 'Courses',
      value: stats?.totalCourses || 0,
      icon: HiOutlineBookOpen,
      color: 'var(--color-purple-500)',
      subtitle: 'Enrolled courses',
    },
    {
      label: 'Semester',
      value: stats?.currentSemester || '—',
      icon: HiOutlineAcademicCap,
      color: 'var(--color-sky-500)',
      subtitle: profile?.batch?.degree || 'Current',
    },
  ];

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1>Welcome, {profile?.firstName || user?.name || 'Student'} 👋</h1>
          <p className="page-subtitle">
            {profile?.enrollmentNo && <span className="badge badge-sky" style={{ marginRight: 'var(--space-2)' }}>{profile.enrollmentNo}</span>}
            {profile?.batch?.degree} — {profile?.batch?.name} · {profile?.section?.name}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
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
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', marginTop: 'var(--space-2)' }}>
              {s.subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
        <div className="card" style={{ padding: 'var(--space-6)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={() => navigate('/student/marks')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
            <HiOutlineChartBar size={28} style={{ color: 'var(--color-purple-500)' }} />
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>My Marks</h3>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>View your assessment scores and performance across all courses</p>
        </div>
        <div className="card" style={{ padding: 'var(--space-6)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={() => navigate('/student/attendance')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
            <HiOutlineClipboardList size={28} style={{ color: 'var(--color-sky-500)' }} />
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>My Attendance</h3>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>Check your attendance records and per-course breakdown</p>
        </div>
        <div className="card" style={{ padding: 'var(--space-6)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={() => navigate('/student/profile')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
            <HiOutlineUser size={28} style={{ color: 'var(--color-indigo-500)' }} />
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>My Profile</h3>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>View and verify your personal details, parents &amp; education info</p>
        </div>
        <div className="card" style={{ padding: 'var(--space-6)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={() => navigate('/student/skill-courses')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
            <HiOutlineLightBulb size={28} style={{ color: 'var(--color-warning)' }} />
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Skill Courses</h3>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>Browse and enroll in skill enhancement courses</p>
        </div>
        <div className="card" style={{ padding: 'var(--space-6)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onClick={() => navigate('/student/feedback')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
            <HiOutlineChat size={28} style={{ color: 'var(--color-purple-500)' }} />
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Space for Thought</h3>
          </div>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>Share your feedback, suggestions, or thoughts with the college</p>
        </div>
      </div>

      {/* Profile Summary */}
      {profile && (
        <div className="card">
          <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-gray-100)' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Profile Summary</h3>
          </div>
          <div style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HiOutlineUser size={18} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>Full Name</div>
                  <div style={{ fontWeight: 500 }}>{profile.firstName} {profile.lastName}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HiOutlineMail size={18} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>Email</div>
                  <div style={{ fontWeight: 500 }}>{profile.user?.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HiOutlinePhone size={18} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>Phone</div>
                  <div style={{ fontWeight: 500 }}>{profile.phone || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HiOutlineCalendar size={18} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>Date of Birth</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(profile.dob)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HiOutlineAcademicCap size={18} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>Department</div>
                  <div style={{ fontWeight: 500 }}>{profile.batch?.department?.name || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HiOutlineLocationMarker size={18} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>Address</div>
                  <div style={{ fontWeight: 500 }}>{profile.address || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
