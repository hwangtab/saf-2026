import { AdminBadge } from '@/app/(portal)/admin/_components/admin-ui';

/**
 * 마지막 게시로부터 경과일 라벨. 일(day) 단위 + UTC epoch 차이라 SSR/CSR 값이 동일
 * (자정 경계의 찰나를 제외하면 불일치 없음) → 렌더 중 직접 계산.
 */
function relativeDaysLabel(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  return days === 0 ? ' · 오늘' : ` · ${days}일 전`;
}

/**
 * 작품의 소셜 게시 이력 신호. 후보 카드·컴포저 공용.
 * 미게시 → info 배지, 게시 이력 있음 → warning 배지 + 마지막 게시 경과일.
 */
export function PostHistoryBadge({
  postCount,
  lastPublishedAt,
  className,
}: {
  postCount: number;
  lastPublishedAt: string | null;
  className?: string;
}) {
  if (postCount === 0) {
    return (
      <AdminBadge tone="info" className={className}>
        미게시
      </AdminBadge>
    );
  }

  return (
    <AdminBadge tone="warning" className={className}>
      이미 {postCount}회 게시{relativeDaysLabel(lastPublishedAt)}
    </AdminBadge>
  );
}
