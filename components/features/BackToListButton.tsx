import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import { useTranslations } from 'next-intl';

interface BackToListButtonProps {
  fallbackHref?: string;
  className?: string;
}

export default function BackToListButton({
  fallbackHref = '/artworks',
  className,
}: BackToListButtonProps) {
  const t = useTranslations('artworkDetailNav');

  return (
    <Link
      href={fallbackHref}
      className={cn(
        'inline-flex min-h-9 shrink-0 items-center justify-center py-1 text-xs font-medium text-charcoal-soft transition-[transform,color] hover:text-primary-strong active:scale-[0.98] md:min-h-[44px] md:py-2 md:text-sm',
        className
      )}
    >
      ← {t('backToList')}
    </Link>
  );
}
