import { cn } from '@/lib/utils/cn';

type BadgeTone = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'outline-primary';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-gray-100 text-charcoal-muted',
  info: 'bg-primary-surface text-primary-strong',
  success: 'bg-success/10 text-success-a11y',
  warning: 'bg-sun-soft text-sun-strong',
  danger: 'bg-danger/10 text-danger-a11y',
  'outline-primary': 'border border-primary text-primary bg-transparent',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5',
  md: 'px-2.5 py-1',
};

export default function Badge({ children, tone = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full text-xs font-medium',
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}
