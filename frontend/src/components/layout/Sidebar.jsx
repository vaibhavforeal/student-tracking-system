import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import Icon from '../ui/Icon';
import {
  Home, GraduationCap, Briefcase, Users, Building2,
  Layers, ClipboardList, BookOpen, Link2, Lightbulb,
  ArrowUp, Trash2, FileText, Sparkles, Mail,
  MessageSquare, FileSpreadsheet, LogOut, BarChart3,
  ScanBarcode,
} from 'lucide-react';

/* ─── Admin nav grouped into sections ─── */
const adminNavGroups = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', icon: 'grid', label: 'Dashboard', end: true },
    ],
  },
  {
    title: 'Academics',
    items: [
      { to: '/admin/students', icon: 'cap', label: 'Students' },
      { to: '/admin/verify', icon: 'scan', label: 'Verify Student' },
      { to: '/admin/alumni', icon: 'briefcase', label: 'Alumni' },
      { to: '/admin/staff', icon: 'users', label: 'Staff' },
      { to: '/admin/departments', icon: 'building', label: 'Departments' },
      { to: '/admin/batches', icon: 'layers', label: 'Batches' },
      { to: '/admin/sections', icon: 'clipboard', label: 'Sections' },
      { to: '/admin/courses', icon: 'book', label: 'Courses' },
      { to: '/admin/assignments', icon: 'link', label: 'Class Mapping' },
      { to: '/admin/skill-courses', icon: 'bulb', label: 'Skill Courses' },
    ],
  },
  {
    title: 'Insights & Engagement',
    items: [
      { to: '/admin/reports', icon: 'report', label: 'Reports' },
      { to: '/admin/analytics', icon: 'spark', label: 'Analytics' },
      { to: '/admin/feedback', icon: 'mail', label: 'Student Feedback' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/users', icon: 'key', label: 'Users' },
      { to: '/admin/trash', icon: 'trash', label: 'Trash' },
    ],
  },
];

const teacherLinks = [
  { to: '/teacher', icon: Home, label: 'Dashboard', end: true },
  { to: '/teacher/students', icon: GraduationCap, label: 'Students' },
  { to: '/teacher/verify', icon: ScanBarcode, label: 'Verify Student' },
  { to: '/teacher/attendance', icon: ClipboardList, label: 'Attendance' },
  { to: '/teacher/marks', icon: BarChart3, label: 'Marks' },
  { to: '/teacher/profile', icon: Users, label: 'My Profile' },
  { to: '/teacher/reports', icon: FileText, label: 'Reports' },
];

const studentLinks = [
  { to: '/student', icon: Home, label: 'Dashboard', end: true },
  { to: '/student/marks', icon: BarChart3, label: 'My Marks' },
  { to: '/student/attendance', icon: ClipboardList, label: 'My Attendance' },
  { to: '/student/profile', icon: Users, label: 'My Profile' },
  { to: '/student/academic', icon: FileSpreadsheet, label: 'Academic Record' },
  { to: '/student/skill-courses', icon: Lightbulb, label: 'Skill Courses' },
  { to: '/student/feedback', icon: MessageSquare, label: 'Space for Thought' },
];

export default function Sidebar({ isOpen, onClose }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user?.role === 'admin';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <img src="/logo.png" alt="N.E.S. Institute Logo" className="brand-logo" />
        <span className="brand-name">N.E.S.I.A.S</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {isAdmin ? (
          /* Admin: grouped navigation */
          adminNavGroups.map((group) => (
            <div className="nav-section" key={group.title}>
              <div className="nav-section-title">{group.title}</div>
              {group.items.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Icon name={link.icon} className="idata nav-icon" />
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))
        ) : (
          /* Teacher / Student: flat navigation */
          <div className="nav-section">
            <div className="nav-section-title">
              {user?.role === 'teacher' ? 'Teaching' : 'Academics'}
            </div>
            {(user?.role === 'teacher' ? teacherLinks : studentLinks).map((link) => {
              const LucideIcon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <LucideIcon className="idata nav-icon" />
                  {link.label}
                </NavLink>
              );
            })}
          </div>
        )}
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
          <LogOut className="idata" />
        </button>
      </div>
    </aside>
  );
}
