import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="text-zinc-300 mb-2">{icon}</div>
      <p className="text-[13px] font-medium text-zinc-500">{title}</p>
      {subtitle && (
        <p className="text-[12px] text-zinc-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

export default EmptyState;
