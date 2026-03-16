import { useEffect, useCallback, useRef, type ReactNode } from 'react';
import { getMessages } from '@/locales';

const MSG = getMessages().layout;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
  closable?: boolean;
  closeOnBackdrop?: boolean;
}

const modalSizes = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
};

function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  closable = true,
  closeOnBackdrop = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) {
        onClose();
      }
    },
    [closable, onClose],
  );

  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[300] bg-black/50 animate-[fadeIn_150ms_ease-out]"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal wrapper */}
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`
            bg-white rounded border border-zinc-200 shadow-sm
            w-full flex flex-col
            animate-[scaleIn_150ms_ease-out]
            ${modalSizes[size]}
            max-h-[90vh]
            sm:max-h-[90vh]
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-200 flex items-start justify-between shrink-0">
            <div>
              <h3
                id="modal-title"
                className="text-[15px] font-semibold text-zinc-900"
              >
                {title}
              </h3>
              {subtitle && (
                <p className="text-[13px] text-zinc-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            {closable && (
              <button
                onClick={onClose}
                aria-label={MSG.ariaClose}
                className="h-5 w-5 text-zinc-400 cursor-pointer hover:text-zinc-600 transition-colors duration-150 shrink-0 mt-0.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-5 py-3 border-t border-zinc-200 flex items-center justify-end gap-2 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Modal;
