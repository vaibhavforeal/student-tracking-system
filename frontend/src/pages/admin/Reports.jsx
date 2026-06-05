import { useState, useEffect } from 'react';
import { Check, BarChart2, FileText } from 'lucide-react';
import client from '../../api/client';
import Icon from '../../components/ui/Icon';
import { PageHead } from '../../components/ui/DesignHelpers';

const reportTypes = [
  { id: 'student-performance', title: 'Student Performance', desc: 'Marks summary with percentage for each student', icon: 'chart', tint: 'var(--info)', filters: ['batch', 'section', 'semester', 'academicYear'] },
  { id: 'attendance', title: 'Attendance Report', desc: 'Attendance summary with present/absent counts', icon: 'clipboard', tint: 'var(--accent)', filters: ['batch', 'section', 'course'] },
  { id: 'marks', title: 'Marks Report', desc: 'Detailed marks data for each assessment', icon: 'book', tint: 'var(--good)', filters: ['batch', 'section', 'course', 'semester', 'academicYear'] },
  { id: 'batch-summary', title: 'Batch Summary', desc: 'Aggregate statistics per batch', icon: 'layers', tint: 'var(--warn)', filters: [] },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [format, setFormat] = useState('csv');
  const [filters, setFilters] = useState({});
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { loadFilterData(); }, []);

  const loadFilterData = async () => {
    try {
      const [bRes, sRes, cRes] = await Promise.all([
        client.get('/admin/batches').catch(() => ({ data: { batches: [] } })),
        client.get('/admin/sections').catch(() => ({ data: { sections: [] } })),
        client.get('/admin/courses').catch(() => ({ data: { courses: [] } })),
      ]);
      setBatches(bRes.data.batches || []); setSections(sRes.data.sections || []); setCourses(cRes.data.courses || []);
    } catch { /* filters empty */ }
  };

  const handleSelectReport = (report) => { setSelectedReport(report); setFilters({}); setMessage(''); };
  const handleFilterChange = (key, value) => { setFilters(prev => ({ ...prev, [key]: value })); };

  const handleGenerate = async () => {
    if (!selectedReport) return; setLoading(true); setMessage('');
    try {
      const params = new URLSearchParams(); params.append('format', format);
      Object.entries(filters).forEach(([key, val]) => { if (val) params.append(key === 'batch' ? 'batchId' : key === 'section' ? 'sectionId' : key === 'course' ? 'courseId' : key, val); });
      const response = await client.get(`/reports/${selectedReport.id}?${params.toString()}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${selectedReport.id}-report.${format}`;
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
      setMessage(`${selectedReport.title} report downloaded successfully!`);
      setMessageType('success');
    } catch (err) { 
      setMessage(`Failed to generate report. ${err.response?.data?.error || 'Please try again.'}`); 
      setMessageType('error');
    } finally { setLoading(false); }
  };

  const currentFilters = selectedReport?.filters || [];

  return (
    <div className="rd-content-inner">
      <PageHead title="Reports" sub="Generate and download reports in CSV or PDF format" />

      {/* Report Type Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
        {reportTypes.map((report, i) => (
          <div key={report.id} className="rd-card rd-card-pad fade-up" style={{ animationDelay: `${i * 60}ms`, cursor: 'pointer', border: selectedReport?.id === report.id ? `2px solid var(--accent)` : '2px solid transparent', transition: 'border .15s' }} onClick={() => handleSelectReport(report)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: `color-mix(in srgb, ${report.tint} 10%, transparent)`, display: 'grid', placeItems: 'center', color: report.tint }}>
                <Icon name={report.icon} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{report.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--faint)' }}>{report.desc}</div>
              </div>
            </div>
            {selectedReport?.id === report.id && <div style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}><Check size={18} /></div>}
          </div>
        ))}
      </div>

      {/* Filter & Generate Panel */}
      {selectedReport && (
        <div className="rd-card rd-card-pad fade-up">
          <div className="rd-card-title" style={{ marginBottom: 16 }}>
            <Icon name="filter" style={{ width: 16, height: 16, marginRight: 8 }} /> Configure: {selectedReport.title}
          </div>

          {currentFilters.length > 0 && (
            <div className="form-row" style={{ marginBottom: 20 }}>
              {currentFilters.includes('batch') && (
                <div className="form-group"><label className="form-label">Batch</label><select className="form-select" value={filters.batch || ''} onChange={e => handleFilterChange('batch', e.target.value)}><option value="">All Batches</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.degree})</option>)}</select></div>
              )}
              {currentFilters.includes('section') && (
                <div className="form-group"><label className="form-label">Section</label><select className="form-select" value={filters.section || ''} onChange={e => handleFilterChange('section', e.target.value)}><option value="">All Sections</option>{sections.filter(s => !filters.batch || s.batchId === filters.batch).map(s => <option key={s.id} value={s.id}>{s.name} — {s.batch?.name}</option>)}</select></div>
              )}
              {currentFilters.includes('course') && (
                <div className="form-group"><label className="form-label">Course</label><select className="form-select" value={filters.course || ''} onChange={e => handleFilterChange('course', e.target.value)}><option value="">All Courses</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></div>
              )}
              {currentFilters.includes('semester') && (
                <div className="form-group"><label className="form-label">Semester</label><select className="form-select" value={filters.semester || ''} onChange={e => handleFilterChange('semester', e.target.value)}><option value="">All Semesters</option>{[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}</select></div>
              )}
              {currentFilters.includes('academicYear') && (
                <div className="form-group"><label className="form-label">Academic Year</label><select className="form-select" value={filters.academicYear || ''} onChange={e => handleFilterChange('academicYear', e.target.value)}><option value="">All Years</option>{['2025-26','2024-25','2023-24'].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              )}
            </div>
          )}

          {/* Format */}
          <div style={{ marginBottom: 20 }}>
            <label className="form-label">Export Format</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ val: 'csv', icon: <BarChart2 size={24} />, label: 'CSV', sub: 'Spreadsheet' }, { val: 'pdf', icon: <FileText size={24} />, label: 'PDF', sub: 'Print-ready' }].map(f => (
                <label key={f.val} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 'var(--r-md)', cursor: 'pointer', border: format === f.val ? '2px solid var(--accent)' : '2px solid var(--border)', background: format === f.val ? 'var(--accent-soft)' : 'var(--surface)', transition: 'all .15s' }}>
                  <input type="radio" name="format" value={f.val} checked={format === f.val} onChange={() => setFormat(f.val)} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 20 }}>{f.icon}</span>
                  <div><div style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</div><div style={{ fontSize: 12, color: 'var(--faint)' }}>{f.sub}</div></div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="rd-btn rd-btn-primary" onClick={handleGenerate} disabled={loading}>
              {loading ? <><div className="spinner" /> Generating…</> : <><Icon name="download" /> Generate & Download</>}
            </button>
            {message && <span style={{ fontSize: 14, color: messageType === 'success' ? 'var(--good)' : 'var(--bad)', fontWeight: 500 }}>{message}</span>}
          </div>
        </div>
      )}

      {!selectedReport && (
        <div className="rd-card rd-card-pad fade-up" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ marginBottom: 16, color: 'var(--accent)' }}><BarChart2 size={48} /></div>
          <h3 style={{ color: 'var(--muted)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Select a Report Type</h3>
          <p style={{ color: 'var(--faint)', fontSize: 14 }}>Choose a report type above to configure filters and generate your report</p>
        </div>
      )}
    </div>
  );
}
