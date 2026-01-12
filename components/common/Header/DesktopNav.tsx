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
      <div className="hidden md:flex items-center gap-8 h-full">
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
      <div className="hidden md:flex">
        <Button href={EXTERNAL_LINKS.DONATE} variant="accent" external>
          후원하기
        </Button>
      </div>
    </>
  );
}
