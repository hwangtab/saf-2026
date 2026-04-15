import { cn } from '@/lib/utils/cn';

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
 * 포털 카드 래퍼 스켈레톤 (admin / dashboard / exhibitor 공통)
 *
 * @example
 * ```tsx
 * // 기본 (p-6 포함)
 * <AdminCardSkeleton className="space-y-8">...</AdminCardSkeleton>
 *
 * // 패딩 없음 (테이블/오버플로 래퍼)
 * <AdminCardSkeleton padded={false} className="overflow-hidden">...</AdminCardSkeleton>
 * ```
 */
export function AdminCardSkeleton({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white/90 shadow-sm',
        padded && 'p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

export default Skeleton;
