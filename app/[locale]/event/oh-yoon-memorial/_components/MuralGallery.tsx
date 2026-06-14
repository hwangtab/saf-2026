import { getTranslations } from 'next-intl/server';
import SafeImage from '@/components/common/SafeImage';

const MURALS = [
  { src: '/images/petition-oh-yoon/mural-1.png', altKey: 'muralAlt1' },
  { src: '/images/petition-oh-yoon/mural-2.png', altKey: 'muralAlt2' },
  { src: '/images/petition-oh-yoon/mural-3.png', altKey: 'muralAlt3' },
] as const;

/** 오윤 1974 구의동 테라코타 벽화 — 그의 대표 공공미술. */
export default async function MuralGallery() {
  const t = await getTranslations('event.ohYoonMemorial');
  return (
    <div className="container-max">
      <div className="mx-auto max-w-5xl">
        <p className="text-eyebrow text-primary-strong">1974</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-charcoal-deep md:text-3xl">
          {t('muralTitle')}
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MURALS.map((m) => (
            <div
              key={m.src}
              className="overflow-hidden rounded-xl border border-gallery-hairline bg-gallery-parchment"
            >
              <SafeImage
                src={m.src}
                alt={t(m.altKey)}
                width={600}
                height={450}
                className="aspect-[4/3] h-auto w-full object-cover"
              />
            </div>
          ))}
        </div>
        <p className="text-caption-meta mt-4 break-keep">{t('muralCaption')}</p>
      </div>
    </div>
  );
}
