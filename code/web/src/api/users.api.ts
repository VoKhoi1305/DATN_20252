import api from '@/api/axios';
import type { ApiResponse } from '@/types/auth.types';
import type {
  UserListResponse,
  UserListParams,
  UserDetail,
  CreateUserPayload,
  UpdateUserPayload,
} from '@/types/user.types';

export function fetchUsers(params: UserListParams) {
  return api.get<ApiResponse<UserListResponse>>('/users', { params });
}

export function fetchUserDetail(id: string) {
  return api.get<ApiResponse<UserDetail>>(`/users/${id}`);
}

export function createUser(payload: CreateUserPayload) {
  return api.post<ApiResponse<{ id: string; username: string }>>('/users', payload);
}

export function updateUser(id: string, payload: UpdateUserPayload) {
  return api.patch<ApiResponse<{ id: string; username: string }>>(`/users/${id}`, payload);
}

export function resetUserPassword(id: string, newPassword: string) {
  return api.patch(`/users/${id}/reset-password`, { new_password: newPassword });
}

export function toggleUserStatus(id: string) {
  return api.patch(`/users/${id}/toggle-status`);
}

export function unlockUser(id: string) {
  return api.patch(`/users/${id}/unlock`);
}

export function deleteUser(id: string) {
  return api.delete(`/users/${id}`);
}
