import { useState, useEffect } from 'react';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/ui/Icon';
import { AreaChart, MiniBars } from '../../components/ui/DesignCharts';
import { StatTile } from '../../components/ui/DesignHelpers';
import { deptColor } from '../../components/ui/DesignUtils';

/* ─── Mock chart data (until backend endpoints are added) ─── */
const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const ATTENDANCE_TREND = [82, 79, 83, 85, 81, 78, 84, 88, 86, 83, 87, 91];
const GRADE_DIST = [
  { grade: 'A+', value: 18, color: 'good' },
  { grade: 'A', value: 42 },
  { grade: 'B+', value: 35 },
  { grade: 'B', value: 28 },
  { grade: 'C', value: 14 },
  { grade: 'F', value: 4, color: 'low' },
];

function timeAgo(dateString) {
  if (!dateString) return '';
  const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return 'Yesterday';
  return `${Math.floor(diff / 86400)} days ago`;
}
const DEADLINES = [
  { title: 'Semester Registration', sub: 'B.Tech Sem 6 — CSE, ECE', due: 'Tomorrow', urgent: true },
  { title: 'Faculty Evaluation Forms', sub: 'All departments', due: 'Jun 15' },
  { title: 'Alumni Meet Preparation', sub: 'Batch 2020-24', due: 'Jun 28' },
  { title: 'Course Curriculum Review', sub: 'MECH, CIVIL', due: 'Jul 5' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [deptStudents, setDeptStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await client.get('/admin/dashboard/stats');
        setStats(data.stats);
        setRecentActivity(data.recentActivity || []);
        setDeptStudents(data.deptStudents || []);
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const maxDept = Math.max(...deptStudents.map(d => d.count), 1);

  return (
    <div className="rd-content-inner">
      {/* ─── Greeting ─── */}
      <div className="rd-section-head fade-up">
        <div>
          <h1>{greeting}, {user?.name?.split(' ')[0] || 'Admin'}</h1>
          <p>{dateStr}</p>
        </div>
      </div>

      {/* ─── Stat tiles ─── */}
      <div className="rd-stat-grid">
        <StatTile icon="cap" label="Total Students" value={stats?.totalStudents || 0}
          delta="+12" up tint="var(--accent)" soft="var(--accent-soft)" delay={0} />
        <StatTile icon="users" label="Active Staff" value={stats?.totalStaff || 0}
          tint="var(--info)" soft="var(--info-soft)" delay={60} />
        <StatTile icon="building" label="Departments" value={stats?.totalDepartments || 0}
          tint="var(--warn)" soft="var(--warn-soft)" delay={120} />
        <StatTile icon="briefcase" label="Alumni" value={stats?.totalAlumni || 0}
          tint="#9b3d8f" soft="rgba(155,61,143,.08)" delay={180} />
      </div>

      {/* ─── Charts row — matches prototype 1.6fr / 1fr ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
        {/* Attendance trend — wide card */}
        <div className="rd-card fade-up" style={{ animationDelay: '200ms' }}>
          <div className="rd-card-head">
            <div>
              <div className="rd-card-title">Attendance trend</div>
              <div className="rd-card-sub">Institution-wide · last 12 months</div>
            </div>
            <div className="rd-seg"><button className="on">Year</button><button>Quarter</button></div>
          </div>
          <div className="rd-card-pad" style={{ paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-1px' }}>
                {Math.round(ATTENDANCE_TREND.reduce((a, b) => a + b, 0) / ATTENDANCE_TREND.length)}%
              </span>
              <span className="rd-stat-delta up"><Icon name="arrowUp" style={{ width: 13, height: 13 }} />4.1% vs last yr</span>
            </div>
            <AreaChart data={ATTENDANCE_TREND} height={92} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {MONTHS.map(m => <span key={m} style={{ fontSize: 10.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>{m}</span>)}
            </div>
          </div>
        </div>

        {/* Grade distribution — narrower card */}
        <div className="rd-card fade-up" style={{ animationDelay: '260ms' }}>
          <div className="rd-card-head">
            <div>
              <div className="rd-card-title">Grade distribution</div>
              <div className="rd-card-sub">Current semester</div>
            </div>
          </div>
          <div className="rd-card-pad" style={{ paddingTop: 12 }}>
            <MiniBars data={GRADE_DIST} height={92} />
          </div>
        </div>
      </div>

      {/* ─── Lower grid — 3 equal columns ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--gap)' }}>
        {/* Students by dept */}
        <div className="rd-card fade-up" style={{ animationDelay: '320ms' }}>
          <div className="rd-card-head"><div className="rd-card-title">Students by department</div></div>
          <div style={{ padding: '14px 0 10px' }}>
            {deptStudents.map(d => (
              <div className="rd-deptbar-row" key={d.code}>
                <span className="rd-dept-tag"><span className="rd-dept-swatch" style={{ background: deptColor(d.code) }} />{d.code}</span>
                <div className="rd-deptbar-track"><div className="rd-deptbar-fill" style={{ width: `${(d.count / maxDept) * 100}%`, background: deptColor(d.code) }} /></div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>{d.count}</span>
              </div>
            ))}
            {deptStudents.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, marginTop: 10 }}>No department data</div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rd-card fade-up" style={{ animationDelay: '380ms' }}>
          <div className="rd-card-head"><div className="rd-card-title">Recent activity</div></div>
          <div className="rd-panel-list" style={{ marginTop: 10 }}>
            {recentActivity.map((act, i) => (
              <div className="rd-act-row" key={i}>
                <div className="rd-act-ico" style={{ background: act.bg, color: act.fg }}>
                  <Icon name={act.icon} />
                </div>
                <div>
                  <div className="rd-act-txt" dangerouslySetInnerHTML={{ __html: act.text }} />
                  <div className="rd-act-time">{timeAgo(act.createdAt)}</div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>No recent activity</div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="rd-card fade-up" style={{ animationDelay: '440ms' }}>
          <div className="rd-card-head"><div className="rd-card-title">Upcoming</div></div>
          <div className="rd-panel-list" style={{ marginTop: 10 }}>
            {DEADLINES.map((dl, i) => (
              <div className={`rd-deadline ${dl.urgent ? 'urgent' : ''}`} key={i}>
                <div className="rd-deadline-bar" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{dl.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>{dl.sub}</div>
                </div>
                <div className="rd-deadline-due">{dl.due}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
