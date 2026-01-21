import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  /** 원형 스켈레톤 */
  circle?: boolean;
  /** 애니메이션 비활성화 */
  noAnimation?: boolean;
  /** 인라인 스타일 */
  style?: React.CSSProperties;
}

/**
 * 기본 스켈레톤 컴포넌트
 *
 * @example
 * ```tsx
 * // 텍스트 라인
 * <Skeleton className="h-4 w-32" />
 *
 * // 원형 아바타
 * <Skeleton circle className="w-12 h-12" />
 *
 * // 이미지 영역
 * <Skeleton className="aspect-square w-full" />
 * ```
 */
export function Skeleton({ className, circle = false, noAnimation = false, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200',
        circle ? 'rounded-full' : 'rounded',
        !noAnimation && 'animate-pulse',
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * 텍스트 스켈레톤 (여러 줄)
 */
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')} />
      ))}
    </div>
  );
}

/**
 * 아트워크 카드 스켈레톤
 */
export function ArtworkCardSkeleton({ variant = 'gallery' }: { variant?: 'gallery' | 'slider' }) {
  if (variant === 'slider') {
    return (
      <div className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px]">
        {/* 이미지 영역 */}
        <Skeleton className="aspect-square rounded-lg" />
        {/* 텍스트 영역 */}
        <div className="mt-3 px-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  // Gallery variant
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm">
      {/* 이미지 영역 - 4:5 비율 */}
      <Skeleton className="aspect-[4/5] rounded-none" />
      {/* 콘텐츠 영역 */}
      <div className="p-4 space-y-3">
        {/* 제목 */}
        <div className="space-y-1">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        {/* 작가명 */}
        <Skeleton className="h-4 w-1/2" />
        {/* 재료/크기 */}
        <Skeleton className="h-3 w-2/3" />
        {/* 가격 */}
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

/**
 * 갤러리 그리드 스켈레톤
 */
export function GallerySkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ArtworkCardSkeleton key={i} variant="gallery" />
      ))}
    </div>
  );
}

/**
 * 슬라이더 스켈레톤
 */
export function SliderSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex gap-4 overflow-hidden', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ArtworkCardSkeleton key={i} variant="slider" />
      ))}
    </div>
  );
}

/**
 * 검색바 스켈레톤
 */
export function SearchBarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-4 items-center', className)}>
      {/* 검색 입력창 */}
      <Skeleton className="h-10 flex-1 rounded-full" />
      {/* 필터 버튼들 */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20 rounded-full" />
        <Skeleton className="h-10 w-20 rounded-full" />
        <Skeleton className="h-10 w-20 rounded-full" />
      </div>
    </div>
  );
}

/**
 * 페이지 히어로 스켈레톤
 */
export function PageHeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('py-16 px-4 text-center space-y-4', className)}>
      <Skeleton className="h-10 w-48 mx-auto" />
      <Skeleton className="h-5 w-96 max-w-full mx-auto" />
    </div>
  );
}

/**
 * 아티스트 정보 스켈레톤
 */
export function ArtistInfoSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* 이름 */}
      <Skeleton className="h-8 w-32" />
      {/* 프로필 */}
      <TextSkeleton lines={4} />
      {/* 이력 */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <TextSkeleton lines={6} />
      </div>
    </div>
  );
}

/**
 * 차트 스켈레톤
 */
export function ChartSkeleton({
  height = 'h-96',
  className,
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div className={cn('bg-gray-100 rounded-lg overflow-hidden', height, className)}>
      <div className="h-full flex items-end justify-around p-4 gap-2">
        {/* 막대 그래프 형태 */}
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <Skeleton key={i} className="w-8 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
