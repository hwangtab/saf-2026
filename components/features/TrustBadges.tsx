import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface TrustBadgesProps {
  className?: string;
}

export default function TrustBadges({ className }: TrustBadgesProps) {
  const t = useTranslations('trustBadges');
  const badges = [t('authenticity'), t('safeDelivery'), t('curatorVerified')];

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
