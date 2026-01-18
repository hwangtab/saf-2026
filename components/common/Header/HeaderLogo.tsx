'use client';

import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import clsx from 'clsx';
import { UI_STRINGS } from '@/lib/ui-strings';

interface HeaderLogoProps {
  isDarkText: boolean;
}

export default function HeaderLogo({ isDarkText }: HeaderLogoProps) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
    >
      <div className="relative h-9 w-40">
        <ExportedImage
          src="/images/logo/320pxX90px.webp"
          alt={UI_STRINGS.A11Y.LOGO_ALT}
          width={160}
          height={45}
          className={clsx(
            'absolute inset-0 h-9 w-auto object-contain transition-opacity duration-300',
            isDarkText ? 'opacity-100' : 'opacity-0'
          )}
          priority
        />
        <ExportedImage
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
      <span className="sr-only">{UI_STRINGS.A11Y.HOME_LINK}</span>
    </Link>
  );
}
