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
import StudentDetail from './pages/admin/StudentDetail';
import ManageAssignments from './pages/admin/ManageAssignments';
import Reports from './pages/admin/Reports';
import Analytics from './pages/admin/Analytics';
import Trash from './pages/admin/Trash';
import ManageSkillCourses from './pages/admin/ManageSkillCourses';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherMarks from './pages/teacher/Marks';
import StudentDashboard from './pages/student/Dashboard';
import StudentMyMarks from './pages/student/MyMarks';
import StudentMyAttendance from './pages/student/MyAttendance';
import StudentProfile from './pages/student/Profile';
import StudentSkillCourses from './pages/student/SkillCourses';
import SemesterPromotion from './pages/admin/SemesterPromotion';
import AcademicRecord from './pages/shared/AcademicRecord';
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
          <Route path="assignments" element={<ManageAssignments />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="trash" element={<Trash />} />
          <Route path="skill-courses" element={<ManageSkillCourses />} />
          <Route path="promotion" element={<SemesterPromotion />} />
          <Route path="students/:id/academic" element={<AcademicRecord />} />
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
          <Route path="reports" element={<Reports />} />
          <Route path="students/:id/academic" element={<AcademicRecord />} />
        </Route>

        {/* Student Routes */}
        <Route path="/student" element={
          <ProtectedRoute roles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<StudentDashboard />} />
          <Route path="marks" element={<StudentMyMarks />} />
          <Route path="attendance" element={<StudentMyAttendance />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="skill-courses" element={<StudentSkillCourses />} />
          <Route path="academic" element={<AcademicRecord />} />
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
