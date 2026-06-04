import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, CornerDownLeft, ArrowUp, ArrowDown, Command,
  Home, GraduationCap, Briefcase, Users, Building2,
  Layers, ClipboardList, BookOpen, Link2, Lightbulb,
  ArrowUpIcon, Trash2, FileText, Sparkles, Mail,
  MessageSquare, FileSpreadsheet, BarChart3, ScanBarcode,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

/* ─── Navigation registry per role (Pages & Actions) ─────────── */
const adminItems = [
  // Pages
  { to: '/admin', icon: Home, label: 'Dashboard', keywords: ['home', 'overview', 'main'], type: 'page' },
  { to: '/admin/students', icon: GraduationCap, label: 'Students', keywords: ['manage', 'enroll', 'student list'], type: 'page' },
  { to: '/admin/verify', icon: ScanBarcode, label: 'Verify Student', keywords: ['scan', 'barcode', 'id card'], type: 'page' },
  { to: '/admin/alumni', icon: Briefcase, label: 'Alumni', keywords: ['graduated', 'passout', 'ex-students'], type: 'page' },
  { to: '/admin/staff', icon: Users, label: 'Staff', keywords: ['teacher', 'faculty', 'employees'], type: 'page' },
  { to: '/admin/departments', icon: Building2, label: 'Departments', keywords: ['dept', 'branch', 'division'], type: 'page' },
  { to: '/admin/batches', icon: Layers, label: 'Batches', keywords: ['year', 'batch', 'intake'], type: 'page' },
  { to: '/admin/sections', icon: ClipboardList, label: 'Sections', keywords: ['class', 'division', 'group'], type: 'page' },
  { to: '/admin/courses', icon: BookOpen, label: 'Courses', keywords: ['subject', 'syllabus', 'curriculum'], type: 'page' },
  { to: '/admin/assignments', icon: Link2, label: 'Assignments', keywords: ['assign', 'teacher course', 'mapping'], type: 'page' },
  { to: '/admin/skill-courses', icon: Lightbulb, label: 'Skill Courses', keywords: ['skill', 'extra', 'elective'], type: 'page' },
  { to: '/admin/promotion', icon: ArrowUp, label: 'Semester Promotion', keywords: ['promote', 'advance', 'next semester'], type: 'page' },
  { to: '/admin/users', icon: Users, label: 'Users', keywords: ['accounts', 'login', 'credentials'], type: 'page' },
  { to: '/admin/reports', icon: FileText, label: 'Reports', keywords: ['export', 'download', 'pdf', 'excel'], type: 'page' },
  { to: '/admin/analytics', icon: Sparkles, label: 'Analytics', keywords: ['charts', 'stats', 'insights', 'graphs'], type: 'page' },
  { to: '/admin/feedback', icon: Mail, label: 'Student Feedback', keywords: ['review', 'opinion', 'suggestion'], type: 'page' },
  { to: '/admin/trash', icon: Trash2, label: 'Trash', keywords: ['deleted', 'recycle', 'restore'], type: 'page' },

  // Actions (Sub-options under pages)
  { to: '/admin/students', state: { openAddModal: true }, icon: GraduationCap, label: 'Add New Student', keywords: ['create', 'enroll student', 'new student'], type: 'action', parent: 'Students' },
  { to: '/admin/students', state: { openImportModal: true }, icon: GraduationCap, label: 'Bulk Import Students', keywords: ['upload csv', 'import excel', 'bulk enroll'], type: 'action', parent: 'Students' },
  { to: '/admin/students', state: { openBarcodeModal: true }, icon: ScanBarcode, label: 'Print Student Barcodes', keywords: ['print', 'generate barcode', 'id cards'], type: 'action', parent: 'Students' },
  { to: '/admin/staff', state: { openAddModal: true }, icon: Users, label: 'Add New Staff Member', keywords: ['create', 'add teacher', 'new faculty'], type: 'action', parent: 'Staff' },
  { to: '/admin/departments', state: { openAddModal: true }, icon: Building2, label: 'Create Department', keywords: ['new dept', 'add branch'], type: 'action', parent: 'Departments' },
  { to: '/admin/batches', state: { openAddModal: true }, icon: Layers, label: 'Create New Batch', keywords: ['add year', 'new batch'], type: 'action', parent: 'Batches' },
  { to: '/admin/sections', state: { openAddModal: true }, icon: ClipboardList, label: 'Create New Section', keywords: ['add class division', 'new division'], type: 'action', parent: 'Sections' },
  { to: '/admin/courses', state: { openAddModal: true }, icon: BookOpen, label: 'Add New Course', keywords: ['create subject', 'new course', 'add syllabus'], type: 'action', parent: 'Courses' },
  { to: '/admin/assignments', state: { openAddModal: true }, icon: Link2, label: 'Assign Teacher to Course', keywords: ['link staff', 'course mapping', 'class assignment'], type: 'action', parent: 'Assignments' },
  { to: '/admin/skill-courses', state: { openAddModal: true }, icon: Lightbulb, label: 'Add Skill Course', keywords: ['create elective', 'new skill course'], type: 'action', parent: 'Skill Courses' },
  { to: '/admin/skill-courses', state: { openCategoriesModal: true }, icon: Lightbulb, label: 'Manage Skill Course Categories', keywords: ['skill categories', 'edit tags'], type: 'action', parent: 'Skill Courses' },
];

const teacherItems = [
  // Pages
  { to: '/teacher', icon: Home, label: 'Dashboard', keywords: ['home', 'overview', 'main'], type: 'page' },
  { to: '/teacher/students', icon: GraduationCap, label: 'Students', keywords: ['student list', 'manage'], type: 'page' },
  { to: '/teacher/verify', icon: ScanBarcode, label: 'Verify Student', keywords: ['scan', 'barcode', 'id card'], type: 'page' },
  { to: '/teacher/attendance', icon: ClipboardList, label: 'Attendance', keywords: ['present', 'absent', 'mark'], type: 'page' },
  { to: '/teacher/marks', icon: BarChart3, label: 'Marks', keywords: ['grades', 'score', 'exam'], type: 'page' },
  { to: '/teacher/profile', icon: Users, label: 'My Profile', keywords: ['account', 'settings', 'info'], type: 'page' },
  { to: '/teacher/reports', icon: FileText, label: 'Reports', keywords: ['export', 'download', 'pdf'], type: 'page' },

  // Actions (Sub-options under pages)
  { to: '/teacher/attendance', icon: ClipboardList, label: 'Mark/Track Attendance', keywords: ['take attendance', 'present status', 'roll call'], type: 'action', parent: 'Attendance' },
  { to: '/teacher/marks', icon: BarChart3, label: 'Enter/Update Student Marks', keywords: ['grades entry', 'exam score', 'add marks'], type: 'action', parent: 'Marks' },
  { to: '/teacher/verify', icon: ScanBarcode, label: 'Scan Student ID Barcode', keywords: ['scanner', 'verify status'], type: 'action', parent: 'Verify Student' },
  { to: '/teacher/profile', icon: Users, label: 'Edit Profile Settings', keywords: ['change phone', 'update info'], type: 'action', parent: 'My Profile' },
];

const studentItems = [
  // Pages
  { to: '/student', icon: Home, label: 'Dashboard', keywords: ['home', 'overview', 'main'], type: 'page' },
  { to: '/student/marks', icon: BarChart3, label: 'My Marks', keywords: ['grades', 'score', 'exam', 'result'], type: 'page' },
  { to: '/student/attendance', icon: ClipboardList, label: 'My Attendance', keywords: ['present', 'absent', 'percentage'], type: 'page' },
  { to: '/student/profile', icon: Users, label: 'My Profile', keywords: ['account', 'settings', 'personal'], type: 'page' },
  { to: '/student/academic', icon: FileSpreadsheet, label: 'Academic Record', keywords: ['transcript', 'history', 'semester'], type: 'page' },
  { to: '/student/skill-courses', icon: Lightbulb, label: 'Skill Courses', keywords: ['extra', 'elective', 'skill'], type: 'page' },
  { to: '/student/feedback', icon: MessageSquare, label: 'Space for Thought', keywords: ['feedback', 'review', 'opinion'], type: 'page' },

  // Actions (Sub-options under pages)
  { to: '/student/marks', icon: BarChart3, label: 'View Exam Grades', keywords: ['report card', 'marks breakdown'], type: 'action', parent: 'My Marks' },
  { to: '/student/attendance', icon: ClipboardList, label: 'View Attendance Logs', keywords: ['check percentage', 'absent log'], type: 'action', parent: 'My Attendance' },
  { to: '/student/skill-courses', icon: Lightbulb, label: 'Browse & Enroll in Skill Courses', keywords: ['enroll online', 'extra certificates'], type: 'action', parent: 'Skill Courses' },
  { to: '/student/feedback', icon: MessageSquare, label: 'Write Space for Thought Feedback', keywords: ['new feedback', 'anonymous post'], type: 'action', parent: 'Space for Thought' },
  { to: '/student/profile', icon: Users, label: 'Edit My Contact Info', keywords: ['update phone', 'change address'], type: 'action', parent: 'My Profile' },
];

/* ─── Fuzzy matching / scoring helper ──────────────────────── */
function getMatchScore(item, query) {
  const q = query.toLowerCase();
  const label = item.label.toLowerCase();
  const parent = item.parent ? item.parent.toLowerCase() : '';

  // Exact match on label
  if (label === q) return 100;
  // Label starts with query
  if (label.startsWith(q)) return 90;
  // Label contains query
  if (label.includes(q)) return 80;
  // Exact match on parent
  if (parent && parent === q) return 75;
  // Parent contains query
  if (parent && parent.includes(q)) return 70;
  // Keywords match
  const kwMatch = item.keywords.some(k => k.includes(q));
  if (kwMatch) return 60;
  // Fuzzy on label
  const words = q.split(/\s+/).filter(Boolean);
  if (words.every(w => label.includes(w))) return 50;
  // Fuzzy on keywords
  if (words.every(w => item.keywords.some(k => k.includes(w)))) return 40;
  return 0;
}

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const items = useMemo(() => {
    if (user?.role === 'admin') return adminItems;
    if (user?.role === 'teacher') return teacherItems;
    return studentItems;
  }, [user?.role]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items
      .map(item => ({ ...item, score: getMatchScore(item, query.trim()) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [query, items]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('.gs-item.gs-active');
      if (active) {
        active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = useCallback((item) => {
    navigate(item.to, { state: item.state || {} });
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, selectedIndex, handleSelect, onClose]);

  // Highlight the matched text in the label
  const highlightMatch = (label, q) => {
    if (!q.trim()) return label;
    const idx = label.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return label;
    return (
      <>
        {label.slice(0, idx)}
        <span className="gs-highlight">{label.slice(idx, idx + q.length)}</span>
        {label.slice(idx + q.length)}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="gs-overlay" onClick={onClose}>
      <div className="gs-container" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="gs-input-wrapper">
          <Search className="idata gs-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="gs-input"
            placeholder="Search pages, options, or features…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="gs-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
              <X className="idata" style={{ width: '14px', height: '14px' }} />
            </button>
          )}
          <kbd className="gs-kbd">ESC</kbd>
        </div>

        {/* Results list */}
        <div className="gs-results" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="gs-empty">
              <Search className="idata" style={{ width: '28px', height: '28px', opacity: 0.3 }} />
              <p>No results for "<strong>{query}</strong>"</p>
              <span>Try a different search term</span>
            </div>
          ) : (
            <>
              <div className="gs-section-title">
                {query.trim() ? `${filtered.length} result${filtered.length > 1 ? 's' : ''}` : 'All Pages & Options'}
              </div>
              {filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.to + '-' + item.label}
                    className={`gs-item ${idx === selectedIndex ? 'gs-active' : ''}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="gs-item-icon">
                      <Icon className="idata" />
                    </div>
                    <div className="gs-item-content">
                      <div className="gs-item-title-row">
                        <span className="gs-item-label">
                          {highlightMatch(item.label, query)}
                        </span>
                        {item.type === 'action' ? (
                          <span className="badge badge-purple gs-item-badge">Action</span>
                        ) : (
                          <span className="badge badge-sky gs-item-badge">Page</span>
                        )}
                      </div>
                      <span className="gs-item-path">
                        {item.type === 'action' ? `Action in ${item.parent} • ${item.to}` : item.to}
                      </span>
                    </div>
                    <CornerDownLeft className="idata gs-item-enter" />
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="gs-footer">
          <div className="gs-footer-hint">
            <kbd className="gs-kbd-sm"><ArrowUp className="idata" style={{ width: '10px', height: '10px' }} /></kbd>
            <kbd className="gs-kbd-sm"><ArrowDown className="idata" style={{ width: '10px', height: '10px' }} /></kbd>
            <span>Navigate</span>
          </div>
          <div className="gs-footer-hint">
            <kbd className="gs-kbd-sm"><CornerDownLeft className="idata" style={{ width: '10px', height: '10px' }} /></kbd>
            <span>Open</span>
          </div>
          <div className="gs-footer-hint">
            <kbd className="gs-kbd-sm" style={{ fontSize: '9px', padding: '1px 4px' }}>ESC</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
