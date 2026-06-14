'use client';

import { useTranslations } from 'next-intl';

export default function SeatStatusBar({
  remaining,
  isOpen,
}: {
  remaining: number;
  isOpen: boolean;
}) {
  const t = useTranslations('event.ohYoonMemorial');
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2 text-base font-semibold text-white backdrop-blur-sm">
      <span
        className={`h-2 w-2 rounded-full ${isOpen ? 'animate-pulse bg-success' : 'bg-white/50'}`}
        aria-hidden="true"
      />
      {isOpen ? t('seatRemaining', { remaining }) : t('seatClosed')}
    </span>
  );
}
