import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import CartPageContent from '@/components/features/CartPageContent';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cart' });
  return {
    title: t('title'),
    robots: { index: false },
  };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'cart' });

  return (
    <div className={`min-h-screen ${SAWTOOTH_TOP_SAFE_PADDING}`}>
      <PageHero title={t('title')} description={t('subtitle')} />
      <Section variant="white">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <CartPageContent />
        </div>
      </Section>
    </div>
  );
}
