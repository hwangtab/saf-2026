import { cn } from '@/lib/utils/cn';

const STATUS_LABEL: Record<string, string> = {
  sold: '판매완료',
  reserved: '예약',
};

/**
 * 선택된 작품이 판매중(available)이 아니거나 숨김이면 경고 배너.
 * 게시를 막지는 않고 실수를 환기시킨다(경고만).
 */
export function SaleStatusGuard({
  status,
  isHidden,
  className,
}: {
  status: string;
  isHidden: boolean;
  className?: string;
}) {
  const isSold = status === 'sold';
  const isReserved = status === 'reserved';
  if (!isSold && !isReserved && !isHidden) return null;

  const reason = isHidden ? '숨김 처리된' : `${STATUS_LABEL[status] ?? status} 상태의`;

  // 판매완료는 danger, 예약/숨김은 warning(중성) 톤
  const danger = isSold;

  return (
    <p
      className={cn(
        'rounded-lg p-3 text-sm',
        danger ? 'bg-danger/10 text-danger-a11y' : 'bg-charcoal-deep/5 text-charcoal-deep',
        className
      )}
    >
      이 작품은 {reason} 작품입니다 — 그래도 게시할까요?
    </p>
  );
}
