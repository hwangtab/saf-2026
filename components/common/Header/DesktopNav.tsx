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
      <ul className="hidden md:flex items-center gap-8 h-full m-0 p-0 list-none">
        {navigation.map((item) => (
          <li key={item.href}>
            <NavLink
              item={item}
              isActive={isActive(item.href)}
              variant="desktop"
              textColor={textColor}
            />
          </li>
        ))}
      </ul>
      <div className="hidden md:flex">
        <Button href={EXTERNAL_LINKS.DONATE} variant="accent" external>
          후원하기
        </Button>
      </div>
    </>
  );
}
