'use client';

import type { HTMLAttributes, SelectHTMLAttributes } from 'react';
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
          'block h-10 w-full appearance-none rounded-md border border-[var(--admin-border)] bg-white px-3 pr-9 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50',
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
