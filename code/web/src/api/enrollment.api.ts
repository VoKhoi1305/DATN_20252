import api from '@/api/axios';

export interface PendingEnrollmentItem {
  id: string;
  code: string;
  fullName: string;
  areaId: string;
  lifecycle: string;
  submittedAt: string | null;
  enrollmentDate: string | null;
}

export interface PendingEnrollmentsResponse {
  total: number;
  items: PendingEnrollmentItem[];
}

export function fetchPendingEnrollments() {
  return api.get<{ data: PendingEnrollmentsResponse }>('/enrollment/pending');
}

export function approveEnrollment(subjectId: string, note?: string) {
  return api.post<{ data: { lifecycle: string; approvedAt: string; message: string } }>(
    `/enrollment/${subjectId}/approve`,
    { note },
  );
}

export function rejectEnrollment(subjectId: string, note: string) {
  return api.post<{ data: { lifecycle: string; rejectedAt: string; message: string } }>(
    `/enrollment/${subjectId}/reject`,
    { note },
  );
}

export interface ResetEnrollmentResponse {
  lifecycle: string;
  resetAt: string;
  facesDeactivated: number;
  nfcDeactivated: number;
  deviceReset: boolean;
  message: string;
}

export function resetEnrollment(
  subjectId: string,
  body: { reason: string; resetDevice?: boolean },
) {
  return api.post<{ data: ResetEnrollmentResponse }>(
    `/enrollment/${subjectId}/reset`,
    body,
  );
}
