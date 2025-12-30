# SAF 2026 코드베이스 재점검 - 남은 이슈

> **리뷰 날짜**: 2025-12-30
> **대상**: SAF 2026 웹사이트 (이전 리뷰 반영 후)

본 문서는 이전 코드 리뷰(`PERFORMANCE-BUG-REVIEW.md`) 반영 후 **남은 이슈**를 정리한 문서입니다.

---

## 목차

1. [수정 완료 항목 (FIXED)](#1-수정-완료-항목-fixed)
2. [남은 이슈 (REMAINING)](#2-남은-이슈-remaining)
3. [우선순위 체크리스트](#3-우선순위-체크리스트)

---

## 1. 수정 완료 항목 (FIXED)

### 1.1 스크롤 이벤트 쓰로틀링 ✅

**파일**: `components/common/Header.tsx:55-75`

```tsx
useEffect(() => {
  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  // ...
}, []);
```

**상태**: ✅ RAF 쓰로틀링 + `passive: true` 적용됨

---

### 1.2 MasonryGallery React.memo ✅

**파일**: `components/features/MasonryGallery.tsx`

```tsx
import { useMemo, memo } from 'react';

function MasonryGallery({ artworks, showArtistNav = true }: MasonryGalleryProps) {
  // ...
}

export default memo(MasonryGallery);
```

**상태**: ✅ `memo()` 래핑됨

---

### 1.3 Button 스케일 애니메이션 ✅

**파일**: `components/ui/Button.tsx`

```tsx
const variantStyles = {
  primary: '... hover:scale-[1.02] ...',
  // ...
};

const interactiveClasses = isDisabled
  ? 'opacity-50 cursor-not-allowed transform-none'
  : 'active:scale-[0.98] cursor-pointer';
```

**상태**: ✅ hover 1.02 / active 0.98로 통일 (4% 범위)

---

### 1.4 BackgroundSlider 뷰포트 체크 ✅

**파일**: `components/features/BackgroundSlider.tsx:24-31`

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    if (document.hidden) return; // 탭이 백그라운드에 있으면 스킵
    setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

**상태**: ✅ `document.hidden` 체크 적용됨

---

### 1.5 Kakao SDK 안전한 초기화 ✅

**파일**: `components/common/ShareButtons.tsx:52-62`

```tsx
useEffect(() => {
  if (typeof window !== 'undefined' && window.Kakao && !window.Kakao.isInitialized()) {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (kakaoKey) {
      window.Kakao.init(kakaoKey);
    }
  }
}, []);
```

**상태**: ✅ 안전한 초기화 체크 적용됨

---

### 1.6 PageHero 배경색 플레이스홀더 ✅

**파일**: `components/ui/PageHero.tsx:38`

```tsx
<section className="... bg-charcoal">
```

**상태**: ✅ `bg-charcoal` 플레이스홀더 추가됨 (CLS 최소화)

---

## 2. 남은 이슈 (REMAINING)

### 2.1 ActionCard 중복 애니메이션 (MEDIUM)

**파일**: `components/ui/ActionCard.tsx:29-41`

```tsx
// 1. 부모 div - CSS transition
<div className="... hover:border-primary hover:shadow-xl transition-all duration-300 ...">

  // 2. 그라데이션 오버레이 - CSS transition
  <div className="... opacity-0 group-hover:opacity-100 transition-opacity duration-300 ..." />

  // 3. 아이콘 - Framer Motion (다른 타이밍 함수)
  <motion.div
    whileHover={{ scale: 1.1, rotate: 5 }}
    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
  >
```

**문제**:

- 하나의 hover에 3개의 독립적인 애니메이션 동시 실행
- CSS `ease` vs Framer Motion `spring` → 타이밍 불일치
- 시각적으로 "불협화음" 느낌

**해결 방안**: 애니메이션 단일화

```tsx
// 옵션 1: CSS만 사용 (권장 - 더 가벼움)
<div className="text-4xl mb-4 group-hover:scale-105 transition-transform duration-300">
  {icon}
</div>

// 옵션 2: Framer Motion만 사용 (단순화)
<motion.div
  className="text-4xl mb-4"
  whileHover={{ scale: 1.05 }}  // rotate 제거
  transition={{ duration: 0.3 }}  // spring → ease
>
```

---

### 2.2 StatisticsCharts memo 누락 (MEDIUM)

**파일**: `components/features/StatisticsCharts.tsx:38-251`

```tsx
// 스타일 객체는 모듈 레벨에 있음 ✅
const tooltipContentStyle: CSSProperties = { ... };

// 하지만 차트 함수들은 memo가 없음 ❌
export function FirstBankAccessChart() {
  const data = [
    { name: '제1금융권 배제', value: 84.9 },
    { name: '접근 가능', value: 15.1 },
  ];
  // ...
}
```

**문제**:

- 6개 차트 함수 모두 `memo()` 래핑 안 됨
- 부모 리렌더 시 모든 Recharts가 재렌더링됨
- Recharts는 렌더링 비용이 높은 라이브러리

**해결 방안**:

```tsx
import { memo } from 'react';

export const FirstBankAccessChart = memo(function FirstBankAccessChart() {
  // ...
});

export const RejectionReasonsChart = memo(function RejectionReasonsChart() {
  // ...
});

// 나머지 4개 차트도 동일하게 적용
```

---

### 2.3 HERO_IMAGES 코드 중복 (MEDIUM)

**파일들**:

- `components/ui/PageHero.tsx:8-20`
- `components/features/BackgroundSlider.tsx:7-19`

```tsx
// PageHero.tsx - 문자열 배열 (10개)
const HERO_IMAGES = [
  '/images/hero/1.jpg',
  '/images/hero/2.jpg',
  // ... 3-10.jpg
  // 11.jpg는 메인 페이지 전용으로 제외
];

// BackgroundSlider.tsx - 객체 배열 (11개, 11.jpg 포함)
const HERO_IMAGES = [
  { id: '11', filename: '11.jpg', alt: '2026 씨앗페 출품작' },
  { id: '1', filename: '1.jpg', alt: '2026 씨앗페 출품작' },
  // ...
];
```

**문제**:

- 같은 데이터가 두 곳에 다른 형태로 존재
- 이미지 파일명 변경 시 두 곳 모두 수정 필요
- 유지보수 부담 증가

**해결 방안**: `lib/constants.ts`로 중앙화

```tsx
// lib/constants.ts
export const HERO_IMAGE_FILES = [
  { id: '1', filename: '1.jpg', alt: '2026 씨앗페 출품작' },
  // ... 2-10.jpg
  { id: '11', filename: '11.jpg', alt: '2026 씨앗페 출품작', mainPageOnly: true },
];

// PageHero.tsx
const HERO_IMAGES = HERO_IMAGE_FILES.filter((img) => !img.mainPageOnly).map(
  (img) => `/images/hero/${img.filename}`
);

// BackgroundSlider.tsx
const HERO_IMAGES = HERO_IMAGE_FILES;
```

---

### 2.4 z-index 계층 불일치 (MEDIUM)

**파일**: `components/common/Header.tsx`

```tsx
// Line 116: 헤더
<header className="fixed ... z-50 ...">

// Line 205: 모바일 메뉴 오버레이
<motion.div className="fixed ... z-40 ...">

// Line 214: 모바일 메뉴
<motion.div className="fixed ... z-50 ...">  // ⚠️ 헤더와 같은 z-index
```

**현재 z-index 구조**:

| 요소                  | z-index | 비고            |
| --------------------- | ------- | --------------- |
| Header                | `z-50`  | 고정 헤더       |
| Mobile Menu           | `z-50`  | ⚠️ 헤더와 동일  |
| Mobile Overlay        | `z-40`  | 배경 오버레이   |
| ArtworkGallery Sticky | `z-40`  | 정렬 컨트롤     |
| MasonryGallery Sticky | `z-30`  | 작가 네비게이션 |

**문제**: Header와 Mobile Menu가 같은 `z-50` → 렌더링 순서에 의존

**해결 방안**: 명확한 계층 분리

```tsx
// lib/constants.ts
export const Z_INDEX = {
  stickyNav: 30, // MasonryGallery 작가 네비
  controls: 40, // 정렬/필터 컨트롤
  overlay: 45, // 모바일 오버레이
  header: 50, // 고정 헤더
  mobileMenu: 55, // 모바일 메뉴 (헤더 위)
} as const;
```

---

### 2.5 스크롤 오프셋 불일치 (LOW)

**파일들**:

- `components/features/ArtworkGalleryWithSort.tsx:95-112`
- `components/features/MasonryGallery.tsx:38-46`

```tsx
// ArtworkGalleryWithSort - 수동 오프셋
const offset = 220; // 하드코딩된 매직 넘버
const elementPosition = element.getBoundingClientRect().top + window.scrollY;
window.scrollTo({
  top: elementPosition - offset,
  behavior: 'smooth',
});

// MasonryGallery - scrollIntoView
element.scrollIntoView({
  behavior: 'smooth',
  block: 'center', // 다른 방식
});
```

**문제**:

- 두 컴포넌트가 다른 스크롤 방식 사용
- `offset: 220`은 하드코딩 (헤더 높이 변경 시 깨짐)
- `scrollIntoView`는 sticky 헤더를 고려하지 않을 수 있음

**해결 방안**: 공통 유틸리티

```tsx
// lib/scroll.ts
export function scrollToElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const header = document.querySelector('header');
  const headerHeight = header?.getBoundingClientRect().height ?? 64;
  const offset = headerHeight + 20;

  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: elementPosition - offset,
    behavior: 'smooth',
  });
}
```

---

### 2.6 Transition Duration 불일치 (LOW)

| 컴포넌트       | Duration       | 파일                 |
| -------------- | -------------- | -------------------- |
| DynamicCounter | `duration-200` | `DynamicCounter.tsx` |
| Header         | `duration-300` | `Header.tsx`         |
| Button         | `duration-300` | `Button.tsx`         |
| ActionCard     | `duration-300` | `ActionCard.tsx`     |
| MasonryGallery | `duration-500` | `MasonryGallery.tsx` |

**문제**: 사이트 전반의 애니메이션 "리듬"이 불일치

**해결 방안**: Tailwind 커스텀 토큰

```tsx
// tailwind.config.ts
transitionDuration: {
  fast: '150ms',
  DEFAULT: '300ms',
  slow: '500ms',
}
```

---

### 2.7 통계 데이터 Constants 미사용 (LOW)

**파일**: `components/features/StatisticsCharts.tsx`

```tsx
// StatisticsCharts.tsx - 하드코딩된 데이터
export function FirstBankAccessChart() {
  const data = [
    { name: '제1금융권 배제', value: 84.9 }, // 하드코딩
    // ...
  ];
}
```

```tsx
// lib/constants.ts - 사용되지 않는 중앙 데이터
export const STATISTICS_DATA = [
  { label: '예술인의 1금융권 배제율', value: 84.9, unit: '%' },
  // ...
];
```

**문제**:

- `STATISTICS_DATA`가 정의되어 있지만 실제로 사용되지 않음
- 통계 업데이트 시 여러 곳 수정 필요
- 데이터 불일치 위험

**해결 방안**: constants 활용

```tsx
// StatisticsCharts.tsx
import { STATISTICS_DATA } from '@/lib/constants';

export function FirstBankAccessChart() {
  const exclusionRate = STATISTICS_DATA.find((s) => s.label.includes('배제율'))?.value ?? 84.9;

  const data = [
    { name: '제1금융권 배제', value: exclusionRate },
    { name: '접근 가능', value: 100 - exclusionRate },
  ];
  // ...
}
```

---

### 2.8 KakaoMap any 타입 (LOW)

**파일**: `components/features/KakaoMap.tsx:34`

```tsx
const { kakao } = window as typeof window & { kakao?: any };
```

**문제**: `any` 타입으로 TypeScript 타입 안전성 무력화

**해결 방안**: 타입 정의 파일 생성

```tsx
// lib/types/kakao.d.ts
interface KakaoGeocoder {
  addressSearch(
    address: string,
    callback: (result: Array<{ x: string; y: string }>, status: string) => void
  ): void;
}

interface KakaoMapsServices {
  Geocoder: new () => KakaoGeocoder;
  Status: { OK: string };
}

interface WindowWithKakao extends Window {
  kakao?: {
    maps?: {
      services?: KakaoMapsServices;
    };
  };
}

// 사용
const { kakao } = window as WindowWithKakao;
```

---

## 3. 우선순위 체크리스트

### MEDIUM (1-2주 내 권장)

- [ ] **ActionCard 애니메이션 단순화**: `ActionCard.tsx:35-41`
  - Framer Motion 제거 또는 CSS 통일
- [ ] **StatisticsCharts memo 적용**: `StatisticsCharts.tsx`
  - 6개 차트 함수 모두 `memo()` 래핑
- [ ] **HERO_IMAGES 중앙화**: `lib/constants.ts`
  - `PageHero.tsx`, `BackgroundSlider.tsx`에서 공유
- [ ] **z-index 계층 정리**: `Header.tsx`
  - 모바일 메뉴를 `z-55`로 분리

### LOW (여유 시)

- [ ] **스크롤 유틸리티 통합**: `lib/scroll.ts`
  - `scrollToElement()` 공통 함수 생성
- [ ] **Transition Duration 통일**: `tailwind.config.ts`
  - 디자인 토큰 정의
- [ ] **통계 데이터 연동**: `StatisticsCharts.tsx`
  - `STATISTICS_DATA` 활용
- [ ] **KakaoMap 타입 정의**: `lib/types/kakao.d.ts`
  - `any` 타입 제거

---

## 부록: 파일 경로 참조

| 컴포넌트               | 경로                                             | 상태             |
| ---------------------- | ------------------------------------------------ | ---------------- |
| Header                 | `components/common/Header.tsx`                   | ✅ 스크롤 수정됨 |
| MasonryGallery         | `components/features/MasonryGallery.tsx`         | ✅ memo 적용됨   |
| Button                 | `components/ui/Button.tsx`                       | ✅ 스케일 수정됨 |
| BackgroundSlider       | `components/features/BackgroundSlider.tsx`       | ✅ 뷰포트 체크   |
| ShareButtons           | `components/common/ShareButtons.tsx`             | ✅ 초기화 수정됨 |
| PageHero               | `components/ui/PageHero.tsx`                     | ⚠️ 부분 수정     |
| ActionCard             | `components/ui/ActionCard.tsx`                   | ❌ 미수정        |
| StatisticsCharts       | `components/features/StatisticsCharts.tsx`       | ❌ 미수정        |
| ArtworkGalleryWithSort | `components/features/ArtworkGalleryWithSort.tsx` | ⚠️ 스크롤 불일치 |
| KakaoMap               | `components/features/KakaoMap.tsx`               | ⚠️ 타입 미개선   |

---

**문서 작성자**: Claude Code (AI Assistant)
**최종 검토**: 2025-12-30
