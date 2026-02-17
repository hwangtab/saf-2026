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
      <ul className="hidden md:flex xl:absolute xl:left-1/2 xl:-translate-x-1/2 top-0 items-center gap-8 h-full m-0 p-0 list-none">
        {navigation.map((item) => (
          <li key={item.name} className="h-full flex items-center group relative">
            <div className="relative h-full flex items-center">
              <NavLink item={item} isActive={isActive(item.href)} textColor={textColor} />

              {/* Dropdown Menu */}
              {item.items && item.items.length > 0 && (
                <div className="absolute top-full left-0 pt-2 opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] min-w-[240px] z-50 before:absolute before:h-4 before:w-full before:-top-4 before:left-0 before:content-['']">
                  <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-2 overflow-hidden">
                    <ul className="flex flex-col gap-1">
                      {item.items.map((subItem) => (
                        <li key={subItem.href}>
                          <NavLink
                            item={subItem}
                            isActive={isActive(subItem.href)}
                            textColor="text-charcoal hover:bg-gray-50 flex flex-col items-start text-left p-3 rounded-md transition-colors"
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
      <div className="hidden md:flex items-center gap-2">
        {/* Utility Menu (Order Status) */}
        <a
          href="https://koreasmartcoop.cafe24.com/myshop/order/list.html"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm font-medium hover:opacity-70 transition-opacity px-3 py-2 ${textColor}`}
        >
          주문조회
        </a>

        <Button href="/artworks" variant="accent" size="xs">
          작품 구매
        </Button>

        <AuthButtons size="xs" variant={textColor === 'text-white' ? 'white' : 'white'} />
      </div>
    </>
  );
}
