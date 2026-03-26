import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/guards/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/Dashboard';
import ManageStudents from './pages/admin/ManageStudents';
import ManageStaff from './pages/admin/ManageStaff';
import ManageDepartments from './pages/admin/ManageDepartments';
import ManageBatches from './pages/admin/ManageBatches';
import ManageSections from './pages/admin/ManageSections';
import ManageCourses from './pages/admin/ManageCourses';
import ManageUsers from './pages/admin/ManageUsers';
import ManageAssignments from './pages/admin/ManageAssignments';
import StudentDetail from './pages/admin/StudentDetail';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherMarks from './pages/teacher/Marks';
import useAuthStore from './store/authStore';

function App() {
  const user = useAuthStore((s) => s.user);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<ManageStudents />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="staff" element={<ManageStaff />} />
          <Route path="departments" element={<ManageDepartments />} />
          <Route path="batches" element={<ManageBatches />} />
          <Route path="sections" element={<ManageSections />} />
          <Route path="courses" element={<ManageCourses />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="assignments" element={<ManageAssignments />} />
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={
          <ProtectedRoute roles={['teacher']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TeacherDashboard />} />
          <Route path="students" element={<ManageStudents />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="marks" element={<TeacherMarks />} />
        </Route>

        {/* Student Routes (placeholder for Phase 3) */}
        <Route path="/student" element={
          <ProtectedRoute roles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<div className="page-header"><div><h1>Student Dashboard</h1><p className="page-subtitle">Coming in Phase 3</p></div></div>} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={
          user ? <Navigate to={`/${user.role === 'admin' ? 'admin' : user.role === 'teacher' ? 'teacher' : 'student'}`} replace />
               : <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
