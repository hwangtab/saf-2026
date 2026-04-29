'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import type { SearchResultArtwork } from '@/app/api/search/route';

interface SearchResultItemProps {
  artwork: SearchResultArtwork;
  onSelect: () => void;
}

export default function SearchResultItem({ artwork, onSelect }: SearchResultItemProps) {
  const tFilters = useTranslations('filters');

  return (
    <Link
      href={`/artworks/${artwork.id}`}
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-gray-50"
    >
      {/* 썸네일 */}
      <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-canvas relative">
        {artwork.image ? (
          <div className="absolute inset-1">
            <SafeImage
              src={artwork.image}
              alt={`${artwork.title} - ${artwork.artist}`}
              fill
              className="object-contain"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-charcoal truncate">{artwork.title}</p>
        <p className="text-xs text-charcoal-muted truncate">{artwork.artist}</p>
        <p className="text-xs text-charcoal-muted mt-0.5">{artwork.price}</p>
      </div>

      {/* sold / reserved 뱃지 */}
      {artwork.sold && (
        <span className="flex-shrink-0 text-xs font-medium text-charcoal-soft bg-gray-100 px-2 py-0.5 rounded">
          {tFilters('sold')}
        </span>
      )}
      {artwork.reserved && !artwork.sold && (
        <span className="flex-shrink-0 text-xs font-medium text-white bg-charcoal-deep px-2 py-0.5 rounded">
          {tFilters('reserved')}
        </span>
      )}
    </Link>
  );
}
