'use client';

import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCart } from '@/components/providers/CartProvider';
import { cn } from '@/lib/utils/cn';

export default function CartNavButton({
  textColor,
  className,
}: {
  textColor: string;
  className?: string;
}) {
  const { count, mounted, openDrawer } = useCart();
  const t = useTranslations('cart');

  return (
    <button
      type="button"
      onClick={() => {
        if (!mounted) return;
        openDrawer();
      }}
      aria-label={t('headerLabel')}
      aria-disabled={!mounted}
      disabled={!mounted}
      className={cn(
        'relative flex items-center justify-center',
        'p-3 min-w-[44px] min-h-[44px] lg:p-2 lg:min-w-[44px] lg:min-h-[44px]',
        'transition-[transform,color] duration-150 active:scale-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg',
        textColor,
        mounted ? 'hover:text-primary' : 'cursor-default opacity-70',
        className
      )}
    >
      <ShoppingCart className="w-5 h-5 lg:w-4 lg:h-4" aria-hidden="true" />
      {mounted && (
        <span
          className={cn(
            'absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary-strong text-white text-[10px] font-bold leading-none',
            'transition-[opacity,transform] duration-200 motion-reduce:transition-none',
            count > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
          )}
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
