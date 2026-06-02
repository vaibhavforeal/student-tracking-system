import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AiAssistant from '../AiAssistant';
import useAuthStore from '../../store/authStore';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="main-content">
        <div className="page-container fade-in">
          <Outlet />
        </div>
      </main>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 99, display: 'none',
          }}
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* AI Assistant — admin only */}
      {user?.role === 'admin' && <AiAssistant />}
    </div>
  );
}

