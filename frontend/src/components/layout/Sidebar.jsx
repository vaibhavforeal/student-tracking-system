import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import {
  Home, GraduationCap, Briefcase, Users, Building2,
  Layers, ClipboardList, BookOpen, Link2, Lightbulb,
  ArrowUp, Trash2, FileText, Sparkles, Mail,
  MessageSquare, FileSpreadsheet, LogOut, BarChart3,
  ScanBarcode,
} from 'lucide-react';

const adminLinks = [
  { to: '/admin', icon: Home, label: 'Dashboard', end: true },
  { to: '/admin/students', icon: GraduationCap, label: 'Students' },
  { to: '/admin/verify', icon: ScanBarcode, label: 'Verify Student' },
  { to: '/admin/alumni', icon: Briefcase, label: 'Alumni' },
  { to: '/admin/staff', icon: Users, label: 'Staff' },
  { to: '/admin/departments', icon: Building2, label: 'Departments' },
  { to: '/admin/batches', icon: Layers, label: 'Batches' },
  { to: '/admin/sections', icon: ClipboardList, label: 'Sections' },
  { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
  { to: '/admin/assignments', icon: Link2, label: 'Assignments' },
  { to: '/admin/skill-courses', icon: Lightbulb, label: 'Skill Courses' },
  { to: '/admin/promotion', icon: ArrowUp, label: 'Promotion' },

  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/analytics', icon: Sparkles, label: 'Analytics' },
  { to: '/admin/feedback', icon: Mail, label: 'Student Feedback' },
  { to: '/admin/trash', icon: Trash2, label: 'Trash' },
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
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon className="idata nav-icon" />
                {link.label}
              </NavLink>
            );
          })}
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
          <LogOut className="idata" />
        </button>
      </div>
    </aside>
  );
}
