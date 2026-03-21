import api from '@/api/axios';
import type {
  EscalationRuleListParams,
  EscalationRuleListResponse,
  EscalationRuleDetail,
  CreateEscalationRulePayload,
  UpdateEscalationRulePayload,
} from '@/types/escalation-rule.types';

export function fetchEscalationRules(params: EscalationRuleListParams) {
  return api.get<EscalationRuleListResponse>('/escalation-rules', { params });
}

export function fetchEscalationRuleDetail(id: string) {
  return api.get<EscalationRuleDetail>(`/escalation-rules/${id}`);
}

export function createEscalationRule(payload: CreateEscalationRulePayload) {
  return api.post<EscalationRuleDetail>('/escalation-rules', payload);
}

export function updateEscalationRule(id: string, payload: UpdateEscalationRulePayload) {
  return api.patch<EscalationRuleDetail>(`/escalation-rules/${id}`, payload);
}

export function deleteEscalationRule(id: string) {
  return api.delete(`/escalation-rules/${id}`);
}

export function toggleEscalationRule(id: string, is_active: boolean) {
  return api.patch(`/escalation-rules/${id}/toggle`, { is_active });
}
