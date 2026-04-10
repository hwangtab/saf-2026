'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import type { SearchResultArtist } from '@/app/api/search/route';

interface ArtistResultItemProps {
  artist: SearchResultArtist;
  onSelect: () => void;
}

export default function ArtistResultItem({ artist, onSelect }: ArtistResultItemProps) {
  const t = useTranslations('globalSearch');

  return (
    <Link
      href={`/artworks/artist/${encodeURIComponent(artist.name)}`}
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-gray-50"
    >
      {/* 샘플 이미지 */}
      <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden bg-canvas-soft relative">
        {artist.sampleImage ? (
          <div className="absolute inset-1">
            <SafeImage
              src={artist.sampleImage}
              alt={artist.name}
              fill
              className="object-contain"
              sizes="40px"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm font-semibold">{artist.name.charAt(0)}</span>
          </div>
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-charcoal truncate">{artist.name}</p>
        {artist.name_en && <p className="text-xs text-charcoal-muted truncate">{artist.name_en}</p>}
      </div>

      {/* 작품 수 */}
      <span className="flex-shrink-0 text-xs text-charcoal-muted">
        {t('artworkCount', { count: artist.artworkCount })}
      </span>
    </Link>
  );
}
