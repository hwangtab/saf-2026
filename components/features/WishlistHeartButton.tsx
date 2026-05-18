'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { cn } from '@/lib/utils/cn';

interface WishlistHeartButtonProps {
  artworkId: string;
  artworkTitle?: string;
  /** 'overlay' — 카드 이미지 위 absolute 배지 모드. 'inline' — CTA 영역 인라인 버튼. */
  variant?: 'overlay' | 'inline';
  className?: string;
}

export default function WishlistHeartButton({
  artworkId,
  artworkTitle,
  variant = 'overlay',
  className,
}: WishlistHeartButtonProps) {
  const { has, toggle, mounted } = useWishlist();
  const t = useTranslations('wishlist');
  const inWishlist = mounted && has(artworkId);
  const title = artworkTitle ?? '';

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(artworkId);
  }

  const ariaLabel = inWishlist ? t('removeAria', { title }) : t('addAria', { title });

  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-pressed={inWishlist}
        className={cn(
          'absolute bottom-3 right-3 z-10',
          'w-8 h-8 flex items-center justify-center',
          'rounded-full bg-white/90 backdrop-blur-sm shadow-sm',
          'transition-[transform,background-color] duration-150 active:scale-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          'hover:bg-white',
          className
        )}
      >
        <Heart
          className={cn(
            'w-4 h-4 transition-colors duration-150',
            inWishlist ? 'text-charcoal-deep fill-charcoal-deep' : 'text-gray-400'
          )}
          aria-hidden="true"
        />
      </button>
    );
  }

  // inline variant — 작품 상세 CTA 영역용
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={inWishlist}
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium',
        'px-4 py-2.5 rounded-xl border transition-[background-color,border-color,color] duration-150',
        inWishlist
          ? 'border-charcoal/20 bg-charcoal-deep/5 text-charcoal-deep'
          : 'border-gray-200 bg-white text-charcoal-muted hover:border-charcoal/20 hover:text-charcoal',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'active:scale-[0.98]',
        className
      )}
    >
      <Heart
        className={cn(
          'w-4 h-4 flex-shrink-0 transition-colors duration-150',
          inWishlist ? 'fill-charcoal-deep' : ''
        )}
        aria-hidden="true"
      />
      {inWishlist ? t('saved') : t('save')}
    </button>
  );
}
