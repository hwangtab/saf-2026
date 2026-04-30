'use client';

import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';

interface HeaderLogoProps {
  isDarkText: boolean;
}

export default function HeaderLogo({ isDarkText }: HeaderLogoProps) {
  const tA11y = useTranslations('a11y');

  return (
    <Link
      href="/"
      className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
    >
      <div className="relative h-9 w-40">
        <SafeImage
          src="/images/logo/320pxX90px.webp"
          alt={tA11y('logoAlt')}
          width={160}
          height={45}
          className={clsx(
            'absolute inset-0 h-9 w-auto object-contain transition-opacity duration-300',
            isDarkText ? 'opacity-100' : 'opacity-0'
          )}
          priority
        />
        <SafeImage
          src="/images/logo/320pxX90px_white.webp"
          alt=""
          aria-hidden="true"
          width={160}
          height={45}
          className={clsx(
            'absolute inset-0 h-9 w-auto object-contain transition-opacity duration-300',
            isDarkText ? 'opacity-0' : 'opacity-100'
          )}
          priority
        />
      </div>
      <span className="sr-only">{tA11y('homeLink')}</span>
    </Link>
  );
}
