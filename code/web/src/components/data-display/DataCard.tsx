import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface DataCardProps {
  title: string;
  titleAction?: ReactNode;
  noPadding?: boolean;
  children: ReactNode;
  className?: string;
}

function DataCard({ title, titleAction, noPadding = false, children, className }: DataCardProps) {
  return (
    <div className={cn('bg-white border border-zinc-200 rounded', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100">
        <h2 className="text-[13px] font-semibold text-zinc-900">{title}</h2>
        {titleAction}
      </div>
      <div className={noPadding ? '' : 'p-3'}>
        {children}
      </div>
    </div>
  );
}

export default DataCard;
