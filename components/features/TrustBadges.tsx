import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { useLocale, useTranslations } from 'next-intl';
import { Clock, Shield, RotateCcw, Truck, Lock, User } from 'lucide-react';
import { formatCurrentDate } from '@/lib/utils/format-date';

interface TrustBadgesProps {
  className?: string;
  /**
   * 매뉴얼 10.6 결제 페이지 신뢰 시그널 5개(진품·청약철회·배송·결제보안·작가 직접 출품)를
   * 출력. 결제 페이지(/checkout)는 `variant="checkout"`, 작품 detail은 기본값.
   * 두 variant 모두 5개 시그널을 노출하지만 결제 페이지는 alwaysOpen 운영 시간 뱃지를 생략(컨텍스트 무관).
   */
  variant?: 'detail' | 'checkout';
}

/**
 * 매뉴얼 3.3 신뢰 시그널 — 14개 일반 시그널 중 결제 임팩트가 큰 5개를 작품 detail/결제 페이지에 노출.
 *
 * 5개 신호 (Part 10.6):
 * 1) 진품 보증서 (authenticity)
 * 2) 7일 청약철회 (returnPolicy)
 * 3) 안전 포장·배송 (safeDelivery)
 * 4) 결제 보안 + 통신판매업 등록 (paymentSecurity)
 * 5) 작가 직접 출품 + 큐레이터 검증 (directFromArtist + curatorVerified — 2개 합쳐 1개 가독 시그널로)
 */
export default function TrustBadges({ className, variant = 'detail' }: TrustBadgesProps) {
  const t = useTranslations('trustBadges');
  const locale = useLocale();
  const formattedDate = useMemo(() => formatCurrentDate(locale), [locale]);

  const badges = [
    ...(variant === 'detail'
      ? [{ icon: Clock, label: t('alwaysOpen', { date: formattedDate }), tone: 'success' as const }]
      : []),
    { icon: Shield, label: t('authenticity') },
    { icon: RotateCcw, label: t('returnPolicy') },
    { icon: Truck, label: t('safeDelivery') },
    { icon: Lock, label: t('paymentSecurity') },
    { icon: User, label: t('directFromArtist') },
  ];

  return (
    // detail: 구매 가능 상태까지 같은 크기의 2열 신뢰 그리드로 노출한다.
    // checkout: flex-wrap 유지 (좁은 결제 박스 컨텍스트).
    <div
      className={cn(
        variant === 'detail'
          ? 'grid grid-cols-2 gap-2'
          : 'flex flex-nowrap justify-center gap-1.5 overflow-x-auto scrollbar-hide',
        className
      )}
    >
      {badges.map(({ icon: Icon, label, tone }) => (
        <span
          key={label}
          suppressHydrationWarning={variant === 'detail' && tone === 'success'}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border font-medium',
            variant === 'checkout'
              ? 'px-2.5 py-1 text-[11px]'
              : 'min-h-[40px] w-full justify-start px-2.5 py-1.5 text-[11px] leading-tight md:min-h-[44px] md:px-3 md:text-xs',
            tone === 'success'
              ? 'border-success/20 bg-success/10 text-success-a11y'
              : 'border-gray-100 bg-gray-50 text-gray-700'
          )}
        >
          <Icon
            className={cn(
              'shrink-0',
              tone === 'success' ? 'text-success-a11y' : 'text-primary',
              variant === 'checkout' ? 'h-3 w-3' : 'h-3 w-3 md:h-3.5 md:w-3.5'
            )}
          />
          <span className="min-w-0 break-keep leading-tight">{label}</span>
        </span>
      ))}
    </div>
  );
}
