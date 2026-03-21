import type { AlertLevel } from './alert.types';

export type CaseStatus = 'OPEN' | 'CLOSED';
export type CaseSource = 'AUTO' | 'MANUAL_ESCALATE' | 'MANUAL_NEW';
export type EscalationType = 'AUTO' | 'MANUAL';

export interface CaseListItem {
  id: string;
  code: string;
  severity: AlertLevel;
  status: CaseStatus;
  source: CaseSource;
  description: string | null;
  created_at: string;
  closed_at: string | null;
  escalation_type: EscalationType | null;
  subject: {
    id: string;
    code: string;
    full_name: string;
  };
  assignee_name: string | null;
}

export interface CaseListResponse {
  data: CaseListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CaseNote {
  id: string;
  content: string;
  image_url: string | null;
  created_by_name: string;
  created_at: string;
}

export interface CaseDetail extends CaseListItem {
  escalated_from_alert_id: string | null;
  escalation_reason: string | null;
  escalation_rule_name: string | null;
  linked_event_ids: string[];
  assignee_id: string | null;
  created_by_id: string | null;
  created_by_name: string;
  closing_note: string | null;
  closed_by_id: string | null;
  related_case_id: string | null;
  notes: CaseNote[];
}

export interface CaseListParams {
  page?: number;
  limit?: number;
  status?: CaseStatus;
  severity?: AlertLevel;
  source?: CaseSource;
  subject_id?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CreateCasePayload {
  subject_id: string;
  severity: AlertLevel;
  description?: string;
}

export interface CloseCasePayload {
  closing_note: string;
}

export interface CreateNotePayload {
  content: string;
  image_url?: string;
}
