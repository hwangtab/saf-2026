import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ artworkId: string; locale: string }>;
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}

export default async function FailPage({ params, searchParams }: Props) {
  const { artworkId } = await params;
  const { code, message, orderId } = await searchParams;
  const t = await getTranslations('checkout');

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-lg mx-auto px-4">
        <div className="rounded-2xl border border-red-100 bg-white p-10 shadow-sm text-center">
          <p className="text-4xl mb-4">✗</p>
          <h1 className="text-2xl font-bold text-charcoal mb-2">{t('paymentFailed')}</h1>

          {message && <p className="text-sm text-gray-600 mb-3">{message}</p>}
          {code && (
            <p className="text-xs text-gray-400 mb-6">
              {t('errorCode')}: {code}
            </p>
          )}
          {orderId && (
            <p className="text-xs text-gray-400 mb-6">
              {t('orderIdLabel')}: {orderId}
            </p>
          )}

          <div className="flex flex-col items-center gap-3">
            <Link
              href={`/checkout/${artworkId}`}
              className="inline-block w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              {t('retryPayment')}
            </Link>
            <Link
              href={`/artworks/${artworkId}`}
              className="text-sm text-gray-500 underline hover:text-charcoal"
            >
              {t('backToArtworkPage')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
