import { memo } from 'react';
import { cn } from '@/lib/utils/cn';
import ArtworkCard from '@/components/ui/ArtworkCard';
import type { ArtworkListItem } from '@/types';

interface MasterArtistGalleryProps {
  artworks: ArtworkListItem[];
  returnTo: string;
  className?: string;
}

const MasterArtistGallery = memo(function MasterArtistGallery({
  artworks,
  returnTo,
  className,
}: MasterArtistGalleryProps) {
  if (!artworks || artworks.length === 0) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      {/* grid(균일 카드) + content-visibility로 화면 밖 카드 렌더 스킵 — 대량 작품 부하 감소.
          ArtworkCard gallery는 aspect-[4/5] + 고정 min-h라 카드 높이가 거의 균일해 masonry(columns)와
          시각 차이 미미하면서 content-visibility가 안정적으로 동작(columns는 content-visibility와 비호환). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {artworks.map((artwork, index) => {
          // content-visibility로 화면 밖 카드는 스크롤 진입 시 렌더된다. 전역 index 기반 긴 지연
          // (175번째 = 17초)은 진입 시 opacity-0 정체를 유발하므로 짧게 순환(0~420ms)시켜 스탬프-인.
          const delayStyle = { animationDelay: `${(index % 8) * 60}ms` };
          return (
            <div
              key={artwork.id}
              className="cv-gallery-card animate-stamp opacity-0 bg-transparent"
              style={delayStyle}
            >
              <div className="group relative">
                <div className="relative overflow-hidden bg-charcoal">
                  <ArtworkCard
                    artwork={artwork}
                    variant="gallery"
                    theme="dark"
                    returnTo={returnTo}
                    priorityIndex={index}
                    className="!bg-transparent !shadow-none !rounded-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default MasterArtistGallery;
