import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { resolveLocale } from '@/lib/server-locale';
import ManageClient from './ManageClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'event.ohYoonMemorial' });
  return {
    title: t('manageMetaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function ManagePage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  return <ManageClient />;
}
