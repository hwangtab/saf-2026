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
      {/* formattedDate는 client `new Date()`라 SSR 시점·hydration 시점 자정/timezone 차이로
          text content가 미세하게 어긋나 React error #418 발생 가능. 이 영역에선 prop
          drilling 부담이 커 suppressHydrationWarning으로 hydration mismatch만 silent 처리.
          (실제 사용자가 자정 정확히 페이지 머물러야 차이 감지) */}
      <span
        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-success/10 border border-success/20 rounded-full text-xs font-medium text-success-a11y"
        suppressHydrationWarning
      >
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
