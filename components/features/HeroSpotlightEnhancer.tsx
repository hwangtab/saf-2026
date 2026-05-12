'use client';

import { useEffect } from 'react';
import EmblaCarousel from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';

interface HeroSpotlightEnhancerProps {
  /** 서버에서 SSR된 슬라이드 개수. 단일 슬라이드면 enhancer 자체가 no-op */
  slideCount: number;
}

/**
 * HeroSpotlight Progressive Enhancement — vanilla embla 마운트 전용 client island.
 *
 * **회귀 trauma 회피 설계**:
 * 1. 서버가 모든 슬라이드/dots/arrows의 정적 마크업을 SSR. 이 client island는
 *    "데이터-속성" hook 지점에 vanilla embla를 부착할 뿐 **DOM 노드를 교체하지 않음**.
 *    → 회귀 1 (commit 4378e1a4: server island + absolute overlay로 두 번째 paint
 *      LCP 회귀)의 본질 회피. SSR로 paint된 첫 슬라이드 image element가 그대로
 *      LCP element로 측정됨.
 * 2. embla 마운트을 `useEffect`에서 정상 실행. `requestIdleCallback`/`setTimeout`
 *    으로 지연시키지 않음.
 *    → 회귀 2 (commit a3e6d876: idleCallback lazy activation으로 TBT 40→1110ms)의
 *      본질 회피. PSI mobile 4x throttle 환경에서 idle 시점에 embla mount + autoplay
 *      + handler 등록이 한 long task로 묶이는 폭증을 차단.
 *
 * **vanilla embla 선택 이유**: `embla-carousel-react` wrapper(~10KB 추가) 대신
 * vanilla `embla-carousel`을 직접 호출해 클라이언트 번들 절감. autoplay 플러그인은
 * 동일 패키지 그대로 사용.
 *
 * **이벤트 위임 패턴**: dots/arrows에 querySelector로 접근 후 click 리스너 부착.
 * SSR된 button이 그대로 embla 컨트롤 역할 수행 — React state 동기화는 dot의
 * `aria-current` + `data-active` 속성 mutation으로 처리.
 */
export default function HeroSpotlightEnhancer({ slideCount }: HeroSpotlightEnhancerProps) {
  useEffect(() => {
    // 슬라이드가 1개 이하면 캐러셀 동작 불필요
    if (slideCount <= 1) return;

    // 같은 페이지 내 다중 HeroSpotlight 가정 안 함 — querySelector 단일 매칭
    const root = document.querySelector<HTMLElement>('[data-hero-spotlight]');
    if (!root) return;
    const viewport = root.querySelector<HTMLElement>('[data-embla-viewport]');
    if (!viewport) return;

    const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-embla-dot]'));
    const dotSpans = dots.map((dot) =>
      dot.querySelector<HTMLSpanElement>('[data-embla-dot-indicator]')
    );
    const prevBtn = root.querySelector<HTMLButtonElement>('[data-embla-prev]');
    const nextBtn = root.querySelector<HTMLButtonElement>('[data-embla-next]');

    // prefers-reduced-motion 존중 — autoplay 비활성화
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const plugins = prefersReducedMotion
      ? []
      : [
          Autoplay({
            delay: 6000,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
            stopOnFocusIn: true,
          }),
        ];

    const embla = EmblaCarousel(viewport, { loop: true, align: 'start' }, plugins);

    const updateDots = () => {
      const selected = embla.selectedScrollSnap();
      dots.forEach((dot, idx) => {
        const isActive = idx === selected;
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
        const span = dotSpans[idx];
        if (!span) return;
        // 시각 상태: active(w-8 bg-white) vs inactive(w-2 bg-white/40)
        span.classList.toggle('w-8', isActive);
        span.classList.toggle('bg-white', isActive);
        span.classList.toggle('w-2', !isActive);
        span.classList.toggle('bg-white/40', !isActive);
        // group-hover:bg-white/60는 hover state에서만 트리거되니 그대로 둠
      });
    };

    const dotHandlers = dots.map((dot, idx) => {
      const handler = () => embla.scrollTo(idx);
      dot.addEventListener('click', handler);
      return handler;
    });

    const prevHandler = () => embla.scrollPrev();
    const nextHandler = () => embla.scrollNext();
    prevBtn?.addEventListener('click', prevHandler);
    nextBtn?.addEventListener('click', nextHandler);

    embla.on('select', updateDots);
    embla.on('reInit', updateDots);
    updateDots();

    return () => {
      dots.forEach((dot, idx) => {
        const handler = dotHandlers[idx];
        if (handler) dot.removeEventListener('click', handler);
      });
      prevBtn?.removeEventListener('click', prevHandler);
      nextBtn?.removeEventListener('click', nextHandler);
      embla.destroy();
    };
  }, [slideCount]);

  return null;
}
