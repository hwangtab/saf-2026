import { getTranslations } from 'next-intl/server';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import { Link } from '@/i18n/navigation';
import { getCardStatus, getNowShowingCards, type NowShowingItem } from '@/lib/now-showing';
import { getLiveStats } from '@/lib/live-stats';

/**
 * Now Showing — 메인 페이지 hero 직하 시한성 큐레이션 전시·캠페인 섹션.
 * 매거진 "이번 호 머리기사" 톤 (DESIGN.md §1).
 *
 * 데이터: lib/now-showing.ts의 NOW_SHOWING 배열에서 endDate가 지나지 않은 항목만 노출.
 * 항목 0건이면 섹션 자체 렌더 X.
 */
export default async function NowShowing({ locale }: { locale: string }) {
  const items = getNowShowingCards();
  if (items.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'home.nowShowing' });
  const { artistCount, artworkCount } = await getLiveStats();
  const counts = { artistCount, artworkCount };
  const now = new Date();
  const preparing = t('preparing');
  const cards = items.map((item) => ({
    item,
    // 자동 derive — entry에 status 명시 X면 startDate 기준 'coming-soon'/'on' 결정.
    derivedStatus: getCardStatus(item, now),
    status: t(`${item.i18nKey}Status` as 'ohYoon40thStatus'),
    title: t(`${item.i18nKey}Title` as 'ohYoon40thTitle', counts),
    desc: t(`${item.i18nKey}Desc` as 'ohYoon40thDesc', counts),
    cta: t(`${item.i18nKey}Cta` as 'ohYoon40thCta'),
    preparing,
  }));

  return (
    <Section variant="canvas-soft" className="py-16 md:py-20">
      <div className="container-max">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-section-title text-balance text-charcoal-deep">{t('title')}</h2>
          <p className="mt-3 text-body-large text-charcoal-muted">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {cards.map(({ item, derivedStatus, status, title, desc, cta }, idx) => (
            <ShowingCard
              key={item.slug}
              item={item}
              derivedStatus={derivedStatus}
              status={status}
              title={title}
              desc={desc}
              cta={cta}
              preparing={preparing}
              priority={idx === 0}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}

function ShowingCard({
  item,
  derivedStatus,
  status,
  title,
  desc,
  cta,
  preparing,
  priority = false,
}: {
  item: NowShowingItem;
  derivedStatus: 'on' | 'coming-soon';
  status: string;
  title: string;
  desc: string;
  cta: string;
  preparing: string;
  priority?: boolean;
}) {
  const inner = (
    <article className="group h-full overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-canvas">
        <SafeImage
          src={item.imageUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1056px) 50vw, 512px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            derivedStatus === 'on'
              ? 'bg-success/90 text-white'
              : 'bg-charcoal-deep/85 text-white backdrop-blur-sm'
          }`}
        >
          {derivedStatus === 'on' && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          )}
          {status}
        </span>
      </div>
      <div className="p-6 md:p-7">
        <h3 className="text-xl md:text-2xl font-bold text-charcoal-deep mb-2 break-keep text-balance whitespace-pre-line">
          {title}
        </h3>
        <p className="text-base text-charcoal-muted leading-relaxed break-keep text-balance mb-4">
          {desc}
        </p>
        <p
          className={`text-sm font-semibold ${
            item.href ? 'text-primary-strong group-hover:underline' : 'text-charcoal-soft'
          }`}
        >
          {item.href ? cta : preparing}
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

  return <div className="block h-full cursor-not-allowed opacity-70">{inner}</div>;
}
