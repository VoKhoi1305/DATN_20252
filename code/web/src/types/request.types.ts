export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RequestType = 'TRAVEL' | 'POSTPONE' | 'CHANGE_DEVICE' | 'CHANGE_ADDRESS';

export interface RequestItem {
  id: string;
  code: string;
  type: RequestType;
  status: RequestStatus;
  reason: string;
  details: Record<string, any>;
  subject_id: string;
  subject_name: string;
  subject_cccd: string;
  reviewed_by_id: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestListResponse {
  items: RequestItem[];
  total: number;
  page: number;
  limit: number;
}

export interface RequestListParams {
  status?: RequestStatus;
  search?: string;
  page?: number;
  limit?: number;
}
