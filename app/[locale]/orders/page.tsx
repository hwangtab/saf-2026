import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import OrderLookup from './OrderLookup';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('orderLookup');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function OrdersPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8">
        <OrderLookup />
      </div>
    </div>
  );
}
