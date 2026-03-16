import { cn } from '@/utils/cn';

type BadgeVariant = 'done' | 'urgent' | 'warning' | 'info' | 'processing' | 'pending' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  done: 'bg-green-50 text-green-800 border-green-200',
  urgent: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  processing: 'bg-red-50 text-red-700 border-red-300 font-semibold',
  pending: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  neutral: 'bg-zinc-50 text-zinc-600 border-zinc-200',
};

function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium leading-none whitespace-nowrap',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
