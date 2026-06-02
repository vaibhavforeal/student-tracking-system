import { useState, useEffect } from 'react';
import client from '../../api/client';
import {
  GraduationCap, Users, Building2, BookOpen, Briefcase, Layers, ClipboardList
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await client.get('/admin/dashboard/stats');
        setStats(data.stats);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  }

  const statCards = [
    { label: 'Total Students', value: stats?.totalStudents || 0, icon: GraduationCap, color: 'sky' },
    { label: 'Total Staff', value: stats?.totalStaff || 0, icon: Users, color: 'purple' },
    { label: 'Departments', value: stats?.totalDepartments || 0, icon: Building2, color: 'green' },
    { label: 'Courses', value: stats?.totalCourses || 0, icon: BookOpen, color: 'amber' },
    { label: 'Batches', value: stats?.totalBatches || 0, icon: Layers, color: 'purple' },
    { label: 'Sections', value: stats?.totalSections || 0, icon: ClipboardList, color: 'sky' },
    { label: 'Active Students', value: stats?.activeStudents || 0, icon: GraduationCap, color: 'green' },
    { label: 'Inactive Students', value: stats?.inactiveStudents || 0, icon: GraduationCap, color: 'amber' },
    { label: 'Total Alumni', value: stats?.totalAlumni || 0, icon: Briefcase, color: 'purple' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="page-subtitle">Overview of your institution</p>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`stat-icon ${card.color}`}>
              <card.icon className="idata" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <a href="/admin/students" className="btn btn-primary">Manage Students</a>
          <a href="/admin/staff" className="btn btn-secondary">Manage Staff</a>
          <a href="/admin/departments" className="btn btn-secondary">Departments</a>
          <a href="/admin/courses" className="btn btn-secondary">Courses</a>
        </div>
      </div>
    </div>
  );
}
