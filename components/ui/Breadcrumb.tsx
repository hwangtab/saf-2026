import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import type { BreadcrumbItem } from '@/types';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

function toPathname(absoluteUrl: string): string {
  try {
    const url = new URL(absoluteUrl);
    const pathname = url.pathname.replace(/^\/en(\/|$)/, '/') || '/';
    return pathname === '' ? '/' : pathname;
  } catch {
    return '/';
  }
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items || items.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.url} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-white/40 select-none" aria-hidden="true">
                  ›
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="text-white font-medium">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={toPathname(item.url)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
