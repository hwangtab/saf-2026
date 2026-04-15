import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils/cn';

export function AdminCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function AdminPageHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2', className)} {...props} />;
}

export function AdminPageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    // eslint-disable-next-line jsx-a11y/heading-has-content -- children passed via ...props
    <h1
      className={cn('text-2xl font-bold tracking-tight text-charcoal-deep sm:text-3xl', className)}
      {...props}
    />
  );
}

export function AdminPageDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-relaxed text-charcoal-muted', className)} {...props} />;
}

export function AdminCardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-[var(--admin-border-soft)] bg-[var(--admin-surface-muted)] p-6 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
      {...props}
    />
  );
}

export function AdminFieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- htmlFor passed via ...props from callers
    <label
      className={cn('mb-2 block text-sm font-medium text-charcoal-muted', className)}
      {...props}
    />
  );
}

export function AdminInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'block h-11 w-full rounded-md border border-[var(--admin-border)] bg-white px-3 text-sm text-charcoal-deep shadow-sm focus-visible:outline-nonetransition placeholder:text-charcoal-soft focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:bg-charcoal/10 disabled:text-charcoal-soft',
        className
      )}
      {...props}
    />
  );
}

export function AdminTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'block w-full rounded-md border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-charcoal-deep shadow-sm focus-visible:outline-nonetransition placeholder:text-charcoal-soft focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:bg-charcoal/10 disabled:text-charcoal-soft',
        className
      )}
      {...props}
    />
  );
}

type AdminBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  description?: string;
};

export function AdminBadge({
  className,
  tone = 'default',
  description,
  ...props
}: AdminBadgeProps) {
  /* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 툴팁 트리거 배지: 키보드 포커스를 위해 tabIndex 필요 */
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset relative group cursor-help focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        tone === 'default' && 'bg-charcoal/10 text-charcoal-muted ring-charcoal/15',
        tone === 'info' && 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
        tone === 'success' && 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        tone === 'warning' && 'bg-amber-50 text-amber-800 ring-amber-600/25',
        tone === 'danger' && 'bg-rose-50 text-rose-700 ring-rose-600/20',
        className
      )}
      role="note"
      tabIndex={0}
      {...props}
    >
      {props.children}
      {description && (
        <span className="invisible group-hover:visible group-focus-within:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] sm:text-xs font-normal text-white bg-charcoal-deep rounded shadow-lg whitespace-nowrap z-50">
          {description}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-charcoal-deep" />
        </span>
      )}
    </span>
  );
  /* eslint-enable jsx-a11y/no-noninteractive-tabindex */
}

type AdminEmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
};

export function AdminEmptyState({
  className,
  title,
  description,
  children,
  ...props
}: AdminEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-14 text-center', className)} {...props}>
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/10 text-charcoal-soft">
        <svg
          aria-hidden="true"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-charcoal-deep">{title}</h3>
      {description ? <p className="mt-1 text-sm text-charcoal-soft">{description}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

type AdminSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
  iconClassName?: string;
};

export function AdminSelect({
  className,
  wrapperClassName,
  iconClassName,
  children,
  ...props
}: AdminSelectProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        className={cn(
          'block h-11 w-full appearance-none rounded-md border border-[var(--admin-border)] bg-white px-3 pr-9 text-sm text-charcoal shadow-sm focus-visible:outline-nonetransition focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:bg-charcoal/10 disabled:text-charcoal-soft',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className={cn(
          'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-soft',
          iconClassName
        )}
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
export function AdminHelp({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative group inline-flex ml-1.5 align-middle', className)}>
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- 인라인 SVG는 <img>로 대체 불가; role="img"+aria-label로 스크린 리더 지원 */}
      <svg
        className="w-4 h-4 text-charcoal-soft cursor-help hover:text-indigo-500 transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-full"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        tabIndex={0}
        role="img"
        aria-label="Help"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="invisible group-hover:visible group-focus-within:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 text-[11px] leading-relaxed text-white bg-charcoal-deep rounded-lg shadow-xl z-50 pointer-events-none">
        {children}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-charcoal-deep" />
      </div>
    </div>
  );
}
