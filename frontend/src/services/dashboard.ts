import apiClient from './api';

export interface DashboardSummary {
  total_inspections: number;
  draft_count: number;
  pending_review_count: number;
  compliant_count: number;
  non_compliant_count: number;
  completed_count: number;
  status_distribution: Record<string, number>;
  compliance_distribution: Record<string, number>;
}

const DASHBOARD_PREFIX = '/api/dashboard';

const dashboardService = {
  /**
   * GET /api/dashboard/summary
   * Fetches aggregated metrics and compliance distribution.
   */
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get<DashboardSummary>(`${DASHBOARD_PREFIX}/summary`);
    return data;
  },
};

export default dashboardService;
