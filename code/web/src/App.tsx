import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/providers/ToastProvider';
import LoginPage from '@/pages/LoginPage';
import OtpVerifyPage from '@/pages/OtpVerifyPage';
import SetupOtpPage from '@/pages/SetupOtpPage';
import AppLayout from '@/layouts/AppLayout';
import AuthGuard from '@/guards/AuthGuard';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import SubjectListPage from '@/pages/subjects/SubjectListPage';
import SubjectDetailPage from '@/pages/subjects/SubjectDetailPage';
import SubjectCreatePage from '@/pages/subjects/SubjectCreatePage';
import SubjectEditPage from '@/pages/subjects/SubjectEditPage';
import EnrollmentManagementPage from '@/pages/subjects/EnrollmentManagementPage';

function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Auth routes — no layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/otp" element={<OtpVerifyPage />} />
        <Route path="/setup-otp" element={<SetupOtpPage />} />

        {/* Protected routes — AppLayout */}
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ho-so" element={<SubjectListPage />} />
          <Route path="/ho-so/them-moi" element={<SubjectCreatePage />} />
          <Route path="/ho-so/enrollment" element={<EnrollmentManagementPage />} />
          <Route path="/ho-so/:id" element={<SubjectDetailPage />} />
          <Route path="/ho-so/:id/chinh-sua" element={<SubjectEditPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
