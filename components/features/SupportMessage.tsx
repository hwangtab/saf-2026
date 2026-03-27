'use client';

import { useTranslations } from 'next-intl';
import { Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupportMessageProps {
  className?: string;
}

export default function SupportMessage({ className }: SupportMessageProps) {
  const t = useTranslations('support');

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 to-white border border-primary/10 p-6 text-center transition-transform hover:scale-[1.01] duration-300',
        className
      )}
    >
      <div className="relative z-10 flex flex-col items-center gap-4">
        <Sprout className="w-8 h-8 text-primary" />

        <h3 className="font-bold text-gray-800 text-lg break-keep">{t('title')}</h3>

        {/* 통계 콜아웃 */}
        <div className="w-full rounded-xl bg-primary/[0.08] py-3 px-4">
          <p className="text-2xl font-bold text-primary">{t('statValue')}</p>
          <p className="text-xs text-gray-600 mt-0.5 break-keep">{t('statLabel')}</p>
        </div>

        <p className="text-sm text-gray-600 break-keep leading-relaxed whitespace-pre-line text-left">
          {t('body')}
        </p>

        <p className="text-xs text-primary-strong break-keep font-medium opacity-80">
          {t('footer')}
        </p>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}
