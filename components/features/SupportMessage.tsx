'use client';

import { useTranslations } from 'next-intl';
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
      <div className="relative z-10 flex flex-col items-center gap-3">
        <span className="text-3xl">🤝</span>

        <div className="space-y-1">
          <h3 className="font-bold text-gray-800 text-lg break-keep">
            {t('titleTop')}
            <br />
            {t('titleBottom')}
          </h3>
          <p className="text-sm text-gray-500 break-keep opacity-80 mt-2">
            {t('bodyTop')}
            <br />
            {t('bodyBottom')}
          </p>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}
