import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  HiOutlineBriefcase, HiOutlineSearch, HiOutlineAcademicCap,
  HiOutlineDocumentDownload, HiOutlineEye, HiOutlineArrowLeft,
  HiOutlineOfficeBuilding, HiOutlineCollection, HiOutlineCalendar
} from 'react-icons/hi';

export default function AlumniDatabase() {
  const [alumni, setAlumni] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revertTarget, setRevertTarget] = useState(null);
  const [reverting, setReverting] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal State
  const [previewAlumni, setPreviewAlumni] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    graduationDate: '',
    graduationYear: '',
    currentEmployer: '',
    currentJobTitle: '',
    linkedInUrl: '',
    alumniEmail: '',
    notes: '',
  });

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const params = {
        search,
        departmentId: selectedDept,
        batchId: selectedBatch,
        graduationYear: selectedYear,
        page,
        limit: 15,
      };

      const [alumniRes, statsRes, deptRes, batchRes] = await Promise.all([
        client.get('/admin/alumni', { params }),
        client.get('/admin/alumni/stats'),
        client.get('/admin/departments'),
        client.get('/admin/batches')
      ]);

      setAlumni(alumniRes.data.alumni);
      setTotalPages(alumniRes.data.totalPages);
      setTotalCount(alumniRes.data.total);

      setStats(statsRes.data.stats);
      setDepartments(deptRes.data.departments);
      setBatches(batchRes.data.batches);
    } catch (err) {
      console.error('Failed to fetch alumni data:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedBatch, selectedYear, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevert = async () => {
    if (!revertTarget) return;
    setReverting(true);
    try {
      await client.post(`/admin/alumni/${revertTarget}/revert`);
      setRevertTarget(null);
      if (previewAlumni?.id === revertTarget) {
        setPreviewAlumni(null);
      }
      fetchData();
      alert('Alumni status reverted back to active student successfully');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to revert alumni status');
    } finally {
      setReverting(false);
    }
  };

  const handleOpenPreview = (student) => {
    setPreviewAlumni(student);
    setEditing(false);
    const profile = student.alumniProfile || {};
    setEditForm({
      graduationDate: profile.graduationDate ? new Date(profile.graduationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      graduationYear: profile.graduationYear || new Date().getFullYear(),
      currentEmployer: profile.currentEmployer || '',
      currentJobTitle: profile.currentJobTitle || '',
      linkedInUrl: profile.linkedInUrl || '',
      alumniEmail: profile.alumniEmail || '',
      notes: profile.notes || '',
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await client.put(`/admin/alumni/${previewAlumni.id}`, editForm);
      setEditing(false);
      // Fetch fresh details and refresh preview
      const { data } = await client.get(`/admin/alumni`, {
        params: { search: previewAlumni.enrollmentNo }
      });
      if (data.alumni && data.alumni.length > 0) {
        setPreviewAlumni(data.alumni[0]);
      }
      fetchData();
      alert('Alumni profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (alumni.length === 0) {
      alert('No alumni records available to export');
      return;
    }

    const headers = [
      'Enrollment No', 'First Name', 'Last Name', 'Email', 'Phone',
      'Degree', 'Batch', 'Department', 'Semester', 'Status',
      'Graduation Date', 'Graduation Year', 'Current Employer', 'Current Job Title',
      'Alumni Email', 'LinkedIn URL', 'Notes'
    ];

    const rows = alumni.map(a => {
      const p = a.alumniProfile || {};
      return [
        a.enrollmentNo,
        a.firstName,
        a.lastName,
        a.user?.email || '',
        a.phone,
        a.batch?.degree || '',
        a.batch?.name || '',
        a.batch?.department?.name || '',
        a.semester,
        a.status,
        p.graduationDate ? new Date(p.graduationDate).toLocaleDateString() : '',
        p.graduationYear || '',
        p.currentEmployer || '',
        p.currentJobTitle || '',
        p.alumniEmail || '',
        p.linkedInUrl || '',
        p.notes || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Alumni_Export_${new Date().getFullYear()}-${new Date().getMonth()+1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && page === 1 && alumni.length === 0) {
    return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  }

  // Calculate employment rate
  const total = stats?.totalAlumni || 0;
  const employed = stats?.employment?.employed || 0;
  const rate = total > 0 ? Math.round((employed / total) * 100) : 0;

  // Generate graduation years list for filter
  const currentYear = new Date().getFullYear();
  const graduationYears = [];
  for (let y = currentYear; y >= currentYear - 6; y--) {
    graduationYears.push(y);
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Alumni Database</h1>
          <p className="page-subtitle">Track and manage graduated student profiles</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
          <HiOutlineDocumentDownload /> Export CSV
        </button>
      </div>

      {/* Stats Section */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card slide-up">
          <div className="stat-icon purple">
            <HiOutlineAcademicCap />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.totalAlumni || 0}</div>
            <div className="stat-label">Total Alumni</div>
          </div>
        </div>

        <div className="stat-card slide-up" style={{ animationDelay: '50ms' }}>
          <div className="stat-icon green">
            <HiOutlineBriefcase />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.employment?.employed || 0}</div>
            <div className="stat-label">Employed</div>
          </div>
        </div>

        <div className="stat-card slide-up" style={{ animationDelay: '100ms' }}>
          <div className="stat-icon amber">
            <HiOutlineBriefcase />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.employment?.unemployed || 0}</div>
            <div className="stat-label">Higher Ed / Seeking / Unspecified</div>
          </div>
        </div>

        <div className="stat-card slide-up" style={{ animationDelay: '150ms' }}>
          <div className="stat-icon sky">
            <HiOutlineBriefcase />
          </div>
          <div className="stat-info">
            <div className="stat-value">{rate}%</div>
            <div className="stat-label">Employment Rate</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            
            {/* Search */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlineSearch style={{ fontSize: '0.9rem' }} /> Search
              </label>
              <input
                className="form-input"
                placeholder="Search name, enrollment, company..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Department */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlineOfficeBuilding style={{ fontSize: '0.9rem' }} /> Department
              </label>
              <select
                className="form-select"
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setSelectedBatch(''); setPage(1); }}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Batch */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlineCollection style={{ fontSize: '0.9rem' }} /> Batch
              </label>
              <select
                className="form-select"
                value={selectedBatch}
                onChange={(e) => { setSelectedBatch(e.target.value); setPage(1); }}
              >
                <option value="">All Batches</option>
                {batches
                  .filter(b => !selectedDept || b.departmentId === selectedDept)
                  .map(b => (
                    <option key={b.id} value={b.id}>{b.degree} — {b.name}</option>
                  ))}
              </select>
            </div>

            {/* Graduation Year */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlineCalendar style={{ fontSize: '0.9rem' }} /> Graduation Year
              </label>
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setPage(1); }}
              >
                <option value="">All Years</option>
                {graduationYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* Main Datatable */}
      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Department & Batch</th>
                <th>Graduation</th>
                <th>Current Employer</th>
                <th>Job Title</th>
                <th>LinkedIn</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alumni.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <p>No alumni profiles found matching the filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                alumni.map((alum) => {
                  const prof = alum.alumniProfile || {};
                  return (
                    <tr key={alum.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem', fontWeight: 600 }}>
                            {alum.firstName.charAt(0)}{alum.lastName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>
                              {alum.firstName} {alum.lastName}
                            </div>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                              {alum.enrollmentNo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{alum.batch?.department?.name || '—'}</div>
                        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
                          {alum.batch?.degree} {alum.batch?.name}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-purple)' }}>
                          Class of {prof.graduationYear || '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>
                          {prof.graduationDate ? new Date(prof.graduationDate).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{prof.currentEmployer || '—'}</td>
                      <td>{prof.currentJobTitle || '—'}</td>
                      <td>
                        {prof.linkedInUrl ? (
                          <a
                            href={prof.linkedInUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="badge badge-sky"
                            style={{ cursor: 'pointer', textDecoration: 'none' }}
                          >
                            LinkedIn
                          </a>
                        ) : '—'}
                      </td>
                      <td className="actions" style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenPreview(alum)}
                          title="View Profile"
                        >
                          <HiOutlineEye />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => setRevertTarget(alum.id)}
                          title="Revert to Active Student"
                        >
                          <HiOutlineArrowLeft />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--color-gray-100)' }}>
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)' }}>
              Showing {alumni.length} of {totalCount} alumni
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alumni Detail Modal */}
      {previewAlumni && (
        <div className="modal-overlay" onClick={() => setPreviewAlumni(null)} style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2>Alumni Details</h2>
              <button className="btn btn-ghost" onClick={() => setPreviewAlumni(null)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              {/* Header profile cards */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-gray-100)' }}>
                <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.4rem', fontWeight: 600 }}>
                  {previewAlumni.firstName.charAt(0)}{previewAlumni.lastName.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, margin: 0 }}>
                    {previewAlumni.firstName} {previewAlumni.lastName}
                  </h3>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)', flexWrap: 'wrap' }}>
                    <span className="badge badge-sky">{previewAlumni.enrollmentNo}</span>
                    <span className="badge badge-purple">Class of {previewAlumni.alumniProfile?.graduationYear}</span>
                    <span className="badge badge-gray">{previewAlumni.batch?.department?.name}</span>
                  </div>
                </div>
              </div>

              {editing ? (
                <form onSubmit={handleUpdateProfile}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Graduation Date *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={editForm.graduationDate}
                        onChange={(e) => setEditForm({ ...editForm, graduationDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Graduation Year *</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.graduationYear}
                        onChange={(e) => setEditForm({ ...editForm, graduationYear: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="form-group">
                      <label className="form-label">Current Employer</label>
                      <input
                        className="form-input"
                        value={editForm.currentEmployer}
                        onChange={(e) => setEditForm({ ...editForm, currentEmployer: e.target.value })}
                        placeholder="e.g. Google"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Current Job Title</label>
                      <input
                        className="form-input"
                        value={editForm.currentJobTitle}
                        onChange={(e) => setEditForm({ ...editForm, currentJobTitle: e.target.value })}
                        placeholder="e.g. Software Engineer"
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="form-group">
                      <label className="form-label">Alumni Email</label>
                      <input
                        type="email"
                        className="form-input"
                        value={editForm.alumniEmail}
                        onChange={(e) => setEditForm({ ...editForm, alumniEmail: e.target.value })}
                        placeholder="e.g. name@alumni.com"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">LinkedIn Profile URL</label>
                      <input
                        type="url"
                        className="form-input"
                        value={editForm.linkedInUrl}
                        onChange={(e) => setEditForm({ ...editForm, linkedInUrl: e.target.value })}
                        placeholder="e.g. https://linkedin.com/in/username"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-input"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Notes on post-graduation pursuits..."
                      rows={2}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                    <div>
                      <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                        Current Employer
                      </h4>
                      <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>
                        {previewAlumni.alumniProfile?.currentEmployer || '—'}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                        Current Job Title
                      </h4>
                      <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>
                        {previewAlumni.alumniProfile?.currentJobTitle || '—'}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                        Graduation Date
                      </h4>
                      <div>
                        {previewAlumni.alumniProfile?.graduationDate ? new Date(previewAlumni.alumniProfile.graduationDate).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                        Alumni Email
                      </h4>
                      <div>{previewAlumni.alumniProfile?.alumniEmail || '—'}</div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                        LinkedIn Profile
                      </h4>
                      <div>
                        {previewAlumni.alumniProfile?.linkedInUrl ? (
                          <a href={previewAlumni.alumniProfile.linkedInUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                            View LinkedIn profile
                          </a>
                        ) : '—'}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                        Student Phone
                      </h4>
                      <div>{previewAlumni.phone}</div>
                    </div>
                  </div>

                  {previewAlumni.alumniProfile?.notes && (
                    <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)' }}>
                      <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                        Notes
                      </h4>
                      <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--color-gray-600)' }}>
                        {previewAlumni.alumniProfile.notes}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', borderTop: '1px solid var(--color-gray-100)', paddingTop: 'var(--space-4)' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => setRevertTarget(previewAlumni.id)}
                    >
                      Revert to Active Student
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => navigate(`/admin/students/${previewAlumni.id}`)}
                    >
                      View Academic Record
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setEditing(true)}
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revert Confirm Dialog */}
      <ConfirmDialog
        open={!!revertTarget}
        title="Revert Alumni Status?"
        message="This will change the student status back to 'active' and permanently delete their post-graduation profile data. Are you sure you want to proceed?"
        onConfirm={handleRevert}
        onCancel={() => setRevertTarget(null)}
        loading={reverting}
      />
    </div>
  );
}
