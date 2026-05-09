'use client';

import { useTranslations } from 'next-intl';
import { Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { CONTACT } from '@/lib/constants';

interface GalleryStatusBarProps {
  className?: string;
  /**
   * 현재 날짜 — server에서 formatCurrentDate(locale)로 평가해 prop 전달.
   * client에서 직접 `new Date()`를 호출하면 SSR 시점 날짜와 hydration 시점 날짜가
   * 자정·timezone 차이로 어긋나 React error #418 (text content mismatch) 발생.
   */
  currentDate: string;
}

export default function GalleryStatusBar({ className, currentDate }: GalleryStatusBarProps) {
  const t = useTranslations('galleryStatus');
  const formattedDate = currentDate;

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 py-3 text-sm',
        className
      )}
    >
      <div className="flex items-center gap-2 font-medium text-charcoal">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
        </span>
        {t('status', { date: formattedDate })}
        <span className="text-charcoal-soft hidden md:inline">|</span>
        <span className="text-charcoal-muted font-normal">{t('hours')}</span>
      </div>

      <div className="flex items-center gap-3">
        <a
          href={`tel:${CONTACT.PHONE}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-charcoal hover:bg-gray-100 transition-colors"
        >
          <Phone className="w-3 h-3" />
          {t('phone')}
        </a>
        <a
          href={`mailto:${CONTACT.EMAIL}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-charcoal hover:bg-gray-100 transition-colors"
        >
          <Mail className="w-3 h-3" />
          {t('email')}
        </a>
      </div>
    </div>
  );
}
