import api from '@/api/axios';
import type { ApiResponse } from '@/types/auth.types';
import type {
  SubjectListResponse,
  SubjectListParams,
  ScenarioListResponse,
  SubjectDetail,
  TimelineResponse,
  DevicesResponse,
  DocumentsResponse,
  AreaOption,
  CreateSubjectPayload,
  UpdateSubjectPayload,
  CccdCheckResponse,
  CreateSubjectResponse,
} from '@/types/subject.types';

export function fetchSubjects(params: SubjectListParams) {
  return api.get<ApiResponse<SubjectListResponse>>('/subjects', { params });
}

export function fetchScenarioOptions() {
  return api.get<ApiResponse<ScenarioListResponse>>('/subjects/scenarios');
}

export function exportSubjects(params: SubjectListParams) {
  return api.get('/subjects/export', {
    params: { ...params, format: 'xlsx' },
    responseType: 'blob',
  });
}

// --- SCR-021: Detail ---

export function fetchSubjectDetail(id: string) {
  return api.get<SubjectDetail>(`/subjects/${id}`);
}

export function fetchSubjectTimeline(id: string, params?: { page?: number; limit?: number }) {
  return api.get<TimelineResponse>(`/subjects/${id}/timeline`, { params });
}

export function fetchSubjectDevices(id: string) {
  return api.get<DevicesResponse>(`/subjects/${id}/devices`);
}

export function fetchSubjectDocuments(id: string) {
  return api.get<DocumentsResponse>(`/subjects/${id}/documents`);
}

// --- SCR-022: Create ---

export function fetchAreas() {
  return api.get<{ data: AreaOption[] }>('/areas');
}

export function checkCccd(cccd: string) {
  return api.get<CccdCheckResponse>('/subjects/check-cccd', { params: { cccd } });
}

export function createSubject(payload: CreateSubjectPayload) {
  return api.post<CreateSubjectResponse>('/subjects', payload);
}

// --- SCR-023: Update ---

export function updateSubject(id: string, payload: UpdateSubjectPayload) {
  return api.patch<{ id: string; ma_ho_so: string; full_name: string; status: string; updated_at: string }>(`/subjects/${id}`, payload);
}
