import { useState, useEffect } from 'react';
import client from '../../api/client';
import {
  HiOutlineUser, HiOutlineMail, HiOutlinePhone, HiOutlineCalendar,
  HiOutlineLocationMarker, HiOutlineAcademicCap, HiOutlineHeart,
  HiOutlineStar, HiOutlineBookOpen, HiOutlineSparkles,
} from 'react-icons/hi';

export default function Profile() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/student/profile')
      .then((res) => setStudent(res.data.student))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  if (!student) return <div className="card"><div className="card-body"><div className="empty-state"><p>Profile not found.</p></div></div></div>;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const InfoItem = ({ icon: Icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
      <Icon size={18} style={{ color: 'var(--color-gray-400)', flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontWeight: 500, color: 'var(--color-gray-800)' }}>{value || '—'}</div>
      </div>
    </div>
  );

  const Section = ({ title, icon: Icon, children }) => (
    <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
      <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Icon size={20} style={{ color: 'var(--color-sky-500)' }} />
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>{title}</h3>
      </div>
      <div style={{ padding: 'var(--space-5)' }}>{children}</div>
    </div>
  );

  const levelBadge = { beginner: 'badge badge-gray', intermediate: 'badge badge-sky', advanced: 'badge badge-purple' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p className="page-subtitle">Verify your personal and academic details</p>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ marginBottom: 'var(--space-5)', overflow: 'visible' }}>
        <div style={{ background: 'var(--gradient-primary)', padding: 'var(--space-8) var(--space-6) var(--space-12)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />
        <div style={{ padding: '0 var(--space-6) var(--space-6)', marginTop: '-40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-accent)', border: '4px solid var(--color-white)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-white)', fontSize: 'var(--font-2xl)', fontWeight: 700,
              boxShadow: 'var(--shadow-lg)',
            }}>
              {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>{student.firstName} {student.lastName}</h2>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-1)' }}>
                <span className="badge badge-sky">{student.enrollmentNo}</span>
                <span className="badge badge-purple">{student.batch?.department?.name}</span>
                <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>{student.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <Section title="Personal Information" icon={HiOutlineUser}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-5)' }}>
          <InfoItem icon={HiOutlineMail} label="Email" value={student.user?.email} />
          <InfoItem icon={HiOutlinePhone} label="Phone" value={student.phone} />
          <InfoItem icon={HiOutlineCalendar} label="Date of Birth" value={fmt(student.dob)} />
          <InfoItem icon={HiOutlineUser} label="Gender" value={student.gender} />
          <InfoItem icon={HiOutlineLocationMarker} label="Address" value={student.address} />
          <InfoItem icon={HiOutlineAcademicCap} label="Batch" value={`${student.batch?.degree} — ${student.batch?.name}`} />
          <InfoItem icon={HiOutlineBookOpen} label="Section" value={student.section?.name} />
          <InfoItem icon={HiOutlineAcademicCap} label="Semester" value={student.semester} />
        </div>
      </Section>

      {/* Parents / Guardians */}
      {student.parents?.length > 0 && (
        <Section title="Parents / Guardians" icon={HiOutlineHeart}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
            {student.parents.map((p) => (
              <div key={p.id} style={{ padding: 'var(--space-4)', border: '1px solid var(--color-gray-100)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>{p.name}</div>
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <span>Relation: <strong style={{ color: 'var(--color-gray-700)' }}>{p.relation}</strong></span>
                  <span>Phone: <strong style={{ color: 'var(--color-gray-700)' }}>{p.phone}</strong></span>
                  <span>Email: <strong style={{ color: 'var(--color-gray-700)' }}>{p.email}</strong></span>
                  <span>Occupation: <strong style={{ color: 'var(--color-gray-700)' }}>{p.occupation}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Previous Education */}
      {student.previousEducation?.length > 0 && (
        <Section title="Previous Education" icon={HiOutlineBookOpen}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Level</th><th>Institution</th><th>Board</th><th>Percentage</th><th>Year of Passing</th></tr></thead>
              <tbody>
                {student.previousEducation.map((e) => (
                  <tr key={e.id}>
                    <td><span className="badge badge-sky">{e.level === 'sslc_10th' ? 'SSLC / 10th' : 'PU / 12th'}</span></td>
                    <td style={{ fontWeight: 500 }}>{e.institution}</td>
                    <td>{e.board || '—'}</td>
                    <td style={{ fontWeight: 600, color: Number(e.percentage) >= 75 ? '#16a34a' : Number(e.percentage) >= 50 ? '#d97706' : '#dc2626' }}>{Number(e.percentage).toFixed(1)}%</td>
                    <td>{e.yearOfPass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Skills */}
      {student.skills?.length > 0 && (
        <Section title="Skills" icon={HiOutlineStar}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {student.skills.map((s) => (
              <div key={s.id} style={{ padding: 'var(--space-2) var(--space-4)', border: '1px solid var(--color-gray-100)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontWeight: 500, fontSize: 'var(--font-sm)' }}>{s.name}</span>
                <span className={levelBadge[s.level] || 'badge badge-gray'}>{s.level}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Hobbies & Strengths */}
      {student.hobbies?.length > 0 && (
        <Section title="Hobbies & Strengths" icon={HiOutlineSparkles}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {student.hobbies.map((h) => (
              <span key={h.id} className={h.type === 'strength' ? 'badge badge-purple' : 'badge badge-sky'} style={{ padding: 'var(--space-1) var(--space-3)' }}>
                {h.name}
              </span>
            ))}
          </div>
        </Section>
      )}

    </div>
  );
}
