import api from '@/api/axios';
import type { RequestListParams, RequestListResponse, RequestItem } from '@/types/request.types';

export function fetchAllRequests(params?: RequestListParams) {
  return api.get<RequestListResponse>('/requests/all', { params });
}

export function fetchRequestDetail(id: string) {
  return api.get<RequestItem>(`/requests/${id}`);
}

export function reviewRequest(id: string, action: 'APPROVED' | 'REJECTED', note?: string) {
  return api.post<RequestItem>(`/requests/${id}/review`, { action, note });
}
