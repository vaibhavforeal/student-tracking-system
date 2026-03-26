import { useLocation } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineBell } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/students': 'Students',
  '/admin/staff': 'Staff',
  '/admin/departments': 'Departments',
  '/admin/batches': 'Batches',
  '/admin/sections': 'Sections',
  '/admin/courses': 'Courses',
  '/admin/users': 'Users',
  '/teacher': 'Dashboard',
  '/teacher/attendance': 'Attendance',
  '/teacher/marks': 'Marks',
  '/student': 'Dashboard',
  '/student/marks': 'My Marks',
  '/student/attendance': 'My Attendance',
};

export default function Navbar({ onMenuToggle }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="menu-toggle" onClick={onMenuToggle}>
          <HiOutlineMenu />
        </button>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="nav-actions">
        <button className="btn btn-ghost" title="Notifications">
          <HiOutlineBell style={{ fontSize: '1.25rem' }} />
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          background: 'var(--color-gray-50)',
          borderRadius: 'var(--radius-full)',
        }}>
          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'var(--color-gray-700)' }}>
            {user?.name}
          </span>
          <span className="badge badge-sky">{user?.role}</span>
        </div>
      </div>
    </header>
  );
}
