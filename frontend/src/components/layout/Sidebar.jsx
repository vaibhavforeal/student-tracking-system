import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import {
  HiOutlineHome, HiOutlineAcademicCap, HiOutlineUserGroup,
  HiOutlineOfficeBuilding, HiOutlineCollection, HiOutlineBookOpen,
  HiOutlineClipboardList, HiOutlineUsers, HiOutlineLogout, HiOutlineChartBar,
  HiOutlineDocumentReport, HiOutlineSparkles, HiOutlineTrash, HiOutlineLink,
  HiOutlineLightBulb, HiOutlineArrowUp, HiOutlineDocumentText,
} from 'react-icons/hi';

const adminLinks = [
  { to: '/admin', icon: HiOutlineHome, label: 'Dashboard', end: true },
  { to: '/admin/students', icon: HiOutlineAcademicCap, label: 'Students' },
  { to: '/admin/staff', icon: HiOutlineUserGroup, label: 'Staff' },
  { to: '/admin/departments', icon: HiOutlineOfficeBuilding, label: 'Departments' },
  { to: '/admin/batches', icon: HiOutlineCollection, label: 'Batches' },
  { to: '/admin/sections', icon: HiOutlineClipboardList, label: 'Sections' },
  { to: '/admin/courses', icon: HiOutlineBookOpen, label: 'Courses' },
  { to: '/admin/assignments', icon: HiOutlineLink, label: 'Assignments' },
  { to: '/admin/skill-courses', icon: HiOutlineLightBulb, label: 'Skill Courses' },
  { to: '/admin/promotion', icon: HiOutlineArrowUp, label: 'Promotion' },

  { to: '/admin/users', icon: HiOutlineUsers, label: 'Users' },
  { to: '/admin/trash', icon: HiOutlineTrash, label: 'Trash' },
  { to: '/admin/reports', icon: HiOutlineDocumentReport, label: 'Reports' },
  { to: '/admin/analytics', icon: HiOutlineSparkles, label: 'Analytics' },
];

const teacherLinks = [
  { to: '/teacher', icon: HiOutlineHome, label: 'Dashboard', end: true },
  { to: '/teacher/students', icon: HiOutlineAcademicCap, label: 'Students' },
  { to: '/teacher/attendance', icon: HiOutlineClipboardList, label: 'Attendance' },
  { to: '/teacher/marks', icon: HiOutlineChartBar, label: 'Marks' },
  { to: '/teacher/reports', icon: HiOutlineDocumentReport, label: 'Reports' },
];

const studentLinks = [
  { to: '/student', icon: HiOutlineHome, label: 'Dashboard', end: true },
  { to: '/student/marks', icon: HiOutlineChartBar, label: 'My Marks' },
  { to: '/student/attendance', icon: HiOutlineClipboardList, label: 'My Attendance' },
  { to: '/student/profile', icon: HiOutlineUsers, label: 'My Profile' },
  { to: '/student/academic', icon: HiOutlineDocumentText, label: 'Academic Record' },
  { to: '/student/skill-courses', icon: HiOutlineLightBulb, label: 'Skill Courses' },
];

export default function Sidebar({ isOpen, onClose }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const links = user?.role === 'admin' ? adminLinks
    : user?.role === 'teacher' ? teacherLinks
    : studentLinks;

  const sectionTitle = user?.role === 'admin' ? 'Management'
    : user?.role === 'teacher' ? 'Teaching' : 'Academics';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <img src="/logo.png" alt="N.E.S. Institute Logo" className="brand-logo" />
        <span className="brand-name">N.E.S.I.A.S</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">{sectionTitle}</div>
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon className="nav-icon" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="user-info">
          <div className="user-name">{user?.name || 'User'}</div>
          <div className="user-role">{user?.role || 'Guest'}</div>
        </div>
        <button className="btn btn-ghost" onClick={logout} title="Logout">
          <HiOutlineLogout />
        </button>
      </div>
    </aside>
  );
}
