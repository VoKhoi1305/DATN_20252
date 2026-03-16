import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger-ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantStyles = {
  primary: `
    bg-red-700 text-zinc-50
    hover:bg-red-800 active:bg-red-900
    focus-visible:ring-red-700/30
    disabled:bg-zinc-100 disabled:text-zinc-400
  `,
  secondary: `
    bg-zinc-100 text-zinc-900
    hover:bg-zinc-200 active:bg-zinc-300
    focus-visible:ring-zinc-400/30
    disabled:bg-zinc-100 disabled:text-zinc-400
  `,
  outline: `
    border border-red-700 text-red-700 bg-transparent
    hover:bg-red-50 hover:text-red-800 active:bg-red-100
    focus-visible:ring-red-700/20
    disabled:border-zinc-300 disabled:text-zinc-400 disabled:bg-transparent
  `,
  ghost: `
    text-zinc-600 bg-transparent
    hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200
    focus-visible:ring-zinc-400/30
    disabled:text-zinc-300 disabled:bg-transparent
  `,
  'danger-ghost': `
    text-red-700 bg-transparent
    hover:bg-red-50 hover:text-red-800 active:bg-red-100
    focus-visible:ring-red-700/20
    disabled:text-zinc-300 disabled:bg-transparent
  `,
};

const sizeStyles = {
  sm: 'h-[30px] px-[10px] text-xs',
  md: 'h-9 px-[14px] text-[13px]',
  lg: 'h-10 px-5 text-[13px]',
};

function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium whitespace-nowrap select-none
        transition-colors duration-150 rounded
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </button>
  );
}

export default Button;
