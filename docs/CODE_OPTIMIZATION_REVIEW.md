# SAF 2026 코드 최적화 리뷰

> **리뷰 일자**: 2026-01-08
> **전반적 평가**: B+ (양호, 개선 여지 있음)
> **대상 프로젝트**: SAF (Seed Art Festival) 2026 웹사이트

---

## 목차

1. [개요](#개요)
2. [성능 최적화](#1-성능-최적화)
3. [코드 품질](#2-코드-품질)
4. [SEO & 접근성](#3-seo--접근성)
5. [스타일링](#4-스타일링)
6. [잠재적 문제점](#5-잠재적-문제점)
7. [개선 권장사항](#6-개선-권장사항)
8. [참조 파일 목록](#부록-참조-파일-목록)

---

## 개요

SAF 2026 웹사이트는 Next.js 14 기반의 정적 사이트로, 한국 예술가들의 금융 차별 문제를 다루는 사회 캠페인의 디지털 허브 역할을 합니다. 전반적으로 모던 React 패턴, TypeScript, Tailwind CSS를 잘 활용하고 있으며, 성능과 접근성에 대한 고려가 적절히 이루어져 있습니다.

### 평가 요약

| 영역          | 평가 | 점수 |
| ------------- | ---- | ---- |
| 성능 최적화   | 양호 | B+   |
| 코드 품질     | 양호 | B    |
| SEO & 접근성  | 우수 | A-   |
| 스타일링      | 우수 | A    |
| 잠재적 문제점 | 양호 | B    |

---

## 1. 성능 최적화

### 1.1 이미지 최적화

**상태**: ✅ 우수

프로젝트 전반에서 `next-image-export-optimizer`를 사용하여 이미지를 최적화하고 있습니다.

#### 잘 된 점

- **ExportedImage 컴포넌트 사용**
  - 파일: `components/ui/ArtworkCard.tsx` (lines 34-40, 64-70)
  - 모든 이미지에서 네이티브 `<img>` 대신 최적화된 컴포넌트 사용

- **WebP 변환 활성화**
  - 파일: `next.config.js` (line 11)

  ```javascript
  nextImageExportOptimizer_storePicturesInWEBP: 'true';
  ```

- **반응형 sizes 속성 적용**

  ```tsx
  // components/ui/ArtworkCard.tsx
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  ```

- **중요 이미지 priority 로딩**
  - Hero 이미지, 로고 등 LCP에 영향을 주는 이미지에 `priority` 속성 적용

#### 개선 필요

| 문제점                              | 파일                                                      | 권장 수정                        |
| ----------------------------------- | --------------------------------------------------------- | -------------------------------- |
| Hero 이미지 blur placeholder 미적용 | `components/features/BackgroundSlider.tsx` (lines 96-102) | `placeholder="blur"` 추가        |
| preload 방식 개선 여지              | `components/features/BackgroundSlider.tsx` (lines 53-60)  | `<link rel="preload">` 사용 검토 |

**권장 수정 코드**:

```tsx
// BackgroundSlider.tsx - blur placeholder 추가
<ExportedImage
  src={image.src}
  alt={image.alt}
  fill
  className="object-cover"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  priority={index === 0}
/>
```

---

### 1.2 코드 스플리팅

**상태**: ✅ 우수

동적 import를 통한 코드 분할이 잘 구현되어 있습니다.

#### 잘 된 점

- **차트 컴포넌트 동적 로딩**
  - 파일: `app/our-reality/page.tsx` (lines 109-141)

  ```tsx
  const FirstBankAccessChart = dynamic(
    () => import('@/components/features/StatisticsCharts').then((mod) => mod.FirstBankAccessChart),
    {
      ssr: false,
      loading: () => <div className="h-96 bg-gray-100 rounded animate-pulse" />,
    }
  );
  ```

- **갤러리 컴포넌트 동적 로딩**
  - 파일: `app/artworks/page.tsx` (lines 10-21)

- **ShareButtons 동적 로딩**
  - 파일: `app/artworks/[id]/page.tsx` (line 15)

#### 개선 필요

| 문제점               | 파일                               | 영향도 | 권장 수정          |
| -------------------- | ---------------------------------- | ------ | ------------------ |
| KakaoMap 직접 import | `app/exhibition/page.tsx` (line 7) | High   | 동적 import로 변경 |

**권장 수정 코드**:

```tsx
// app/exhibition/page.tsx
const KakaoMap = dynamic(() => import('@/components/features/KakaoMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse bg-gray-100 rounded-lg" />,
});
```

---

### 1.3 Lazy Loading

**상태**: ✅ 양호

#### 잘 된 점

- **YouTube 비디오 Lazy Loading**
  - 파일: `components/features/VideoEmbed.tsx`
  - `LiteYouTubeEmbed` 사용으로 초기 로드 시 썸네일만 표시

- **카운터 애니메이션 Intersection Observer**
  - 파일: `components/features/DynamicCounter.tsx` (lines 17-20)

  ```tsx
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  ```

- **framer-motion LazyMotion**
  - 파일: `components/providers/AnimationProvider.tsx`
  - `domAnimation` features만 로드하여 번들 크기 최소화

#### 개선 여지

- 갤러리 이미지에 Intersection Observer 추가하여 더 세밀한 로딩 제어 가능

---

### 1.4 번들 크기

**상태**: ⚠️ 개선 필요

#### 문제점

| 문제                   | 파일                          | 크기    | 영향도   |
| ---------------------- | ----------------------------- | ------- | -------- |
| **과대한 콘텐츠 파일** | `content/saf2026-artworks.ts` | 535.8KB | Critical |

이 파일은 500KB를 초과하여 초기 페이지 로드에 부정적 영향을 미칩니다.

**권장 해결 방안**:

1. **파일 분할**

   ```
   content/
   ├── artworks/
   │   ├── artists-1-50.ts
   │   ├── artists-51-100.ts
   │   └── artists-101-145.ts
   └── artworks-index.ts  // 통합 export
   ```

2. **JSON + 동적 로딩**

   ```tsx
   // lib/artworks.ts
   export async function getArtworks() {
     const data = await import('@/content/artworks.json');
     return data.default;
   }
   ```

3. **페이지네이션/무한 스크롤 적용**
   - 초기 로드 시 일부만 표시
   - 스크롤 시 추가 로드

---

## 2. 코드 품질

### 2.1 컴포넌트 구조

**상태**: ✅ 양호

#### 잘 된 점

- **명확한 컴포넌트 계층**

  ```
  components/
  ├── common/    # Header, Footer 등 공통 컴포넌트
  ├── features/  # 기능별 컴포넌트 (Charts, Map 등)
  └── ui/        # 재사용 UI 컴포넌트 (Button, Card 등)
  ```

- **CVA를 활용한 Button variants**
  - 파일: `components/ui/Button.tsx`

  ```tsx
  const buttonVariants = cva('base-classes...', {
    variants: {
      variant: { primary: '...', secondary: '...' },
      size: { sm: '...', md: '...', lg: '...' },
    },
  });
  ```

- **ArtworkCard variant 지원**
  - slider/gallery 모드 지원

#### 개선 필요

| 문제점               | 위치                                                           | 권장 수정                 |
| -------------------- | -------------------------------------------------------------- | ------------------------- |
| CTA 버튼 패턴 중복   | `our-reality/page.tsx` (446-459), `archive/page.tsx` (216-230) | CTAButtonGroup 컴포넌트화 |
| Navigation 정의 중복 | Header 내 하드코딩                                             | constants 파일로 분리     |

**권장 CTAButtonGroup 컴포넌트**:

```tsx
// components/common/CTAButtonGroup.tsx
interface CTAButtonGroupProps {
  donateText?: string;
  purchaseText?: string;
  className?: string;
}

export function CTAButtonGroup({
  donateText = '후원하기',
  purchaseText = '작품 구매하기',
  className,
}: CTAButtonGroupProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-4 justify-center', className)}>
      <Button href="https://www.socialfunch.org/SAF" variant="primary" size="lg">
        {donateText}
      </Button>
      <Button href="https://auto-graph.co.kr" variant="secondary" size="lg">
        {purchaseText}
      </Button>
    </div>
  );
}
```

---

### 2.2 TypeScript 타입 안전성

**상태**: ⚠️ 양호하나 개선 필요

#### 잘 된 점

- **타입 정의 파일 존재**
  - 파일: `types/index.ts`
  - Artist, Artwork, News 등 주요 인터페이스 정의

- **제네릭 유틸리티 타입 활용**

#### 개선 필요

| 문제점                   | 파일                                         | 위험도 |
| ------------------------ | -------------------------------------------- | ------ |
| Null 체크 미흡           | `app/artworks/[id]/page.tsx` (line 68)       | Medium |
| Kakao 타입 미사용        | `components/features/KakaoMap.tsx` (line 39) | Low    |
| Optional chaining 불일관 | 여러 파일                                    | Low    |

**문제 코드 예시**:

```tsx
// app/artworks/[id]/page.tsx:68
// 빈 문자열일 경우 undefined 반환 가능
artwork.material.split(' ')[0];
```

**권장 수정**:

```tsx
// 안전한 접근
artwork.material?.split(' ')?.[0] ?? '기타';
```

---

### 2.3 에러 처리

**상태**: ✅ 양호

#### 잘 된 점

- **전역 에러 바운더리**
  - 파일: `app/error.tsx`

  ```tsx
  export default function GlobalError({ error, reset }) {
    useEffect(() => {
      console.error('Application error:', error);
    }, [error]);
    // ...
  }
  ```

- **404 페이지**
  - 파일: `app/not-found.tsx`
  - 적절한 메타데이터와 UX 제공

- **페이지별 에러 핸들러**
  - `app/news/error.tsx`
  - `app/artworks/error.tsx`

#### 개선 여지

| 문제점                           | 파일                                             | 권장 수정       |
| -------------------------------- | ------------------------------------------------ | --------------- |
| KakaoMap API 실패 시 재시도 없음 | `components/features/KakaoMap.tsx` (lines 80-88) | Retry 버튼 추가 |
| Button 에러 미전파               | `components/ui/Button.tsx` (lines 73-76)         | 에러 re-throw   |

**Button 에러 처리 개선**:

```tsx
// components/ui/Button.tsx
} catch (error) {
  console.error('Button click error:', error);
  throw error; // 상위 컴포넌트로 전파
}
```

---

### 2.4 코드 중복

#### 중복 발견 영역

| 중복 패턴          | 발생 위치            | 권장 해결              |
| ------------------ | -------------------- | ---------------------- |
| CTA 섹션           | 5개 이상 페이지      | CTASection 컴포넌트화  |
| OG 메타데이터 구조 | 모든 페이지          | 메타데이터 팩토리 함수 |
| Tooltip 스타일     | StatisticsCharts.tsx | 공유 config로 추출     |

**메타데이터 팩토리 함수 예시**:

```tsx
// lib/metadata.ts
export function createPageMetadata({
  title,
  description,
  path,
  image = '/images/og-default.jpg',
}: PageMetadataOptions): Metadata {
  const url = `https://saf2026.org${path}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
```

---

## 3. SEO & 접근성

### 3.1 메타데이터 구현

**상태**: ✅ 우수

#### 잘 된 점

- **포괄적인 루트 메타데이터**
  - 파일: `app/layout.tsx` (lines 18-80)
  - title, description, keywords, openGraph, twitter 모두 설정

- **JSON-LD Schema 구현**

| Schema 타입    | 적용 위치                               |
| -------------- | --------------------------------------- |
| Organization   | `app/layout.tsx` (lines 83-108)         |
| Website        | `app/layout.tsx` (lines 110-122)        |
| Event          | `app/exhibition/page.tsx` (lines 48-83) |
| VisualArtwork  | 작품 상세 페이지 (lines 125-186)        |
| FAQ            | 홈페이지 (lines 224-268)                |
| BreadcrumbList | 작품 상세 페이지                        |

- **XSS 방지**
  ```tsx
  // escapeJsonLdForScript 함수 사용
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: escapeJsonLdForScript(jsonLd),
    }}
  />
  ```

#### 개선 필요

| 문제점                            | 파일                             | 권장 수정                  |
| --------------------------------- | -------------------------------- | -------------------------- |
| archive 페이지 JSON-LD XSS 미적용 | `app/archive/page.tsx` (line 68) | escapeJsonLdForScript 적용 |

---

### 3.2 시맨틱 HTML

**상태**: ✅ 양호

#### 잘 된 점

- **적절한 heading 계층**
  - h1 → h2 → h3 순서 준수

- **시맨틱 요소 사용**

  ```html
  <header>
    - 헤더 영역
    <nav>
      - 네비게이션
      <main>
        - 메인 콘텐츠
        <article>
          - 독립적 콘텐츠
          <section>
            - 구분된 섹션
            <footer>- 푸터 영역</footer>
          </section>
        </article>
      </main>
    </nav>
  </header>
  ```

- **스킵 링크 구현**
  - 파일: `app/layout.tsx` (lines 147-149)

#### 개선 여지

- 작품 이미지에 `<figure>` + `<figcaption>` 사용 검토

---

### 3.3 ARIA 속성

**상태**: ✅ 양호

#### 잘 된 점

- **차트 접근성**
  - 파일: `components/features/StatisticsCharts.tsx` (line 52)

  ```tsx
  aria-label="제1금융권 접근 현황: 예술인의 84.9%가 배제됨, 15.1%만 접근 가능"
  ```

- **동적 콘텐츠 알림**
  - 파일: `components/features/DynamicCounter.tsx` (line 35)

  ```tsx
  aria-live="polite"
  ```

- **모바일 메뉴 상태**

  ```tsx
  aria-expanded={isOpen}
  ```

- **필터 버튼 그룹**

  ```tsx
  role="radiogroup"
  aria-checked={isSelected}
  ```

- **소셜 아이콘 레이블**
  - 파일: `components/common/Footer.tsx` (lines 104-128)
  - 모든 소셜 링크에 `aria-label` 적용

---

## 4. 스타일링

### 4.1 Tailwind CSS 사용 패턴

**상태**: ✅ 우수

#### 잘 된 점

- **cn() 유틸리티 함수**
  - 파일: `lib/utils.ts`

  ```tsx
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```

- **CVA (Class Variance Authority) 활용**
  - 컴포넌트 variants 체계적 관리

- **시맨틱 타이포그래피 클래스**
  - `text-hero`, `text-section-title`, `text-card-title` 등

- **커스텀 유틸리티 클래스**
  - `@layer utilities`와 `@layer components` 활용

#### 개선 여지

| 문제점                | 파일                                                             | 권장 수정              |
| --------------------- | ---------------------------------------------------------------- | ---------------------- |
| 과도하게 긴 className | `components/features/ArtworkGalleryWithSort.tsx` (lines 120-125) | 명명된 유틸리티로 추출 |

---

### 4.2 반응형 디자인

**상태**: ✅ 우수

#### 잘 된 점

- **모바일 퍼스트 접근**
  - 기본 스타일이 모바일, breakpoint로 확장

- **일관된 breakpoint 사용**
  - sm (640px), md (768px), lg (1024px)

- **container-max 유틸리티**
  - 일관된 최대 너비 적용

- **Safe Area Insets 지원**
  - 파일: `app/layout.tsx` (line 148)

  ```tsx
  className = 'pt-[env(safe-area-inset-top,0px)]';
  ```

- **text-balance 사용**
  - 제목 텍스트 줄바꿈 최적화

---

### 4.3 CSS 최적화

**상태**: ✅ 양호

#### 잘 된 점

- **폰트 프리로드**
  - 파일: `app/layout.tsx` (lines 130-143)

  ```tsx
  <link rel="preload" href="..." as="font" crossOrigin="anonymous" />
  ```

- **font-display: swap**
  - 모든 커스텀 폰트에 적용

- **prefers-reduced-motion 지원**
  - 파일: `styles/globals.css` (lines 175-183)
  ```css
  @media (prefers-reduced-motion: reduce) {
    *,
    ::before,
    ::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

#### 개선 여지

| 문제점               | 현재 상태                | 권장 수정        |
| -------------------- | ------------------------ | ---------------- |
| 외부 폰트 CDN        | cdn.jsdelivr.net 사용    | 셀프 호스팅 검토 |
| 미사용 색상 variants | tailwind config에 정의됨 | PurgeCSS로 확인  |

---

## 5. 잠재적 문제점

### 5.1 메모리 누수 가능성

**상태**: ✅ 일반적으로 안전

#### 잘 된 점

- **useEffect cleanup 구현**
  - 파일: `components/features/BackgroundSlider.tsx` (lines 41-44)

  ```tsx
  useEffect(() => {
    const interval = setInterval(() => { ... }, 5000);
    const timer = requestAnimationFrame(() => { ... });

    return () => {
      cancelAnimationFrame(timer);
      clearInterval(interval);
    };
  }, []);
  ```

- **isMountedRef 패턴**
  - 파일: `components/ui/Button.tsx` (lines 60-66)

  ```tsx
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  ```

- **KakaoMap cleanup**
  - isMounted 플래그로 비동기 상태 업데이트 방지

#### 주의 필요

| 컴포넌트               | 파일                                               | 주의사항                               |
| ---------------------- | -------------------------------------------------- | -------------------------------------- |
| ShareButtons Kakao SDK | `components/common/ShareButtons.tsx` (lines 20-43) | 이벤트 리스너 cleanup 명시적 확인 필요 |

---

### 5.2 불필요한 리렌더링

**상태**: ✅ 양호한 예방 조치

#### 적용된 최적화

| 기법          | 적용 컴포넌트                                                  |
| ------------- | -------------------------------------------------------------- |
| `memo()`      | ArtworkCard, MasonryGallery, ArtworkGalleryWithSort, 모든 차트 |
| `useCallback` | Header 이벤트 핸들러 (lines 52-107)                            |
| `useMemo`     | useArtworkFilter 내 필터링 로직                                |
| Debounce      | 검색 쿼리 (300ms)                                              |

#### 개선 여지

| 문제점                                  | 파일                                                      | 권장 수정                 |
| --------------------------------------- | --------------------------------------------------------- | ------------------------- |
| BackgroundSlider 빈번한 상태 업데이트   | `components/features/BackgroundSlider.tsx`                | preload index 계산 최적화 |
| RelatedArtworksSlider 내부 데이터 fetch | `components/features/RelatedArtworksSlider.tsx` (line 86) | props로 전달              |

**RelatedArtworksSlider 개선**:

```tsx
// 현재: 컴포넌트 내부에서 getAllArtworks() 호출
const allArtworks = useMemo(() => getAllArtworks(), []);

// 권장: props로 전달받기
interface Props {
  currentArtworkId: string;
  allArtworks: Artwork[];
}
```

---

### 5.3 하드코딩된 값

#### 발견된 하드코딩

| 유형            | 파일                   | 라인   | 현재 값       |
| --------------- | ---------------------- | ------ | ------------- |
| 슬라이더 인터벌 | `BackgroundSlider.tsx` | 39     | `5000` (5초)  |
| 차트 데이터     | `StatisticsCharts.tsx` | 전체   | 인라인 데이터 |
| Testimonials    | `our-reality/page.tsx` | 18-107 | 인라인 배열   |

#### 잘 처리된 부분

- **Z-index 값**: `Z_INDEX` 상수 객체로 중앙화

#### 권장 수정

```typescript
// lib/constants.ts
export const ANIMATION = {
  SLIDER_INTERVAL: 5000,
  COUNTER_DURATION: 2000,
  FADE_DURATION: 300,
} as const;

// content/testimonials.ts
export const testimonials = [
  {
    id: '1',
    quote: '대출 거절 사유가...',
    author: '참여 예술가 A',
    role: '설치미술가',
  },
  // ...
];
```

---

## 6. 개선 권장사항

### 우선순위별 정리

#### 🔴 Critical (즉시 조치 필요)

| #   | 항목                                 | 영향           | 예상 작업량 |
| --- | ------------------------------------ | -------------- | ----------- |
| 1   | 콘텐츠 파일 분할 (535KB → 여러 파일) | 초기 로드 성능 | 중          |

**상세 계획**:

```
content/
├── artworks/
│   ├── batch-001.ts  // 1-50
│   ├── batch-002.ts  // 51-100
│   └── batch-003.ts  // 101-145
├── artworks-index.ts // 통합 export
└── artworks-loader.ts // 동적 로딩 유틸
```

---

#### 🟠 High (권장)

| #   | 항목                      | 영향        | 예상 작업량 |
| --- | ------------------------- | ----------- | ----------- |
| 2   | KakaoMap 동적 import      | 번들 크기   | 소          |
| 3   | CTAButtonGroup 컴포넌트화 | 유지보수성  | 소          |
| 4   | 폰트 셀프 호스팅          | 성능/안정성 | 소          |

---

#### 🟡 Medium (개선)

| #   | 항목                         | 영향       | 예상 작업량 |
| --- | ---------------------------- | ---------- | ----------- |
| 5   | Testimonials 데이터 분리     | 유지보수성 | 소          |
| 6   | Hero 이미지 blur placeholder | LCP        | 소          |
| 7   | 타입 안전성 강화             | 안정성     | 중          |
| 8   | 차트 데이터 외부화           | 유지보수성 | 중          |
| 9   | 메타데이터 팩토리 함수       | 코드 중복  | 소          |

---

#### 🟢 Low (선택적)

| #   | 항목                       | 영향     | 예상 작업량 |
| --- | -------------------------- | -------- | ----------- |
| 10  | 긴 className 추출          | 가독성   | 소          |
| 11  | 애니메이션 duration 상수화 | 일관성   | 소          |
| 12  | 갤러리 가상화 (미래 대비)  | 확장성   | 대          |
| 13  | 분석 이벤트 추가           | 인사이트 | 중          |

---

## 부록: 참조 파일 목록

### 주요 분석 파일

```
app/
├── layout.tsx                    # 루트 레이아웃, 메타데이터
├── page.tsx                      # 홈페이지
├── error.tsx                     # 전역 에러 핸들러
├── not-found.tsx                 # 404 페이지
├── our-reality/page.tsx          # 통계 페이지
├── archive/page.tsx              # 아카이브 페이지
├── exhibition/page.tsx           # 전시 안내 페이지
└── artworks/
    ├── page.tsx                  # 작품 목록
    └── [id]/page.tsx             # 작품 상세

components/
├── common/
│   ├── Header/                   # 헤더 컴포넌트
│   ├── Footer.tsx                # 푸터
│   └── ShareButtons.tsx          # SNS 공유
├── features/
│   ├── BackgroundSlider.tsx      # 히어로 슬라이더
│   ├── DynamicCounter.tsx        # 카운터 애니메이션
│   ├── KakaoMap.tsx              # 카카오맵
│   ├── StatisticsCharts.tsx      # 차트 컴포넌트들
│   ├── VideoEmbed.tsx            # YouTube 임베드
│   └── ArtworkGalleryWithSort.tsx # 갤러리
├── providers/
│   └── AnimationProvider.tsx     # framer-motion provider
└── ui/
    ├── Button.tsx                # 버튼 컴포넌트
    └── ArtworkCard.tsx           # 작품 카드

content/
└── saf2026-artworks.ts           # 작품 데이터 (535KB)

lib/
├── utils.ts                      # 유틸리티 함수
└── hooks/
    └── useArtworkFilter.ts       # 필터링 훅

styles/
└── globals.css                   # 전역 스타일

types/
├── index.ts                      # 타입 정의
└── kakao.d.ts                    # Kakao API 타입

config files
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 결론

SAF 2026 웹사이트는 전반적으로 잘 구조화되어 있으며, 성능, 접근성, SEO에 대한 적절한 고려가 이루어져 있습니다.

**주요 개선 포인트**:

1. 535KB 콘텐츠 파일 분할 (Critical)
2. KakaoMap 동적 import (High)
3. 반복 패턴 컴포넌트화 (High)

이러한 개선사항을 적용하면 PageSpeed 점수 향상과 더 나은 유지보수성을 확보할 수 있습니다.

---

_이 문서는 2026년 1월 8일에 생성되었습니다._
