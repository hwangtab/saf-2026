'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrentDate } from '@/lib/utils/format-date';
import { CONTACT } from '@/lib/constants';

interface GalleryStatusBarProps {
  className?: string;
}

export default function GalleryStatusBar({ className }: GalleryStatusBarProps) {
  const t = useTranslations('galleryStatus');
  const locale = useLocale();
  const formattedDate = useMemo(() => formatCurrentDate(locale), [locale]);

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
