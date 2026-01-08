'use client';

import type { AnimationDefinition } from 'framer-motion';
import { m, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import Button from '@/components/ui/Button';
import { EXTERNAL_LINKS, Z_INDEX } from '@/lib/constants';
import type { NavigationItem } from '@/lib/types';
import NavLink from './NavLink';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationItem[];
  isActive: (href: string) => boolean;
  onAnimationComplete?: (definition: AnimationDefinition) => void;
  onExitComplete?: () => void;
}

export default function MobileMenu({
  isOpen,
  onClose,
  navigation,
  isActive,
  onAnimationComplete,
  onExitComplete,
}: MobileMenuProps) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen && (
        <FocusTrap
          focusTrapOptions={{
            allowOutsideClick: true,
            escapeDeactivates: true,
            onDeactivate: onClose,
          }}
        >
          <div>
            <m.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 lg:hidden top-[calc(4rem+env(safe-area-inset-top,0px))]"
              style={{
                willChange: 'opacity',
                transform: 'translateZ(0)',
                zIndex: Z_INDEX.MOBILE_BACKDROP,
              }}
            />

            <m.div
              key="mobile-menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onAnimationComplete={onAnimationComplete}
              className="fixed top-[calc(4rem+env(safe-area-inset-top,0px))] right-0 w-72 max-w-[85%] bg-white shadow-2xl lg:hidden overflow-y-auto pb-[env(safe-area-inset-bottom,20px)]"
              style={{
                bottom: 0,
                willChange: 'transform',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                zIndex: Z_INDEX.MOBILE_MENU,
              }}
            >
              <div className="py-4 px-5 space-y-3">
                {navigation.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    variant="mobile"
                    onClick={onClose}
                  />
                ))}
                <div className="mt-4">
                  <Button
                    href={EXTERNAL_LINKS.DONATE}
                    variant="accent"
                    external
                    className="w-full gap-1.5"
                    onClick={onClose}
                  >
                    <span className="group-hover:scale-125 transition-transform duration-300">
                      ❤️
                    </span>
                    <span className="pt-0.5">후원하기</span>
                  </Button>
                </div>
              </div>
            </m.div>
          </div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
