import { cn } from '@/utils/cn';
import Skeleton from '@/components/ui/Skeleton';

interface StatCardProps {
  label: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  variant?: 'default' | 'alert';
  onClick?: () => void;
  loading?: boolean;
}

const changeColors = {
  positive: 'text-green-800',
  negative: 'text-red-700',
  neutral: 'text-zinc-400',
};

function StatCard({
  label,
  value,
  change,
  changeType,
  variant = 'default',
  onClick,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-zinc-200 rounded p-3">
        <Skeleton className="h-3 w-[60%] mb-2" />
        <Skeleton className="h-5 w-[40%] mb-2" />
        <Skeleton className="h-3 w-[80%]" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-zinc-200 rounded p-3 transition-colors',
        variant === 'alert' && 'border-l-[3px] border-l-red-700',
        onClick && 'cursor-pointer hover:bg-zinc-50',
      )}
    >
      <p className="text-[12px] text-zinc-500 font-medium">{label}</p>
      <p className="text-xl font-semibold text-zinc-900 mt-0.5">{value}</p>
      <p className={cn('text-[12px] mt-0.5', changeColors[changeType])}>
        {change}
      </p>
    </div>
  );
}

export default StatCard;
