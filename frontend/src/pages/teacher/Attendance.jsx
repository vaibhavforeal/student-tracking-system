import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import { HiOutlineCheck, HiOutlineX, HiOutlineClock, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';

const STATUS_OPTIONS = ['present', 'absent', 'late'];
const statusStyles = {
  present: { bg: 'var(--color-green-50, #ecfdf5)', color: 'var(--color-green-600, #16a34a)', label: 'Present', icon: HiOutlineCheck },
  absent: { bg: 'var(--color-red-50, #fef2f2)', color: 'var(--color-red-600, #dc2626)', label: 'Absent', icon: HiOutlineX },
  late: { bg: 'var(--color-amber-50, #fffbeb)', color: 'var(--color-amber-600, #d97706)', label: 'Late', icon: HiOutlineClock },
};

export default function TeacherAttendance() {
  const [assignments, setAssignments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    client.get('/teacher/my-courses').then((res) => {
      setAssignments(res.data.assignments);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const courses = [...new Map(assignments.map((a) => [a.course.id, a.course])).values()];
  const sectionsForCourse = assignments.filter((a) => a.course.id === selectedCourse);

  const fetchAttendance = async () => {
    if (!selectedCourse || !selectedSection || !date) return;
    setFetching(true);
    try {
      const { data } = await client.get('/teacher/attendance', {
        params: { courseId: selectedCourse, sectionId: selectedSection, date },
      });
      setStudents(data.students);
      const map = {};
      data.students.forEach((s) => { map[s.id] = 'present'; });
      data.records.forEach((r) => {
        if (data.students.find((s) => s.id === r.studentId)) {
          map[r.studentId] = r.status;
        }
      });
      setEntries(map);
      setCurrentIndex(0);
      setShowSummary(false);
    } catch (err) { console.error(err); }
    finally { setFetching(false); }
  };

  useEffect(() => {
    if (selectedCourse && selectedSection && date) fetchAttendance();
  }, [selectedCourse, selectedSection, date]);

  const markStatus = useCallback((studentId, status) => {
    setEntries((prev) => ({ ...prev, [studentId]: status }));
    // Auto-advance to next student after a brief delay
    setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev < students.length - 1) return prev + 1;
        // Last student — show summary
        setShowSummary(true);
        return prev;
      });
    }, 300);
  }, [students.length]);

  const markAll = (status) => {
    const map = {};
    students.forEach((s) => { map[s.id] = status; });
    setEntries(map);
    setShowSummary(true);
    setCurrentIndex(students.length - 1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entryList = students.map((s) => ({ studentId: s.id, status: entries[s.id] || 'present' }));
      await client.post('/teacher/attendance/bulk', {
        courseId: selectedCourse, sectionId: selectedSection, date, entries: entryList,
      });
      alert('Attendance saved successfully!');
    } catch (err) { alert(err.response?.data?.error || 'Error saving attendance'); }
    finally { setSaving(false); }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!students.length || showSummary) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex((p) => p - 1);
      if (e.key === 'ArrowRight' && currentIndex < students.length - 1) setCurrentIndex((p) => p + 1);
      const student = students[currentIndex];
      if (!student) return;
      if (e.key === '1' || e.key === 'p' || e.key === 'P') markStatus(student.id, 'present');
      if (e.key === '2' || e.key === 'a' || e.key === 'A') markStatus(student.id, 'absent');
      if (e.key === '3' || e.key === 'l' || e.key === 'L') markStatus(student.id, 'late');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [students, currentIndex, showSummary, markStatus]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const presentCount = Object.values(entries).filter((s) => s === 'present').length;
  const absentCount = Object.values(entries).filter((s) => s === 'absent').length;
  const lateCount = Object.values(entries).filter((s) => s === 'late').length;
  const currentStudent = students[currentIndex];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <p className="page-subtitle">Mark daily attendance for your classes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Course</label>
              <select className="form-select" value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSection(''); setStudents([]); setShowSummary(false); }}>
                <option value="">Select Course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-select" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedCourse}>
                <option value="">{selectedCourse ? 'Select Section' : 'Select a course first'}</option>
                {sectionsForCourse.map((a) => (
                  <option key={a.section.id} value={a.section.id}>{a.section.name} ({a.section.batch?.degree} — {a.section.batch?.name})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Card View */}
      {fetching ? (
        <div className="loading-container"><div className="spinner spinner-lg" /></div>
      ) : students.length > 0 ? (
        <>
          {/* Progress bar & summary stats */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>{students.length} students</span>
            <span className="badge badge-green">Present: {presentCount}</span>
            <span className="badge badge-red">Absent: {absentCount}</span>
            <span style={{ background: 'var(--color-amber-50, #fffbeb)', color: 'var(--color-amber-600, #d97706)', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-xs)', fontWeight: 600 }}>Late: {lateCount}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => markAll('present')} style={{ color: 'var(--color-green-600, #16a34a)' }}>All Present</button>
              <button className="btn btn-ghost btn-sm" onClick={() => markAll('absent')} style={{ color: 'var(--color-red-600, #dc2626)' }}>All Absent</button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', background: 'var(--color-gray-100, #f3f4f6)', borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-5)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((showSummary ? students.length : currentIndex) / students.length) * 100}%`,
              background: 'linear-gradient(90deg, var(--color-primary, #6366f1), var(--color-primary-light, #818cf8))',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.3s ease',
            }} />
          </div>

          {!showSummary && currentStudent ? (
            /* Single Student Card */
            <div className="card" style={{ maxWidth: '560px', margin: '0 auto' }}>
              <div className="card-body" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                    disabled={currentIndex === 0}
                    style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}
                  >
                    <HiOutlineChevronLeft size={20} /> Prev
                  </button>
                  <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)', fontWeight: 600 }}>
                    {currentIndex + 1} of {students.length}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (currentIndex < students.length - 1) setCurrentIndex((p) => p + 1);
                      else setShowSummary(true);
                    }}
                  >
                    {currentIndex < students.length - 1 ? <>Next <HiOutlineChevronRight size={20} /></> : 'Review'}
                  </button>
                </div>

                {/* Student Info */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary, #6366f1), var(--color-primary-light, #818cf8))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto var(--space-4)', color: '#fff', fontSize: '24px', fontWeight: 700,
                }}>
                  {currentStudent.firstName?.[0]}{currentStudent.lastName?.[0]}
                </div>
                <h2 style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--font-xl)' }}>
                  {currentStudent.firstName} {currentStudent.lastName}
                </h2>
                <span className="badge badge-sky" style={{ marginBottom: 'var(--space-6)', display: 'inline-block' }}>
                  {currentStudent.enrollmentNo}
                </span>

                {/* Status Buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
                  {STATUS_OPTIONS.map((status) => {
                    const s = statusStyles[status];
                    const isActive = entries[currentStudent.id] === status;
                    const Icon = s.icon;
                    return (
                      <button
                        key={status}
                        onClick={() => markStatus(currentStudent.id, status)}
                        style={{
                          background: isActive ? s.color : s.bg,
                          color: isActive ? '#fff' : s.color,
                          border: `2px solid ${s.color}`,
                          padding: '12px 28px', borderRadius: 'var(--radius-lg)',
                          fontWeight: 700, fontSize: 'var(--font-base)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          transition: 'all 0.2s ease',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          fontFamily: 'var(--font-family)',
                        }}
                      >
                        <Icon size={20} /> {s.label}
                      </button>
                    );
                  })}
                </div>

                {/* Keyboard hint */}
                <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                  Keyboard: <b>P</b> Present · <b>A</b> Absent · <b>L</b> Late · <b>←→</b> Navigate
                </p>
              </div>
            </div>
          ) : showSummary ? (
            /* Summary / Review Table */
            <div className="card">
              <div className="card-body" style={{ padding: 'var(--space-4) var(--space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <h3 style={{ margin: 0 }}>Review Attendance</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowSummary(false); setCurrentIndex(0); }}>
                    ← Remark
                  </button>
                </div>
              </div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Unique ID</th>
                      <th>Student Name</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => {
                      const st = entries[s.id] || 'present';
                      const style = statusStyles[st];
                      return (
                        <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => { setCurrentIndex(i); setShowSummary(false); }}>
                          <td>{i + 1}</td>
                          <td><span className="badge badge-sky">{s.enrollmentNo}</span></td>
                          <td style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              background: style.bg, color: style.color,
                              padding: '4px 16px', borderRadius: 'var(--radius-full)',
                              fontWeight: 600, fontSize: 'var(--font-sm)',
                            }}>
                              {style.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </>
      ) : selectedCourse && selectedSection ? (
        <div className="card"><div className="card-body"><div className="empty-state"><p>No students found in this section.</p></div></div></div>
      ) : null}
    </div>
  );
}
