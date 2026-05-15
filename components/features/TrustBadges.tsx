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
    { icon: Shield, label: t('authenticity') },
    { icon: RotateCcw, label: t('returnPolicy') },
    { icon: Truck, label: t('safeDelivery') },
    { icon: Lock, label: t('paymentSecurity') },
    { icon: User, label: t('directFromArtist') },
  ];

  return (
    // 모바일 narrow(320~375px)에서 5개 뱃지(영문 라벨 최장 28자)가 wrap 깨지지 않게
    // gap·padding·text 크기를 모바일에서 축소. md(768px+)부터 기존 detail 크기 유지.
    <div className={cn('flex flex-wrap justify-center gap-1.5 md:gap-2', className)}>
      {variant === 'detail' && (
        // formattedDate는 client `new Date()`라 SSR 시점·hydration 시점 자정/timezone 차이로
        // text content가 미세하게 어긋나 React error #418 발생 가능. 이 영역에선 prop
        // drilling 부담이 커 suppressHydrationWarning으로 hydration mismatch만 silent 처리.
        <span
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 bg-success/10 border border-success/20 rounded-full text-[11px] md:text-xs font-medium text-success-a11y"
          suppressHydrationWarning
        >
          <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
          {t('alwaysOpen', { date: formattedDate })}
        </span>
      )}
      {badges.map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[11px] md:text-xs font-medium text-gray-700"
        >
          <Icon className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0 text-primary" />
          {label}
        </span>
      ))}
    </div>
  );
}
