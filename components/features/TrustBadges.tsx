import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

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
          className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-xs font-medium text-slate-600"
        >
          <Check className="w-3.5 h-3.5 text-primary" />
          {badge}
        </span>
      ))}
    </div>
  );
}
