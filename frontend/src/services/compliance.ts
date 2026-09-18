import apiClient from './api';
import type { ComplianceCheckResponse } from '../types/inspection';
import type { DashboardSummary, ReportResponse } from '../types/compliance';

const COMPLIANCE_PREFIX = '/api/inspections';
const DASHBOARD_PREFIX = '/api/dashboard';
const REPORTS_PREFIX = '/api/reports';

/**
 * Compliance service — compliance checks, reports and dashboard data.
 */
const complianceService = {
  /**
   * GET /api/v1/inspections/:id/compliance — list compliance checks.
   */
  getChecks: async (inspectionId: string): Promise<ComplianceCheckResponse[]> => {
    const { data } = await apiClient.get<ComplianceCheckResponse[]>(
      `${COMPLIANCE_PREFIX}/${inspectionId}/compliance`,
    );
    return data;
  },

  /**
   * GET /api/v1/dashboard/summary — aggregate counts for dashboard.
   */
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get<DashboardSummary>(`${DASHBOARD_PREFIX}/summary`);
    return data;
  },

  /**
   * GET /api/v1/reports — list all reports.
   */
  listReports: async (): Promise<ReportResponse[]> => {
    const { data } = await apiClient.get<ReportResponse[]>(REPORTS_PREFIX);
    return data;
  },

  /**
   * GET /api/v1/reports/:id — get a specific report.
   */
  getReport: async (reportId: string): Promise<ReportResponse> => {
    const { data } = await apiClient.get<ReportResponse>(`${REPORTS_PREFIX}/${reportId}`);
    return data;
  },

  /**
   * GET /api/v1/inspections/:id/report — generate/get inspection report.
   */
  getInspectionReport: async (inspectionId: string): Promise<ReportResponse> => {
    const { data } = await apiClient.get<ReportResponse>(
      `${COMPLIANCE_PREFIX}/${inspectionId}/report`,
    );
    return data;
  },
};

export default complianceService;
