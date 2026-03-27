'use client';

import { useTranslations } from 'next-intl';
import { Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTACT } from '@/lib/constants';

interface GalleryStatusBarProps {
  className?: string;
}

export default function GalleryStatusBar({ className }: GalleryStatusBarProps) {
  const t = useTranslations('galleryStatus');

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 py-3 text-sm',
        className
      )}
    >
      <div className="flex items-center gap-2 font-medium text-charcoal">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        {t('status')}
        <span className="text-charcoal/40 hidden md:inline">|</span>
        <span className="text-charcoal/70 font-normal">{t('hours')}</span>
      </div>

      <div className="flex items-center gap-3">
        <a
          href={`tel:${CONTACT.PHONE}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-charcoal hover:bg-slate-50 transition-colors"
        >
          <Phone className="w-3 h-3" />
          {t('phone')}
        </a>
        <a
          href={`mailto:${CONTACT.EMAIL}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-charcoal hover:bg-slate-50 transition-colors"
        >
          <Mail className="w-3 h-3" />
          {t('email')}
        </a>
      </div>
    </div>
  );
}
