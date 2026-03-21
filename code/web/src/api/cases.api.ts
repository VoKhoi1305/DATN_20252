import api from '@/api/axios';
import type {
  CaseListParams,
  CaseListResponse,
  CaseDetail,
  CreateCasePayload,
  CloseCasePayload,
  CreateNotePayload,
  CaseNote,
} from '@/types/case.types';

export function fetchCases(params: CaseListParams) {
  return api.get<CaseListResponse>('/cases', { params });
}

export function fetchCaseDetail(id: string) {
  return api.get<CaseDetail>(`/cases/${id}`);
}

export function createCase(payload: CreateCasePayload) {
  return api.post('/cases', payload);
}

export function closeCase(id: string, payload: CloseCasePayload) {
  return api.patch(`/cases/${id}/close`, payload);
}

export function reopenCase(id: string) {
  return api.post(`/cases/${id}/reopen`);
}

export function fetchCaseNotes(id: string) {
  return api.get<CaseNote[]>(`/cases/${id}/notes`);
}

export function addCaseNote(id: string, payload: CreateNotePayload) {
  return api.post(`/cases/${id}/notes`, payload);
}

export function exportCases(params: Partial<CaseListParams>) {
  return api.get('/cases/export', { params, responseType: 'blob' });
}
