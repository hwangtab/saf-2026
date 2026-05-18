import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { SITE_URL } from '@/lib/constants';
import { getSupabaseFAQs } from '@/lib/supabase-data';
import { generateFAQSchema } from '@/lib/schemas/content';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import FAQList from '@/components/features/FAQList';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import type { BreadcrumbItem } from '@/types';

export const dynamic = 'force-static';
export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

const PAGE_COPY = {
  ko: {
    title: '자주 묻는 질문 — 그림 구매·배송·상호부조 대출 | 씨앗페',
    description:
      '씨앗페 작품 구매, 배송·반품, 진품 보증, 예술인 상호부조 대출 기금, 조합원 가입 등에 대한 자주 묻는 질문과 답변입니다.',
    h1: '자주 묻는 질문',
    lead: '작품 구매부터 캠페인 참여까지, 궁금한 점을 모았습니다.',
  },
  en: {
    title: 'FAQ — Art Purchase, Shipping & Mutual-Aid Loan | SAF',
    description:
      'Answers to frequently asked questions about purchasing artworks on SAF, shipping & returns, authentication, the artist mutual-aid loan fund, and membership.',
    h1: 'Frequently Asked Questions',
    lead: 'Everything you need to know — from buying your first artwork to joining the campaign.',
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const pageUrl = locale === 'en' ? `${SITE_URL}/en/faq` : `${SITE_URL}/faq`;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: pageUrl,
      languages: {
        'ko-KR': `${SITE_URL}/faq`,
        'en-US': `${SITE_URL}/en/faq`,
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: pageUrl,
    },
  };
}

export default async function FAQPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  setRequestLocale(locale);

  const faqs = await getSupabaseFAQs(locale);
  const copy = PAGE_COPY[locale];
  const baseUrl = locale === 'en' ? `${SITE_URL}/en` : SITE_URL;

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: locale === 'en' ? 'Home' : '홈', url: baseUrl },
    { name: copy.h1, url: `${baseUrl}/faq` },
  ];

  return (
    <>
      <PageHero title={copy.h1} description={copy.lead} breadcrumbItems={breadcrumbItems} />
      <Section variant="canvas-soft" className="py-16 md:py-20">
        <div className="container-max max-w-3xl">
          <FAQList items={faqs} />
        </div>
      </Section>
      {faqs.length > 0 && <JsonLdScript data={generateFAQSchema(faqs, locale)} />}
      <JsonLdScript data={createBreadcrumbSchema(breadcrumbItems)} />
    </>
  );
}
