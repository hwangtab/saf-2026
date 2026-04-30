import { getTranslations } from 'next-intl/server';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import { Link } from '@/i18n/navigation';
import { getActiveShowingItems, type NowShowingItem } from '@/lib/now-showing';

/**
 * Now Showing — 메인 페이지 hero 직하 시한성 큐레이션 전시·캠페인 섹션.
 * 매거진 "이번 호 머리기사" 톤 (DESIGN.md §1).
 *
 * 데이터: lib/now-showing.ts의 NOW_SHOWING 배열에서 endDate가 지나지 않은 항목만 노출.
 * 항목 0건이면 섹션 자체 렌더 X.
 */
export default async function NowShowing() {
  const items = getActiveShowingItems();
  if (items.length === 0) return null;

  const t = await getTranslations('home.nowShowing');

  return (
    <Section variant="canvas-soft" className="py-16 md:py-20">
      <div className="container-max">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-section-title text-balance text-charcoal-deep">{t('title')}</h2>
          <p className="mt-3 text-body-large text-charcoal-muted">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {items.map((item) => (
            <ShowingCard key={item.slug} item={item} />
          ))}
        </div>
      </div>
    </Section>
  );
}

async function ShowingCard({ item }: { item: NowShowingItem }) {
  const t = await getTranslations('home.nowShowing');

  const status = t(`${item.i18nKey}Status` as 'ohYoon40thStatus');
  const title = t(`${item.i18nKey}Title` as 'ohYoon40thTitle');
  const desc = t(`${item.i18nKey}Desc` as 'ohYoon40thDesc');
  const cta = t(`${item.i18nKey}Cta` as 'ohYoon40thCta');

  const inner = (
    <article className="group h-full overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-canvas">
        <SafeImage
          src={item.imageUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            item.status === 'on'
              ? 'bg-success/90 text-white'
              : 'bg-charcoal-deep/85 text-white backdrop-blur-sm'
          }`}
        >
          {item.status === 'on' && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          )}
          {status}
        </span>
      </div>
      <div className="p-6 md:p-7">
        <h3 className="text-xl md:text-2xl font-bold text-charcoal-deep mb-2 break-keep text-balance">
          {title}
        </h3>
        <p className="text-base text-charcoal-muted leading-relaxed break-keep text-balance mb-4">
          {desc}
        </p>
        <p
          className={`text-sm font-semibold ${
            item.href ? 'text-primary-strong group-hover:underline' : 'text-charcoal-muted'
          }`}
        >
          {cta}
        </p>
      </div>
    </article>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block h-full">
        {inner}
      </Link>
    );
  }

  return <div className="block h-full cursor-not-allowed opacity-80">{inner}</div>;
}
