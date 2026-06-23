'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Props {
  slug: string;
}

/**
 * 후원 결제 실패 랜딩.
 *
 * Toss가 failUrl로 리다이렉트하면 이 화면이 표시된다.
 * 결제 파라미터는 필요 없으므로 서버 searchParams를 읽지 않는다.
 */
export default function FailClient({ slug }: Props) {
  const t = useTranslations('funding');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-danger/20 bg-canvas-soft p-10 text-center shadow-sm">
        <p className="mb-4 text-5xl text-danger">✕</p>
        <h1 className="mb-2 text-2xl font-bold text-charcoal-deep">{t('paymentFailed')}</h1>
        <p className="mb-6 text-sm text-charcoal-muted">{t('paymentFailedDesc')}</p>
        <Link
          href={`/funding/${slug}`}
          className="inline-block rounded-lg bg-primary-strong px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {t('backToProject')}
        </Link>
      </div>
    </div>
  );
}
