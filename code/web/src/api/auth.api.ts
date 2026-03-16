import api from '@/api/axios';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  VerifyOtpResponse,
  SetupOtpResponse,
  ConfirmOtpSetupResponse,
  RefreshResponse,
} from '@/types/auth.types';

export async function login(
  username: string,
  password: string,
): Promise<ApiResponse<LoginResponse>> {
  const payload: LoginRequest = { username, password };
  const response = await api.post<ApiResponse<LoginResponse>>(
    '/auth/login',
    payload,
  );
  return response.data;
}

export async function verifyOtp(
  otpCode: string,
  tempToken: string,
): Promise<ApiResponse<VerifyOtpResponse>> {
  const response = await api.post<ApiResponse<VerifyOtpResponse>>(
    '/auth/verify-otp',
    { otpCode },
    { headers: { Authorization: `Bearer ${tempToken}` } },
  );
  return response.data;
}

export async function setupOtp(): Promise<ApiResponse<SetupOtpResponse>> {
  const response = await api.post<ApiResponse<SetupOtpResponse>>(
    '/auth/setup-otp',
  );
  return response.data;
}

export async function confirmOtpSetup(
  otpCode: string,
): Promise<ApiResponse<ConfirmOtpSetupResponse>> {
  const response = await api.post<ApiResponse<ConfirmOtpSetupResponse>>(
    '/auth/confirm-otp-setup',
    { otpCode },
  );
  return response.data;
}

export async function refreshToken(
  token: string,
): Promise<ApiResponse<RefreshResponse>> {
  const response = await api.post<ApiResponse<RefreshResponse>>(
    '/auth/refresh',
    { refreshToken: token },
  );
  return response.data;
}

export async function logout(
  refreshTokenValue: string,
): Promise<ApiResponse<null>> {
  const response = await api.post<ApiResponse<null>>('/auth/logout', {
    refreshToken: refreshTokenValue,
  });
  return response.data;
}
