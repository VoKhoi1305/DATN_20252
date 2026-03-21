export type EscalationRuleSource = 'DEFAULT' | 'CUSTOM';
export type AlertType = 'OVERDUE' | 'FACE_MISMATCH_STREAK' | 'SEVERE_OVERDUE' | 'NFC_CCCD_MISMATCH' | 'GEOFENCE_VIOLATION' | '*';
export type ConditionOperator = '>=' | '<=' | '==' | '>' | '<';
export type AlertRuleLevel = 'THAP' | 'TRUNG_BINH' | 'CAO' | 'KHAN_CAP';

export interface EscalationRuleListItem {
  id: string;
  code: string;
  name: string;
  source: EscalationRuleSource;
  alert_type: string;
  alert_level_filter: AlertRuleLevel | null;
  condition_operator: ConditionOperator;
  condition_value: number;
  condition_window_days: number | null;
  condition_consecutive: boolean;
  case_severity: AlertRuleLevel;
  is_editable: boolean;
  is_deletable: boolean;
  is_active: boolean;
  created_at: string;
}

export interface EscalationRuleDetail extends EscalationRuleListItem {
  scenario_id: string;
  condition_extra: Record<string, unknown> | null;
  case_description_tpl: string | null;
  notification_channels: string[] | null;
  auto_assign: boolean;
}

export interface CreateEscalationRulePayload {
  scenario_id: string;
  name: string;
  alert_type: string;
  alert_level_filter?: AlertRuleLevel;
  condition_operator: ConditionOperator;
  condition_value: number;
  condition_window_days?: number;
  condition_consecutive?: boolean;
  condition_extra?: Record<string, unknown>;
  case_severity: AlertRuleLevel;
  case_description_tpl?: string;
  notification_channels?: string[];
  auto_assign?: boolean;
  is_active?: boolean;
}

export type UpdateEscalationRulePayload = Partial<Omit<CreateEscalationRulePayload, 'scenario_id'>>;

export interface EscalationRuleListParams {
  scenario_id: string;
  source?: EscalationRuleSource;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface EscalationRuleListResponse {
  data: EscalationRuleListItem[];
  total: number;
  page: number;
  limit: number;
}
