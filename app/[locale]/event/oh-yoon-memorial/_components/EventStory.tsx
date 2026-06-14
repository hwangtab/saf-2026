import { getTranslations } from 'next-intl/server';
import SafeImage from '@/components/common/SafeImage';

/** 오윤 작가 추모 서사 — 초상 + 어록 + 생애. 갤러리 도록 톤. */
export default async function EventStory() {
  const t = await getTranslations('event.ohYoonMemorial');
  return (
    <div className="container-max">
      <div className="mx-auto grid max-w-5xl items-start gap-10 md:grid-cols-[minmax(0,300px)_1fr] md:gap-14">
        <figure className="mx-auto w-full max-w-[300px]">
          <div className="overflow-hidden rounded-2xl border border-gallery-hairline bg-gallery-parchment shadow-sm">
            <SafeImage
              src="/images/ohyoon.webp"
              alt={t('portraitAlt')}
              width={600}
              height={750}
              className="h-auto w-full object-cover"
            />
          </div>
          <figcaption className="text-caption-meta mt-3 text-center">
            {t('portraitCaption')}
          </figcaption>
        </figure>

        <div>
          <p className="text-eyebrow text-primary-strong">{t('memorialLife')}</p>
          <h2 className="mt-1 font-display text-4xl font-black text-charcoal-deep md:text-5xl">
            {t('memorialName')}
          </h2>
          <p className="mt-2 text-charcoal-muted">{t('memorialEpithet')}</p>

          <blockquote className="my-7 border-l-4 border-primary-strong pl-5">
            <p className="font-display text-2xl font-bold leading-snug text-charcoal-deep break-keep md:text-3xl">
              “{t('storyQuote')}”
            </p>
          </blockquote>

          <div className="space-y-4 text-base leading-relaxed text-charcoal break-keep md:text-lg">
            <p>{t('storyP1')}</p>
            <p>{t('storyP2')}</p>
            <p>{t('storyP3')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
