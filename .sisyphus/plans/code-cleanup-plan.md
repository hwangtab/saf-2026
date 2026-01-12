# SAF 2026 코드 정리 및 최적화 작업 계획서

> **작성일**: 2026-01-12  
> **예상 소요 시간**: 1~2일  
> **우선순위**: 높음 (코드 품질 및 유지보수성 개선)

---

## 📋 개요

Oracle 에이전트의 심층 분석 결과를 바탕으로, SAF 2026 웹사이트의 **코드 중복**, **CSS 충돌**, **애니메이션 파편화** 문제를 해결하기 위한 단계별 작업 계획입니다.

### 해결할 문제 요약

| 카테고리      | 문제                                       | 심각도  | 예상 시간 |
| ------------- | ------------------------------------------ | ------- | --------- |
| 버튼 컴포넌트 | Button/ServerButton 파편화 + 인라인 스타일 | 🔴 높음 | 1~2시간   |
| 모바일 감지   | 중복된 `window.innerWidth` 로직            | 🟡 중간 | 30분      |
| CSS 토큰      | globals.css 하드코딩 색상                  | 🟡 중간 | 15분      |
| 애니메이션    | 인라인 variants 중복                       | 🟢 낮음 | 1시간     |
| 데이터 정규화 | 작가 프로필 중복                           | 🟡 중간 | 2~3시간   |

---

## 🔴 Phase 1: 버튼 컴포넌트 통합 (최우선)

### 1.1 현재 상태 분석

**문제점:**

- `Button.tsx` (135줄): 클라이언트 컴포넌트, 로딩 상태, async onClick 지원
- `ServerButton.tsx` (37줄): 서버 컴포넌트용이지만 **현재 사용처 없음**
- 페이지에서 인라인 스타일로 버튼 구현 (Button 컴포넌트 미사용)

**인라인 버튼 스타일 사용처:**

```
app/our-proof/page.tsx:299    → bg-accent hover:bg-accent-strong
app/our-proof/page.tsx:311    → bg-gray-900 hover:bg-gray-800
app/exhibition/page.tsx:122   → bg-accent hover:bg-accent-strong
app/exhibition/page.tsx:128   → bg-gray-900 hover:bg-gray-800
components/common/CTAButtonGroup.tsx:54-60 → 버튼 스타일 재정의
```

### 1.2 작업 내용

#### Step 1: ServerButton 제거

```bash
# 파일 삭제
rm components/ui/ServerButton.tsx
```

#### Step 2: Button 컴포넌트에 `asChild` 패턴 추가 (선택사항)

```typescript
// components/ui/Button.tsx - 기존 코드 유지하되 export 추가
export { buttonVariants }; // 이미 export 됨 ✓
```

#### Step 3: CTAButtonGroup 리팩토링

```typescript
// components/common/CTAButtonGroup.tsx
import Button from '@/components/ui/Button';

// 변경 전
<a href={donateHref} className={donateClasses}>...</a>

// 변경 후
<Button href={donateHref} external variant="accent" size={variant === 'large' ? 'lg' : 'md'}>
  {donateText}
</Button>
<Button href={purchaseHref} variant="secondary" size={variant === 'large' ? 'lg' : 'md'}>
  {purchaseText}
</Button>
```

#### Step 4: our-proof/page.tsx 수정

```typescript
// 변경 전 (line 295-302)
<a
  href={EXTERNAL_LINKS.DONATE}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center justify-center bg-accent hover:bg-accent-strong text-light font-bold px-6 py-3 rounded-lg transition-colors"
>
  후원하기
</a>

// 변경 후
import Button from '@/components/ui/Button';
// ...
<Button href={EXTERNAL_LINKS.DONATE} external variant="accent">
  후원하기
</Button>
```

#### Step 5: exhibition/page.tsx 수정

```typescript
// 변경 전 (line 118-125)
<a
  href={EXTERNAL_LINKS.DONATE}
  target="_blank"
  rel="noopener noreferrer"
  className="block w-full bg-accent hover:bg-accent-strong text-light font-bold px-6 py-3 rounded-lg transition-colors text-center"
>
  ❤️ 후원하기
</a>

// 변경 후
<Button href={EXTERNAL_LINKS.DONATE} external variant="accent" className="w-full">
  ❤️ 후원하기
</Button>
```

### 1.3 검증

```bash
npm run type-check
npm run lint
npm run build
```

---

## 🟡 Phase 2: 모바일 감지 훅 생성

### 2.1 현재 상태 분석

**중복 코드 위치:**
| 파일 | 브레이크포인트 | 코드 |
|------|---------------|------|
| `BackgroundSlider.tsx:43` | 768px | `setIsMobile(window.innerWidth < 768)` |
| `KakaoMap.tsx:19` | 768px | `setIsMobile(window.innerWidth < 768)` |
| `useChartDimensions.ts:5` | 480px | `const MOBILE_BREAKPOINT = 480` |

### 2.2 작업 내용

#### Step 1: useIsMobile 훅 생성

```typescript
// lib/hooks/useIsMobile.ts
'use client';

import { useState, useEffect } from 'react';

const DEFAULT_BREAKPOINT = 768;

export function useIsMobile(breakpoint = DEFAULT_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Initial check
    checkMobile();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// 기본 브레이크포인트 상수 export
export const BREAKPOINTS = {
  MOBILE: 768,
  MOBILE_SMALL: 480,
  TABLET: 1024,
} as const;
```

#### Step 2: BackgroundSlider.tsx 수정

```typescript
// 변경 전
const [isMobile, setIsMobile] = useState(false);
// ... useEffect 내부에 resize 로직

// 변경 후
import { useIsMobile } from '@/lib/hooks/useIsMobile';
// ...
const isMobile = useIsMobile();
// useEffect 내 checkMobile 관련 코드 제거
```

#### Step 3: KakaoMap.tsx 수정

```typescript
// 변경 전
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  // ...
}, []);

// 변경 후
import { useIsMobile } from '@/lib/hooks/useIsMobile';
// ...
const isMobile = useIsMobile();
// 관련 useEffect 제거
```

#### Step 4: useChartDimensions.ts 수정 (선택사항)

```typescript
// 변경 전
const MOBILE_BREAKPOINT = 480;
// ...
const isMobile = width < MOBILE_BREAKPOINT;

// 변경 후
import { BREAKPOINTS } from './useIsMobile';
// ...
const isMobile = width < BREAKPOINTS.MOBILE_SMALL;
```

### 2.3 검증

```bash
npm run type-check
npm test -- useIsMobile  # 테스트 작성 필요시
```

---

## 🟡 Phase 3: CSS 토큰 정규화

### 3.1 현재 상태 분석

**하드코딩된 색상 (styles/globals.css):**

```css
/* Line 56-57 */
body {
  background-color: #fff9e8; /* Should be canvas.soft */
  color: #31393c; /* Should be charcoal.DEFAULT */
}

/* Line 83 */
a:focus-visible,
button:focus-visible {
  outline: 2px solid #2176ff; /* Should be primary.DEFAULT */
}

/* Line 96-97 */
.skip-to-main {
  background: #fdca40; /* Should be sun.DEFAULT */
  color: #31393c; /* Should be charcoal.DEFAULT */
}

/* Line 112 */
.text-gradient {
  color: #2176ff; /* Should be primary.DEFAULT */
}
```

### 3.2 작업 내용

#### Step 1: CSS 변수 정의 추가

```css
/* styles/globals.css - @tailwind 지시문 앞에 추가 */
:root {
  --color-canvas-soft: #fff9e8;
  --color-charcoal: #31393c;
  --color-primary: #2176ff;
  --color-sun: #fdca40;
}
```

#### Step 2: 하드코딩 색상 교체

```css
/* 변경 후 */
body {
  background-color: var(--color-canvas-soft);
  color: var(--color-charcoal);
}

a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-primary);
}

.skip-to-main {
  background: var(--color-sun);
  color: var(--color-charcoal);
}

.text-gradient {
  color: var(--color-primary);
}
```

### 3.3 검증

```bash
npm run build
# 브라우저에서 색상 확인
```

---

## 🟢 Phase 4: 애니메이션 Variants 중앙화

### 4.1 현재 상태 분석

**인라인 애니메이션 정의 위치:**
| 파일 | 애니메이션 타입 | 속성 |
|------|---------------|------|
| `FadeInSection.tsx` | fade-in + direction | opacity, y/x, duration: 0.6s |
| `BackgroundSlider.tsx` | fade + scale | opacity, scale, complex timing |
| `PageHeroBackground.tsx` | ken-burns loop | scale 1.1→1.0, 20s infinite |
| `Button.tsx` | spinner rotation | rotate 360, 1s infinite |

### 4.2 작업 내용

#### Step 1: motion-variants.ts 생성

```typescript
// lib/motion-variants.ts
import type { Variants, Transition } from 'framer-motion';

// === Fade Variants ===
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

// === Stagger Container ===
export const staggerContainer = (staggerDelay = 0.1): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

// === Scale Variants ===
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 },
  },
};

// === Spinner Animation ===
export const spinnerTransition: Transition = {
  duration: 1,
  repeat: Infinity,
  ease: 'linear',
};

// === Duration Constants ===
export const DURATIONS = {
  FAST: 0.15,
  DEFAULT: 0.3,
  SLOW: 0.5,
  FADE_IN: 0.6,
  SLIDER: 1.5,
  KEN_BURNS: 20,
} as const;
```

#### Step 2: FadeInSection.tsx 리팩토링 (선택사항)

```typescript
// 기존 로직을 유지하되, directionOffset을 motion-variants에서 가져올 수 있음
// 현재 구현이 이미 깔끔하므로 필수 아님
```

### 4.3 검증

```bash
npm run type-check
npm run build
```

---

## 🟡 Phase 5: 작가 데이터 정규화 (중기)

### 5.1 현재 상태 분석

**문제점:**

- `content/artworks-batches/batch-*.ts`에서 동일 작가의 `profile`, `history`가 반복됨
- 예: "최윤정" 작가의 프로필(500+ 문자)이 10개 이상 작품에 중복

**영향:**

- 번들 사이즈 증가
- 작가 정보 업데이트 시 모든 작품 수정 필요

### 5.2 작업 내용

#### Step 1: artists-data.ts 생성

```typescript
// content/artists-data.ts
export interface ArtistData {
  profile: string;
  history: string;
}

export const ARTIST_DATA: Record<string, ArtistData> = {
  최윤정: {
    profile: '최윤정 작가는 자신이 살아가고 있는 시대를 섬세하게 들여다보고자 한다...',
    history: '개인전\n2023 POP KIDS (갤러리H, 서울)\n...',
  },
  이수철: {
    profile: '사진가 이수철은 일본 오사카예술대학교에서 사진을 전공하며...',
    history: '오사카예술대학 사진학과 졸업\n...',
  },
  // ... 모든 작가 데이터
};
```

#### Step 2: Artwork 타입 수정 (선택사항)

```typescript
// types/index.ts
export interface Artwork {
  id: string;
  artist: string; // 작가명 (ARTIST_DATA 키)
  title: string;
  // profile, history 제거 또는 optional로 변경
  profile?: string; // 개별 오버라이드용
  history?: string; // 개별 오버라이드용
  // ... 나머지 필드
}
```

#### Step 3: 유틸 함수 생성

```typescript
// lib/artworkUtils.ts 에 추가
import { ARTIST_DATA } from '@/content/artists-data';
import type { Artwork } from '@/types';

export function getArtworkWithArtistData(artwork: Artwork): Artwork & ArtistData {
  const artistData = ARTIST_DATA[artwork.artist] || { profile: '', history: '' };
  return {
    ...artwork,
    profile: artwork.profile || artistData.profile,
    history: artwork.history || artistData.history,
  };
}
```

#### Step 4: 기존 batch 파일 정리

```typescript
// content/artworks-batches/batch-001.ts
import { ARTIST_DATA } from '../artists-data';

export const artworksBatch1: Artwork[] = [
  {
    id: '2',
    artist: '최윤정',
    title: 'face #02-홍범도',
    // profile, history 제거 (ARTIST_DATA에서 가져옴)
    size: '53x53cm',
    // ...
  },
];
```

### 5.3 검증

```bash
npm run type-check
npm run build
# 작품 상세 페이지에서 작가 정보 표시 확인
```

---

## ✅ 체크리스트

### Phase 1: 버튼 통합

- [ ] ServerButton.tsx 삭제
- [ ] CTAButtonGroup.tsx에서 Button 컴포넌트 사용
- [ ] our-proof/page.tsx 인라인 버튼 → Button 교체
- [ ] exhibition/page.tsx 인라인 버튼 → Button 교체
- [ ] 타입 체크 및 빌드 통과

### Phase 2: 모바일 훅

- [ ] lib/hooks/useIsMobile.ts 생성
- [ ] BackgroundSlider.tsx에서 useIsMobile 사용
- [ ] KakaoMap.tsx에서 useIsMobile 사용
- [ ] (선택) useChartDimensions.ts에서 BREAKPOINTS 사용

### Phase 3: CSS 토큰

- [ ] globals.css에 CSS 변수 정의
- [ ] 하드코딩된 색상값 CSS 변수로 교체

### Phase 4: 애니메이션

- [ ] lib/motion-variants.ts 생성
- [ ] 새 애니메이션 작성 시 variants 재사용

### Phase 5: 데이터 정규화

- [ ] content/artists-data.ts 생성
- [ ] 작가별 profile/history 추출
- [ ] artworkUtils.ts에 헬퍼 함수 추가
- [ ] batch 파일에서 중복 데이터 제거

---

## 📝 참고사항

### 의존성

- Phase 1~3은 독립적으로 실행 가능
- Phase 4는 즉시 적용 불필요 (새 애니메이션 작성 시 활용)
- Phase 5는 데이터 마이그레이션 필요하므로 시간 여유 있을 때 진행

### 테스트 추가 권장

```bash
# 새로 생성되는 훅에 대한 테스트
__tests__/hooks/useIsMobile.test.ts
```

### 롤백 전략

- 각 Phase별로 별도 커밋 생성
- 문제 발생 시 해당 커밋만 revert

---

_이 계획서는 `/start-work` 명령으로 구현을 시작할 수 있습니다._
