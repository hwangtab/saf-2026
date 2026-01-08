'use client';

import Link from 'next/link';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import { EXTERNAL_LINKS } from '@/lib/constants';
import type { NavigationItem } from '@/lib/types';

interface DesktopNavProps {
  navigation: NavigationItem[];
  isActive: (href: string) => boolean;
  textColor: string;
}

export default function DesktopNav({ navigation, isActive, textColor }: DesktopNavProps) {
  return (
    <>
      <div className="hidden lg:flex items-center gap-8 h-full">
        {navigation.map((item) =>
          item.external ? (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                'relative flex items-center h-full text-sm font-medium transition-colors',
                'focus:outline-none focus-visible:outline-none',
                'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5',
                'after:bg-transparent hover:after:bg-primary/40 after:transition-colors',
                textColor,
                'hover:text-primary'
              )}
            >
              {item.name}
            </a>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'relative flex items-center h-full text-sm font-medium transition-colors',
                'focus:outline-none focus-visible:outline-none',
                'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5',
                'after:transition-colors',
                isActive(item.href)
                  ? ['text-primary', 'after:bg-primary']
                  : [
                      textColor,
                      'hover:text-primary',
                      'after:bg-transparent hover:after:bg-primary/40',
                    ]
              )}
            >
              {item.name}
            </Link>
          )
        )}
      </div>
      <div className="hidden lg:flex">
        <Button href={EXTERNAL_LINKS.DONATE} variant="accent" external className="gap-1.5">
          <span className="group-hover:scale-125 transition-transform duration-300">❤️</span>
          <span className="pt-0.5">후원하기</span>
        </Button>
      </div>
    </>
  );
}
