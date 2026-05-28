import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children, roles }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // Redirect to role-appropriate dashboard
    const dashMap = { admin: '/admin', teacher: '/teacher', student: '/student' };
    return <Navigate to={dashMap[user.role] || '/login'} replace />;
  }

  return children;
}
