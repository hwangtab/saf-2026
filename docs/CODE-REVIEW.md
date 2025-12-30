# SAF 2026 코드베이스 종합 코드 리뷰

> **리뷰 날짜**: 2025-12-30
> **대상**: SAF 2026 웹사이트 (Next.js 14 App Router)

본 문서는 코드베이스의 **보안**, **코드 품질**, **접근성**, **개발 환경**에 대한 종합 리뷰입니다.

**관련 문서**:

- `optimization-code-review.md` - 성능/UX 최적화
- `SEO-REVIEW.md` - SEO 전문 리뷰
- `mobile-compatibility-review.md` - 모바일 호환성

---

## 목차

1. [보안 (Security)](#1-보안-security)
2. [코드 품질 (Code Quality)](#2-코드-품질-code-quality)
3. [접근성 (Accessibility)](#3-접근성-accessibility)
4. [에러 핸들링 (Error Handling)](#4-에러-핸들링-error-handling)
5. [개발 환경 (DevOps)](#5-개발-환경-devops)
6. [의존성 (Dependencies)](#6-의존성-dependencies)
7. [우선순위 체크리스트](#7-우선순위-체크리스트)

---

## 1. 보안 (Security)

### 1.1 외부 스크립트 SRI 누락 (HIGH)

**파일**: `app/layout.tsx:159-163`

```tsx
<script src="https://developers.kakao.com/sdk/js/kakao.js" async defer></script>
```

**문제**: Subresource Integrity (SRI) 해시가 없어 CDN이 침해될 경우 악성 코드가 실행될 수 있습니다.

**해결 방안**:

```tsx
<script
  src="https://developers.kakao.com/sdk/js/kakao.js"
  integrity="sha384-[해시값]"
  crossOrigin="anonymous"
  async
  defer
></script>
```

**참고**: Kakao SDK는 공식 SRI 해시를 제공하지 않을 수 있으므로, 자체 호스팅 또는 정기적인 무결성 검증이 권장됩니다.

---

### 1.2 dangerouslySetInnerHTML 사용 패턴 (MEDIUM)

**파일**: `app/layout.tsx:101-156`, 기타 페이지들

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      /* ... */
    }),
  }}
/>
```

**현재 상태**: ✅ 안전
**이유**: `JSON.stringify()`를 통해 데이터가 직렬화되므로 XSS 위험이 없습니다.

**주의 사항**:

- 동적 사용자 입력이 JSON-LD에 포함될 경우 반드시 이스케이프 처리 필요
- 현재는 모든 데이터가 하드코딩되어 있어 안전함

---

### 1.3 외부 링크 보안 (LOW)

**상태**: ✅ 양호

모든 외부 링크에 `target="_blank"` + `rel="noopener noreferrer"` 속성이 올바르게 적용되어 있습니다.

**확인된 파일**:

- `components/common/Header.tsx`
- `components/common/Footer.tsx`
- `components/ui/Button.tsx`
- `components/ui/ActionCard.tsx`

---

## 2. 코드 품질 (Code Quality)

### 2.1 React 모범 사례

#### 2.1.1 불필요한 상태와 useEffect 패턴

**파일**: `components/features/DynamicCounter.tsx`

```tsx
// 현재 코드 (비효율적)
const [hasStarted, setHasStarted] = useState(false);

useEffect(() => {
  if (inView) {
    setHasStarted(true);
  }
}, [inView]);
```

**문제**: `inView` 값을 그대로 사용할 수 있는데 불필요한 상태를 추가로 관리합니다.

**개선 방안**:

```tsx
// 개선된 코드
const shouldStart = inView;
// 또는 triggerOnce: true 옵션 사용
const { ref, inView } = useInView({ triggerOnce: true });
```

---

#### 2.1.2 PageHero Hydration 불일치

**파일**: `components/ui/PageHero.tsx:33-39`

```tsx
const [bgImage, setBgImage] = useState('');

useEffect(() => {
  const randomImage = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
  setBgImage(randomImage);
}, []);
```

**문제**:

- 서버에서는 `bgImage = ''`로 렌더링
- 클라이언트에서는 랜덤 이미지로 재렌더링
- 결과: 이미지가 깜빡이며 나타남 (Hydration mismatch)

**해결 방안**:

1. **서버 컴포넌트에서 랜덤 결정**: `page.tsx`에서 이미지를 선택하여 prop으로 전달
2. **CSS 배경색 플레이스홀더**: 이미지 로드 전 어두운 배경 표시

```tsx
// 해결책 1: 서버에서 결정
// page.tsx
const heroImage = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
<PageHero bgImage={heroImage} ... />

// 해결책 2: 기본 배경 추가
<section className="relative min-h-[60vh] bg-charcoal ...">
```

---

### 2.2 TypeScript 타입 안전성

#### 2.2.1 Unsafe Type Casting

**파일**: `components/features/KakaoMap.tsx:34`

```tsx
const { kakao } = window as typeof window & { kakao?: any };
```

**문제**: `any` 타입 사용으로 TypeScript의 타입 안전성이 무력화됩니다.

**해결 방안**:

```tsx
// lib/types/kakao.d.ts 생성
interface KakaoGeocoderResult {
  x: string;
  y: string;
}

interface KakaoGeocoder {
  addressSearch(
    address: string,
    callback: (result: KakaoGeocoderResult[], status: string) => void
  ): void;
}

interface KakaoMapsServices {
  Geocoder: new () => KakaoGeocoder;
  Status: { OK: string };
}

interface KakaoMaps {
  services?: KakaoMapsServices;
}

interface WindowWithKakao extends Window {
  kakao?: {
    maps?: KakaoMaps;
  };
}

// 사용
const { kakao } = window as WindowWithKakao;
```

---

### 2.3 클래스명 관리

#### 2.3.1 템플릿 리터럴 className 결합

**파일**: `components/ui/Button.tsx`

```tsx
const styles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} ${interactiveClasses}`;
```

**문제**:

- 조건부 클래스 처리가 복잡해짐
- 빈 문자열이 포함될 수 있음
- 중복 공백 발생 가능

**해결 방안**: `clsx` 또는 `classnames` 라이브러리 도입

```bash
npm install clsx
```

```tsx
import clsx from 'clsx';

const styles = clsx(
  baseStyles,
  variantStyles[variant],
  sizeStyles[size],
  className,
  interactiveClasses
);
```

---

#### 2.3.2 복잡한 조건부 클래스

**파일**: `components/common/Header.tsx:130-134`

```tsx
className={`relative flex items-center ... ${isActive(item.href)
  ? 'text-primary after:bg-primary'
  : `${textColor} hover:text-primary ...`
}`}
```

**개선 방안**:

```tsx
className={clsx(
  'relative flex items-center h-full text-sm font-medium transition-colors',
  'focus:outline-none focus-visible:outline-none',
  'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5 after:transition-colors',
  isActive(item.href) ? [
    'text-primary',
    'after:bg-primary'
  ] : [
    textColor,
    'hover:text-primary',
    'after:bg-transparent hover:after:bg-primary/40'
  ]
)}
```

---

### 2.4 코드 중복

#### 2.4.1 window 타입 체크 패턴

**파일들**: `KakaoMap.tsx:31`, `ShareButtons.tsx:54`

```tsx
// 중복 패턴
if (typeof window === 'undefined') { return; }
if (typeof window !== 'undefined' && window.Kakao) { ... }
```

**해결 방안**: 커스텀 훅 추출

```tsx
// lib/hooks/useIsClient.ts
import { useState, useEffect } from 'react';

export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
```

---

#### 2.4.2 이미지 alt 텍스트 불일치

| 파일                      | 현재 alt                      | 권장                                         |
| ------------------------- | ----------------------------- | -------------------------------------------- |
| `BackgroundSlider.tsx:37` | `'2026 씨앗페 출품작'` (고정) | 이미지별 고유 alt                            |
| `PageHero.tsx:47`         | `''` (빈 문자열)              | 배경이미지이므로 빈 문자열 허용 (decorative) |
| `MasonryGallery.tsx:82`   | `artwork.title` (동적)        | ✅ 양호                                      |

---

## 3. 접근성 (Accessibility)

### 3.1 양호한 구현 사항

| 항목              | 파일                   | 상태                              |
| ----------------- | ---------------------- | --------------------------------- |
| 스킵 링크         | `app/layout.tsx:91-93` | ✅ 구현됨                         |
| ARIA 속성         | `Header.tsx:158-159`   | ✅ `aria-label`, `aria-expanded`  |
| 시맨틱 HTML       | 전체                   | ✅ `<main>`, `<nav>`, `<section>` |
| 키보드 네비게이션 | 전체                   | ✅ Tab 순서 적절                  |

---

### 3.2 개선 필요 사항

#### 3.2.1 차트 접근성 레이블 누락

**파일**: `components/features/StatisticsCharts.tsx`

**문제**: Recharts 차트에 스크린 리더용 대체 텍스트가 없습니다.

**해결 방안**:

```tsx
<div role="img" aria-label="예술인 금융배제율 84.9%를 보여주는 원형 차트">
  <PieChart ...>
    {/* ... */}
  </PieChart>
</div>
```

또는 차트 데이터를 테이블 형태의 대체 콘텐츠로 제공:

```tsx
<div className="sr-only">
  <table>
    <caption>예술인 금융 현황 통계</caption>
    <tr>
      <td>금융배제율</td>
      <td>84.9%</td>
    </tr>
    {/* ... */}
  </table>
</div>
```

---

#### 3.2.2 배경 이미지 alt 텍스트

**파일**: `components/ui/PageHero.tsx:47`

```tsx
alt = '';
```

**현재 상태**: ✅ 기술적으로 올바름
**이유**: 순수 장식용(decorative) 이미지는 빈 alt가 적절합니다.
**권장**: 의미 있는 이미지의 경우 설명적 alt 추가

---

## 4. 에러 핸들링 (Error Handling)

### 4.1 양호한 구현 사항

**파일**: `components/features/KakaoMap.tsx:53-77`

```tsx
if (!hasAppKey) {
  return <div className="...">카카오 지도 APP KEY가 설정되지 않았습니다...</div>;
}

if (loading) {
  return <div className="...">지도를 불러오는 중입니다…</div>;
}

if (error) {
  console.error('Kakao map load error', error);
  return <div className="...">카카오 지도를 불러오지 못했습니다...</div>;
}
```

✅ 세 가지 상태(키 없음, 로딩, 에러)에 대한 적절한 폴백 UI 제공

---

### 4.2 개선 필요 사항

#### 4.2.1 링크 복사 실패 시 사용자 피드백 부재

**파일**: `components/common/ShareButtons.tsx:64-72`

```tsx
const handleCopyLink = async () => {
  try {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    // 사용자에게 피드백 없음!
  }
};
```

**해결 방안**:

```tsx
const [copyError, setCopyError] = useState(false);

const handleCopyLink = async () => {
  try {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    setCopyError(true);
    setTimeout(() => setCopyError(false), 2000);
  }
};

// UI에서
{
  copyError ? '복사 실패' : copied ? '✓ 복사됨' : '링크 복사';
}
```

---

#### 4.2.2 전역 에러 바운더리 누락

**문제**: `app/error.tsx` 파일이 없어 런타임 에러 발생 시 전체 앱이 크래시됩니다.

**해결 방안**: `app/error.tsx` 생성

```tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">문제가 발생했습니다</h2>
        <p className="text-gray-600 mb-4">페이지를 불러오는 중 오류가 발생했습니다.</p>
        <button onClick={() => reset()} className="px-4 py-2 bg-primary text-white rounded">
          다시 시도
        </button>
      </div>
    </div>
  );
}
```

---

## 5. 개발 환경 (DevOps)

### 5.1 Husky Pre-commit 훅 미설정 (CRITICAL)

**현재 상태**:

- `package.json`에 `husky: ^8.0.0`, `lint-staged: ^15.0.0` 설치됨
- **`.husky/` 디렉토리 존재하지 않음**

**영향**:

- 커밋 전 린트/포맷 검사가 실행되지 않음
- 코드 품질 게이트가 우회됨

**해결 방안**:

```bash
# Husky 초기화
npx husky install

# Pre-commit 훅 추가
npx husky add .husky/pre-commit "npx lint-staged"

# package.json에 prepare 스크립트 추가 (협업자 자동 설정용)
npm pkg set scripts.prepare="husky install"
```

**lint-staged 설정** (`package.json`에 추가):

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

---

### 5.2 ESLint 규칙 강화 필요 (MEDIUM)

**파일**: `.eslintrc.json`

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "react/no-unescaped-entities": "warn",
    "react/display-name": "warn",
    "@next/next/no-html-link-for-pages": "warn"
  }
}
```

**문제**: 모든 커스텀 규칙이 `warn`으로 설정되어 있어 무시될 수 있습니다.

**권장 설정**:

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "react/no-unescaped-entities": "error",
    "react/display-name": "error",
    "@next/next/no-html-link-for-pages": "error",
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

### 5.3 테스트 커버리지 부족 (LOW)

**현재 상태**:

- 테스트 파일: `__tests__/components/DynamicCounter.test.tsx` (1개)
- Jest 설정: 완료됨 (`jest.config.js`)

**권장 테스트 추가 대상**:

| 우선순위 | 컴포넌트               | 이유                          |
| -------- | ---------------------- | ----------------------------- |
| HIGH     | `KakaoMap.tsx`         | 외부 API 의존, 에러 처리      |
| HIGH     | `ShareButtons.tsx`     | 사용자 인터랙션, 클립보드 API |
| MEDIUM   | `Header.tsx`           | 네비게이션 로직, 모바일 메뉴  |
| MEDIUM   | `StatisticsCharts.tsx` | 데이터 시각화 정확성          |
| LOW      | `Button.tsx`           | 기본 UI 컴포넌트              |

---

## 6. 의존성 (Dependencies)

### 6.1 미사용 의존성

**패키지**: `react-icons: ^4.12.0`

**확인 결과**:

- `package.json`에 설치됨
- **소스 코드에서 import 없음** (검색 결과 0건)

**해결 방안**:

```bash
npm uninstall react-icons
```

**절약 효과**: 번들 크기 감소 (~50KB)

---

### 6.2 의존성 상태 요약

| 패키지        | 버전     | 상태      |
| ------------- | -------- | --------- |
| next          | ^14.0.0  | ✅ 최신   |
| react         | ^18.2.0  | ✅ 최신   |
| typescript    | ^5.3.0   | ✅ 최신   |
| tailwindcss   | ^3.4.0   | ✅ 최신   |
| recharts      | ^2.10.0  | ✅ 최신   |
| framer-motion | ^10.16.0 | ✅ 최신   |
| react-icons   | ^4.12.0  | ⚠️ 미사용 |

---

## 7. 우선순위 체크리스트

### CRITICAL (즉시 조치 필요)

- [ ] **Husky 훅 초기화**: `.husky/` 디렉토리 생성 및 pre-commit 훅 설정
  - 명령어: `npx husky install && npx husky add .husky/pre-commit "npx lint-staged"`

### HIGH (1주 내 조치 권장)

- [ ] **Kakao SDK SRI 추가**: `app/layout.tsx:159-163`
  - 또는 자체 호스팅 검토
- [ ] **전역 에러 바운더리 추가**: `app/error.tsx` 생성
- [ ] **KakaoMap 타입 정의**: `lib/types/kakao.d.ts` 생성

### MEDIUM (2주 내 조치 권장)

- [ ] **PageHero hydration 수정**: 서버에서 이미지 결정 또는 플레이스홀더 추가
- [ ] **차트 접근성 레이블 추가**: `StatisticsCharts.tsx`에 `role="img"`, `aria-label` 추가
- [ ] **ShareButtons 에러 피드백**: 복사 실패 시 사용자 알림 추가
- [ ] **ESLint 규칙 강화**: `warn` → `error` 변경

### LOW (여유 시 조치)

- [ ] **clsx 도입**: `Button.tsx`, `Header.tsx` className 관리 개선
- [ ] **미사용 의존성 제거**: `npm uninstall react-icons`
- [ ] **useIsClient 훅 추출**: window 체크 패턴 통합
- [ ] **테스트 커버리지 확대**: KakaoMap, ShareButtons 테스트 추가

---

## 부록: 파일 경로 참조

| 컴포넌트         | 경로                                       |
| ---------------- | ------------------------------------------ |
| Root Layout      | `app/layout.tsx`                           |
| PageHero         | `components/ui/PageHero.tsx`               |
| KakaoMap         | `components/features/KakaoMap.tsx`         |
| ShareButtons     | `components/common/ShareButtons.tsx`       |
| StatisticsCharts | `components/features/StatisticsCharts.tsx` |
| Button           | `components/ui/Button.tsx`                 |
| Header           | `components/common/Header.tsx`             |
| ESLint Config    | `.eslintrc.json`                           |

---

**문서 작성자**: Claude Code (AI Assistant)
**최종 검토**: 2025-12-30
**다음 검토 예정**: 2026-03-30 (3개월 후)
