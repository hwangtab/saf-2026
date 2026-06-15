import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';

const STORAGE =
  'https://khtunrybrzntlnowlahb.supabase.co/storage/v1/object/public/artworks/398f3739-b81e-4ba8-bcd0-fed2e53d3dc8';

/** 오윤 대표 판화 — 민중적·예술적 의미를 큐레이터 캡션으로. 작품 상세로 링크. */
const WORKS = [
  {
    id: '4c920878-32dd-4727-ab03-6eda996597d5',
    img: `${STORAGE}/151__original.webp`,
    year: '1985',
    size: '30.0×25.0cm',
    n: 1,
  },
  {
    id: 'a17be53e-d025-428b-86e8-1d95c510bbc2',
    img: `${STORAGE}/1040__original.webp`,
    year: '1984',
    size: '27.3×17.7cm',
    n: 2,
  },
  {
    id: '74824081-63a0-4b76-9de6-a57d865c110e',
    img: `${STORAGE}/1006__original.webp`,
    year: '1985',
    size: '62.0×40.0cm',
    n: 3,
  },
  {
    id: 'b3838f14-0601-4e2a-a502-4b099ecd50ad',
    img: `${STORAGE}/1005__original.webp`,
    year: '1985',
    size: '54.0×35.8cm',
    n: 4,
  },
  {
    id: '0e9ce433-07b6-4762-9f21-38938edb1847',
    img: `${STORAGE}/1013__original.webp`,
    year: '1985',
    size: '27.0×25.0cm',
    n: 5,
  },
  {
    id: '31fea0b7-6fb2-4448-a5a1-1a24e7d24fbd',
    img: `${STORAGE}/1044__original.webp`,
    year: '1977',
    size: '19.0×19.0cm',
    n: 6,
  },
] as const;

export default async function PrintGallery() {
  const t = await getTranslations('event.ohYoonMemorial');
  return (
    <div className="container-max">
      <div className="mx-auto max-w-5xl">
        <p className="text-eyebrow text-primary-strong">{t('printEyebrow')}</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-charcoal-deep md:text-3xl">
          {t('printTitle')}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-charcoal-muted break-keep">
          {t('printLead')}
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {WORKS.map((w) => {
            const title = t(`printWork${w.n}Title`);
            return (
              <li key={w.id}>
                <Link href={`/artworks/${w.id}`} className="group block">
                  <div className="overflow-hidden rounded-xl border border-gallery-hairline bg-gallery-parchment p-3">
                    <SafeImage
                      src={w.img}
                      alt={t('printWorkAlt', { title, year: w.year })}
                      width={600}
                      height={750}
                      className="h-64 w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                    />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-charcoal-deep group-hover:text-primary-strong">
                    {title}
                  </h3>
                  <p className="text-caption-meta mt-0.5">
                    {w.year} · {w.size}
                  </p>
                </Link>
                <p className="mt-2 text-sm leading-relaxed text-charcoal break-keep">
                  {t(`printWork${w.n}Caption`)}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 text-center">
          <Link
            href="/artworks/artist/오윤"
            className="inline-flex items-center gap-1.5 font-semibold text-primary-strong underline-offset-4 hover:underline"
          >
            {t('printMore')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
