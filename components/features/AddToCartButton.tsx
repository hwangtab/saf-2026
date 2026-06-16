'use client';

import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { useCart } from '@/components/providers/CartProvider';

export default function AddToCartButton({
  artworkId,
  isUnique,
  disabled,
}: {
  artworkId: string;
  isUnique: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations('cart');
  const { addOne, openDrawer, items, mounted } = useCart();
  const inCart = mounted && items.some((i) => i.artworkId === artworkId);

  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={disabled}
      leadingIcon={<ShoppingCart className="w-4 h-4" aria-hidden="true" />}
      onClick={() => {
        addOne(artworkId, { unique: isUnique });
        openDrawer();
      }}
    >
      {inCart ? t('inCart') : t('addToCart')}
    </Button>
  );
}
