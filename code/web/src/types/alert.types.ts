export type AlertLevel = 'THAP' | 'TRUNG_BINH' | 'CAO' | 'KHAN_CAP';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED';
export type AlertSource = 'DEFAULT' | 'CUSTOM';

export interface AlertListItem {
  id: string;
  code: string;
  type: string;
  level: AlertLevel;
  status: AlertStatus;
  source: AlertSource;
  created_at: string;
  resolved_at: string | null;
  escalated_at: string | null;
  case_id: string | null;
  subject: {
    id: string;
    code: string;
    full_name: string;
  };
}

export interface AlertListResponse {
  data: AlertListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AlertDetail extends AlertListItem {
  trigger_event_id: string;
  alert_rule_id: string | null;
  scenario_id: string | null;
  trigger_event?: {
    id: string;
    code: string;
    type: string;
    result: string;
    created_at: string;
  } | null;
}

export interface AlertListParams {
  page?: number;
  limit?: number;
  status?: AlertStatus;
  level?: AlertLevel;
  subject_id?: string;
  type?: string;
  source?: AlertSource;
  from?: string;
  to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}
