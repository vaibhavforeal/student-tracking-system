import { useState, useEffect } from 'react';
import client from '../../api/client';
import { HiOutlineSave } from 'react-icons/hi';

const ASSESSMENT_TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'midterm', label: 'Midterm' },
  { value: 'final', label: 'Final' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'lab', label: 'Lab' },
];

export default function TeacherMarks() {
  const [assignments, setAssignments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [assessmentType, setAssessmentType] = useState('internal');
  const [maxMarks, setMaxMarks] = useState('100');
  const [academicYear, setAcademicYear] = useState('');
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

  const courses = [...new Map(assignments.map((a) => [a.course.id, a.course])).values()];
  const sectionsForCourse = assignments.filter((a) => a.course.id === selectedCourse);

  // Generate academic years from selected section's batch
  const getAcademicYears = () => {
    const assignment = sectionsForCourse.find((a) => a.section.id === selectedSection);
    if (!assignment?.section?.batch?.startYear || !assignment?.section?.batch?.endYear) return [];
    const years = [];
    for (let y = assignment.section.batch.startYear; y < assignment.section.batch.endYear; y++) {
      years.push(`${y}-${String(y + 1).slice(-2)}`);
    }
    return years;
  };

  const fetchMarks = async () => {
    if (!selectedCourse || !selectedSection) return;
    setFetching(true);
    try {
      const { data } = await client.get('/teacher/marks', {
        params: { courseId: selectedCourse, sectionId: selectedSection, assessmentType },
      });
      setStudents(data.students);
      // Pre-fill entries
      const map = {};
      data.students.forEach((s) => { map[s.id] = { marksObtained: '', remarks: '' }; });
      data.marks.forEach((m) => {
        if (map[m.studentId]) {
          map[m.studentId] = { marksObtained: String(parseFloat(m.marksObtained)), remarks: m.remarks || '' };
        }
      });
      setEntries(map);
    } catch (err) { console.error(err); }
    finally { setFetching(false); }
  };

  useEffect(() => {
    if (selectedCourse && selectedSection && assessmentType) fetchMarks();
  }, [selectedCourse, selectedSection, assessmentType]);

  const updateEntry = (studentId, field, value) => {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!academicYear) { alert('Please select an academic year'); return; }
    setSaving(true);
    try {
      const semester = students[0]?.semester || 1;
      const entryList = students.map((s) => ({
        studentId: s.id,
        marksObtained: entries[s.id]?.marksObtained || '',
        remarks: entries[s.id]?.remarks || '',
      }));
      await client.post('/teacher/marks/bulk', {
        courseId: selectedCourse, sectionId: selectedSection,
        assessmentType, maxMarks, semester, academicYear, entries: entryList,
      });
      alert('Marks saved successfully!');
      fetchMarks();
    } catch (err) { alert(err.response?.data?.error || 'Error saving marks'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  const filledCount = Object.values(entries).filter((e) => e.marksObtained !== '' && e.marksObtained !== null).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Marks & Grading</h1>
          <p className="page-subtitle">Enter assessment marks for your students</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Course</label>
              <select className="form-select" value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSection(''); setStudents([]); setAcademicYear(''); }}>
                <option value="">Select Course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-select" value={selectedSection} onChange={(e) => { setSelectedSection(e.target.value); setAcademicYear(''); }} disabled={!selectedCourse}>
                <option value="">{selectedCourse ? 'Select Section' : 'Select a course first'}</option>
                {sectionsForCourse.map((a) => (
                  <option key={a.section.id} value={a.section.id}>{a.section.name} ({a.section.batch?.degree} — {a.section.batch?.name})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assessment Type</label>
              <select className="form-select" value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)}>
                {ASSESSMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Max Marks</label>
              <input className="form-input" type="number" min="1" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} style={{ maxWidth: '120px' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <select className="form-select" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} disabled={!selectedSection}>
                <option value="">{selectedSection ? 'Select Year' : 'Select a section first'}</option>
                {getAcademicYears().map((yr) => <option key={yr} value={yr}>{yr}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Marks Table */}
      {fetching ? (
        <div className="loading-container"><div className="spinner spinner-lg" /></div>
      ) : students.length > 0 ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>{students.length} students</span>
            <span className="badge badge-sky">Filled: {filledCount}/{students.length}</span>
          </div>

          <div className="card">
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Unique ID</th>
                    <th>Student Name</th>
                    <th style={{ width: '120px' }}>Marks (/{maxMarks})</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td><span className="badge badge-sky">{s.enrollmentNo}</span></td>
                      <td style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          max={maxMarks}
                          step="0.5"
                          value={entries[s.id]?.marksObtained || ''}
                          onChange={(e) => updateEntry(s.id, 'marksObtained', e.target.value)}
                          style={{ width: '100px', padding: '6px 10px', textAlign: 'center' }}
                          placeholder="—"
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          value={entries[s.id]?.remarks || ''}
                          onChange={(e) => updateEntry(s.id, 'remarks', e.target.value)}
                          placeholder="Optional"
                          style={{ padding: '6px 10px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !academicYear}>
              <HiOutlineSave /> {saving ? 'Saving...' : 'Save Marks'}
            </button>
          </div>
        </>
      ) : selectedCourse && selectedSection ? (
        <div className="card"><div className="card-body"><div className="empty-state"><p>No students found in this section.</p></div></div></div>
      ) : null}
    </div>
  );
}
