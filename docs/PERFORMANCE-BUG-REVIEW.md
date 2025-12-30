# SAF 2026 성능, 버그, 애니메이션 코드 리뷰

> **리뷰 날짜**: 2025-12-30
> **대상**: SAF 2026 웹사이트 (Next.js 14 App Router)

본 문서는 코드베이스의 **성능 저하**, **버그**, **애니메이션 충돌**, **코드 충돌**에 대한 분석입니다.

**관련 문서**:

- `CODE-REVIEW.md` - 보안, 코드 품질, 접근성
- `optimization-code-review.md` - 성능/UX 최적화 (일부 중복)

---

## 목차

1. [성능 저하 이슈 (Performance)](#1-성능-저하-이슈-performance)
2. [애니메이션 충돌 (Animation Conflicts)](#2-애니메이션-충돌-animation-conflicts)
3. [버그 (Bugs)](#3-버그-bugs)
4. [코드 충돌 (Code Conflicts)](#4-코드-충돌-code-conflicts)
5. [우선순위 체크리스트](#5-우선순위-체크리스트)

---

## 1. 성능 저하 이슈 (Performance)

### 1.1 스크롤 이벤트 쓰로틀링 누락 (HIGH)

**파일**: `components/common/Header.tsx:55-67`

```tsx
useEffect(() => {
  const handleScroll = () => {
    setIsScrolled(window.scrollY > 10);
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll();

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, []);
```

**문제**:

- 스크롤할 때마다 `handleScroll`이 초당 60회 이상 호출됨
- 매번 `setIsScrolled()` 호출 → 불필요한 상태 업데이트
- 헤더 스타일, 로고 이미지, 텍스트 색상이 모두 변경됨

**영향**: 스크롤 시 프레임 드롭, 모바일에서 특히 심각

**해결 방안**:

```tsx
import { useCallback, useRef } from 'react';

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
  handleScroll();

  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

또는 lodash의 `throttle` 사용:

```tsx
import { throttle } from 'lodash';

const handleScroll = throttle(() => {
  setIsScrolled(window.scrollY > 10);
}, 100);
```

---

### 1.2 MasonryGallery React.memo 누락 (HIGH)

**파일**: `components/features/MasonryGallery.tsx`

```tsx
export default function MasonryGallery({ artworks, showArtistNav = true }: MasonryGalleryProps) {
  // ...
}
```

**문제**:

- 부모 컴포넌트(`ArtworkGalleryWithSort`)의 상태 변경 시 전체 갤러리 리렌더링
- 62개 이상의 작품 카드 + 이미지가 불필요하게 재렌더링됨
- `useMemo`로 데이터는 캐싱했지만 컴포넌트 자체는 캐싱 안 됨

**해결 방안**:

```tsx
import { memo } from 'react';

function MasonryGallery({ artworks, showArtistNav = true }: MasonryGalleryProps) {
  // ...
}

export default memo(MasonryGallery);
```

---

### 1.3 StatisticsCharts 메모이제이션 누락 (MEDIUM)

**파일**: `components/features/StatisticsCharts.tsx`

**문제**:

- 6개의 Recharts 차트 컴포넌트가 부모 리렌더 시 모두 재렌더링
- Recharts는 렌더링 비용이 높은 라이브러리
- 차트 내부 스타일 객체가 매 렌더마다 재생성됨

```tsx
// 매 렌더마다 새 객체 생성
const tooltipContentStyle = {
  backgroundColor: '#fff',
  border: '1px solid #ccc',
  // ...
};
```

**해결 방안**:

1. 스타일 객체를 모듈 레벨 상수로 이동:

```tsx
// 컴포넌트 외부에 선언
const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #ccc',
  // ...
} as const;
```

2. 차트 컴포넌트 메모이제이션:

```tsx
export const IncomeDistributionChart = memo(function IncomeDistributionChart() {
  // ...
});
```

---

### 1.4 PageHero 이미지 CLS (Cumulative Layout Shift) (MEDIUM)

**파일**: `components/ui/PageHero.tsx:33-39`

```tsx
const [bgImage, setBgImage] = useState('');

useEffect(() => {
  const randomImage = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
  setBgImage(randomImage);
}, []);
```

**문제**:

- 첫 렌더: `bgImage = ''` → 이미지 없음
- useEffect 실행 후: 랜덤 이미지 선택 → 이미지 나타남
- 결과: 레이아웃 시프트 + 깜빡임

**해결 방안**:

1. **서버에서 이미지 결정** (권장):

```tsx
// page.tsx (서버 컴포넌트)
const heroImage = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];

<PageHero bgImage={heroImage} ... />
```

2. **기본 배경색 추가**:

```tsx
<section className="relative min-h-[60vh] bg-charcoal ...">
  {bgImage && <Image src={bgImage} ... />}
</section>
```

---

### 1.5 BackgroundSlider 뷰포트 외 실행 (LOW)

**파일**: `components/features/BackgroundSlider.tsx:24-29`

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

**문제**:

- 사용자가 페이지 하단으로 스크롤해도 슬라이더가 계속 실행
- 탭이 백그라운드에 있어도 계속 실행
- 불필요한 상태 업데이트 + 이미지 리소스 낭비

**해결 방안**:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    // 탭이 보이지 않으면 스킵
    if (document.hidden) return;
    setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

또는 `IntersectionObserver`를 사용하여 뷰포트에 있을 때만 실행.

---

## 2. 애니메이션 충돌 (Animation Conflicts)

### 2.1 Button hover/active 스케일 충돌 (MEDIUM)

**파일**: `components/ui/Button.tsx:45-68`

```tsx
const variantStyles = {
  primary: '... hover:scale-105 hover:shadow-lg',
  secondary: '... hover:scale-105 hover:shadow-lg',
  // ...
};

const interactiveClasses = isDisabled
  ? 'opacity-50 cursor-not-allowed transform-none'
  : 'active:scale-95 cursor-pointer';
```

**문제**:

- `hover:scale-105` → 105%로 확대
- `active:scale-95` → 95%로 축소
- 클릭 시: 105% → 95%로 급격한 크기 변화 (10% 차이)
- 버튼에서 손을 떼면: 95% → 100% → (다시 hover면) 105%

**증상**: 버튼 클릭 시 "펑" 하는 느낌의 불안정한 애니메이션

**해결 방안**:

```tsx
// hover와 active 사이의 크기 차이를 줄임
const variantStyles = {
  primary: '... hover:scale-[1.02] hover:shadow-lg',
  // ...
};

const interactiveClasses = isDisabled
  ? 'opacity-50 cursor-not-allowed transform-none'
  : 'active:scale-[0.98] cursor-pointer';
```

---

### 2.2 ActionCard 중복 애니메이션 (MEDIUM)

**파일**: `components/ui/ActionCard.tsx:29-41`

```tsx
// 1. 부모 div - border, shadow transition
<div className="... hover:border-primary hover:shadow-xl transition-all duration-300 ...">

  // 2. 그라데이션 오버레이 - opacity transition
  <div className="... opacity-0 group-hover:opacity-100 transition-opacity duration-300 ..." />

  // 3. 아이콘 - framer-motion scale + rotate
  <motion.div
    whileHover={{ scale: 1.1, rotate: 5 }}
    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
  >
```

**문제**:

- 하나의 hover 액션에 3개의 독립적인 애니메이션이 동시 실행
- 각각 다른 타이밍 함수 사용 (CSS `ease`, framer-motion `spring`)
- 결과: 불협화음 느낌의 애니메이션

**해결 방안**:

1. 애니메이션 통합 (하나만 선택):

```tsx
// CSS만 사용하거나
<div className="... hover:scale-[1.02] hover:shadow-xl transition-transform duration-300">

// 또는 framer-motion만 사용
<motion.div whileHover={{ scale: 1.02 }} ...>
```

2. 아이콘 애니메이션 제거 또는 단순화:

```tsx
<motion.div
  whileHover={{ scale: 1.05 }} // rotate 제거
  transition={{ duration: 0.2 }} // spring 대신 간단한 ease
>
```

---

### 2.3 MasonryGallery 연속 지연 애니메이션 (MEDIUM)

**파일**: `components/features/MasonryGallery.tsx:68-76`

```tsx
{
  artworks.map((artwork) => (
    <motion.div
      key={artwork.id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '50px' }}
      transition={{ duration: 0.4, delay: 0.05 }} // 모든 아이템에 동일한 delay
    >
      ...
    </motion.div>
  ));
}
```

**문제**:

- 모든 아이템에 `delay: 0.05`가 적용됨
- 스크롤하면 뷰포트에 들어온 모든 아이템이 동시에 50ms 후 애니메이션
- 결과: "동시에 펑" 터지는 느낌 (stagger 효과 없음)

**해결 방안 1**: delay 제거 (가장 심플)

```tsx
transition={{ duration: 0.4 }} // delay 제거
```

**해결 방안 2**: 진정한 stagger 효과

```tsx
// 부모에서 stagger 제어
<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true }}
  variants={{
    visible: {
      transition: { staggerChildren: 0.05 }
    }
  }}
>
  {artworks.map((artwork) => (
    <motion.div
      key={artwork.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    >
```

---

### 2.4 비일관적인 Transition Duration (LOW)

| 컴포넌트       | 파일                 | Duration                |
| -------------- | -------------------- | ----------------------- |
| Header         | `Header.tsx`         | `duration-300`          |
| Button         | `Button.tsx`         | `duration-300`          |
| ActionCard     | `ActionCard.tsx`     | `duration-300`          |
| MasonryGallery | `MasonryGallery.tsx` | `duration-500` (이미지) |
| ShareButtons   | `ShareButtons.tsx`   | 미지정 (기본값)         |

**문제**: 사이트 전반적인 애니메이션 "리듬"이 불일치

**해결 방안**: 디자인 토큰으로 통일

```css
/* globals.css */
:root {
  --transition-fast: 150ms;
  --transition-normal: 300ms;
  --transition-slow: 500ms;
}
```

```tsx
// tailwind.config.ts
transitionDuration: {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
}
```

---

## 3. 버그 (Bugs)

### 3.1 Button 언마운트 후 상태 업데이트 (MEDIUM)

**파일**: `components/ui/Button.tsx:34-42`

```tsx
const handleClick = async () => {
  if (onClick && !isLoading && !disabled && !loading) {
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false); // 컴포넌트가 언마운트되었을 수 있음
    }
  }
};
```

**문제**:

- `onClick()`이 비동기 작업(API 호출 등)일 때
- 작업 완료 전에 사용자가 페이지 이동하면
- `setIsLoading(false)`가 언마운트된 컴포넌트에 호출됨
- React 18에서는 에러가 아니지만, 메모리 누수 가능성

**해결 방안**:

```tsx
import { useRef, useEffect } from 'react';

const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);

const handleClick = async () => {
  if (onClick && !isLoading && !disabled && !loading) {
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }
};
```

---

### 3.2 Kakao SDK 초기화 레이스 컨디션 (MEDIUM)

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

**문제 1**: SDK 로딩 타이밍

- Kakao SDK는 `layout.tsx`에서 `async defer`로 로드
- `ShareButtons`가 마운트될 때 SDK가 아직 로드 안 됐을 수 있음
- `window.Kakao`가 `undefined`면 초기화 실패 → 공유 버튼 작동 안 함

**문제 2**: 공유 함수 (Line 74-98)

```tsx
const handleKakaoShare = () => {
  if (typeof window !== 'undefined' && window.Kakao) {
    window.Kakao.Link.sendDefault({...});
  }
  // SDK가 없으면 아무 일도 안 일어남 (사용자 피드백 없음)
};
```

**해결 방안**:

```tsx
const [kakaoReady, setKakaoReady] = useState(false);

useEffect(() => {
  const initKakao = () => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (kakaoKey) {
        window.Kakao.init(kakaoKey);
        setKakaoReady(true);
      }
    } else if (window.Kakao?.isInitialized()) {
      setKakaoReady(true);
    }
  };

  // 이미 로드됨
  if (window.Kakao) {
    initKakao();
  } else {
    // SDK 로드 대기
    window.addEventListener('load', initKakao);
    return () => window.removeEventListener('load', initKakao);
  }
}, []);

// UI에서 비활성화 표시
<button
  onClick={handleKakaoShare}
  disabled={!kakaoReady}
  className={!kakaoReady ? 'opacity-50' : ''}
>
```

---

### 3.3 스크롤 오프셋 불일치 (LOW)

**파일들**:

- `components/features/MasonryGallery.tsx:39-42`
- `components/features/ArtworkGalleryWithSort.tsx:95-112`

```tsx
// MasonryGallery - scrollIntoView 사용
const element = document.getElementById(`artwork-${artworkId}`);
if (element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ArtworkGalleryWithSort - 수동 오프셋 계산
const element = document.getElementById(`artwork-${artworkId}`);
if (element) {
  const offset = 220; // 하드코딩된 값
  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: elementPosition - offset,
    behavior: 'smooth',
  });
}
```

**문제**:

- 두 컴포넌트가 다른 스크롤 방식 사용
- `scrollIntoView`는 sticky 헤더를 고려하지 않음
- `offset: 220`은 하드코딩됨 (헤더 높이 변경 시 깨짐)

**해결 방안**: 공통 유틸리티 함수

```tsx
// lib/scroll.ts
export function scrollToElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 64;
  const offset = headerHeight + 20; // 헤더 + 여백

  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: elementPosition - offset,
    behavior: 'smooth',
  });
}
```

---

### 3.4 KakaoMap addressSearch 클린업 누락 (LOW)

**파일**: `components/features/KakaoMap.tsx:38-50`

```tsx
geocoder.addressSearch(EXHIBITION.ADDRESS, (result, status) => {
  if (status === kakao.maps.services.Status.OK && result?.[0]) {
    setPosition({
      lat: Number(result[0].y),
      lng: Number(result[0].x),
    });
  }
});
```

**문제**:

- 컴포넌트 언마운트 후에도 콜백이 실행될 수 있음
- `setPosition` 호출 시 경고 발생 가능

**해결 방안**:

```tsx
useEffect(() => {
  let isCancelled = false;

  // ...geocoder setup...

  geocoder.addressSearch(EXHIBITION.ADDRESS, (result, status) => {
    if (isCancelled) return;
    if (status === kakao.maps.services.Status.OK && result?.[0]) {
      setPosition({
        lat: Number(result[0].y),
        lng: Number(result[0].x),
      });
    }
  });

  return () => {
    isCancelled = true;
  };
}, [hasAppKey, loading]);
```

---

## 4. 코드 충돌 (Code Conflicts)

### 4.1 z-index 계층 불일치 (LOW)

| 요소                | 파일                 | z-index |
| ------------------- | -------------------- | ------- |
| Header              | `Header.tsx`         | `z-50`  |
| Mobile Menu Overlay | `Header.tsx`         | `z-40`  |
| Mobile Menu         | `Header.tsx`         | `z-50`  |
| Gallery Sticky Nav  | `MasonryGallery.tsx` | `z-30`  |

**문제**:

- Header와 Mobile Menu가 같은 `z-50` 사용
- Gallery Sticky Nav가 Header보다 아래(`z-30`)지만, 스크롤 시 겹칠 수 있음
- 명확한 z-index 계층 구조 없음

**해결 방안**: 디자인 토큰으로 계층화

```tsx
// lib/constants.ts
export const Z_INDEX = {
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  header: 50,
  toast: 60,
} as const;
```

```tsx
// 사용
<header className={`z-[${Z_INDEX.header}]`}>
```

---

### 4.2 하드코딩된 중복 데이터 (LOW)

**파일들**:

- `app/page.tsx:43-47`
- `app/our-reality/page.tsx`
- `app/our-proof/page.tsx`

```tsx
// page.tsx
const counterItems = [
  { label: '제1금융권 배제율', value: 84.9, unit: '%' },
  { label: '고리대금 노출 예술인', value: 48.6, unit: '%' },
  { label: '상호부조 대출 상환율', value: 95, unit: '%' },
];
```

**문제**: 같은 통계 데이터가 여러 파일에 중복 → 업데이트 시 동기화 어려움

**해결 방안**:

```tsx
// lib/constants.ts
export const STATISTICS = {
  financialExclusionRate: { label: '제1금융권 배제율', value: 84.9, unit: '%' },
  highInterestExposure: { label: '고리대금 노출 예술인', value: 48.6, unit: '%' },
  repaymentRate: { label: '상호부조 대출 상환율', value: 95, unit: '%' },
} as const;
```

---

### 4.3 KakaoMap 높이 CSS 충돌 (LOW)

**파일**: `components/features/KakaoMap.tsx:80-89`

```tsx
const containerClassName = [
  'w-full',
  'min-h-[360px]',
  'h-full', // 부모 높이에 맞춤
  // ...
].join(' ');
```

**문제**:

- `h-full`은 부모의 100% 높이
- `min-h-[360px]`은 최소 360px
- 부모가 360px보다 작으면 `h-full`이 우선 → 의도치 않은 높이

**해결 방안**:

```tsx
// h-full 제거, min-h만 유지
const containerClassName = [
  'w-full',
  'min-h-[360px]',
  'aspect-video', // 또는 고정 비율 사용
  // ...
].join(' ');
```

---

### 4.4 uniqueArtists 중복 계산 (LOW)

**파일들**:

- `components/features/ArtworkGalleryWithSort.tsx:56-65`
- `components/features/MasonryGallery.tsx:16-23`

```tsx
// ArtworkGalleryWithSort
const uniqueArtists = useMemo(() => {
  return [...new Set(artworks.map((a) => a.artist))];
}, [artworks]);

// MasonryGallery - 거의 동일한 로직
const uniqueArtists = useMemo(() => {
  const seen = new Set<string>();
  return artworks
    .filter((a) => {
      if (seen.has(a.artist)) return false;
      seen.add(a.artist);
      return true;
    })
    .map((a) => a.artist);
}, [artworks]);
```

**문제**: 같은 데이터를 두 컴포넌트에서 각각 계산

**해결 방안**: 부모에서 계산 후 prop으로 전달

```tsx
// ArtworkGalleryWithSort
const uniqueArtists = useMemo(() => [...], [artworks]);

<MasonryGallery
  artworks={sortedArtworks}
  uniqueArtists={uniqueArtists} // prop으로 전달
/>
```

---

## 5. 우선순위 체크리스트

### HIGH (즉시 수정 권장)

- [ ] **스크롤 이벤트 쓰로틀링** 추가: `Header.tsx:55-67`
  - `requestAnimationFrame` 또는 `throttle` 적용
- [ ] **MasonryGallery React.memo** 래핑: `MasonryGallery.tsx`
  - 불필요한 리렌더링 방지
- [ ] **PageHero CLS 수정**: `PageHero.tsx:33-39`
  - 서버에서 이미지 결정 또는 플레이스홀더 추가

### MEDIUM (1-2주 내 수정)

- [ ] **Button 애니메이션 통합**: `Button.tsx:45-68`
  - hover/active 스케일 차이 줄이기
- [ ] **ActionCard 애니메이션 단순화**: `ActionCard.tsx:29-41`
  - 중복 애니메이션 제거
- [ ] **Button 언마운트 체크** 추가: `Button.tsx:34-42`
  - `isMountedRef` 패턴 적용
- [ ] **Kakao SDK 초기화 안정화**: `ShareButtons.tsx:52-62`
  - 로딩 상태 관리 추가
- [ ] **StatisticsCharts 메모이제이션**: `StatisticsCharts.tsx`
  - 스타일 객체 상수화 + memo 래핑

### LOW (여유 시 수정)

- [ ] **z-index 계층 표준화**: 여러 파일
  - 디자인 토큰으로 통일
- [ ] **중복 데이터 상수화**: `lib/constants.ts`
  - 통계 데이터 중앙 관리
- [ ] **스크롤 유틸리티 통합**: `lib/scroll.ts`
  - 공통 스크롤 함수 생성
- [ ] **Transition Duration 통일**: `tailwind.config.ts`
  - 디자인 토큰으로 관리
- [ ] **BackgroundSlider 뷰포트 체크**: `BackgroundSlider.tsx:24-29`
  - `document.hidden` 또는 `IntersectionObserver` 적용

---

## 부록: 파일 경로 참조

| 컴포넌트               | 경로                                             |
| ---------------------- | ------------------------------------------------ |
| Header                 | `components/common/Header.tsx`                   |
| Button                 | `components/ui/Button.tsx`                       |
| ActionCard             | `components/ui/ActionCard.tsx`                   |
| MasonryGallery         | `components/features/MasonryGallery.tsx`         |
| BackgroundSlider       | `components/features/BackgroundSlider.tsx`       |
| PageHero               | `components/ui/PageHero.tsx`                     |
| ShareButtons           | `components/common/ShareButtons.tsx`             |
| KakaoMap               | `components/features/KakaoMap.tsx`               |
| StatisticsCharts       | `components/features/StatisticsCharts.tsx`       |
| ArtworkGalleryWithSort | `components/features/ArtworkGalleryWithSort.tsx` |

---

**문서 작성자**: Claude Code (AI Assistant)
**최종 검토**: 2025-12-30
**다음 검토 예정**: 2026-03-30 (3개월 후)
