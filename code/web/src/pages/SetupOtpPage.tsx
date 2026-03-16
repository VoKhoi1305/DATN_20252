import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import AuthLayout from '@/layouts/AuthLayout';
import OtpInput from '@/components/ui/OtpInput';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { setupOtp, confirmOtpSetup } from '@/api/auth.api';
import {
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  setUser,
  clearAuth,
} from '@/stores/auth.store';
import type { ApiError } from '@/types/auth.types';

type Step = 1 | 2;

import { getMessages } from '@/locales';

const MSG = getMessages().otp;

function StepIndicator({ currentStep }: { currentStep: Step; totalSteps?: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {MSG.stepLabels.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px bg-zinc-300" />}
            <div className="flex items-center gap-1.5">
              <span
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold
                  ${isDone ? 'bg-green-100 text-green-800' : ''}
                  ${isActive ? 'bg-red-700 text-white' : ''}
                  ${!isDone && !isActive ? 'bg-zinc-100 text-zinc-400' : ''}
                `}
              >
                {isDone ? '✓' : stepNum}
              </span>
              <span
                className={`text-xs ${
                  isActive
                    ? 'text-red-700 font-semibold'
                    : isDone
                      ? 'text-green-800'
                      : 'text-zinc-400'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SetupOtpPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);

  // Backup codes modal
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  // Check auth state
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
  }, [navigate]);

  // Load QR code on mount
  useEffect(() => {
    let cancelled = false;

    async function loadSetup() {
      try {
        setPageLoading(true);
        setPageError('');
        const response = await setupOtp();
        if (cancelled) return;
        const result = response.data;
        setQrCodeDataUrl(result.qrCodeDataUrl);
        setSecretKey(result.secret);
      } catch (err) {
        if (cancelled) return;
        const axiosError = err as AxiosError<ApiError>;
        const status = axiosError.response?.status;
        const errorCode = axiosError.response?.data?.error?.code;

        if (status === 401) {
          showToast(MSG.errSession, 'error');
          clearAuth();
          navigate('/login?session=expired', { replace: true });
          return;
        }
        if (errorCode === 'OTP_ALREADY_ENABLED') {
          showToast(MSG.errAlreadySetup, 'info');
          navigate('/login/otp', { replace: true });
          return;
        }
        if (!axiosError.response) {
          setPageError(MSG.errNetwork);
        } else {
          setPageError(MSG.errSystem);
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }

    loadSetup();
    return () => { cancelled = true; };
  }, [navigate, showToast]);

  const handleCopySecret = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(secretKey);
      setSecretCopied(true);
      showToast(MSG.copied, 'success');
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      showToast(MSG.errSystem, 'error');
    }
  }, [secretKey, showToast]);

  const handleConfirmOtp = useCallback(
    async (code: string) => {
      setOtpError('');
      setLoading(true);

      try {
        const response = await confirmOtpSetup(code);
        const result = response.data;

        // Store backup codes for modal
        setBackupCodes(result.backupCodes);

        // Save tokens
        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken);
        setUser(result.user);

        // Show backup codes modal
        setShowBackupModal(true);
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        const status = axiosError.response?.status;

        setOtpValue('');

        if (status === 401) {
          showToast(MSG.errSession, 'error');
          clearAuth();
          navigate('/login?session=expired', { replace: true });
          return;
        }
        if (status === 429) {
          showToast(MSG.errTooMany, 'error');
        } else if (status === 400 || status === 403) {
          setOtpError(MSG.errInvalidOtp);
        } else if (!axiosError.response) {
          showToast(MSG.errNetwork, 'error');
        } else {
          showToast(MSG.errSystem, 'error');
        }
      } finally {
        setLoading(false);
      }
    },
    [navigate, showToast],
  );

  const handleOtpComplete = useCallback(
    (code: string) => {
      handleConfirmOtp(code);
    },
    [handleConfirmOtp],
  );

  const handleOtpSubmit = useCallback(() => {
    if (otpValue.length !== 6) {
      setOtpError(MSG.errInvalidOtp);
      return;
    }
    handleConfirmOtp(otpValue);
  }, [otpValue, handleConfirmOtp]);

  const handleCopyAllBackupCodes = useCallback(async () => {
    const text = backupCodes
      .map((code, i) => `${(i + 1).toString().padStart(2, ' ')}. ${code}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast(MSG.copiedAll, 'success');
    } catch {
      showToast(MSG.errSystem, 'error');
    }
  }, [backupCodes, showToast]);

  const handleBackupModalContinue = useCallback(() => {
    setShowBackupModal(false);
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleBackToLogin = useCallback(() => {
    clearAuth();
    navigate('/login');
  }, [navigate]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Format secret for display: groups of 4
  const formattedSecret = secretKey.replace(/(.{4})/g, '$1 ').trim();

  // Page loading state
  if (pageLoading) {
    return (
      <AuthLayout title={MSG.step1Title} subtitle={MSG.step1Subtitle}>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="h-8 w-8 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-zinc-500">{MSG.loading}</p>
        </div>
      </AuthLayout>
    );
  }

  // Page error state
  if (pageError) {
    return (
      <AuthLayout title={MSG.step1Title} subtitle={MSG.step1Subtitle}>
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-[13px] text-red-700 text-center">{pageError}</p>
          <Button variant="primary" size="md" onClick={handleRetry}>
            {MSG.retry}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLogin}
            className="text-zinc-500"
          >
            {MSG.backToLogin}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Step 1: Scan QR
  if (step === 1) {
    return (
      <AuthLayout title={MSG.step1Title} subtitle={MSG.step1Subtitle}>
        <StepIndicator currentStep={1} />

        <div className="flex flex-col items-center">
          {/* QR Code */}
          <div className="mx-auto p-3 border border-zinc-200 rounded bg-white">
            <img
              src={qrCodeDataUrl}
              alt="QR Code"
              className="w-[180px] h-[180px] lg:w-[180px] lg:h-[180px] w-[150px] h-[150px]"
            />
          </div>

          {/* Divider with text */}
          <div className="flex items-center gap-3 my-4 w-full">
            <div className="flex-1 h-px bg-zinc-200" />
            <span className="text-[11px] text-zinc-400 uppercase tracking-widest whitespace-nowrap">
              {MSG.manualEntry}
            </span>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          {/* Secret Key */}
          <div className="w-full bg-zinc-100 border border-zinc-200 rounded px-3 py-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[13px] text-zinc-700 tracking-widest break-all">
              {formattedSecret}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySecret}
              className="shrink-0"
            >
              {secretCopied ? MSG.copied : MSG.copySecret}
            </Button>
          </div>
          <p className="text-xs text-zinc-500 mt-1 w-full">
            {MSG.secretHelper}
          </p>

          {/* Continue button */}
          <div className="w-full mt-6">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setStep(2)}
            >
              {MSG.continue}
            </Button>
          </div>

          {/* Back to login */}
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToLogin}
              className="text-zinc-500"
            >
              {MSG.backToLogin}
            </Button>
          </div>
        </div>

        {/* Backup codes modal */}
        <Modal
          open={showBackupModal}
          onClose={() => {}}
          title={MSG.modalTitle}
          size="md"
          closable={false}
          closeOnBackdrop={false}
          footer={
            <Button
              variant="primary"
              size="md"
              disabled={!backupConfirmed}
              onClick={handleBackupModalContinue}
            >
              {MSG.modalContinue}
            </Button>
          }
        >
          <BackupCodesModalContent
            codes={backupCodes}
            confirmed={backupConfirmed}
            onConfirmChange={setBackupConfirmed}
            onCopyAll={handleCopyAllBackupCodes}
          />
        </Modal>
      </AuthLayout>
    );
  }

  // Step 2: Verify OTP
  return (
    <AuthLayout title={MSG.step2Title} subtitle={MSG.step2Subtitle}>
      <StepIndicator currentStep={2} />

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
            {loading ? MSG.confirming : MSG.confirm}
          </Button>
        </div>

        <div className="flex flex-col items-center gap-2 mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep(1);
              setOtpValue('');
              setOtpError('');
            }}
            disabled={loading}
          >
            {MSG.backToQr}
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

      {/* Backup codes modal */}
      <Modal
        open={showBackupModal}
        onClose={() => {}}
        title={MSG.modalTitle}
        size="md"
        closable={false}
        closeOnBackdrop={false}
        footer={
          <Button
            variant="primary"
            size="md"
            disabled={!backupConfirmed}
            onClick={handleBackupModalContinue}
          >
            {MSG.modalContinue}
          </Button>
        }
      >
        <BackupCodesModalContent
          codes={backupCodes}
          confirmed={backupConfirmed}
          onConfirmChange={setBackupConfirmed}
          onCopyAll={handleCopyAllBackupCodes}
        />
      </Modal>
    </AuthLayout>
  );
}

function BackupCodesModalContent({
  codes,
  confirmed,
  onConfirmChange,
  onCopyAll,
}: {
  codes: string[];
  confirmed: boolean;
  onConfirmChange: (v: boolean) => void;
  onCopyAll: () => void;
}) {
  return (
    <div>
      {/* Warning box */}
      <div className="bg-yellow-50 border border-amber-200 rounded p-3">
        <p className="text-[13px] font-semibold text-amber-800 mb-1">
          {MSG.modalWarningTitle}
        </p>
        <p className="text-xs text-amber-800 leading-relaxed">
          {MSG.modalWarningText}
        </p>
      </div>

      {/* Backup codes grid */}
      <div className="mt-4 bg-zinc-50 border border-zinc-200 rounded p-4">
        <div className="grid grid-cols-2 sm:grid-cols-2 grid-cols-1 gap-y-2 gap-x-6">
          {codes.map((code, i) => (
            <div
              key={code}
              className="font-mono text-[13px] text-zinc-700"
            >
              <span className="text-zinc-400 mr-2">
                {(i + 1).toString().padStart(2, '\u00A0')}.
              </span>
              {code}
            </div>
          ))}
        </div>
      </div>

      {/* Copy all button */}
      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={onCopyAll}>
          {MSG.copyAll}
        </Button>
      </div>

      {/* Checkbox */}
      <label className="flex items-start gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-red-700 focus:ring-red-700/20"
        />
        <span className="text-[13px] text-zinc-900">
          {MSG.checkboxLabel}
        </span>
      </label>
    </div>
  );
}

export default SetupOtpPage;
