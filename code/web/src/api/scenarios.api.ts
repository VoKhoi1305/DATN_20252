import api from '@/api/axios';

export interface ScenarioItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  scope: string;
  checkin_frequency: string;
  checkin_window_start: string;
  checkin_window_end: string;
  grace_period_days: number;
  face_threshold: number;
  nfc_required: boolean;
  fallback_allowed: boolean;
  geofence_id: string | null;
  curfew_start: string | null;
  curfew_end: string | null;
  travel_approval_required: boolean;
  travel_threshold_days: number | null;
  effective_from: string | null;
  effective_to: string | null;
  subject_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScenarioDetail extends ScenarioItem {
  version: number;
  created_by_id: string;
  approved_by_id: string | null;
  approved_at: string | null;
  geofence: {
    id: string;
    code: string;
    name: string;
    address: string | null;
    center_lat: number;
    center_lng: number;
    radius: number;
  } | null;
}

export interface ScenarioListResponse {
  data: ScenarioItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateScenarioPayload {
  name: string;
  description?: string;
  scope: string;
  checkin_frequency: string;
  checkin_window_start: string;
  checkin_window_end: string;
  grace_period_days?: number;
  face_threshold?: number;
  nfc_required?: boolean;
  fallback_allowed?: boolean;
  geofence_id?: string | null;
  curfew_start?: string | null;
  curfew_end?: string | null;
  travel_approval_required?: boolean;
  travel_threshold_days?: number | null;
  effective_from?: string | null;
  effective_to?: string | null;
}

export type UpdateScenarioPayload = Partial<CreateScenarioPayload> & { status?: string };

export function fetchScenarios(params?: Record<string, string | number>) {
  return api.get<{ data: ScenarioListResponse }>('/scenarios', { params });
}

export function fetchScenarioDetail(id: string) {
  return api.get<{ data: ScenarioDetail }>(`/scenarios/${id}`);
}

export function createScenario(payload: CreateScenarioPayload) {
  return api.post<{ data: ScenarioItem }>('/scenarios', payload);
}

export function updateScenario(id: string, payload: UpdateScenarioPayload) {
  return api.patch<{ data: ScenarioItem }>(`/scenarios/${id}`, payload);
}

export function updateScenarioStatus(id: string, status: string) {
  return api.patch<{ data: ScenarioItem }>(`/scenarios/${id}/status`, { status });
}

export function deleteScenario(id: string) {
  return api.delete(`/scenarios/${id}`);
}
