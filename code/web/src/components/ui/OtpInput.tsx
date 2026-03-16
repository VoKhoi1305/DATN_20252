import { useRef, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const focusInput = useCallback((index: number) => {
    const input = inputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleChange = useCallback(
    (index: number, char: string) => {
      if (!/^\d$/.test(char)) return;

      const newValue = value.split('');
      newValue[index] = char;
      // Fill gaps with empty strings
      for (let i = 0; i < length; i++) {
        if (!newValue[i]) newValue[i] = '';
      }
      const result = newValue.join('').slice(0, length);
      onChange(result);

      if (index < length - 1) {
        focusInput(index + 1);
      }

      if (result.length === length) {
        onComplete?.(result);
      }
    },
    [value, length, onChange, onComplete, focusInput],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const newValue = value.split('');
        if (newValue[index]) {
          newValue[index] = '';
          onChange(newValue.join(''));
        } else if (index > 0) {
          newValue[index - 1] = '';
          onChange(newValue.join(''));
          focusInput(index - 1);
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [value, length, onChange, focusInput],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, length);

      if (pastedData.length > 0) {
        onChange(pastedData);
        const nextIndex = Math.min(pastedData.length, length - 1);
        focusInput(nextIndex);

        if (pastedData.length === length) {
          onComplete?.(pastedData);
        }
      }
    },
    [length, onChange, onComplete, focusInput],
  );

  const cells = Array.from({ length }, (_, i) => {
    const char = value[i] || '';
    const isFilled = char !== '';

    return (
      <input
        key={i}
        ref={(el) => { inputRefs.current[i] = el; }}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={1}
        value={char}
        disabled={disabled}
        autoComplete="one-time-code"
        aria-label={`Digit ${i + 1}`}
        aria-invalid={!!error || undefined}
        className={`
          w-10 h-12 text-center
          text-lg font-mono font-semibold text-zinc-900
          border rounded bg-white
          transition-colors duration-150
          hover:border-zinc-500
          focus:border-red-700 focus:ring-2 focus:ring-red-700/15 focus:outline-none
          disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed
          ${error ? 'border-red-700 bg-red-50' : isFilled ? 'border-zinc-500' : 'border-zinc-300'}
          ${error ? 'animate-[shake_0.3s_ease-in-out]' : ''}
        `}
        onChange={(e) => handleChange(i, e.target.value)}
        onKeyDown={(e) => handleKeyDown(i, e)}
        onPaste={handlePaste}
        onFocus={(e) => e.target.select()}
      />
    );
  });

  return (
    <div>
      <div className="flex items-center justify-center gap-2">
        {cells.slice(0, 3)}
        <span className="w-3 h-px bg-zinc-300" />
        {cells.slice(3)}
      </div>
      {error && (
        <p className="text-xs text-red-700 text-center mt-2">{error}</p>
      )}
    </div>
  );
}

export default OtpInput;
