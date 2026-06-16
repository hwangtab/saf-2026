'use client';

import { Check, ShoppingBag } from 'lucide-react';
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
}

/**
 * 작품 카드 이미지 우하단 오버레이 액션 그룹 (단일 client island).
 *
 * 위시 하트 + 카트 담기 버튼을 한 컴포넌트로 묶어 카드당 island 수를 1로 유지.
 * ArtworkCategoryGrid의 wishlistSlot render prop에 주입해 사용.
 *
 * 카드 전체가 <a>이므로 버튼 onClick에서 preventDefault + stopPropagation 필수.
 * WishlistHeartButton(overlay variant)이 absolute 포지셔닝을 자체 내장하므로,
 * 이 컴포넌트는 absolute 컨테이너 안에서 두 버튼을 flex row로 배치한다.
 */
export default function ArtworkCardActions({
  artworkId,
  artworkTitle,
  isUnique,
  purchasable,
}: ArtworkCardActionsProps) {
  const t = useTranslations('cart');
  const { addOne, openDrawer, items, mounted } = useCart();
  const inCart = mounted && items.some((i) => i.artworkId === artworkId);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addOne(artworkId, { unique: isUnique });
    openDrawer();
  }

  const cartAriaLabel = inCart
    ? t('inCartAria', { title: artworkTitle })
    : t('addToCartAria', { title: artworkTitle });

  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
      {purchasable && (
        <button
          type="button"
          onClick={handleAddToCart}
          aria-label={cartAriaLabel}
          aria-pressed={inCart}
          className={cn(
            'w-8 h-8 flex items-center justify-center',
            'rounded-full bg-white/90 backdrop-blur-sm shadow-sm',
            'transition-[transform,background-color] duration-150 active:scale-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            'hover:bg-white'
          )}
        >
          {inCart ? (
            <Check className="w-4 h-4 text-charcoal-deep" aria-hidden="true" />
          ) : (
            <ShoppingBag className="w-4 h-4 text-gray-400" aria-hidden="true" />
          )}
        </button>
      )}
      {/* WishlistHeartButton overlay variant은 absolute bottom-3 right-3 자체 포지셔닝을 가지므로,
          이 flex 그룹 안에서는 static으로 재배치. className override로 absolute 속성을 무력화. */}
      <WishlistHeartButton
        artworkId={artworkId}
        artworkTitle={artworkTitle}
        variant="overlay"
        className="!static !bottom-auto !right-auto !z-auto"
      />
    </div>
  );
}
