import { useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineBell, HiOutlineArrowLeft } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';
import ThemeToggle from './ThemeToggle';

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/students': 'Students',
  '/admin/staff': 'Staff',
  '/admin/departments': 'Departments',
  '/admin/batches': 'Batches',
  '/admin/sections': 'Sections',
  '/admin/courses': 'Courses',
  '/admin/assignments': 'Assignments',
  '/admin/users': 'Users',
  '/admin/reports': 'Reports',
  '/admin/analytics': 'Analytics',
  '/admin/trash': 'Trash',
  '/admin/skill-courses': 'Skill Courses',
  '/admin/promotion': 'Semester Promotion',
  '/admin/feedback': 'Student Feedback',

  '/teacher': 'Dashboard',
  '/teacher/students': 'Students',
  '/teacher/attendance': 'Attendance',
  '/teacher/marks': 'Marks',
  '/teacher/reports': 'Reports',

  '/student': 'Dashboard',
  '/student/marks': 'My Marks',
  '/student/attendance': 'My Attendance',
  '/student/profile': 'My Profile',
  '/student/skill-courses': 'Skill Courses',
  '/student/academic': 'Academic Record',
  '/student/feedback': 'Space for Thought',
};

const getPageTitle = (pathname) => {
  // Exact matches first
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  // Dynamic/nested matches
  if (pathname.match(/^\/admin\/students\/[^/]+\/academic$/)) return 'Academic Record';
  if (pathname.match(/^\/admin\/students\/[^/]+$/)) return 'Student Details';
  if (pathname.match(/^\/teacher\/students\/[^/]+\/academic$/)) return 'Academic Record';
  if (pathname.match(/^\/teacher\/students\/[^/]+$/)) return 'Student Details';

  return 'Dashboard';
};

export default function Navbar({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const title = getPageTitle(location.pathname);
  
  // A page is a dashboard root if it's the role's base dashboard index
  const isDashboardRoot = ['/admin', '/teacher', '/student'].includes(location.pathname);

  const goBack = () => {
    // If there is SPA navigation history, go back in history
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      // Fallback: navigate to the appropriate dashboard root for their role
      const role = user?.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'teacher') navigate('/teacher');
      else if (role === 'student') navigate('/student');
      else navigate('/');
    }
  };

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button className="menu-toggle" onClick={onMenuToggle} title="Toggle Sidebar">
          <HiOutlineMenu />
        </button>
        
        {!isDashboardRoot && (
          <button 
            className="btn btn-ghost back-button" 
            onClick={goBack}
            title="Go Back"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-gray-600)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <HiOutlineArrowLeft style={{ fontSize: '1.25rem' }} />
          </button>
        )}
        
        <h1 className="page-title">{title}</h1>
      </div>
      
      <div className="nav-actions">
        <ThemeToggle />
        <button className="btn btn-ghost" title="Notifications">
          <HiOutlineBell style={{ fontSize: '1.25rem' }} />
        </button>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
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
