'use client';

import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';

import type { NavigationItem } from '@/types';
import NavLink from './NavLink';

const AuthButtons = dynamic(() => import('@/components/auth/AuthButtons'), {
  ssr: false,
  loading: () => <div className="h-10 w-24 bg-gray-100/50 animate-pulse rounded-full" />,
});

interface DesktopNavProps {
  navigation: NavigationItem[];
  isActive: (href: string) => boolean;
  textColor: string;
}

export default function DesktopNav({ navigation, isActive, textColor }: DesktopNavProps) {
  return (
    <>
      <ul className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-0 items-center gap-8 h-full m-0 p-0 list-none">
        {navigation.map((item) => (
          <li key={item.href} className="h-full">
            <NavLink item={item} isActive={isActive(item.href)} textColor={textColor} />
          </li>
        ))}
      </ul>
      <div className="hidden md:flex items-center gap-3">
        <Button href="/artworks" variant="accent">
          작품 구매
        </Button>
        <AuthButtons />
      </div>
    </>
  );
}
