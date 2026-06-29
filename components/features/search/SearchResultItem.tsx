'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import type { SearchResultArtwork } from '@/app/api/search/route';
import { buildArtworkAlt } from '@/lib/artwork-alt';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { cn } from '@/lib/utils/cn';

interface SearchResultItemProps {
  artwork: SearchResultArtwork;
  onSelect: () => void;
}

export default function SearchResultItem({ artwork, onSelect }: SearchResultItemProps) {
  const tFilters = useTranslations('filters');
  const locale = useLocale();
  const isEn = locale === 'en';

  const title = (isEn && artwork.title_en?.trim()) || artwork.title;
  const artist = (isEn && artwork.artist_en?.trim()) || artwork.artist;
  const altText = buildArtworkAlt(
    { title: artwork.title, artist: artwork.artist },
    isEn ? 'en' : 'ko'
  );
  const imageSrc = artwork.image ? resolveArtworkImageUrlForPreset(artwork.image, 'card') : '';

  return (
    <Link
      href={`/artworks/${artwork.id}`}
      onClick={onSelect}
      className="group block h-full rounded-xl overflow-hidden border border-gray-200 bg-white transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg"
    >
      {/* 이미지 */}
      <div className="relative w-full aspect-[4/5] bg-canvas-soft overflow-hidden">
        {imageSrc ? (
          <div className="absolute inset-2">
            <SafeImage
              src={imageSrc}
              alt={altText}
              fill
              loading="lazy"
              quality={70}
              sizes="(max-width: 640px) 50vw, 260px"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}

        {artwork.sold && (
          <div className="absolute top-2 right-2 px-2 py-0.5 text-xs rounded-md shadow-md bg-danger-a11y text-white font-bold">
            {tFilters('sold')}
          </div>
        )}
        {artwork.reserved && !artwork.sold && (
          <div className="absolute top-2 right-2 px-2 py-0.5 text-xs rounded-md shadow-md bg-charcoal-deep text-white font-bold">
            {tFilters('reserved')}
          </div>
        )}
      </div>

      {/* 텍스트 */}
      <div className="p-3">
        <p className="text-sm font-bold text-charcoal break-keep line-clamp-2 transition-colors group-hover:text-primary-strong">
          {title}
        </p>
        <p className="text-xs text-charcoal-muted truncate mt-0.5">{artist}</p>
        <p
          className={cn(
            'text-xs font-semibold mt-1',
            artwork.sold ? 'text-gray-600 line-through' : 'text-primary-strong'
          )}
        >
          {artwork.price}
        </p>
      </div>
    </Link>
  );
}
