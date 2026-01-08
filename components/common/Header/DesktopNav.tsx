'use client';

import Button from '@/components/ui/Button';
import { EXTERNAL_LINKS } from '@/lib/constants';
import type { NavigationItem } from '@/types';
import NavLink from './NavLink';

interface DesktopNavProps {
  navigation: NavigationItem[];
  isActive: (href: string) => boolean;
  textColor: string;
}

export default function DesktopNav({ navigation, isActive, textColor }: DesktopNavProps) {
  return (
    <>
      <div className="hidden lg:flex items-center gap-8 h-full">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            variant="desktop"
            textColor={textColor}
          />
        ))}
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
