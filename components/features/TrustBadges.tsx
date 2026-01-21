import { cn } from '@/lib/utils';

interface TrustBadgesProps {
  className?: string;
}

export default function TrustBadges({ className }: TrustBadgesProps) {
  const badges = ['✓ 100% 진품 보증', '✓ 안전한 포장 배송', '✓ 전문 큐레이터 검증'];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {badges.map((badge, index) => (
        <span
          key={index}
          className="inline-flex items-center px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-xs font-medium text-slate-600"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}
