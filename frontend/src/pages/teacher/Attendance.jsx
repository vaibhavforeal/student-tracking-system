import { useState, useEffect } from 'react';
import client from '../../api/client';
import { HiOutlineCheck, HiOutlineX, HiOutlineClock } from 'react-icons/hi';

const STATUS_OPTIONS = ['present', 'absent', 'late'];
const statusStyles = {
  present: { bg: 'var(--color-green-50, #ecfdf5)', color: 'var(--color-green-600, #16a34a)', label: 'Present' },
  absent: { bg: 'var(--color-red-50, #fef2f2)', color: 'var(--color-red-600, #dc2626)', label: 'Absent' },
  late: { bg: 'var(--color-amber-50, #fffbeb)', color: 'var(--color-amber-600, #d97706)', label: 'Late' },
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

  useEffect(() => {
    client.get('/teacher/my-courses').then((res) => {
      setAssignments(res.data.assignments);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Get unique courses and sections for the selected course
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
      // Pre-fill entries from existing records
      const map = {};
      data.students.forEach((s) => { map[s.id] = 'present'; }); // default to present
      data.records.forEach((r) => { map[r.student?.enrollmentNo ? r.studentId || r.student?.id : r.studentId] = r.status; });
      // Match by studentId from records
      data.records.forEach((r) => {
        if (data.students.find((s) => s.id === r.studentId)) {
          map[r.studentId] = r.status;
        }
      });
      setEntries(map);
    } catch (err) { console.error(err); }
    finally { setFetching(false); }
  };

  useEffect(() => {
    if (selectedCourse && selectedSection && date) fetchAttendance();
  }, [selectedCourse, selectedSection, date]);

  const toggleStatus = (studentId) => {
    setEntries((prev) => {
      const current = prev[studentId] || 'present';
      const next = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(current) + 1) % STATUS_OPTIONS.length];
      return { ...prev, [studentId]: next };
    });
  };

  const markAll = (status) => {
    const map = {};
    students.forEach((s) => { map[s.id] = status; });
    setEntries(map);
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

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const presentCount = Object.values(entries).filter((s) => s === 'present').length;
  const absentCount = Object.values(entries).filter((s) => s === 'absent').length;
  const lateCount = Object.values(entries).filter((s) => s === 'late').length;

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
              <select className="form-select" value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSection(''); setStudents([]); }}>
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

      {/* Attendance Table */}
      {fetching ? (
        <div className="loading-container"><div className="spinner spinner-lg" /></div>
      ) : students.length > 0 ? (
        <>
          {/* Summary bar */}
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

          <div className="card">
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
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td><span className="badge badge-sky">{s.enrollmentNo}</span></td>
                        <td style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => toggleStatus(s.id)}
                            style={{
                              background: style.bg, color: style.color, border: 'none',
                              padding: '6px 20px', borderRadius: 'var(--radius-full)',
                              fontWeight: 600, fontSize: 'var(--font-sm)', cursor: 'pointer',
                              minWidth: '90px', transition: 'all var(--transition-fast)',
                              fontFamily: 'var(--font-family)',
                            }}
                          >
                            {style.label}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
