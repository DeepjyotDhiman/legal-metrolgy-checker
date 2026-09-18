import { Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from '../components/common/ProtectedRoute';
import AppShell from '../components/layout/AppShell';

import LoginPage from '../pages/Login/LoginPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import InspectionsPage from '../pages/Inspections/InspectionsPage';
import NewInspectionPage from '../pages/NewInspection/NewInspectionPage';
import InspectionDetailPage from '../pages/InspectionDetail/InspectionDetailPage';
import ReportsPage from '../pages/Reports/ReportsPage';
import ReportDetailPage from '../pages/Reports/ReportDetailPage';

/**
 * Application routes.
 *
 * Public:
 *   /login
 *
 * Protected (require auth — wrapped in ProtectedRoute + AppShell):
 *   /dashboard
 *   /inspections
 *   /inspections/new
 *   /inspections/:id
 *   /reports
 *   /reports/:id
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard"          element={<DashboardPage />} />
          <Route path="/inspections/new"    element={<NewInspectionPage />} />
          <Route path="/inspections/:id"    element={<InspectionDetailPage />} />
          <Route path="/inspections"        element={<InspectionsPage />} />
          <Route path="/reports/:id"        element={<ReportDetailPage />} />
          <Route path="/reports"            element={<ReportsPage />} />
        </Route>
      </Route>

      {/* Fallback → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
