import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import type { SpaceCollection } from '@/lib/space-collections';
import type { Artwork } from '@/types';

/**
 * 공간·용도 컬렉션 카드 — NowShowing(ShowingCard)과 동일한 표준 이미지 카드 패턴.
 * 랜딩(/collections)과 개별 페이지의 "다른 공간" 섹션에서 공용.
 */
export default function CollectionCard({
  collection,
  cover,
  locale,
  cta,
  priority = false,
}: {
  collection: SpaceCollection;
  cover: Artwork | null;
  locale: string;
  cta: string;
  priority?: boolean;
}) {
  const isEn = locale === 'en';
  const title = isEn ? collection.titleEn : collection.titleKo;
  const subtitle = isEn ? collection.subtitleEn : collection.subtitleKo;

  return (
    <Link href={`/collections/${collection.slug}`} className="block h-full">
      <article className="group h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="relative aspect-[16/10] overflow-hidden bg-canvas">
          {cover?.images?.[0] && (
            <SafeImage
              src={resolveArtworkImageUrlForPreset(cover.images[0], 'detail')}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1056px) 50vw, 512px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority={priority}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <span
            className="absolute left-3 top-3 inline-flex items-center rounded-full bg-charcoal-deep/85 px-3 py-1.5 text-xl backdrop-blur-sm"
            aria-hidden="true"
          >
            {collection.emoji}
          </span>
        </div>
        <div className="p-6 md:p-7">
          <h3 className="mb-2 text-xl font-bold text-charcoal-deep text-balance break-keep md:text-2xl">
            {title}
          </h3>
          <p className="mb-4 text-base leading-relaxed text-charcoal-muted text-balance break-keep">
            {subtitle}
          </p>
          <p className="text-sm font-semibold text-primary-strong group-hover:underline">{cta}</p>
        </div>
      </article>
    </Link>
  );
}
