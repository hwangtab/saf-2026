'use client';

import { Heart } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { cn } from '@/lib/utils/cn';

export default function WishlistNavButton({ textColor }: { textColor: string }) {
  const { count, mounted } = useWishlist();
  const t = useTranslations('wishlist');

  return (
    <Link
      href="/wishlist"
      aria-label={t('headerLabel')}
      className={cn(
        'relative flex items-center justify-center',
        // 모바일: 44px 터치 타겟. 데스크탑: utility pill 크기에 맞춤.
        'p-3 min-w-[44px] min-h-[44px] lg:p-2 lg:min-w-0 lg:min-h-0',
        'transition-[transform,color] duration-150 active:scale-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg',
        textColor,
        'hover:text-primary'
      )}
    >
      <Heart className="w-5 h-5 lg:w-4 lg:h-4" aria-hidden="true" />
      {mounted && (
        <span
          className={cn(
            'absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold leading-none',
            'transition-[opacity,transform] duration-200 motion-reduce:transition-none',
            count > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
          )}
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
