import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import ExportedImage from 'next-image-export-optimizer';
import { Link } from '@/i18n/navigation';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import PageHero from '@/components/ui/PageHero';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { SITE_URL } from '@/lib/constants';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';

export const revalidate = false;

const PAGE_URL = `${SITE_URL}/archive`;
const PAGE_COPY = {
  ko: {
    title: '아카이브',
    description:
      '2023년 첫 번째 전시부터 2026년 캠페인까지, 예술인 상호부조를 위한 씨앗페(SAF)의 여정과 기록을 만나보세요. 120여 명의 예술가가 함께한 연대의 발자취를 아카이브에서 확인하세요.',
  },
  en: {
    title: 'Archive',
    description:
      'Explore SAF records from the first 2023 exhibition to the 2026 campaign for artist mutual-aid finance.',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations('seo');
  const title = `${copy.title} | ${tSeo('siteTitle')}`;
  return createStandardPageMetadata(title, copy.description, PAGE_URL, '/archive', locale);
}

export default async function ArchiveHubPage() {
  const locale = resolveLocale(await getLocale());
  const pageUrl = buildLocaleUrl('/archive', locale);
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: SITE_URL },
    { name: tBreadcrumbs('archive'), url: pageUrl },
  ]);

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript data={breadcrumbSchema} />
        <PageHero title="Archive" description="The SAF journey for artist mutual-aid." />

        <Section variant="white" className="min-h-[60vh] pb-24 md:pb-32">
          <div className="container-max">
            <SectionTitle className="mb-12">Past event records</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <Link href="/archive/2026" className="group block">
                <div className="bg-canvas-soft rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <ExportedImage
                      src="/images/safposter.png"
                      alt="SAF 2026 poster"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-bold font-display text-charcoal mb-2 group-hover:text-primary transition-colors">
                      SAF 2026
                    </h3>
                    <p className="text-charcoal-muted mb-4">
                      The second festival for artist mutual-aid funding, held at Insa Art Center.
                    </p>
                    <span className="inline-block px-4 py-2 bg-white rounded-full text-sm font-bold text-primary border border-primary/20">
                      View archive &rarr;
                    </span>
                  </div>
                </div>
              </Link>

              <Link href="/archive/2023" className="group block">
                <div className="bg-canvas-soft rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <ExportedImage
                      src="/images/saf2023/saf2023poster.png"
                      alt="SAF 2023 poster"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-bold font-display text-charcoal mb-2 group-hover:text-primary transition-colors">
                      SAF 2023
                    </h3>
                    <p className="text-charcoal-muted mb-4">
                      The beginning of SAF, launched with over 120 participating artists.
                    </p>
                    <span className="inline-block px-4 py-2 bg-white rounded-full text-sm font-bold text-primary border border-primary/20">
                      View archive &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero title="아카이브" description="예술인 상호부조를 위한 씨앗페의 발자취입니다." />

      <Section variant="white" className="min-h-[60vh] pb-24 md:pb-32">
        <div className="container-max">
          <SectionTitle className="mb-12">지난 행사 기록</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* 2026 Archive Card */}
            <Link href="/archive/2026" className="group block">
              <div className="bg-canvas-soft rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <ExportedImage
                    src="/images/safposter.png"
                    alt="씨앗페 2026 포스터"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold font-display text-charcoal mb-2 group-hover:text-primary transition-colors">
                    씨앗페 2026
                  </h3>
                  <p className="text-charcoal-muted mb-4">
                    예술인 상호부조 기금 마련을 위한 두 번째 축제. <br />
                    인사아트센터에서 펼쳐진 연대의 현장.
                  </p>
                  <span className="inline-block px-4 py-2 bg-white rounded-full text-sm font-bold text-primary border border-primary/20">
                    기록 보기 &rarr;
                  </span>
                </div>
              </div>
            </Link>

            {/* 2023 Archive Card */}
            <Link href="/archive/2023" className="group block">
              <div className="bg-canvas-soft rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <ExportedImage
                    src="/images/saf2023/saf2023poster.png"
                    alt="씨앗페 2023 포스터"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold font-display text-charcoal mb-2 group-hover:text-primary transition-colors">
                    씨앗페 2023
                  </h3>
                  <p className="text-charcoal-muted mb-4">
                    씨앗페의 시작. <br />
                    120여 명의 예술인이 함께 쏘아올린 첫 번째 신호탄.
                  </p>
                  <span className="inline-block px-4 py-2 bg-white rounded-full text-sm font-bold text-primary border border-primary/20">
                    기록 보기 &rarr;
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
