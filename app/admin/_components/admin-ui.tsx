'use client';

import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

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
    <h1
      className={cn('text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl', className)}
      {...props}
    />
  );
}

export function AdminPageDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-relaxed text-slate-600', className)} {...props} />;
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
    <label className={cn('mb-2 block text-sm font-medium text-slate-700', className)} {...props} />
  );
}

export function AdminInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'block h-11 w-full rounded-md border border-[var(--admin-border)] bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
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
        'block w-full rounded-md border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
        className
      )}
      {...props}
    />
  );
}

type AdminBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'info' | 'success' | 'warning' | 'danger';
};

export function AdminBadge({ className, tone = 'default', ...props }: AdminBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        tone === 'default' && 'bg-slate-100 text-slate-700 ring-slate-200',
        tone === 'info' && 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
        tone === 'success' && 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        tone === 'warning' && 'bg-amber-50 text-amber-800 ring-amber-600/25',
        tone === 'danger' && 'bg-rose-50 text-rose-700 ring-rose-600/20',
        className
      )}
      {...props}
    />
  );
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
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
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
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
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
          'block h-11 w-full appearance-none rounded-md border border-[var(--admin-border)] bg-white px-3 pr-9 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
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
          'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500',
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
