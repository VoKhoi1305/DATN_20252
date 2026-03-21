import api from '@/api/axios';

export interface GeofenceItem {
  id: string;
  code: string;
  name: string;
  address: string | null;
  center_lat: number;
  center_lng: number;
  radius: number;
  area_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeofenceListResponse {
  data: GeofenceItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
  type: string;
}

export interface CreateGeofencePayload {
  name: string;
  address: string;
  center_lat: number;
  center_lng: number;
  radius: number;
  area_id?: string;
}

export interface UpdateGeofencePayload {
  name?: string;
  address?: string;
  center_lat?: number;
  center_lng?: number;
  radius?: number;
  area_id?: string;
  is_active?: boolean;
}

export function fetchGeofences(params?: Record<string, string | number>) {
  return api.get<{ data: GeofenceListResponse }>('/geofences', { params });
}

export function fetchGeofence(id: string) {
  return api.get<{ data: GeofenceItem }>(`/geofences/${id}`);
}

export function createGeofence(payload: CreateGeofencePayload) {
  return api.post<{ data: GeofenceItem }>('/geofences', payload);
}

export function updateGeofence(id: string, payload: UpdateGeofencePayload) {
  return api.patch<{ data: GeofenceItem }>(`/geofences/${id}`, payload);
}

export function deleteGeofence(id: string) {
  return api.delete(`/geofences/${id}`);
}

export function geocodeAddress(address: string) {
  return api.get<{ data: GeocodeResult[] }>('/geofences/geocode', {
    params: { address },
  });
}
