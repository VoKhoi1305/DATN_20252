import api from '@/api/axios';
import type {
  AlertRuleListParams,
  AlertRuleListResponse,
  AlertRuleDetail,
  CreateAlertRulePayload,
  UpdateAlertRulePayload,
} from '@/types/alert-rule.types';

export function fetchAlertRules(params: AlertRuleListParams) {
  return api.get<AlertRuleListResponse>('/alert-rules', { params });
}

export function fetchAlertRuleDetail(id: string) {
  return api.get<AlertRuleDetail>(`/alert-rules/${id}`);
}

export function createAlertRule(payload: CreateAlertRulePayload) {
  return api.post<AlertRuleDetail>('/alert-rules', payload);
}

export function updateAlertRule(id: string, payload: UpdateAlertRulePayload) {
  return api.patch<AlertRuleDetail>(`/alert-rules/${id}`, payload);
}

export function deleteAlertRule(id: string) {
  return api.delete(`/alert-rules/${id}`);
}

export function toggleAlertRule(id: string, is_active: boolean) {
  return api.patch(`/alert-rules/${id}/toggle`, { is_active });
}
