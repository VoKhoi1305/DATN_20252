import type { ReactNode } from 'react';
import Breadcrumb from './Breadcrumb';

interface PageHeaderProps {
  breadcrumbs: { label: string; href?: string }[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

function PageHeader({ breadcrumbs, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-4">
      <Breadcrumb items={breadcrumbs} />
      <div className="flex items-start justify-between mt-1">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          {subtitle && (
            <p className="text-[13px] text-zinc-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export default PageHeader;
