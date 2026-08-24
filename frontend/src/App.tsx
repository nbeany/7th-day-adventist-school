import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Home from './pages/Dashboard/Home';
import Users from './pages/Dashboard/Users';
import Students from './pages/Dashboard/Students';
import Guardians from './pages/Dashboard/Guardians';
import Attendance from './pages/Dashboard/Attendance';
import AttendanceHistory from './pages/Dashboard/AttendanceHistory';
import Gradebook from './pages/Dashboard/Gradebook';
import ReportCards from './pages/Dashboard/ReportCards';
import MyGrades from './pages/Dashboard/MyGrades';
import Timetable from './pages/Dashboard/Timetable';
import Fees from './pages/Dashboard/Fees';
import Invoices from './pages/Dashboard/Invoices';
import Academics from './pages/Dashboard/Academics';
import Settings from './pages/Dashboard/Settings';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // Redirect to dashboard if they don't have access
  }
  
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><Users /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute allowedRoles={['ADMIN']}><Students /></ProtectedRoute>} />
          <Route path="/guardians" element={<ProtectedRoute allowedRoles={['ADMIN']}><Guardians /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><Attendance /></ProtectedRoute>} />
          <Route path="/attendance-history" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><AttendanceHistory /></ProtectedRoute>} />
          <Route path="/gradebook" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}><Gradebook /></ProtectedRoute>} />
          <Route path="/report-cards" element={<ProtectedRoute allowedRoles={['ADMIN', 'STUDENT', 'PARENT']}><ReportCards /></ProtectedRoute>} />
          <Route path="/my-grades" element={<ProtectedRoute allowedRoles={['STUDENT', 'PARENT']}><MyGrades /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute allowedRoles={['ADMIN', 'TEACHER', 'STUDENT', 'PARENT']}><Timetable /></ProtectedRoute>} />
          <Route path="/fees" element={<ProtectedRoute allowedRoles={['ADMIN']}><Fees /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute allowedRoles={['ADMIN', 'PARENT']}><Invoices /></ProtectedRoute>} />
          <Route path="/academics" element={<ProtectedRoute allowedRoles={['ADMIN']}><Academics /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><Settings /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
