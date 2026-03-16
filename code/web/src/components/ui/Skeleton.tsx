import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('bg-zinc-200 rounded animate-pulse', className)}
    />
  );
}

export default Skeleton;
