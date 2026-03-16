import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import AuthLayout from '@/layouts/AuthLayout';
import OtpInput from '@/components/ui/OtpInput';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { verifyOtp } from '@/api/auth.api';
import {
  getTempToken,
  clearTempToken,
  setAccessToken,
  setRefreshToken,
  setUser,
  isAuthenticated,
} from '@/stores/auth.store';
import type { ApiError } from '@/types/auth.types';

type Mode = 'otp' | 'backup';

import { getMessages } from '@/locales';

const MSG = getMessages().otp;

function ShieldLockIcon() {
  return (
    <svg
      className="h-12 w-12 mx-auto text-red-700"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M24 4L6 12V22C6 33.1 13.68 43.48 24 46C34.32 43.48 42 33.1 42 22V12L24 4Z" />
      <rect x="17" y="21" width="14" height="10" rx="2" />
      <path d="M20 21V18C20 15.79 21.79 14 24 14C26.21 14 28 15.79 28 18V21" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      className="h-12 w-12 mx-auto text-zinc-600"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="30" cy="18" r="8" />
      <path d="M22 26L10 38" />
      <path d="M10 32L14 36" />
      <path d="M14 28L18 32" />
    </svg>
  );
}

function OtpVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>('otp');
  const [otpValue, setOtpValue] = useState('');
  const [backupValue, setBackupValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [backupError, setBackupError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
      return;
    }
    const tempToken = getTempToken();
    if (!tempToken) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const returnUrl = searchParams.get('returnUrl');

  const handleVerifyOtp = useCallback(
    async (code: string) => {
      const tempToken = getTempToken();
      if (!tempToken) {
        navigate('/login?session=expired', { replace: true });
        return;
      }

      setOtpError('');
      setLoading(true);

      try {
        const response = await verifyOtp(code, tempToken);
        const result = response.data;

        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken);
        setUser(result.user);
        clearTempToken();

        const destination = returnUrl || '/dashboard';
        navigate(destination, { replace: true });
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        const status = axiosError.response?.status;
        const errorCode = axiosError.response?.data?.error?.code;

        setOtpValue('');

        if (status === 401) {
          showToast(MSG.errSession, 'error');
          clearTempToken();
          navigate('/login?session=expired', { replace: true });
          return;
        }
        if (status === 429) {
          showToast(MSG.errTooMany, 'error');
        } else if (status === 400) {
          if (errorCode === 'OTP_EXPIRED') {
            setOtpError(MSG.errExpired);
          } else {
            setOtpError(MSG.errInvalidOtp);
          }
        } else if (!axiosError.response) {
          showToast(MSG.errNetwork, 'error');
        } else {
          showToast(MSG.errSystem, 'error');
        }
      } finally {
        setLoading(false);
      }
    },
    [navigate, returnUrl, showToast],
  );

  const handleVerifyBackup = useCallback(async () => {
    const code = backupValue.trim().toUpperCase();

    if (!code) {
      setBackupError(MSG.backupRequired);
      return;
    }
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      setBackupError(MSG.backupFormat);
      return;
    }

    const tempToken = getTempToken();
    if (!tempToken) {
      navigate('/login?session=expired', { replace: true });
      return;
    }

    setBackupError('');
    setLoading(true);

    try {
      // Backup codes go through the same verify-otp endpoint
      const response = await verifyOtp(code, tempToken);
      const result = response.data;

      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      setUser(result.user);
      clearTempToken();

      const destination = returnUrl || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      const status = axiosError.response?.status;

      if (status === 401) {
        showToast(MSG.errSession, 'error');
        clearTempToken();
        navigate('/login?session=expired', { replace: true });
        return;
      }
      if (status === 429) {
        showToast(MSG.errTooMany, 'error');
      } else if (status === 400) {
        setBackupError(MSG.errBackupInvalid);
      } else if (!axiosError.response) {
        showToast(MSG.errNetwork, 'error');
      } else {
        showToast(MSG.errSystem, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [backupValue, navigate, returnUrl, showToast]);

  const handleOtpComplete = useCallback(
    (code: string) => {
      handleVerifyOtp(code);
    },
    [handleVerifyOtp],
  );

  const handleOtpSubmit = useCallback(() => {
    if (otpValue.length !== 6) {
      setOtpError(MSG.otpRequired);
      return;
    }
    handleVerifyOtp(otpValue);
  }, [otpValue, handleVerifyOtp]);

  const handleBackToLogin = useCallback(() => {
    clearTempToken();
    navigate('/login');
  }, [navigate]);

  const switchToBackup = useCallback(() => {
    setMode('backup');
    setOtpError('');
    setOtpValue('');
  }, []);

  const switchToOtp = useCallback(() => {
    setMode('otp');
    setBackupError('');
    setBackupValue('');
  }, []);

  if (mode === 'backup') {
    return (
      <AuthLayout title={MSG.backupTitle} subtitle={MSG.backupSubtitle}>
        <div className="text-center mb-4">
          <KeyIcon />
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label={MSG.backupLabel}
            placeholder={MSG.backupPlaceholder}
            value={backupValue}
            onChange={(e) => {
              setBackupValue(e.target.value);
              setBackupError('');
            }}
            error={backupError}
            disabled={loading}
            autoFocus
            className="font-mono"
          />

          <div className="mt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onClick={handleVerifyBackup}
            >
              {loading ? MSG.verifying : MSG.verify}
            </Button>
          </div>

          <div className="text-center mt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={switchToOtp}
              disabled={loading}
            >
              {MSG.backToOtp}
            </Button>
          </div>

          <p className="text-xs text-zinc-400 text-center mt-2">
            {MSG.backupInfo}
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={MSG.otpTitle} subtitle={MSG.otpSubtitle}>
      <div className="text-center mb-4">
        <ShieldLockIcon />
      </div>

      <div className="flex flex-col gap-4">
        <OtpInput
          value={otpValue}
          onChange={(v) => {
            setOtpValue(v);
            setOtpError('');
          }}
          onComplete={handleOtpComplete}
          error={otpError}
          disabled={loading}
          autoFocus
        />

        <div className="mt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onClick={handleOtpSubmit}
          >
            {loading ? MSG.verifying : MSG.verify}
          </Button>
        </div>

        <div className="border-t border-zinc-200 my-2" />

        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={switchToBackup}
            disabled={loading}
          >
            {MSG.useBackup}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLogin}
            disabled={loading}
            className="text-zinc-500"
          >
            {MSG.backToLogin}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}

export default OtpVerifyPage;
