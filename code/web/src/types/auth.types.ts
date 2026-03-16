export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  requireOtp: boolean;
  requireOtpSetup: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: UserInfo;
}

export interface VerifyOtpRequest {
  otpCode: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

export interface SetupOtpResponse {
  secret: string;
  qrCodeDataUrl: string;
}

export interface ConfirmOtpSetupRequest {
  otpCode: string;
}

export interface ConfirmOtpSetupResponse {
  backupCodes: string[];
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
  dataScope: {
    level: string;
    areaId: string;
    areaName: string;
  };
  otpEnabled: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
