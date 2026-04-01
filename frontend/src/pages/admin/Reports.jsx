import { useState, useEffect } from 'react';
import client from '../../api/client';
import {
  HiOutlineDocumentText, HiOutlineClipboardList,
  HiOutlineChartBar, HiOutlineCollection,
  HiOutlineDownload, HiOutlineFilter,
} from 'react-icons/hi';

const reportTypes = [
  {
    id: 'student-performance',
    title: 'Student Performance',
    description: 'Marks summary with percentage for each student',
    icon: HiOutlineChartBar,
    color: 'sky',
    filters: ['batch', 'section', 'semester', 'academicYear'],
  },
  {
    id: 'attendance',
    title: 'Attendance Report',
    description: 'Attendance summary with present/absent counts',
    icon: HiOutlineClipboardList,
    color: 'purple',
    filters: ['batch', 'section', 'course'],
  },
  {
    id: 'marks',
    title: 'Marks Report',
    description: 'Detailed marks data for each assessment',
    icon: HiOutlineDocumentText,
    color: 'green',
    filters: ['batch', 'section', 'course', 'semester', 'academicYear'],
  },
  {
    id: 'batch-summary',
    title: 'Batch Summary',
    description: 'Aggregate statistics per batch',
    icon: HiOutlineCollection,
    color: 'amber',
    filters: [],
  },
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

  useEffect(() => {
    loadFilterData();
  }, []);

  const loadFilterData = async () => {
    try {
      const [bRes, sRes, cRes] = await Promise.all([
        client.get('/admin/batches').catch(() => ({ data: { batches: [] } })),
        client.get('/admin/sections').catch(() => ({ data: { sections: [] } })),
        client.get('/admin/courses').catch(() => ({ data: { courses: [] } })),
      ]);
      setBatches(bRes.data.batches || []);
      setSections(sRes.data.sections || []);
      setCourses(cRes.data.courses || []);
    } catch (err) {
      // Filters will be empty, that's fine
    }
  };

  const handleSelectReport = (report) => {
    setSelectedReport(report);
    setFilters({});
    setMessage('');
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedReport) return;
    setLoading(true);
    setMessage('');

    try {
      const params = new URLSearchParams();
      params.append('format', format);
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.append(key === 'batch' ? 'batchId' : key === 'section' ? 'sectionId' : key === 'course' ? 'courseId' : key, val);
      });

      const response = await client.get(`/reports/${selectedReport.id}?${params.toString()}`, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReport.id}-report.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage(`✅ ${selectedReport.title} report downloaded successfully!`);
    } catch (err) {
      setMessage(`❌ Failed to generate report. ${err.response?.data?.error || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const currentFilters = selectedReport?.filters || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">Generate and download reports in CSV or PDF format</p>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="report-type-grid">
        {reportTypes.map(report => (
          <div
            key={report.id}
            className={`report-type-card ${selectedReport?.id === report.id ? 'selected' : ''}`}
            onClick={() => handleSelectReport(report)}
            id={`report-${report.id}`}
          >
            <div className={`report-type-icon ${report.color}`}>
              <report.icon />
            </div>
            <div className="report-type-info">
              <h3>{report.title}</h3>
              <p>{report.description}</p>
            </div>
            {selectedReport?.id === report.id && (
              <div className="report-selected-check">✓</div>
            )}
          </div>
        ))}
      </div>

      {/* Filter & Generate Panel */}
      {selectedReport && (
        <div className="card report-config-panel">
          <div className="card-header">
            <h2 className="card-title">
              <HiOutlineFilter style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Configure Report: {selectedReport.title}
            </h2>
          </div>
          <div className="card-body">
            {/* Filters */}
            {currentFilters.length > 0 && (
              <div className="report-filters">
                <div className="form-row">
                  {currentFilters.includes('batch') && (
                    <div className="form-group">
                      <label className="form-label">Batch</label>
                      <select
                        className="form-select"
                        value={filters.batch || ''}
                        onChange={e => handleFilterChange('batch', e.target.value)}
                      >
                        <option value="">All Batches</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.degree})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {currentFilters.includes('section') && (
                    <div className="form-group">
                      <label className="form-label">Section</label>
                      <select
                        className="form-select"
                        value={filters.section || ''}
                        onChange={e => handleFilterChange('section', e.target.value)}
                      >
                        <option value="">All Sections</option>
                        {sections
                          .filter(s => !filters.batch || s.batchId === filters.batch)
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} — {s.batch?.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  {currentFilters.includes('course') && (
                    <div className="form-group">
                      <label className="form-label">Course</label>
                      <select
                        className="form-select"
                        value={filters.course || ''}
                        onChange={e => handleFilterChange('course', e.target.value)}
                      >
                        <option value="">All Courses</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {currentFilters.includes('semester') && (
                    <div className="form-group">
                      <label className="form-label">Semester</label>
                      <select
                        className="form-select"
                        value={filters.semester || ''}
                        onChange={e => handleFilterChange('semester', e.target.value)}
                      >
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {currentFilters.includes('academicYear') && (
                    <div className="form-group">
                      <label className="form-label">Academic Year</label>
                      <select
                        className="form-select"
                        value={filters.academicYear || ''}
                        onChange={e => handleFilterChange('academicYear', e.target.value)}
                      >
                        <option value="">All Years</option>
                        {['2025-26', '2024-25', '2023-24'].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Format Selection */}
            <div className="report-format-section">
              <label className="form-label">Export Format</label>
              <div className="report-format-options">
                <label className={`format-option ${format === 'csv' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={() => setFormat('csv')}
                  />
                  <span className="format-icon">📊</span>
                  <span className="format-label">CSV</span>
                  <span className="format-desc">Spreadsheet format</span>
                </label>
                <label className={`format-option ${format === 'pdf' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={() => setFormat('pdf')}
                  />
                  <span className="format-icon">📄</span>
                  <span className="format-label">PDF</span>
                  <span className="format-desc">Print-ready document</span>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <div className="report-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleGenerate}
                disabled={loading}
                id="generate-report-btn"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <HiOutlineDownload />
                    Generate & Download
                  </>
                )}
              </button>
            </div>

            {/* Message */}
            {message && (
              <div className={`report-message ${message.startsWith('✅') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prompt if no report selected */}
      {!selectedReport && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>Select a Report Type</h3>
          <p>Choose a report type above to configure filters and generate your report</p>
        </div>
      )}
    </div>
  );
}
