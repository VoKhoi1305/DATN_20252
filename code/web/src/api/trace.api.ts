import api from '@/api/axios';

export interface TraceResult {
  subject: {
    id: string;
    code: string;
    full_name: string;
    cccd: string;
    address: string | null;
    phone: string | null;
  };
  events: Array<{
    id: string;
    code: string;
    type: string;
    result: string;
    gps_lat: number | null;
    gps_lng: number | null;
    gps_accuracy: number | null;
    in_geofence: boolean | null;
    geofence_distance: number | null;
    face_match_score: number | null;
    nfc_verified: boolean | null;
    client_timestamp: string | null;
    created_at: string;
  }>;
}

export function traceBycccd(cccd: string) {
  return api.get<TraceResult>('/events/trace', { params: { cccd } });
}
