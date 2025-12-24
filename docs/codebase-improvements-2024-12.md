# SAF 2026 코드베이스 개선점 분석 (2024년 12월)

본 문서는 SAF 2026 웹사이트 코드베이스의 종합적인 분석 결과와 개선 권장사항을 담고 있습니다.

---

## 1. 요약

전반적으로 프로젝트는 Next.js 14 App Router를 기반으로 잘 구조화되어 있으며, SEO와 접근성 구현이 우수합니다. 아래는 코드 품질, 성능, 유지보수성 관점에서 발견된 개선 기회들입니다.

### 발견된 주요 이슈 카테고리

| 카테고리 | 심각도 | 발견 건수 |
|---------|--------|----------|
| 코드 품질 (중복 클래스) | 중간 | 15+ 건 |
| TypeScript 타입 안전성 | 중간 | 3건 |
| 성능 최적화 | 높음 | 2건 |
| 접근성 | 낮음 | 2건 |
| 의존성 관리 | 낮음 | 2건 |
| 테스트 부재 | 중간 | 전체 |

---

## 2. 코드 품질 이슈

### 2.1 [높음] 중복된 CSS 클래스 사용

**문제**: 여러 컴포넌트에서 `font-bold`가 중복 사용되어 있습니다.

**영향받는 파일 및 위치**:

```
components/common/Footer.tsx:60   - "font-sans font-bold font-bold"
components/common/Footer.tsx:107  - "font-sans font-bold font-bold"
components/features/StatisticsCharts.tsx:47  - "font-sans font-bold text-lg font-bold"
components/features/StatisticsCharts.tsx:91  - "font-sans font-bold text-lg font-bold"
components/features/StatisticsCharts.tsx:123 - "font-sans font-bold text-lg font-bold"
components/features/StatisticsCharts.tsx:157 - "font-sans font-bold text-lg font-bold"
components/features/StatisticsCharts.tsx:188 - "font-sans font-bold text-lg font-bold"
components/features/StatisticsCharts.tsx:231 - "font-sans font-bold text-lg font-bold"
components/features/DynamicCounter.tsx:40    - "font-sans font-bold text-sm font-medium" (불일치)
components/features/MasonryGallery.tsx:52    - "text-lg font-bold text-charcoal font-sans font-bold"
app/page.tsx:119   - "font-sans font-bold text-xl font-bold"
app/page.tsx:128   - "font-sans font-bold text-xl font-bold"
app/page.tsx:137   - "font-sans font-bold text-xl font-bold"
app/page.tsx:146   - "font-sans font-bold text-xl font-bold"
app/page.tsx:174   - "font-sans font-bold text-2xl font-bold"
app/our-reality/page.tsx:253 - "font-sans font-bold text-xl font-bold"
app/our-reality/page.tsx:296 - "font-sans font-bold text-xl font-bold"
app/our-reality/page.tsx:335 - "font-sans font-bold text-xl font-bold"
app/exhibition/page.tsx:121  - "font-sans font-bold text-sm text-gray-500 font-semibold"
app/exhibition/page.tsx:125  - "font-sans font-bold text-sm text-gray-500 font-semibold"
app/exhibition/page.tsx:129  - "font-sans font-bold text-sm text-gray-500 font-semibold"
app/exhibition/page.tsx:138  - "font-sans font-bold text-lg font-bold"
app/exhibition/page.tsx:192  - "font-sans font-bold text-xl font-bold"
app/exhibition/page.tsx:211  - "font-sans font-bold text-xl font-bold"
app/exhibition/page.tsx:230  - "font-sans font-bold font-bold"
app/exhibition/page.tsx:252  - "font-sans font-bold text-xl font-bold"
app/exhibition/page.tsx:302  - "font-sans font-bold font-bold"
app/our-proof/page.tsx:125   - "font-sans font-bold text-2xl font-bold"
app/our-proof/page.tsx:138   - "font-sans font-bold font-bold"
app/our-proof/page.tsx:145   - "font-sans font-bold font-bold"
app/our-proof/page.tsx:152   - "font-sans font-bold font-bold"
app/our-proof/page.tsx:168   - "font-sans font-bold font-bold"
app/our-proof/page.tsx:179   - "font-sans font-bold font-bold"
app/our-proof/page.tsx:190   - "font-sans font-bold font-bold"
app/our-proof/page.tsx:201   - "font-sans font-bold font-bold"
app/our-proof/page.tsx:302   - "font-sans font-bold text-lg font-bold"
app/our-proof/page.tsx:315   - "font-sans font-bold text-lg font-bold"
app/artworks/[id]/page.tsx:79 - "text-3xl md:text-4xl font-bold font-sans font-bold"
```

**해결 방법**:
```tsx
// Before
<h3 className="font-sans font-bold text-xl font-bold text-charcoal">

// After
<h3 className="font-sans text-xl font-bold text-charcoal">
```

**권장 조치**: 프로젝트 전체에서 `font-bold font-bold` 패턴을 검색하여 정리

```bash
# 중복 검색 명령어
grep -r "font-bold.*font-bold" --include="*.tsx" .
```

---

### 2.2 [중간] 불필요한 주석 및 코드 정리

**파일**: `components/features/MasonryGallery.tsx`

**문제**: 개발 중 작성된 주석들이 프로덕션 코드에 남아 있음

```tsx
// 현재 (27-47 라인)
{/* Image Placeholder or Actual Image */}
{/* In a real scenario, we would use the actual image path.
    For now, we use a placeholder if the file doesn't exist to prevent 404s during dev
    BUT the requirement is to use the filename from the data.
    I'll use a reliable placeholder for development if the image fails,
    or just standard Next.js Image which might show broken icon if file missing.
    To look "premium", let's assume we might need a fallback or just render what we have.
*/}
{/* For the purpose of this task, I will try to use a placeholder service if local images are missing
    BUT the user wants to use their files. I'll stick to local path.
*/}
```

**해결 방법**: 불필요한 주석 제거

---

## 3. TypeScript 타입 안전성

### 3.1 [중간] `any` 타입 사용

**파일**: `components/features/KakaoMap.tsx:34`

```tsx
// 현재
const { kakao } = window as typeof window & { kakao?: any };
```

**해결 방법**: Kakao 타입 정의 추가

```tsx
// lib/global.d.ts 또는 types/kakao.d.ts
declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Link: {
        sendDefault: (options: KakaoShareOptions) => void;
      };
      maps: {
        services: {
          Geocoder: new () => KakaoGeocoder;
          Status: {
            OK: string;
          };
        };
      };
    };
  }
}

interface KakaoGeocoder {
  addressSearch: (
    address: string,
    callback: (result: Array<{ x: string; y: string }>, status: string) => void
  ) => void;
}

interface KakaoShareOptions {
  objectType: 'feed';
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: { webUrl: string; mobileWebUrl: string };
  };
  buttons?: Array<{
    title: string;
    link: { webUrl: string; mobileWebUrl: string };
  }>;
}

export {};
```

### 3.2 [낮음] ShareButtons 컴포넌트의 Kakao 타입

**파일**: `components/common/ShareButtons.tsx`

`window.Kakao` 접근 시 타입 안전성 확보 필요 (위의 글로벌 타입 정의로 해결)

---

## 4. 성능 최적화

### 4.1 [높음] BackgroundSlider 이미지 전환 개선

**파일**: `components/features/BackgroundSlider.tsx`

**현재 문제**:
1. 모든 슬라이드에 `priority` 속성이 있어 모든 이미지가 우선 로드됨
2. 이미지 전환 시 애니메이션이 없어 갑작스러운 변경
3. 다음 이미지 프리로딩 로직 부재

**현재 코드**:
```tsx
<Image
  src={`/images/hero/${currentPhoto.filename}`}
  alt={currentPhoto.alt}
  fill
  className="object-cover"
  priority  // 모든 이미지에 priority
/>
```

**개선 방안**:
```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_IMAGES = [
  { id: '1', filename: '1.jpg', alt: '2026 씨앗페 출품작' },
  // ... 나머지 이미지
];

export default function BackgroundSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 다음 인덱스 미리 계산
  const nextIndex = useMemo(
    () => (currentIndex + 1) % HERO_IMAGES.length,
    [currentIndex]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentPhoto = HERO_IMAGES[currentIndex];
  const nextPhoto = HERO_IMAGES[nextIndex];

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <Image
            src={`/images/hero/${currentPhoto.filename}`}
            alt={currentPhoto.alt}
            fill
            className="object-cover"
            priority={currentIndex === 0}
          />
        </motion.div>
      </AnimatePresence>

      {/* 다음 이미지 프리로드 */}
      <Image
        src={`/images/hero/${nextPhoto.filename}`}
        alt=""
        fill
        className="hidden"
        aria-hidden
      />

      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
```

### 4.2 [중간] DynamicCounter useEffect 최적화

**파일**: `components/features/DynamicCounter.tsx:25-29`

**현재 코드**:
```tsx
useEffect(() => {
  if (inView && !hasStarted) {
    setHasStarted(true);
  }
}, [inView, hasStarted]);
```

**문제**: `hasStarted`가 의존성에 포함되어 불필요한 effect 재실행

**개선 방안**:
```tsx
useEffect(() => {
  if (inView) {
    setHasStarted(true);
  }
}, [inView]);
```

`triggerOnce: true` 옵션이 이미 있으므로 `hasStarted` 체크가 중복됨

---

## 5. 접근성 (Accessibility)

### 5.1 [낮음] 차트 컴포넌트 접근성

**파일**: `components/features/StatisticsCharts.tsx`

**문제**: 차트에 대한 스크린 리더 접근성 미흡

**개선 방안**:
```tsx
// 각 차트 컴포넌트에 접근성 텍스트 추가
<div
  className="bg-white p-6 rounded-lg shadow-sm"
  role="figure"
  aria-label="제1금융권 접근 현황 차트: 예술인의 84.9%가 제1금융권에서 배제"
>
```

### 5.2 [낮음] 모바일 메뉴 포커스 관리

**파일**: `components/common/Header.tsx`

**문제**: 모바일 메뉴가 열렸을 때 포커스 트랩이 없음

**개선 방안**: `react-focus-trap` 또는 수동 포커스 관리 추가

---

## 6. 메타데이터 및 SEO

### 6.1 [중간] Deprecated viewport 메타데이터

**파일**: `app/layout.tsx:32`

**문제**: Next.js 14에서 `viewport` 메타데이터가 deprecated됨

```tsx
// 현재 (deprecated)
export const metadata: Metadata = {
  viewport: 'width=device-width, initial-scale=1',
  // ...
};
```

**해결 방법**:
```tsx
// app/layout.tsx
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2176FF',
};

export const metadata: Metadata = {
  // viewport 제거
  // ...
};
```

### 6.2 [낮음] OG 이미지 메타데이터 중복

**문제**: 각 페이지에서 동일한 OG 이미지 설정이 반복됨

**개선 방안**: 유틸리티 함수 생성

```tsx
// lib/metadata.ts
import { OG_IMAGE, SITE_URL } from './constants';

export function generatePageMetadata(options: {
  title: string;
  description: string;
  path: string;
}) {
  const url = `${SITE_URL}${options.path}`;

  return {
    title: options.title,
    description: options.description,
    alternates: { canonical: url },
    openGraph: {
      title: options.title,
      description: options.description,
      url,
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: options.title,
      description: options.description,
      images: [OG_IMAGE.url],
    },
  };
}
```

---

## 7. 의존성 관리

### 7.1 [낮음] 패키지 버전 업데이트

**파일**: `package.json`

현재 버전과 최신 안정 버전 비교:

| 패키지 | 현재 버전 | 권장 버전 |
|--------|----------|----------|
| next | ^14.0.0 | ^14.2.x |
| react | ^18.2.0 | ^18.3.x |
| framer-motion | ^10.16.0 | ^11.x |
| typescript | ^5.3.0 | ^5.7.x |

**권장 조치**:
```bash
npm update
npm outdated  # 업데이트 가능 패키지 확인
```

### 7.2 [정보] ESLint 규칙 완화

**파일**: `.eslintrc.json`

현재 일부 규칙이 `warn`으로 설정되어 있어 빌드는 통과하지만 코드 품질 이슈가 누적될 수 있음:

```json
{
  "rules": {
    "react/no-unescaped-entities": "warn",
    "react/display-name": "warn",
    "@next/next/no-html-link-for-pages": "warn"
  }
}
```

---

## 8. 테스트 부재

### 8.1 [중간] 테스트 설정 없음

**문제**: 현재 프로젝트에 테스트 설정이 없음

**권장 조치**:
1. Jest + React Testing Library 설정
2. 핵심 컴포넌트에 대한 단위 테스트 작성
3. E2E 테스트 (Playwright 또는 Cypress) 고려

**우선 테스트 대상**:
- `DynamicCounter`: 카운터 애니메이션 트리거
- `ShareButtons`: 각 공유 버튼 동작
- `KakaoMap`: 에러 상태 핸들링
- `StatisticsCharts`: 데이터 렌더링

---

## 9. 코드 구조 개선 제안

### 9.1 [낮음] 상수 및 데이터 분리

현재 일부 데이터가 컴포넌트 내에 하드코딩되어 있음:

- `BackgroundSlider.tsx`: `HERO_IMAGES` 배열
- `our-reality/page.tsx`: `testimonialsData` 배열
- `StatisticsCharts.tsx`: 각 차트의 데이터

**개선 방안**: `content/` 디렉토리에 데이터 파일 분리

```
content/
├── hero-images.ts
├── testimonials.ts
├── statistics-chart-data.ts
└── ...
```

### 9.2 [낮음] 컴포넌트 Props 타입 일관성

일부 컴포넌트는 인터페이스가 파일 내에 정의되어 있고, 일부는 `lib/types.ts`에 정의되어 있음

**권장**: 공유되는 타입은 `lib/types.ts`에, 컴포넌트 전용 타입은 해당 파일에 유지하되 일관된 네이밍 컨벤션 적용

---

## 10. 우선순위 요약

| 우선순위 | 항목 | 예상 작업 시간 | 영향도 |
|---------|------|---------------|--------|
| 🔴 높음 | CSS 클래스 중복 제거 | 1-2시간 | 코드 품질, 파일 크기 |
| 🔴 높음 | BackgroundSlider 성능 개선 | 2-3시간 | LCP, 사용자 경험 |
| 🟡 중간 | Kakao 타입 정의 | 30분 | 타입 안전성 |
| 🟡 중간 | viewport 메타데이터 수정 | 10분 | Next.js 경고 제거 |
| 🟡 중간 | DynamicCounter 최적화 | 10분 | 코드 품질 |
| 🟡 중간 | 불필요한 주석 제거 | 10분 | 코드 가독성 |
| 🟢 낮음 | 의존성 업데이트 | 30분 | 보안, 성능 |
| 🟢 낮음 | 테스트 설정 | 2-4시간 | 장기적 유지보수 |
| 🟢 낮음 | 차트 접근성 개선 | 1시간 | 접근성 |
| 🟢 낮음 | 메타데이터 유틸리티 | 30분 | DRY 원칙 |

---

## 11. 즉시 적용 가능한 수정 스크립트

### CSS 중복 클래스 정리 (검색 명령어)

```bash
# 프로젝트 루트에서 실행
grep -rn "font-bold.*font-bold" --include="*.tsx" app/ components/

# 결과를 파일로 저장
grep -rn "font-bold.*font-bold" --include="*.tsx" app/ components/ > duplicates.txt
```

### 패키지 업데이트

```bash
# 안전하게 패치 버전만 업데이트
npm update

# 모든 업데이트 가능 패키지 확인
npm outdated

# 특정 패키지 메이저 업데이트 (신중하게)
npm install next@latest react@latest react-dom@latest
```

---

## 12. 결론

SAF 2026 웹사이트는 전반적으로 잘 구성되어 있으며, Next.js 베스트 프랙티스를 대부분 따르고 있습니다. 위에서 제안한 개선사항들은 **권장사항**이며, 특히 다음 항목을 우선적으로 고려하는 것을 추천합니다:

1. **CSS 클래스 중복 제거**: 즉시 수정 가능하며 코드 품질 향상
2. **BackgroundSlider 성능 개선**: 사용자 경험에 직접적 영향
3. **viewport 메타데이터 수정**: Next.js 14+ 호환성

이러한 개선을 통해 코드의 유지보수성과 성능을 한층 더 향상시킬 수 있습니다.

---

*문서 작성일: 2024년 12월 24일*
*분석 도구: Claude Code*
