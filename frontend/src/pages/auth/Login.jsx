import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { HiOutlineAcademicCap, HiOutlineUserGroup, HiOutlineShieldCheck } from 'react-icons/hi';

const ROLES = [
  { key: 'student', label: 'Student', icon: HiOutlineAcademicCap },
  { key: 'teacher', label: 'Teacher', icon: HiOutlineUserGroup },
  { key: 'admin', label: 'Admin', icon: HiOutlineShieldCheck },
];

export default function Login() {
  const [role, setRole] = useState('student');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credentials =
        role === 'student'
          ? { role, enrollmentNo, dob }
          : { role, email, password };

      const user = await login(credentials);
      const dashMap = { admin: '/admin', teacher: '/teacher', student: '/student' };
      navigate(dashMap[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isStudent = role === 'student';

  return (
    <div className="login-page">
      <div className="login-card slide-up">
        <div className="login-brand">
          <img src="/logo.png" alt="N.E.S. Institute Logo" className="brand-logo-lg" />
          <h1>N.E.S.I.A.S</h1>
          <p>N.E.S. Institute of Advanced Studies, Shimoga</p>
        </div>

        {/* ── Role Switcher ── */}
        <div className="role-switcher">
          {ROLES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`role-tab ${role === key ? 'active' : ''}`}
              onClick={() => { setRole(key); setError(''); }}
            >
              <Icon className="role-tab-icon" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          {isStudent ? (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="enrollmentNo">Enrollment Number</label>
                <input
                  id="enrollmentNo"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 2024CSE001"
                  value={enrollmentNo}
                  onChange={(e) => setEnrollmentNo(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="dob">Date of Birth</label>
                <input
                  id="dob"
                  type="date"
                  className="form-input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder={role === 'admin' ? 'admin@sts.com' : 'teacher@sts.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
