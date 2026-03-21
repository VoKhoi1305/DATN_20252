import api from '@/api/axios';
import type { ApiResponse } from '@/types/auth.types';
import type {
  DashboardSummaryResponse,
  DashboardChartsResponse,
  DashboardEvent,
  DashboardAlert,
} from '@/types/dashboard.types';

export function fetchDashboardSummary() {
  return api.get<ApiResponse<DashboardSummaryResponse>>('/dashboard/summary');
}

export function fetchDashboardCharts() {
  return api.get<ApiResponse<DashboardChartsResponse>>('/dashboard/charts');
}

export function fetchRecentEvents() {
  return api.get<ApiResponse<{ data: DashboardEvent[] }>>('/events/recent', {
    params: { limit: 5 },
  });
}

export function fetchOpenAlerts() {
  return api.get<ApiResponse<{ data: DashboardAlert[] }>>('/alerts/open', {
    params: { limit: 5, sort: 'severity', order: 'desc' },
  });
}
