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
          <li key={item.name} className="h-full flex items-center group relative">
            <div className="relative h-full flex items-center">
              <NavLink item={item} isActive={isActive(item.href)} textColor={textColor} />

              {/* Dropdown Menu */}
              {item.items && item.items.length > 0 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-200 min-w-[200px] z-50">
                  <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-2 overflow-hidden">
                    <ul className="flex flex-col gap-1">
                      {item.items.map((subItem) => (
                        <li key={subItem.href}>
                          <NavLink
                            item={subItem}
                            isActive={isActive(subItem.href)}
                            textColor="text-charcoal hover:bg-gray-50 flex flex-col items-start p-3 rounded-md transition-colors"
                            isSubItem
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden md:flex items-center gap-4">
        {/* Utility Menu (Order Status) */}
        <Button
          href="https://koreasmartcoop.cafe24.com/myshop/order/list.html"
          external
          variant="outline"
          size="sm"
          className={textColor === 'text-white' ? 'border-white/30 text-white hover:bg-white/10' : 'border-gray-200 text-charcoal hover:bg-gray-50'}
        >
          주문조회
        </Button>
        <Button href="/artworks" variant="accent" size="sm">
          작품 구매
        </Button>
        <AuthButtons />
      </div>
    </>
  );
}
