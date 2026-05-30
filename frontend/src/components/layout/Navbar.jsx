import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineBell, HiOutlineArrowLeft, HiOutlineMail, HiOutlineChat } from 'react-icons/hi';
import useAuthStore from '../../store/authStore';
import ThemeToggle from './ThemeToggle';
import client from '../../api/client';

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
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  if (pathname.match(/^\/admin\/students\/[^/]+\/academic$/)) return 'Academic Record';
  if (pathname.match(/^\/admin\/students\/[^/]+$/)) return 'Student Details';
  if (pathname.match(/^\/teacher\/students\/[^/]+\/academic$/)) return 'Academic Record';
  if (pathname.match(/^\/teacher\/students\/[^/]+$/)) return 'Student Details';

  return 'Dashboard';
};

const formatTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export default function Navbar({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const title = getPageTitle(location.pathname);
  
  const isDashboardRoot = ['/admin', '/teacher', '/student'].includes(location.pathname);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await client.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await client.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    setDropdownOpen(false);
    if (!notif.isRead) {
      try {
        await client.put(`/notifications/${notif.id}/read`);
        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
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
      
      <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ThemeToggle />
        
        <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
          <button 
            className="btn btn-ghost" 
            title="Notifications"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <HiOutlineBell style={{ fontSize: '1.25rem' }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--color-danger)',
                color: '#fff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                border: '2px solid #fff',
                boxShadow: 'var(--shadow-sm)',
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '0.75rem',
              width: '360px',
              maxHeight: '480px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--color-gray-200)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--color-gray-100)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(79, 70, 229, 0.02)',
              }}>
                <span style={{ fontWeight: 650, color: 'var(--color-gray-800)', fontSize: 'var(--font-sm)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-purple-600)',
                      fontSize: 'var(--font-xs)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'color var(--transition-fast)',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-purple-700)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-purple-600)'}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{
                overflowY: 'auto',
                flex: 1,
                padding: '4px 0',
              }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: 'var(--space-8) var(--space-4)',
                    textAlign: 'center',
                    color: 'var(--color-gray-400)',
                  }}>
                    <HiOutlineBell size={32} style={{ marginBottom: 'var(--space-2)', opacity: 0.5, margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>All caught up!</p>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)' }}>No new notifications.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--color-gray-100)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 'var(--space-3)',
                        transition: 'background var(--transition-fast)',
                        background: !notif.isRead ? 'rgba(139, 92, 246, 0.04)' : 'transparent',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-gray-50)'}
                      onMouseOut={(e) => e.currentTarget.style.background = !notif.isRead ? 'rgba(139, 92, 246, 0.04)' : 'transparent'}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: notif.type === 'feedback_submitted' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: notif.type === 'feedback_submitted' ? 'var(--color-purple-600)' : 'var(--color-success)',
                        flexShrink: 0,
                      }}>
                        {notif.type === 'feedback_submitted' ? <HiOutlineMail size={16} /> : <HiOutlineChat size={16} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: 'var(--font-xs)', 
                          fontWeight: 600, 
                          color: 'var(--color-gray-800)',
                          marginBottom: '2px',
                        }}>
                          {notif.title}
                        </div>
                        <div style={{ 
                          fontSize: 'var(--font-xs)', 
                          color: 'var(--color-gray-600)',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                        }}>
                          {notif.message}
                        </div>
                        <div style={{ 
                          fontSize: '10px', 
                          color: 'var(--color-gray-400)',
                          marginTop: '4px',
                        }}>
                          {formatTimeAgo(notif.createdAt)}
                        </div>
                      </div>

                      {!notif.isRead && (
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--color-purple-500)',
                          alignSelf: 'center',
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
