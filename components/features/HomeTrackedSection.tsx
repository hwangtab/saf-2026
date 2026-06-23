'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics/track';

/**
 * 홈 섹션 계측 래퍼 (#4 랜딩→작품상세 퍼널 계측).
 *
 * 1) IntersectionObserver로 섹션이 처음 viewport에 들어오면 `home_section_view` 1회 emit.
 *    sessionStorage로 세션당 섹션 1회만(스크롤 왕복 중복 방지).
 * 2) 내부 `<a>` 클릭을 위임 추적 — 카드 컴포넌트(server)를 건드리지 않고 wrapping div 한 곳에서 처리:
 *    - section==='hero'           → `hero_cta_click`
 *    - href가 /artworks/{id}       → `home_artwork_card_click` (artwork_id + position)
 *    - 그 외(전체보기·컬렉션 등)    → `home_cta_click` (destination)
 *
 * server 컴포넌트인 홈 섹션을 children으로 받아 그대로 통과시킨다(RSC children 패턴).
 */
export default function HomeTrackedSection({
  section,
  children,
  className,
}: {
  section: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const key = `home_section_view:${section}`;
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(key)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          try {
            window.sessionStorage.setItem(key, '1');
          } catch {
            /* storage 비활성 환경 무시 */
          }
          trackEvent('home_section_view', { section });
          io.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [section]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
    if (!anchor || !ref.current?.contains(anchor)) return;

    const href = anchor.getAttribute('href') ?? '';
    const page_path = typeof window !== 'undefined' ? window.location.pathname : null;

    if (section === 'hero') {
      trackEvent('hero_cta_click', { section, destination: href, page_path });
      return;
    }

    const match = href.match(/\/artworks\/([^/?#]+)/);
    const isCard = Boolean(match) && match![1] !== 'category' && match![1] !== 'artist';

    if (isCard) {
      const anchors = Array.from(
        ref.current!.querySelectorAll<HTMLAnchorElement>('a[href*="/artworks/"]')
      ).filter((a) => {
        const m = (a.getAttribute('href') ?? '').match(/\/artworks\/([^/?#]+)/);
        return m && m[1] !== 'category' && m[1] !== 'artist';
      });
      const position = anchors.indexOf(anchor);
      trackEvent('home_artwork_card_click', {
        section,
        artwork_id: match![1],
        position,
        page_path,
      });
    } else {
      trackEvent('home_cta_click', { section, destination: href, page_path });
    }
  }

  return (
    <div ref={ref} onClickCapture={handleClick} className={className}>
      {children}
    </div>
  );
}
