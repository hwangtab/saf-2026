import { cn } from '@/lib/utils/cn';
import type { Platform } from '@/lib/social/types';

const PLATFORM_META: Record<Platform, { label: string; className: string }> = {
  instagram: { label: 'Instagram', className: 'bg-primary/10 text-primary-strong' },
  threads: { label: 'Threads', className: 'bg-charcoal-deep/10 text-charcoal-deep' },
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: '대기', className: 'bg-gray-100 text-charcoal-muted' },
  publishing: { label: '게시 중', className: 'bg-sun-soft text-sun-strong' },
  published: { label: '게시됨', className: 'bg-success/10 text-success-a11y' },
  failed: { label: '실패', className: 'bg-danger/10 text-danger-a11y' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}
