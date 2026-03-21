import api from '@/api/axios';
import type { EventListParams, EventListResponse, EventDetail } from '@/types/event.types';

export function fetchEvents(params: EventListParams) {
  return api.get<EventListResponse>('/events', { params });
}

export function fetchEventDetail(id: string) {
  return api.get<EventDetail>(`/events/${id}`);
}

export function fetchRecentEvents(limit = 10) {
  return api.get('/events/recent', { params: { limit } });
}

export function exportEvents(params: Partial<EventListParams>) {
  return api.get('/events/export', { params, responseType: 'blob' });
}
