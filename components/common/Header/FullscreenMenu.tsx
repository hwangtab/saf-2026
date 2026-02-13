'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
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
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  // body 스크롤 잠금 해제 및 위치 복원
  const restoreBodyScroll = () => {
    if (!isBodyLockedRef.current) return;

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollYRef.current);
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
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      isBodyLockedRef.current = true;
    } else {
      if (dialog.open) dialog.close();
      restoreBodyScroll();
    }

    return () => {
      restoreBodyScroll();
    };
  }, [isOpen]);

  // 경로 변경 시 자동 닫기
  useEffect(() => {
    if (prevPathnameRef.current !== pathname && isOpen) {
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>닫기</span>
          </button>
        </header>

        {/* 네비게이션 */}
        <nav className={styles.nav}>
          <ul className={styles.menuList}>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
                  onClick={onClose}
                >
                  {item.name}
                </Link>
              </li>
            ))}
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
