import type { ReactNode } from 'react';
import { getMessages } from '@/locales';

const MSG = getMessages().layout;

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

function ShieldIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 4L6 12V22C6 33.1 13.68 43.48 24 46C34.32 43.48 42 33.1 42 22V12L24 4Z"
        fill="#B91C1C"
        stroke="#991B1B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 4L6 12V22C6 33.1 13.68 43.48 24 46V4Z"
        fill="#DC2626"
        stroke="#991B1B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M18 24L22 28L30 20"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Red accent bar */}
      <div className="h-[3px] bg-red-700 shrink-0" />

      <div className="flex flex-1">
        {/* Left panel - hidden on mobile */}
        <div className="hidden lg:flex w-[45%] bg-zinc-950 items-center justify-center">
          <div className="text-center px-8">
            <div className="flex justify-center mb-6">
              <ShieldIcon size={48} />
            </div>
            <h1 className="text-xl font-semibold text-zinc-50 mt-4">
              {MSG.brandName}
            </h1>
            <p className="text-sm text-zinc-400 mt-2 text-center max-w-[280px] leading-relaxed">
              {MSG.brandLine1}
              <br />
              {MSG.brandLine2}
              <br />
              {MSG.brandLine3}
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-white flex flex-col">
          <div className="flex-1 flex items-center justify-center px-6 py-8">
            <div className="w-full max-w-[380px]">
              {/* Mobile logo - shown only on mobile */}
              <div className="flex lg:hidden items-center gap-2.5 mb-8">
                <ShieldIcon size={36} />
                <span className="text-lg font-bold text-zinc-900">{MSG.brandName}</span>
              </div>

              {/* Title */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {title}
                </h2>
                <p className="text-[13px] text-zinc-500 mt-1">{subtitle}</p>
              </div>

              {/* Form content */}
              {children}
            </div>
          </div>

          {/* Footer */}
          <div className="py-4 text-center">
            <p className="text-[11px] text-zinc-500">{MSG.copyright}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
