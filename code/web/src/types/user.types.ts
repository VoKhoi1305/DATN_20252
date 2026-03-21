export interface UserListItem {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  area_id: string | null;
  data_scope_level: string;
  status: string;
  otp_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface UserDetail extends UserListItem {
  failed_login_count: number;
  locked_until: string | null;
  updated_at: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
  status?: string;
  sort?: string;
  order?: string;
}

export interface UserListResponse {
  data: UserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: string;
  area_id?: string;
  data_scope_level: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  area_id?: string;
  data_scope_level?: string;
  status?: string;
}
