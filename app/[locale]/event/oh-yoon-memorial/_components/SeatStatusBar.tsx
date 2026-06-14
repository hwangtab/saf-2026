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
    <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2">
      <span className="text-base font-semibold">
        {isOpen ? t('seatRemaining', { remaining }) : t('seatClosed')}
      </span>
    </div>
  );
}
