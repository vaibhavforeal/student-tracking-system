import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/ui/Icon';
import { AreaChart, LabeledBars } from '../../components/ui/DesignCharts';
import { StatTile, MiniAvatar, Meter } from '../../components/ui/DesignHelpers';
import './TeacherDashboard.css';

/* ═══════ Mock data — matches the design prototype exactly ═══════ */
const T = {
  schedule: [
    { id: 'c1', start: '09:00', end: '10:00', name: 'Data Structures & Algorithms', code: 'CS301', section: 'CSE-6A', room: 'Room 304', kind: 'Lecture', status: 'done', students: 42 },
    { id: 'c2', start: '11:00', end: '13:00', name: 'Data Structures Lab', code: 'CS301L', section: 'CSE-6A', room: 'Lab 2', kind: 'Lab', status: 'now', students: 42 },
    { id: 'c3', start: '14:00', end: '15:00', name: 'Algorithms — Tutorial', code: 'CS301', section: 'CSE-6B', room: 'Room 210', kind: 'Tutorial', status: 'upcoming', students: 39 },
  ],
  classes: [
    { id: 'cl1', code: 'CS301', name: 'Data Structures & Algorithms', section: 'CSE-6A', students: 42, att: 91, marks: 78, days: 'Mon · Wed · Fri', slot: '09:00–10:00', spine: '#5b54e6' },
    { id: 'cl2', code: 'CS301', name: 'Data Structures & Algorithms', section: 'CSE-6B', students: 39, att: 84, marks: 71, days: 'Tue · Thu', slot: '14:00–15:00', spine: '#5b54e6' },
    { id: 'cl3', code: 'CS301L', name: 'Data Structures Lab', section: 'CSE-6A', students: 42, att: 95, marks: 82, days: 'Thu', slot: '11:00–13:00', spine: '#19a89a' },
    { id: 'cl4', code: 'CS205', name: 'Discrete Mathematics', section: 'CSE-4A', students: 25, att: 79, marks: 68, days: 'Mon · Wed', slot: '11:00–12:00', spine: '#c98a1e' },
  ],
  students: [
    { id: 1,  name: 'Aarav Sharma',   roll: 'CSE22A-014', section: 'CSE-6A', att: 94, marks: 81 },
    { id: 2,  name: 'Kabir Khan',     roll: 'CSE22A-031', section: 'CSE-6A', att: 62, marks: 49, flags: ['low-attendance', 'low-marks'] },
    { id: 3,  name: 'Ishita Reddy',   roll: 'CSE22A-009', section: 'CSE-6A', att: 88, marks: 76 },
    { id: 4,  name: 'Rohan Gupta',    roll: 'CSE22B-022', section: 'CSE-6B', att: 71, marks: 53, flags: ['low-attendance', 'low-marks'] },
    { id: 5,  name: 'Ananya Iyer',    roll: 'CSE22A-002', section: 'CSE-6A', att: 97, marks: 90 },
    { id: 6,  name: 'Vivaan Joshi',   roll: 'CSE22B-018', section: 'CSE-6B', att: 68, marks: 58, flags: ['low-attendance'] },
    { id: 7,  name: 'Diya Patel',     roll: 'CSE22A-025', section: 'CSE-6A', att: 85, marks: 72 },
    { id: 8,  name: 'Arjun Nair',     roll: 'CSE22B-007', section: 'CSE-6B', att: 90, marks: 67 },
    { id: 9,  name: 'Sara Mathew',    roll: 'CSE24A-011', section: 'CSE-4A', att: 58, marks: 44, flags: ['low-attendance', 'low-marks'] },
    { id: 10, name: 'Neel Verma',     roll: 'CSE24A-003', section: 'CSE-4A', att: 82, marks: 70 },
    { id: 11, name: 'Myra Bose',      roll: 'CSE22A-019', section: 'CSE-6A', att: 91, marks: 85 },
    { id: 12, name: 'Kabir Saxena',   roll: 'CSE22B-030', section: 'CSE-6B', att: 73, marks: 51, flags: ['low-marks'] },
  ],
  tasks: [
    { title: 'Mark attendance — Algorithms Tutorial', sub: 'CSE-6B · today 14:00', due: 'Today', urgent: true, ico: 'scan', tint: 'var(--accent)', soft: 'var(--accent-soft)' },
    { title: 'Publish CS301 Mid-Sem marks', sub: 'CSE-6A · 42 students graded', due: 'Tomorrow', urgent: true, ico: 'report', tint: 'var(--info)', soft: 'var(--info-soft)' },
    { title: 'Enter Discrete Math quiz scores', sub: 'CSE-4A · 25 students', due: 'in 2 days', urgent: false, ico: 'edit', tint: 'var(--warn)', soft: 'var(--warn-soft)' },
    { title: 'Reply to 2 student questions', sub: 'Space for Thought', due: 'in 3 days', urgent: false, ico: 'mail', tint: 'var(--accent)', soft: 'var(--accent-soft)' },
    { title: 'Submit internal assessment sheet', sub: 'CSE-6B · DSA', due: 'Fri', urgent: false, ico: 'upload', tint: 'var(--good)', soft: 'var(--good-soft)' },
  ],
  performance: [
    { label: 'CSE-6A', value: 78, color: '#5b54e6' },
    { label: 'CSE-6B', value: 71, color: '#5b54e6' },
    { label: 'Lab 6A', value: 82, color: '#19a89a' },
    { label: 'CSE-4A', value: 68, color: '#c98a1e' },
  ],
  attTrend: [82, 85, 84, 87, 86, 88, 87, 90],
};

/* ════════════════ STAT TILES ════════════════ */
function StatTiles({ apiStats }) {
  const stats = [
    { label: 'My Students', value: apiStats?.totalStudents || '148', delta: `${apiStats?.totalSections || 4} sections`, up: true, ico: 'cap', tint: 'var(--accent)', soft: 'var(--accent-soft)' },
    { 
      label: 'Avg. Attendance', 
      value: apiStats?.avgAttendance !== undefined && apiStats?.avgAttendance !== null ? `${apiStats.avgAttendance}%` : '88%', 
      delta: apiStats?.attendanceDelta || '+2.1%', 
      up: apiStats?.attendanceDeltaUp !== undefined ? apiStats.attendanceDeltaUp : true, 
      ico: 'scan', 
      tint: 'var(--good)', 
      soft: 'var(--good-soft)' 
    },
    { label: 'Classes Today', value: '3', delta: '1 done', up: true, ico: 'cal', tint: 'var(--info)', soft: 'var(--info-soft)' },
    { label: 'Pending Tasks', value: '5', delta: '2 urgent', up: false, ico: 'flag', tint: 'var(--warn)', soft: 'var(--warn-soft)' },
  ];
  return (
    <div className="rd-stat-grid">
      {stats.map((s, i) => (
        <StatTile key={s.label} label={s.label} value={s.value} delta={s.delta}
          up={s.up} icon={s.ico} tint={s.tint} soft={s.soft} delay={i * 55} />
      ))}
    </div>
  );
}

/* ════════════════ TODAY'S SCHEDULE ════════════════ */
function ScheduleCard({ todayStr }) {
  const navigate = useNavigate();
  return (
    <div className="rd-card fade-up" style={{ animationDelay: '120ms' }}>
      <div className="rd-card-head">
        <div>
          <div className="rd-card-title">Today's schedule</div>
          <div className="rd-card-sub">{todayStr} · 3 classes</div>
        </div>
        <span className="t-card-link">Full timetable <Icon name="chevR" /></span>
      </div>
      <div className="t-sched" style={{ marginTop: 10 }}>
        {T.schedule.map(s => (
          <div className={`t-sched-row ${s.status}`} key={s.id}>
            <div className="t-sched-time">{s.start}<span>{s.end}</span></div>
            <div className="t-sched-rail">
              <div className="t-sched-name">{s.name}</div>
              <div className="t-sched-meta">
                <span>{s.section}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="pin" />{s.room}
                </span>
                <span>{s.kind} · {s.students} students</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {s.status === 'now' && <span className="t-now-pill">Now</span>}
              {s.status === 'done'
                ? <span className="t-badge-good"><Icon name="check" style={{ width: 12, height: 12 }} /> Attendance taken</span>
                : <button className="rd-btn rd-btn-ghost rd-btn-sm" onClick={() => navigate('/teacher/attendance')}>
                    Mark attendance
                  </button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════ PENDING TASKS ════════════════ */
function TasksCard() {
  return (
    <div className="rd-card fade-up" style={{ animationDelay: '180ms' }}>
      <div className="rd-card-head">
        <div>
          <div className="rd-card-title">Pending tasks</div>
          <div className="rd-card-sub">5 to do · 2 urgent</div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        {T.tasks.map((t, i) => (
          <button key={i} className={`t-task ${t.urgent ? 'urgent' : ''}`}>
            <div className="t-task-bar" />
            <div className="t-task-ico" style={{ background: t.soft, color: t.tint }}>
              <Icon name={t.ico} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.3, lineHeight: 1.3 }}>{t.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{t.sub}</div>
            </div>
            <div className="t-task-due">{t.due}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════ MY CLASSES ════════════════ */
function ClassesCard({ classes = [] }) {
  const navigate = useNavigate();
  return (
    <div className="rd-card fade-up rd-card-pad" style={{ animationDelay: '220ms' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="rd-card-title">My classes &amp; subjects</div>
          <div className="rd-card-sub">{classes.length} active this semester</div>
        </div>
      </div>
      {classes.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          No classes assigned this semester.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))', gap: 'var(--gap, 12px)' }}>
          {classes.map(c => (
            <div className="rd-card rd-card-pad t-class-card" key={c.id} style={{ background: 'var(--surface-2)' }}>
              <div className="t-class-code-row">
                <span className="t-badge-id">{c.code}</span>
                <span style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 600 }}>{c.section}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span className="t-class-spine" style={{ background: c.spine }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, letterSpacing: '-.2px', lineHeight: 1.25 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{c.days} · {c.slot}</div>
                </div>
              </div>
              <div className="t-kpi-row">
                <div className="t-kpi"><div className="t-kpi-v">{c.students}</div><div className="t-kpi-k">Students</div></div>
                <div className="t-kpi"><div className="t-kpi-v" style={{ color: c.att >= 85 ? 'var(--good)' : c.att >= 75 ? 'var(--warn)' : 'var(--bad)' }}>{c.att}%</div><div className="t-kpi-k">Attend.</div></div>
                <div className="t-kpi"><div className="t-kpi-v">{c.marks}%</div><div className="t-kpi-k">Avg mark</div></div>
              </div>
              <div style={{ display: 'flex', gap: 7, marginTop: 'auto' }}>
                <button className="rd-btn rd-btn-ghost rd-btn-sm" style={{ flex: 1 }} onClick={() => navigate('/teacher/attendance')}>
                  Attendance
                </button>
                <button className="rd-btn rd-btn-ghost rd-btn-sm" style={{ flex: 1 }} onClick={() => navigate('/teacher/marks')}>
                  <Icon name="report" /> Marks
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════ ROSTER + AT-RISK ════════════════ */
function RosterCard({ students = [] }) {
  const [tab, setTab] = useState('risk');
  const rows = useMemo(() =>
    tab === 'risk' ? students.filter(s => s.flags && s.flags.length) : students,
    [tab, students]
  );
  const riskCount = students.filter(s => s.flags && s.flags.length).length;
  const uniqueSections = new Set(students.map(s => s.section)).size;

  return (
    <div className="rd-card fade-up" style={{ animationDelay: '260ms', overflow: 'hidden' }}>
      <div className="rd-card-head" style={{ paddingBottom: 14 }}>
        <div>
          <div className="rd-card-title">My students</div>
          <div className="rd-card-sub">
            {students.length} across {uniqueSections} {uniqueSections === 1 ? 'section' : 'sections'}
          </div>
        </div>
        <div className="rd-seg">
          <button className={tab === 'risk' ? 'on' : ''} onClick={() => setTab('risk')}>
            At risk <span style={{ opacity: .55, fontFamily: 'var(--font-mono)' }}>{riskCount}</span>
          </button>
          <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All</button>
        </div>
      </div>
      <div className="rd-table-wrap">
        {rows.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            No students found.
          </div>
        ) : (
          <table className="rd-tbl">
            <thead>
              <tr>
                <th>Student</th>
                <th>Section</th>
                <th>Attendance</th>
                <th>Avg. Marks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="t-cell-name">
                      <MiniAvatar name={s.name} size={32} />
                      <div>
                        <div className="rd-name-main">
                          {s.name}
                          {s.flags && s.flags.length > 0 && (
                            <span title="Needs attention" style={{ color: 'var(--bad)', marginLeft: 6, fontSize: 10 }}>●</span>
                          )}
                        </div>
                        <div className="rd-name-sub">{s.roll}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontSize: 12.5, fontWeight: 500 }}>{s.section}</span></td>
                  <td><Meter value={s.att} /></td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13,
                      color: s.marks >= 75 ? 'var(--good)' : s.marks >= 55 ? 'var(--ink)' : 'var(--bad)'
                    }}>{s.marks}%</span>
                  </td>
                  <td>
                    <div className="rd-row-act">
                      <button className="rd-icon-btn" style={{ width: 30, height: 30 }}>
                        <Icon name="eye" style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ════════════════ PERFORMANCE ════════════════ */
function PerformanceCard() {
  return (
    <div className="rd-card fade-up" style={{ animationDelay: '300ms' }}>
      <div className="rd-card-head">
        <div>
          <div className="rd-card-title">Class performance</div>
          <div className="rd-card-sub">Average marks by section</div>
        </div>
      </div>
      <div className="rd-card-pad" style={{ paddingTop: 26 }}>
        <LabeledBars data={T.performance} suffix="%" height={200} />
      </div>
    </div>
  );
}

function AttTrendCard() {
  return (
    <div className="rd-card fade-up" style={{ animationDelay: '340ms' }}>
      <div className="rd-card-head">
        <div>
          <div className="rd-card-title">My attendance average</div>
          <div className="rd-card-sub">Last 8 weeks</div>
        </div>
      </div>
      <div className="rd-card-pad" style={{ paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-1px' }}>90%</span>
          <span className="rd-stat-delta up">
            <Icon name="arrowUp" style={{ width: 13, height: 13 }} />+2.1% this month
          </span>
        </div>
        <AreaChart data={T.attTrend} height={120} accentVar="var(--good)" />
      </div>
    </div>
  );
}

/* ════════════════ MAIN DASHBOARD EXPORT ════════════════ */
export default function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await client.get('/teacher/dashboard-stats');
        setStats(data.stats);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const fName = user?.name?.split(' ')[0] || 'Teacher';

  return (
    <div className="rd-content-inner">
      {/* ─── Greeting ─── */}
      <div className="rd-section-head fade-up">
        <div>
          <div className="t-greet">
            <span className="t-greet-dot" />
            <h1>{greeting}, {fName}</h1>
          </div>
          <p>You have <b style={{ color: 'var(--ink)' }}>3 classes</b> and <b style={{ color: 'var(--ink)' }}>2 urgent tasks</b> today — {todayStr}.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="rd-btn rd-btn-ghost" onClick={() => navigate('/teacher/marks')}>
            <Icon name="report" /> Enter Marks
          </button>
          <button className="rd-btn rd-btn-primary" onClick={() => navigate('/teacher/attendance')}>
            Take Attendance
          </button>
        </div>
      </div>

      {/* ─── Stat tiles ─── */}
      <StatTiles apiStats={stats} />

      {/* ─── Schedule + Tasks (prototype: 1.55fr 1fr) ─── */}
      <div className="t-grid-schedule" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 'var(--gap, 12px)', marginBottom: 'var(--gap, 12px)' }}>
        <ScheduleCard todayStr={todayStr} />
        <TasksCard />
      </div>

      {/* ─── Classes ─── */}
      <div style={{ marginBottom: 'var(--gap, 12px)' }}>
        <ClassesCard classes={stats?.classes || []} />
      </div>

      {/* ─── Roster + Analytics (prototype: 1.4fr 1fr) ─── */}
      <div className="t-grid-roster" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--gap, 12px)', marginBottom: 'var(--gap, 12px)' }}>
        <RosterCard students={stats?.students || []} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap, 12px)' }}>
          <PerformanceCard />
          <AttTrendCard />
        </div>
      </div>
    </div>
  );
}
