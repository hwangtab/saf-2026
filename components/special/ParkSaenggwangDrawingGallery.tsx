import { memo } from 'react';
import { cn } from '@/lib/utils/cn';
import ArtworkCard from '@/components/ui/ArtworkCard';
import type { ArtworkListItem } from '@/types';

interface ParkSaenggwangDrawingGalleryProps {
  artworks: ArtworkListItem[];
  className?: string;
}

/**
 * 박생광 드로잉전 갤러리 — OhYoonMasonryGallery fork.
 *
 * 오윤 갤러리(theme="dark", bg-charcoal)와 다르게 light 톤. 드로잉(연필·종이)이 흰 벽에서
 * 가장 잘 보이는 매체 특성을 반영. Gallery White Cube 원칙 ("color comes only from artworks")
 * 그대로 — chrome은 무색, 작품의 흑백 호흡이 전면.
 */
const ParkSaenggwangDrawingGallery = memo(function ParkSaenggwangDrawingGallery({
  artworks,
  className,
}: ParkSaenggwangDrawingGalleryProps) {
  if (!artworks || artworks.length === 0) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      {/* CSS columns 기반 masonry. 카드별 stagger animate-stamp는 hero h1 외 영역이라 CLS 안전. */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
        {artworks.map((artwork, index) => {
          const delayStyle = { animationDelay: `${index * 100}ms` };

          return (
            <div
              key={artwork.id}
              className="break-inside-avoid mb-8 animate-stamp opacity-0"
              style={delayStyle}
            >
              <div className="group relative">
                <ArtworkCard
                  artwork={artwork}
                  variant="gallery"
                  theme="light"
                  returnTo="/special/park-saenggwang"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ParkSaenggwangDrawingGallery;
