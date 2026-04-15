import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Clock } from 'lucide-react';
import { formatCurrentDate } from '@/lib/utils/format-date';

interface TrustBadgesProps {
  className?: string;
}

export default function TrustBadges({ className }: TrustBadgesProps) {
  const t = useTranslations('trustBadges');
  const locale = useLocale();
  const formattedDate = useMemo(() => formatCurrentDate(locale), [locale]);
  const badges = [t('safeDelivery'), t('curatorVerified')];

  return (
    <div className={cn('flex flex-wrap justify-center gap-2', className)}>
      <span className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full text-xs font-medium text-green-700">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        {t('alwaysOpen', { date: formattedDate })}
      </span>
      {badges.map((badge, index) => (
        <span
          key={index}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-medium text-gray-600"
        >
          <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
          {badge}
        </span>
      ))}
    </div>
  );
}
