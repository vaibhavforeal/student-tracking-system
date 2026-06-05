import { useState, useEffect } from 'react';
import client from '../../api/client';
import {
  HiOutlineUserGroup, HiOutlineAcademicCap, HiOutlineDocumentText,
  HiOutlineDownload, HiOutlineBookOpen, HiOutlineHeart,
} from 'react-icons/hi';

const EDUCATION_LEVELS = {
  bachelors: "Bachelor's", masters: "Master's", mphil: 'M.Phil',
  phd: 'Ph.D', diploma: 'Diploma', other: 'Other',
};

const DOCUMENT_TYPES = {
  aadhaar: 'Aadhaar Card', pan: 'PAN Card', passport: 'Passport',
  driving_license: 'Driving License', voter_id: 'Voter ID',
  degree_certificate: 'Degree Certificate', experience_certificate: 'Experience Certificate',
  other: 'Other',
};

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function ProfileField({ label, value }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>{label}</div>
      <div style={{ fontSize: 'var(--font-base)', color: 'var(--color-gray-800)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

export default function TeacherProfile() {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await client.get('/teacher/my-profile');
        setStaff(data.staff);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  if (!staff) return <div className="empty-state"><p>Staff profile not found. Please contact admin.</p></div>;

  const pd = staff.personalDetails || {};
  const education = staff.education || [];
  const documents = staff.documents || [];
  const assignments = staff.classAssignments || [];



  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p className="page-subtitle">
            <span className="badge badge-purple">{staff.employeeId}</span>
            {' '}
            {staff.designation}
            {staff.department && ` • ${staff.department.name}`}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
        {/* Personal Details */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <HiOutlineUserGroup size={22} style={{ color: 'var(--color-sky-500)' }} />
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Personal Details</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
              <ProfileField label="Full Name" value={staff.user?.name} />
              <ProfileField label="Employee ID" value={staff.employeeId} />
              <ProfileField label="Email" value={staff.user?.email} />
              <ProfileField label="Phone" value={staff.phone} />
              <ProfileField label="Alternate Phone" value={pd.alternatePhone} />
              <ProfileField label="Date of Birth" value={pd.dob ? new Date(pd.dob).toLocaleDateString() : null} />
              <ProfileField label="Gender" value={pd.gender} />
              <ProfileField label="Blood Group" value={pd.bloodGroup} />
              <ProfileField label="Joining Date" value={pd.joiningDate ? new Date(pd.joiningDate).toLocaleDateString() : null} />
              <ProfileField label="Address" value={pd.address} />
              <ProfileField label="City" value={pd.city} />
              <ProfileField label="State" value={pd.state} />
              <ProfileField label="Pincode" value={pd.pincode} />
              <ProfileField label="Emergency Contact" value={pd.emergencyContactName} />
              <ProfileField label="Emergency Phone" value={pd.emergencyContactPhone} />
              <ProfileField label="Designation" value={staff.designation} />
              <ProfileField label="Department" value={staff.department?.name} />
            </div>
          </div>
        </div>

        {/* Health & Conditions */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <HiOutlineHeart size={22} style={{ color: 'var(--color-danger)' }} />
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Health & Conditions</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
              <ProfileField label="Blood Group" value={pd.bloodGroup} />
              <ProfileField label="Emergency Contact" value={pd.emergencyContactName} />
              <ProfileField label="Emergency Phone" value={pd.emergencyContactPhone} />
            </div>
            {/* Diseases */}
            {Array.isArray(pd.diseases) && pd.diseases.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>Diseases / Medical Conditions</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {pd.diseases.map((d, i) => (
                    <span key={i} className="badge badge-orange">{d}</span>
                  ))}
                </div>
              </div>
            )}
            {/* Allergies */}
            {Array.isArray(pd.allergies) && pd.allergies.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>Allergies</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {pd.allergies.map((a, i) => (
                    <span key={i} className="badge badge-red">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {!pd.bloodGroup && !(Array.isArray(pd.diseases) && pd.diseases.length > 0) && !(Array.isArray(pd.allergies) && pd.allergies.length > 0) && (
              <div className="empty-state" style={{ marginTop: 'var(--space-3)' }}>
                <p>No health information on file. Contact admin to add.</p>
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <HiOutlineAcademicCap size={22} style={{ color: 'var(--color-purple-500)' }} />
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Education History</h3>
            </div>
            {education.length === 0 ? (
              <div className="empty-state"><p>No education records on file. Contact admin to add.</p></div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Degree & Specialization</th>
                      <th>Institution / University</th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {education.map((edu) => (
                      <tr key={edu.id}>
                        <td><span className="badge badge-purple">{EDUCATION_LEVELS[edu.level] || edu.level}</span></td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{edu.degree}</div>
                          {edu.specialization && <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>{edu.specialization}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{edu.institution}</div>
                          {edu.university && <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>{edu.university}</div>}
                        </td>
                        <td>{edu.yearOfPass}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Identity Documents */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <HiOutlineDocumentText size={22} style={{ color: 'var(--color-sky-600)' }} />
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>Identity Documents</h3>
            </div>
            {documents.length === 0 ? (
              <div className="empty-state"><p>No identity documents on file. Contact admin to upload.</p></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
                {documents.map((doc) => (
                  <div key={doc.id} style={{
                    padding: 'var(--space-4) var(--space-5)',
                    border: '1px solid var(--color-gray-100)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <span className="badge badge-sky" style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>{DOCUMENT_TYPES[doc.type] || doc.type}</span>
                    <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{doc.title}</div>
                    {doc.documentNumber && (
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)', marginTop: 'var(--space-1)' }}>
                        No: {doc.documentNumber}
                      </div>
                    )}
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', margin: 'var(--space-1) 0 var(--space-3)' }}>
                      {doc.fileName} • {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>
                    <a
                      href={`${API_BASE_URL}${doc.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}
                    >
                      <HiOutlineDownload /> View / Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assigned Courses */}
        {assignments.length > 0 && (
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                <HiOutlineBookOpen size={22} style={{ color: 'var(--color-purple-600)' }} />
                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>My Assigned Courses</h3>
              </div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Course</th><th>Section</th><th>Batch</th><th>Academic Year</th></tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="badge badge-purple">{a.course?.code}</span>
                          <span style={{ marginLeft: 'var(--space-2)', fontWeight: 500 }}>{a.course?.name}</span>
                        </td>
                        <td>{a.section?.name}</td>
                        <td>{a.section?.batch?.degree} — {a.section?.batch?.name}</td>
                        <td><span className="badge badge-sky">{a.academicYear}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
