'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import MenuToggleIcon from '@/components/ui/MenuToggleIcon';
import { EXTERNAL_LINKS } from '@/lib/constants';
import type { NavigationItem } from '@/types';
import styles from './FullscreenMenu.module.css';

const AuthButtons = dynamic(() => import('@/components/auth/AuthButtons'), {
  ssr: false,
  loading: () => <div className="h-10 w-24 bg-gray-100/50 animate-pulse rounded-full" />,
});

interface FullscreenMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationItem[];
  isActive: (href: string) => boolean;
}

export default function FullscreenMenu({
  isOpen,
  onClose,
  navigation,
  isActive,
}: FullscreenMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollYRef = useRef(0);
  const isBodyLockedRef = useRef(false);
  const skipRestoreScrollRef = useRef(false);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  // body 스크롤 잠금 해제 및 위치 복원
  const restoreBodyScroll = (restorePosition = true) => {
    if (!isBodyLockedRef.current) return;

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    if (restorePosition) {
      window.scrollTo(0, scrollYRef.current);
    }
    isBodyLockedRef.current = false;
  };

  // 메뉴 열기/닫기 - Native dialog API 사용
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();

      // 현재 스크롤 위치 저장
      scrollYRef.current = window.scrollY;

      // body 스크롤 완전 차단 (iOS Safari 대응)
      // position: fixed를 사용하면 스크롤 위치가 0으로 튀는 문제를 방지하기 위해 top을 설정
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%'; // width 추가로 레이아웃 흔들림 방지
      document.body.style.overflow = 'hidden';
      isBodyLockedRef.current = true;
    } else {
      if (dialog.open) dialog.close();
      restoreBodyScroll(!skipRestoreScrollRef.current);
      skipRestoreScrollRef.current = false;
    }

    return () => {
      restoreBodyScroll();
    };
  }, [isOpen]);

  // 경로 변경 시 자동 닫기
  useEffect(() => {
    if (prevPathnameRef.current !== pathname && isOpen) {
      skipRestoreScrollRef.current = true;
      onClose();
    }
    prevPathnameRef.current = pathname;
  }, [pathname, isOpen, onClose]);

  // ESC 키로 닫힐 때 상태 동기화
  const handleDialogClose = () => {
    onClose();
  };

  // 백드롭 클릭으로 닫기
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // dialog 자체를 클릭했을 때만 (내부 컨텐츠 클릭 제외)
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      aria-label="메뉴"
    >
      <div className={styles.container}>
        {/* 헤더 - 닫기 버튼 */}
        <header className={styles.header}>
          <button onClick={onClose} className={styles.closeButton} aria-label="메뉴 닫기">
            <MenuToggleIcon isOpen={true} />
            <span>닫기</span>
          </button>
        </header>

        {/* 네비게이션 */}
        <nav className={styles.nav}>
          <ul className={styles.menuList}>
            {navigation.map((item) => (
              <li key={item.name} className="flex flex-col">
                {item.items && item.items.length > 0 ? (
                  <details className="group">
                    <summary
                      className={`${styles.navLink} list-none cursor-pointer flex items-center justify-center relative w-full`}
                    >
                      <span className="text-center">{item.name}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform duration-200 group-open:rotate-180 absolute right-0 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </summary>
                    <ul className="mt-4 space-y-3">
                      {item.items.map((subItem) => (
                        <li key={subItem.href} className="text-center">
                          <Link
                            href={subItem.href}
                            className={`block py-1 text-lg text-charcoal-muted hover:text-primary ${isActive(subItem.href) ? 'text-primary font-semibold' : ''}`}
                            onClick={onClose}
                          >
                            {subItem.name}
                            {subItem.description && (
                              <span className="block text-xs text-gray-400 font-normal mt-1">
                                {subItem.description}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <Link
                    href={item.href}
                    className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
                    onClick={onClose}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            ))}
            {/* Utility Menu in Mobile */}
            <li className="mt-4 pt-4 border-t border-gray-100">
              <a
                href={EXTERNAL_LINKS.ORDER_STATUS}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.navLink} text-base! text-charcoal-muted!`}
                onClick={onClose}
              >
                주문조회
              </a>
            </li>
          </ul>
        </nav>

        {/* 푸터 - 가입 버튼 */}
        <footer className={styles.footer}>
          <AuthButtons layout="stacked" />
          <Button
            href={EXTERNAL_LINKS.JOIN_MEMBER}
            variant="accent"
            external
            className="w-full justify-center"
            onClick={onClose}
          >
            조합원 가입하기
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
