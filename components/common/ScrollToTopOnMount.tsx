'use client';

import { useEffect } from 'react';

/**
 * 마운트 즉시 페이지를 최상단으로 스크롤.
 * not-found.tsx 등 Next.js soft navigation 시 자동 scroll-to-top이 트리거되지
 * 않는 케이스(예: notFound() 흐름)에 끼워 사용.
 */
export default function ScrollToTopOnMount() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);
  return null;
}
