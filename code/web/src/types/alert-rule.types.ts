export type AlertRuleSource = 'DEFAULT' | 'CUSTOM';

export type AlertRuleEventType =
  | 'CHECK_IN'
  | 'CHECKIN_OVERDUE'
  | 'SEVERE_OVERDUE'
  | 'FACE_MISMATCH'
  | 'NFC_FAIL'
  | 'NFC_MISMATCH'
  | 'GEOFENCE_VIOLATION';

export type ConditionOperator = '>=' | '<=' | '==' | '>' | '<';

export type AlertRuleLevel = 'THAP' | 'TRUNG_BINH' | 'CAO' | 'KHAN_CAP';

export interface AlertRuleListItem {
  id: string;
  code: string;
  name: string;
  source: AlertRuleSource;
  event_type: AlertRuleEventType;
  condition_operator: ConditionOperator;
  condition_value: number;
  condition_window_days: number | null;
  alert_level: AlertRuleLevel;
  is_editable: boolean;
  is_deletable: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AlertRuleDetail extends AlertRuleListItem {
  scenario_id: string;
  condition_extra: Record<string, unknown> | null;
  notification_channels: string[] | null;
}

export interface CreateAlertRulePayload {
  scenario_id: string;
  name: string;
  event_type: AlertRuleEventType;
  condition_operator: ConditionOperator;
  condition_value: number;
  condition_window_days?: number;
  condition_extra?: Record<string, unknown>;
  alert_level: AlertRuleLevel;
  notification_channels?: string[];
  is_active?: boolean;
}

export type UpdateAlertRulePayload = Partial<Omit<CreateAlertRulePayload, 'scenario_id'>>;

export interface AlertRuleListParams {
  scenario_id: string;
  source?: AlertRuleSource;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface AlertRuleListResponse {
  data: AlertRuleListItem[];
  total: number;
  page: number;
  limit: number;
}
