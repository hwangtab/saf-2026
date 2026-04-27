'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

interface CountdownTimerProps {
  deadlineIso: string;
}

const HOUR_MS = 60 * 60 * 1000;

function subscribeHourly(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const id = window.setInterval(callback, HOUR_MS);
  return () => window.clearInterval(id);
}

function getSnapshot(): number {
  return Date.now();
}

function getServerSnapshot(): number {
  return 0; // SSR placeholder — hydrate 직후 실제 시각으로 갱신
}

export default function CountdownTimer({ deadlineIso }: CountdownTimerProps) {
  const t = useTranslations('petition.ohYoon');
  const targetMs = new Date(deadlineIso).getTime();
  const now = useSyncExternalStore(subscribeHourly, getSnapshot, getServerSnapshot);

  if (now === 0) {
    return (
      <span className="inline-block min-w-[7ch] text-center" aria-label={t('countdownPrefix')}>
        D-…
      </span>
    );
  }

  const days = Math.max(0, Math.ceil((targetMs - now) / (24 * HOUR_MS)));

  if (days <= 0) {
    return <span className="font-semibold">{t('countdownClosed')}</span>;
  }

  return (
    <span aria-live="polite">
      {t('countdownPrefix')} <strong className="font-semibold">D-{days}</strong>
    </span>
  );
}
