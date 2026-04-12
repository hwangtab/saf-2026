import { cn } from '@/lib/utils';

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
  info: 'bg-blue-50 text-blue-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-yellow-50 text-yellow-700',
  danger: 'bg-red-50 text-red-600',
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
