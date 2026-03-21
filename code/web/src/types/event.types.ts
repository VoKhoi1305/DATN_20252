export type EventResult = 'SUCCESS' | 'FAILED' | 'WARNING';

export interface EventListItem {
  id: string;
  code: string;
  type: string;
  result: EventResult;
  created_at: string;
  client_timestamp: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  in_geofence: boolean | null;
  face_match_score: number | null;
  nfc_verified: boolean | null;
  subject: {
    id: string;
    code: string;
    full_name: string;
  };
}

export interface EventListResponse {
  data: EventListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface EventDetail extends EventListItem {
  scenario_id: string | null;
  gps_accuracy: number | null;
  geofence_distance: number | null;
  nfc_cccd_match: boolean | null;
  liveness_score: number | null;
  face_image_url: string | null;
  device_id: string | null;
  device_info: Record<string, unknown> | null;
  is_voluntary: boolean;
  extra_data: Record<string, unknown> | null;
}

export interface EventListParams {
  page?: number;
  limit?: number;
  subject_id?: string;
  type?: string;
  result?: EventResult;
  from?: string;
  to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}
