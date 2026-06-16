'use client';

import { Check, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCart } from '@/components/providers/CartProvider';
import WishlistHeartButton from '@/components/features/WishlistHeartButton';
import { cn } from '@/lib/utils/cn';

interface ArtworkCardActionsProps {
  artworkId: string;
  artworkTitle: string;
  isUnique: boolean;
  /** 판매 가능 여부: !sold && !reserved && 가격이 구체적(문의/확인 중 아님). */
  purchasable: boolean;
  /** overlay — 이미지 위 흰 원형 배지. inline — 카드 본문(가격 행) 투명 아이콘. */
  placement?: 'overlay' | 'inline';
}

/**
 * 작품 카드 위시 하트 + 카트 담기 액션 (단일 client island).
 *
 * 카드 전체가 링크(또는 stretched-link)이므로 버튼 onClick에서 preventDefault + stopPropagation,
 * 컨테이너는 z-20으로 링크 위에 떠 클릭 가능.
 * placement='inline'은 흰 카드 본문(가격 행)용 — 위시 하트의 흰 원형 배경을 투명 아이콘으로 override.
 */
export default function ArtworkCardActions({
  artworkId,
  artworkTitle,
  isUnique,
  purchasable,
  placement = 'overlay',
}: ArtworkCardActionsProps) {
  const t = useTranslations('cart');
  const { addOne, openDrawer, items, mounted } = useCart();
  const inCart = mounted && items.some((i) => i.artworkId === artworkId);
  const isOverlay = placement === 'overlay';

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addOne(artworkId, { unique: isUnique });
    openDrawer();
  }

  const cartAriaLabel = inCart
    ? t('inCartAria', { title: artworkTitle })
    : t('addToCartAria', { title: artworkTitle });

  const cartBtnClass = cn(
    'w-8 h-8 flex items-center justify-center active:scale-90',
    'transition-[transform,background-color,color] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
    isOverlay
      ? 'rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white'
      : 'rounded-md text-gray-400 hover:bg-gray-100 hover:text-charcoal-deep'
  );

  const heartClass = isOverlay
    ? '!static !bottom-auto !right-auto !z-auto'
    : '!static !bottom-auto !right-auto !z-auto !bg-transparent !shadow-none !backdrop-blur-none hover:!bg-gray-100 !rounded-md';

  return (
    <div
      className={cn(
        'flex items-center',
        isOverlay ? 'absolute bottom-3 right-3 z-20 gap-1.5' : 'relative z-20 shrink-0 gap-0.5'
      )}
    >
      {purchasable && (
        <button
          type="button"
          onClick={handleAddToCart}
          aria-label={cartAriaLabel}
          aria-pressed={inCart}
          className={cartBtnClass}
        >
          {inCart ? (
            <Check className="w-4 h-4 text-charcoal-deep" aria-hidden="true" />
          ) : (
            <ShoppingCart
              className={cn('w-4 h-4', isOverlay && 'text-gray-400')}
              aria-hidden="true"
            />
          )}
        </button>
      )}
      <WishlistHeartButton
        artworkId={artworkId}
        artworkTitle={artworkTitle}
        variant="overlay"
        className={heartClass}
      />
    </div>
  );
}
