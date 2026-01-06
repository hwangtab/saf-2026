# 웹사이트 최적화 및 코드 리뷰 (Optimization Review)

> **리뷰 날짜**: 2025-12-30
> **대상**: SAF 2026 웹사이트 (Next.js 14 App Router)

본 문서는 웹사이트의 **성능(Lighthouse Score)**, **코드 품질(Maintainability)**, **사용자 경험(UX)** 개선을 위한 심층 코드 리뷰 결과입니다.

---

## 🚀 1. 성능 최적화 (Performance)

### 1-1. 폰트 로딩 시스템 개선 (Critical)

현재 `globals.css`에서 CDN(`cdn.jsdelivr.net`)을 통해 웹폰트를 로드하고 있습니다. 이는 FOUT(Flash of Unstyled Text)를 유발하고 외부 서버 의존성을 높입니다.

- **문제점**: 외부 CDN 요청으로 인한 렌더링 지연.
- **해결 방안**: Next.js의 `next/font` 기능을 사용하여 **폰트 최적화(Self-hosting)**를 적용해야 합니다.
  - `app/fonts.ts` 파일을 생성하여 `localFont`로 폰트를 설정하고, `layout.tsx`에서 변수로 주입합니다.

### 1-2. 무거운 차트 라이브러리 최적화 (High)

`StatisticsCharts.tsx`에서 `recharts` 라이브러리를 사용 중입니다. 이 라이브러리는 번들 크기가 크므로 초기 로딩 속도에 영향을 줍니다.

- **문제점**: 메인 페이지 로드 시 차트 라이브러리가 즉시 다운로드됨.
- **해결 방안**: **Dynamic Import**를 사용하여 차트가 필요한 시점(예: 뷰포트에 진입할 때)에 로드되도록 변경합니다.
  ```tsx
  const StatisticsCharts = dynamic(() => import('@/components/features/StatisticsCharts'), {
    loading: () => <p>Loading...</p>,
    ssr: false,
  });
  ```

### 1-3. 모바일 레이아웃 시프트 (CLS) 방지 (Medium)

`MasonryGallery.tsx`에서 `useEffect`와 `window.innerWidth`를 사용하여 컬럼 수를 결정합니다. 이로 인해 초기 로딩 시 `mounted` 상태가 될 때까지 아무것도 보이지 않다가 갑자기 나타나거나(Flash), 레이아웃이 변경되는 현상이 발생합니다.

- **해결 방안**: CSS Grid 또는 Flexbox 기반의 **순수 CSS 기반 Masonry** (또는 `column-count` CSS 속성)를 사용하여 JS 로드 전에도 기본 레이아웃이 잡히도록 개선해야 합니다.

---

## 🪄 2. 애니메이션 및 인터랙션 (Animations)

### 2-1. 불필요한 중복 애니메이션 제거

`MasonryGallery`의 모든 개별 카드(`ArtworkCard`)에 `motion.div`가 적용되어 있습니다. 작품 수가 100개가 넘어가면 모바일 기기에서 스크롤 성능 저하(Jank)를 유발할 수 있습니다.

- **개선안**:
  - 모바일에서는 진입 애니메이션을 비활성화하거나,
  - 전체 리스트 컨테이너에만 애니메이션을 적용.
  - `will-change` 속성을 남발하지 않도록 주의.

### 2-2. Hero 섹션 이미지 깜빡임

`PageHero.tsx`에서 `useEffect`로 랜덤 이미지를 선택하고 있습니다. 이로 인해 Hydration 전후로 이미지가 없다가 깜빡이며 나타나는 현상이 발생합니다.

- **개선안**:
  - 서버 컴포넌트(`page.tsx`)에서 랜덤 이미지를 결정하여 Prop으로 전달하거나,
  - CSS 배경색(Placeholder)을 미리 지정하여 시각적 불편함 감소.

---

## 🛠 3. 코드 구조 및 유지보수 (Enablement)

### 3-1. 공통 컴포넌트 파편화

`ShareButtons.tsx`와 `Header.tsx` 등에서 아이콘 SVG 코드가 인라인으로 반복되고 있습니다.

- **개선안**: `components/icons` 디렉토리를 만들어 `Icon.tsx` 형태로 아이콘을 모듈화하여 재사용성을 높여야 합니다.

### 3-2. 안전한 외부 링크 처리

`target="_blank"`를 사용하는 링크들에 `rel="noopener noreferrer"`가 잘 적용되어 있으나, 이를 `ExternalLink` 컴포넌트로 추상화하면 실수를 방지하고 일관성을 유지할 수 있습니다.

---

## ✅ 개선 우선순위 체크리스트

| 우선순위 | 항목                  | 설명                       | 예상 효과                      |
| :------- | :-------------------- | :------------------------- | :----------------------------- |
| **1**    | **폰트 최적화**       | `next/font` 도입           | LCP 개선, 레이아웃 시프트 방지 |
| **2**    | **차트 Lazy Loading** | Recharts 동적 임포트       | 초기 번들 사이즈(TBT) 감소     |
| **3**    | **Masonry CLS 수정**  | CSS 기반 레이아웃으로 변경 | 시각적 안정성 확보             |
| **4**    | **아이콘 모듈화**     | SVG 코드 분리              | 코드 가독성 및 유지보수성 향상 |
