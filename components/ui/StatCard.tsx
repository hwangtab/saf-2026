import { cn } from '@/lib/utils';

interface StatCardProps {
  value: string | number;
  label: string;
  description?: string;
  variant?: 'default' | 'highlight' | 'bordered';
  className?: string;
}

export default function StatCard({
  value,
  label,
  description,
  variant = 'default',
  className,
}: StatCardProps) {
  const baseStyles =
    'text-center p-6 bg-white rounded-lg flex flex-col justify-center items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl';
  const variantStyles = {
    default: 'shadow-sm',
    highlight: 'border-t-4 border-primary shadow',
    bordered: 'border-2 border-gray-200 shadow-sm',
  };

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)}>
      <p className="text-4xl md:text-5xl font-bold text-primary mb-2">{value}</p>
      <p className="text-lg font-medium text-charcoal">{label}</p>
      {description && <p className="text-sm text-charcoal-muted mt-2">{description}</p>}
    </div>
  );
}
