import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import LinkButton from '@/components/ui/LinkButton';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { CONTACT } from '@/lib/constants';

interface Props {
  artworkId: string;
  artworkTitle: string;
}

export default async function PaypalPlaceholder({ artworkId, artworkTitle }: Props) {
  const t = await getTranslations('checkout.paypalPreparing');

  return (
    <div
      className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
          <p className="text-4xl mb-4" aria-hidden="true">
            🌍
          </p>
          <h1 className="text-2xl font-bold text-charcoal mb-2">{t('title')}</h1>
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-semibold text-charcoal">{artworkTitle}</span>
          </p>
          <p className="text-sm text-gray-500 mb-8">{t('description')}</p>

          <div className="flex flex-col gap-3">
            <LinkButton
              href={`mailto:${CONTACT.EMAIL}`}
              variant="primary"
              size="sm"
              external
              className="w-full"
            >
              {t('contactCta')}
            </LinkButton>
            <Link
              href={`/artworks/${artworkId}`}
              className="text-sm text-gray-500 underline hover:text-charcoal"
            >
              {t('backCta')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
