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
import MapPage from '@/pages/map/MapPage';
import ScenariosPage from '@/pages/scenarios/ScenariosPage';
import ApprovalsPage from '@/pages/approvals/ApprovalsPage';
import EventsPage from '@/pages/events/EventsPage';
import AlertsPage from '@/pages/alerts/AlertsPage';
import CasesPage from '@/pages/cases/CasesPage';
import AlertRuleBuilderPage from '@/pages/alert-rules/AlertRuleBuilderPage';
import EscalationRuleBuilderPage from '@/pages/escalation-rules/EscalationRuleBuilderPage';
import TracePage from '@/pages/trace/TracePage';
import UserListPage from '@/pages/users/UserListPage';
import UserCreatePage from '@/pages/users/UserCreatePage';
import UserEditPage from '@/pages/users/UserEditPage';

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
          <Route path="/ban-do" element={<MapPage />} />
          <Route path="/kich-ban" element={<ScenariosPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/quy-tac-canh-bao" element={<AlertRuleBuilderPage />} />
          <Route path="/quy-tac-leo-thang" element={<EscalationRuleBuilderPage />} />
          <Route path="/xet-duyet" element={<ApprovalsPage />} />
          <Route path="/truy-vet" element={<TracePage />} />
          <Route path="/admin/tai-khoan" element={<UserListPage />} />
          <Route path="/admin/tai-khoan/them-moi" element={<UserCreatePage />} />
          <Route path="/admin/tai-khoan/:id/chinh-sua" element={<UserEditPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
