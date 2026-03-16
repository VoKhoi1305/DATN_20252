import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import AuthLayout from '@/layouts/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { login } from '@/api/auth.api';
import {
  isAuthenticated,
  setAccessToken,
  setRefreshToken,
  setTempToken,
  setUser,
} from '@/stores/auth.store';
import type { ApiError } from '@/types/auth.types';

interface LoginFormData {
  username: string;
  password: string;
}

import { getMessages } from '@/locales';

const MSG = getMessages().login;

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const sessionToastShown = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    setFocus,
  } = useForm<LoginFormData>({
    mode: 'onBlur',
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Check session=expired param
  useEffect(() => {
    if (searchParams.get('session') === 'expired' && !sessionToastShown.current) {
      sessionToastShown.current = true;
      showToast(MSG.sessionExpired, 'info');
    }
  }, [searchParams, showToast]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await login(data.username, data.password);
      const result = response.data;

      if (result.requireOtp) {
        if (result.tempToken) {
          setTempToken(result.tempToken);
        }
        navigate('/login/otp');
        return;
      }

      if (result.requireOtpSetup) {
        if (result.accessToken) {
          setAccessToken(result.accessToken);
        }
        if (result.refreshToken) {
          setRefreshToken(result.refreshToken);
        }
        navigate('/setup-otp');
        return;
      }

      // Fully authenticated
      if (result.accessToken) {
        setAccessToken(result.accessToken);
      }
      if (result.refreshToken) {
        setRefreshToken(result.refreshToken);
      }
      if (result.user) {
        setUser(result.user);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      const status = axiosError.response?.status;

      // Clear password and focus it on any error
      setValue('password', '');

      if (status === 401) {
        showToast(MSG.err401, 'error');
      } else if (status === 403) {
        showToast(MSG.err403, 'error');
      } else if (status === 429) {
        showToast(MSG.err429, 'error');
      } else {
        showToast(MSG.errSystem, 'error');
      }

      // Focus password field after clearing
      setTimeout(() => {
        setFocus('password');
      }, 100);
    }
  };

  const { ref: usernameRef, ...usernameRest } = register('username', {
    required: MSG.usernameRequired,
    minLength: {
      value: 3,
      message: MSG.usernameMinLength,
    },
  });

  const { ref: passwordRef, ...passwordRest } = register('password', {
    required: MSG.passwordRequired,
    minLength: {
      value: 6,
      message: MSG.passwordMinLength,
    },
  });

  return (
    <AuthLayout title={MSG.title} subtitle={MSG.subtitle}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          label={MSG.usernameLabel}
          placeholder={MSG.usernamePlaceholder}
          autoFocus
          autoComplete="username"
          disabled={isSubmitting}
          error={errors.username?.message}
          ref={(e) => {
            usernameRef(e);
          }}
          {...usernameRest}
        />

        <Input
          label={MSG.passwordLabel}
          type="password"
          placeholder={MSG.passwordPlaceholder}
          autoComplete="current-password"
          disabled={isSubmitting}
          error={errors.password?.message}
          ref={(e) => {
            passwordRef(e);
          }}
          {...passwordRest}
        />

        <div className="mt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
          >
            {isSubmitting ? MSG.submitting : MSG.submit}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
