import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  id?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, id }) => {
  return (
    <div id={id} className="flex items-center gap-1 text-[13px] text-[var(--text-dim)]">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-dim)] opacity-60 flex-shrink-0" />
          )}
          {item.current ? (
            <span className="text-[var(--text)] font-semibold">{item.label}</span>
          ) : (
            <a
              href={item.href || '#'}
              onClick={(e) => {
                if (!item.href) e.preventDefault();
              }}
              className="hover:text-[var(--text-mid)] transition-colors duration-150"
            >
              {item.label}
            </a>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
