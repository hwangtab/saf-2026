import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import OrderLookup from './OrderLookup';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('orderLookup');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function OrdersPage() {
  return (
    <div className="min-h-screen bg-canvas-soft flex items-center justify-center px-4 pb-16 pt-24">
      <div className="w-full max-w-lg">
        <OrderLookup />
      </div>
    </div>
  );
}
