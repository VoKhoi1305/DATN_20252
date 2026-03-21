import api from '@/api/axios';
import type { AlertListParams, AlertListResponse, AlertDetail } from '@/types/alert.types';

export function fetchAlerts(params: AlertListParams) {
  return api.get<AlertListResponse>('/alerts', { params });
}

export function fetchAlertDetail(id: string) {
  return api.get<AlertDetail>(`/alerts/${id}`);
}

export function fetchOpenAlerts(limit = 10) {
  return api.get('/alerts/open', { params: { limit } });
}

export function acknowledgeAlert(id: string) {
  return api.patch(`/alerts/${id}/acknowledge`);
}

export function resolveAlert(id: string) {
  return api.patch(`/alerts/${id}/resolve`);
}

export function escalateAlert(id: string, reason?: string) {
  return api.post(`/alerts/${id}/escalate`, { reason });
}

export function exportAlerts(params: Partial<AlertListParams>) {
  return api.get('/alerts/export', { params, responseType: 'blob' });
}
