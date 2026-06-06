import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar, hueFor, StatTile } from '../../components/ui/DesignHelpers';
import { AreaChart, Donut } from '../../components/ui/StudentCharts';

/* ── Static demo data (schedule & deadlines — no backend API yet) ── */
const DEMO_SCHEDULE = [
  { id: 's1', start: '09:00', end: '10:00', name: 'Operating Systems', code: 'CS302', room: 'Room 304', kind: 'Lecture', faculty: 'Dr. R. Iyer', status: 'done' },
  { id: 's2', start: '11:00', end: '13:00', name: 'Data Structures Lab', code: 'CS301L', room: 'Lab 2', kind: 'Lab', faculty: 'Dr. P. Menon', status: 'now' },
  { id: 's3', start: '14:00', end: '15:00', name: 'Computer Networks', code: 'CS304', room: 'Room 210', kind: 'Lecture', faculty: 'Dr. S. Banerjee', status: 'upcoming' },
  { id: 's4', start: '15:00', end: '16:00', name: 'Technical Communication', code: 'HS301', room: 'Room 118', kind: 'Tutorial', faculty: 'Ms. A. Fernandes', status: 'upcoming' },
];

const DEMO_FEED = [
  { title: 'Assignment due — submit on portal', sub: 'Computer Networks', due: 'Tomorrow', urgent: true, ico: 'upload', tint: 'var(--bad)', soft: 'var(--bad-soft)' },
  { title: 'End-Sem exam timetable published', sub: 'Examinations cell', due: 'in 3 days', urgent: true, ico: 'cal', tint: 'var(--info)', soft: 'var(--info-soft)' },
  { title: 'Lab record submission', sub: 'Database Management Systems', due: 'in 4 days', urgent: false, ico: 'book', tint: 'var(--accent)', soft: 'var(--accent-soft)' },
  { title: 'Skill course: enrol for AI Workshop', sub: 'Skill Courses · 12 seats left', due: 'in 6 days', urgent: false, ico: 'bulb', tint: 'var(--warn)', soft: 'var(--warn-soft)' },
];

/* ── Course spine colors ── */
const COURSE_COLORS = ['#5b54e6', '#19a89a', '#3b7ec9', '#c98a1e', '#9b3d8f', '#2f9968', '#d2553f'];

/* ── Greeting time of day ── */
function greetWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ════════════════ ATTENDANCE CARD ════════════════ */
function AttendanceCard({ stats }) {
  const value = stats?.attendancePercent || 0;
  const present = stats?.presentClasses || 0;
  const absent = stats?.absentClasses || 0;
  const total = stats?.totalClasses || 0;

  // Generate a pseudo attendance trend from the current value
  const attTrend = Array.from({ length: 8 }, (_, i) => Math.max(50, value - 4 + Math.round(Math.sin(i) * 3 + i * 0.5)));

  return (
    <div className="rd-card rd-card-pad fade-up" style={{ animationDelay: '0ms' }}>
      <div className="rd-card-head" style={{ marginBottom: 8 }}>
        <div><div className="rd-card-title">My attendance</div><div className="rd-card-sub">{present} of {total} classes</div></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Donut value={value} size={94} stroke={11} color="var(--good)" label="Overall" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
          <div className="s-att-legend-row"><span className="s-att-dot" style={{ background: 'var(--good)' }} /><span className="s-dl-v">{present}</span><span className="s-dl-k">Present</span></div>
          <div className="s-att-legend-row"><span className="s-att-dot" style={{ background: 'var(--bad)' }} /><span className="s-dl-v">{absent}</span><span className="s-dl-k">Absent</span></div>
          <div className="s-att-legend-row"><span className="s-att-dot" style={{ background: 'var(--border-2)' }} /><span className="s-dl-v">75%</span><span className="s-dl-k">Required</span></div>
        </div>
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="s-dl-k">Last 8 weeks</span>
          <span className="rd-stat-delta up"><Icon name="arrowUp" style={{ width: 12, height: 12 }} />stable</span>
        </div>
        <AreaChart data={attTrend} height={56} accentVar="var(--good)" />
      </div>
    </div>
  );
}

/* ════════════════ INFORMATIVE STAT TILES ════════════════ */
function StatTiles({ stats, courseMarks }) {
  // Marks trend — derive from courseMarks averages or use pseudo data
  const marksTrend = courseMarks?.length > 0
    ? courseMarks.slice(0, 8).map(cm => cm.averagePercent || 50)
    : [72, 75, 74, 78, 77, 80, 79, stats?.avgMarksPercent || 70];

  const bestCourse = courseMarks?.length > 0
    ? courseMarks.reduce((best, cm) => cm.averagePercent > (best?.averagePercent || 0) ? cm : best, null)
    : null;

  const totalCourses = stats?.totalCourses || 0;
  // Approximate total credits
  const totalCredits = courseMarks?.reduce((s, cm) => s + (cm.course?.credits || 3), 0) || totalCourses * 3;

  // CGPA trend — placeholder
  const cgpaTrend = [7.6, 7.9, 8.0, 8.1, 8.2, 8.4];
  const cgpaVal = cgpaTrend[cgpaTrend.length - 1];
  const cgMax = Math.max(...cgpaTrend), cgMin = Math.min(...cgpaTrend);

  return (
    <div className="s-dash-stats-row">
      {/* Avg. Marks — sparkline */}
      <div className="rd-stat s-info-stat fade-up" style={{ animationDelay: '0ms' }}>
        <div className="rd-stat-top">
          <div className="rd-stat-ico" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="report" /></div>
          {stats?.avgMarksPercent > 0 && <div className="rd-stat-delta up"><Icon name="arrowUp" style={{ width: 12, height: 12 }} />+3.4%</div>}
        </div>
        <div className="rd-stat-val">{stats?.avgMarksPercent || 0}%</div>
        <div className="rd-stat-label">Average marks</div>
        <div className="s-stat-viz"><AreaChart data={marksTrend} height={46} accentVar="var(--accent)" /></div>
        <div className="s-stat-foot">
          <span>Best</span>
          <b>{bestCourse ? <><span className="mono">{bestCourse.course?.code}</span> · {bestCourse.averagePercent}%</> : '—'}</b>
        </div>
      </div>

      {/* Enrolled Courses — credit segments */}
      <div className="rd-stat s-info-stat fade-up" style={{ animationDelay: '55ms' }}>
        <div className="rd-stat-top">
          <div className="rd-stat-ico" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}><Icon name="book" /></div>
          <div className="rd-stat-delta up">{totalCredits} cr</div>
        </div>
        <div className="rd-stat-val">{totalCourses}</div>
        <div className="rd-stat-label">Enrolled courses</div>
        <div className="s-stat-viz" style={{ display: 'flex', alignItems: 'flex-end', height: 46 }}>
          <div className="s-cred-bar">
            {(courseMarks || []).map((cm, i) =>
              <span key={cm.course?.id || i} title={`${cm.course?.code} · ${cm.course?.credits || 3} cr`}
                style={{ flex: cm.course?.credits || 3, background: COURSE_COLORS[i % COURSE_COLORS.length] }} />
            )}
            {(!courseMarks || courseMarks.length === 0) && <span style={{ flex: 1, background: 'var(--surface-3)' }} />}
          </div>
        </div>
        <div className="s-stat-foot">
          <span>Credit load</span>
          <b>{totalCredits} of 24</b>
        </div>
      </div>

      {/* CGPA — semester bars */}
      <div className="rd-stat s-info-stat fade-up" style={{ animationDelay: '110ms' }}>
        <div className="rd-stat-top">
          <div className="rd-stat-ico" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}><Icon name="award" /></div>
          <div className="rd-stat-delta up"><Icon name="arrowUp" style={{ width: 12, height: 12 }} />+0.2</div>
        </div>
        <div className="rd-stat-val">{cgpaVal}</div>
        <div className="rd-stat-label">Cumulative GPA</div>
        <div className="s-stat-viz s-mini-bars" style={{ height: 46 }}>
          {cgpaTrend.map((v, i) => {
            const h = 30 + ((v - cgMin) / ((cgMax - cgMin) || 1)) * 70;
            const last = i === cgpaTrend.length - 1;
            return <span key={i} title={`Sem ${i + 1} · ${v.toFixed(1)}`} style={{ height: `${h}%`, background: last ? 'var(--warn)' : 'var(--warn-soft)' }} />;
          })}
        </div>
        <div className="s-stat-foot">
          <span>Sem 1 → {cgpaTrend.length}</span>
          <b className="up">Rising</b>
        </div>
      </div>
    </div>
  );
}

/* ════════════════ TODAY'S SCHEDULE ════════════════ */
function ScheduleCard() {
  const schedule = DEMO_SCHEDULE;
  return (
    <div className="rd-card fade-up" style={{ animationDelay: '120ms' }}>
      <div className="rd-card-head">
        <div><div className="rd-card-title">Today's classes</div><div className="rd-card-sub">{todayLabel()} · {schedule.length} sessions</div></div>
        <span className="rd-card-link" style={{ cursor: 'pointer' }}>Full timetable <Icon name="chevR" style={{ width: 14, height: 14 }} /></span>
      </div>
      <div className="s-sched" style={{ marginTop: 10 }}>
        {schedule.map(s => (
          <div className={`s-sched-row ${s.status}`} key={s.id}>
            <div className="s-sched-time">{s.start}<span>{s.end}</span></div>
            <div className="s-sched-rail">
              <div className="s-sched-name">{s.name}</div>
              <div className="s-sched-meta">
                <span style={{ fontFamily: 'var(--font-mono)' }}>{s.code}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="pin" />{s.room}</span>
                <span>{s.kind} · {s.faculty}</span>
              </div>
            </div>
            <div>
              {s.status === 'now' && <span className="s-now-pill">Now</span>}
              {s.status === 'done' && <span className="rd-badge rd-badge-active"><Icon name="check" style={{ width: 12, height: 12 }} /> Attended</span>}
              {s.status === 'upcoming' && <span className="rd-badge" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>Upcoming</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════ WHAT'S DUE ════════════════ */
function FeedCard() {
  return (
    <div className="rd-card fade-up" style={{ animationDelay: '180ms' }}>
      <div className="rd-card-head"><div><div className="rd-card-title">What's due</div><div className="rd-card-sub">Deadlines &amp; announcements</div></div></div>
      <div style={{ marginTop: 10 }}>
        {DEMO_FEED.map((t, i) => (
          <div key={i} className={`s-task ${t.urgent ? 'urgent' : ''}`}>
            <div className="s-task-bar" />
            <div className="s-task-ico" style={{ background: t.soft, color: t.tint }}><Icon name={t.ico} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.3, lineHeight: 1.3 }}>{t.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{t.sub}</div>
            </div>
            <div className="s-task-due">{t.due}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════ MAIN DASHBOARD ════════════════ */
export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [courseMarks, setCourseMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sRes, pRes, mRes] = await Promise.all([
          client.get('/student/dashboard-stats'),
          client.get('/student/profile'),
          client.get('/student/marks').catch(() => ({ data: { courseMarks: [] } })),
        ]);
        setStats(sRes.data.stats);
        setProfile(pRes.data.student);
        setCourseMarks(mRes.data.courseMarks || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const firstName = profile?.firstName || user?.name?.split(' ')[0] || 'Student';
  const semester = stats?.currentSemester || profile?.semester || '—';
  const sectionName = profile?.section?.name || '—';
  const enrollmentNo = profile?.enrollmentNo || '';
  const degree = profile?.batch?.degree ? `${profile.batch.degree} — ${profile.batch?.department?.name || ''}` : '';

  return (
    <div className="rd-content-inner">
      {/* ── Greeting Header ── */}
      <div className="rd-section-head fade-up">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: 'var(--good)', boxShadow: '0 0 0 4px var(--good-soft)', flexShrink: 0 }} />
            <h1>{greetWord()}, {firstName}</h1>
          </div>
          <p>You have <b style={{ color: 'var(--ink)' }}>{DEMO_SCHEDULE.length} classes</b> today and <b style={{ color: 'var(--ink)' }}>1 assignment</b> due tomorrow — {todayLabel()}.</p>
          <div className="s-greet-tags">
            {enrollmentNo && <span className="rd-badge rd-badge-id">{enrollmentNo}</span>}
            <span className="rd-badge rd-badge-active"><span className="rd-badge-dot" style={{ background: 'var(--good)' }} />{sectionName}</span>
            <span className="rd-badge" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>Semester {semester}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="rd-btn rd-btn-ghost" onClick={() => navigate('/student/feedback')}><Icon name="mail" /> Give Feedback</button>
          <button className="rd-btn rd-btn-primary"><Icon name="download" /> Report Card</button>
        </div>
      </div>

      {/* ── Top Row: Attendance donut + stat tiles ── */}
      <div className="s-dash-top-row">
        <AttendanceCard stats={stats} />
        <StatTiles stats={stats} courseMarks={courseMarks} />
      </div>

      {/* ── Content Row: Schedule + Deadlines ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 'var(--gap)', marginBottom: 'var(--gap)', alignItems: 'start' }}>
        <ScheduleCard />
        <FeedCard />
      </div>
    </div>
  );
}
