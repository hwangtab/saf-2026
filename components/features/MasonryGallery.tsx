'use client';

import { memo, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArtworkListItem } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { Pagination } from '@/components/ui/Pagination';

// 페이지당 작품 수. 모바일(1열)·태블릿(2열)·데스크톱(3열) 모두 자연스러운 행 수가 되도록 24로 설정.
// 365점/24 ≈ 16페이지. 사용자가 한 페이지를 끝까지 스크롤할 만큼만 보여주고 다음 페이지로.
const PAGE_SIZE = 24;

interface MasonryGalleryProps {
  artworks: ArtworkListItem[];
}

function MasonryGallery({ artworks }: MasonryGalleryProps) {
  // 이전 infinite scroll(IntersectionObserver) 패턴은 batch 추가 시점마다 Gallery Section
  // 높이가 viewport만큼 늘어나며 그 아래 Section들(Category Guide·Campaign Banner·FAQ)이
  // 일제히 밀려 CLS 1.0 발생 (PSI CrUX 모바일 측정 회귀의 직접 원인). 페이지네이션으로 변경 —
  // 페이지 이동은 사용자 입력 직후 layout 변화라 hadRecentInput=true로 CLS 카운트 안 됨.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageParam = Number(searchParams.get('page') || '1');
  const totalPages = Math.max(1, Math.ceil(artworks.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, pageParam), totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleArtworks = artworks.slice(start, start + PAGE_SIZE);

  // 페이지 변경(URL ?page=N) 시 부드럽게 상단으로 스크롤. 사용자가 깊이 스크롤된 상태에서
  // pagination을 누르면 새 카드가 viewport 밖이라 혼란스러운 UX 방지.
  // 첫 마운트 또는 sortKey 변경 시엔 스크롤하지 않도록 ref로 가드.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {visibleArtworks.map((artwork, index) => (
          <div key={artwork.id} id={`artwork-${artwork.id}`} className="w-full">
            <ArtworkCard artwork={artwork} variant="gallery" priorityIndex={index} />
          </div>
        ))}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={artworks.length}
        baseUrl={pathname}
      />
    </>
  );
}

export default memo(MasonryGallery);
