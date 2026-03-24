import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

interface BackToListButtonProps {
  fallbackHref?: string;
}

export default function BackToListButton({ fallbackHref = '/artworks' }: BackToListButtonProps) {
  const t = useTranslations('artworkDetailNav');

  return (
    <Link
      href={fallbackHref}
      className="inline-flex items-center justify-center min-h-[44px] py-2 text-sm font-medium text-gray-500 hover:text-primary active:scale-[0.98] transition-[transform,color]"
    >
      ← {t('backToList')}
    </Link>
  );
}
