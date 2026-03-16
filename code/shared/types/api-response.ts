/**
 * Standard API response types shared between backend and frontend.
 */

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
}

export type UserRole =
  | 'IT_ADMIN'
  | 'LANH_DAO'
  | 'CAN_BO_QUAN_LY'
  | 'CAN_BO_CO_SO'
  | 'SUBJECT';

export type DataScopeLevel = 'WARD' | 'DISTRICT' | 'PROVINCE' | 'SYSTEM';

export type AlertLevel = 'THAP' | 'TRUNG_BINH' | 'CAO' | 'KHAN_CAP';

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DEACTIVATED';
