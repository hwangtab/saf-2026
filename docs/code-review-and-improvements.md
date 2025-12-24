# 코드 리뷰 및 개선 제안

본 문서는 SAF(Seed Art Festival) 2026 웹사이트의 코드베이스를 분석하고, 발견된 문제점과 개선 방안을 제안하기 위해 작성되었습니다.

## 1. 요약

전반적으로 프로젝트는 최신 Next.js(App Router)를 기반으로 잘 구조화되어 있으며, TypeScript, ESLint, Prettier 등 코드 품질을 유지하기 위한 도구들이 효과적으로 설정되어 있습니다. 특히 SEO 및 웹 접근성 구현 수준이 우수합니다.

아래는 성능, 유지보수성, 비용 최적화 관점에서 발견된 개선 기회들입니다. 각 항목은 **즉시 실행 가능**하도록 구체적인 해결 방법과 함께 제시되었습니다.

## 2. 주요 발견 사항 및 개선 제안

### 1) [우선] 배경 슬라이더의 비효율적인 이미지 렌더링

- **파일:** `components/features/BackgroundSlider.tsx`
- **영향:** 초기 페이지 로딩 시간(LCP), 메모리 사용량
- **문제점:** 현재 `BackgroundSlider` 컴포넌트는 슬라이드에 포함된 모든 이미지를 DOM에 한 번에 렌더링하고 `opacity`를 조절하여 전환 효과를 구현합니다. 이미지 개수가 많아질수록 초기 페이지 로딩 시간에 부정적인 영향을 주며, 메모리 사용량도 증가합니다.
- **개선 제안:**
  - 현재 화면에 보이는 이미지와 다음 이미지(프리로드용)만 렌더링하도록 로직을 수정합니다.
  - `framer-motion`의 `AnimatePresence`를 사용하면 컴포넌트가 DOM에서 제거될 때 애니메이션 효과를 줄 수 있어, 효율적인 이미지 전환 구현이 가능합니다.
  - 또는 `embla-carousel-react`와 같은 경량 캐러셀 라이브러리를 사용하여 자동으로 가상화(virtualization)를 처리하는 방법도 고려할 수 있습니다.

### 2) [권장] 이미지 최적화 설정의 비용 최적화

- **파일:** `next.config.js`
- **영향:** Vercel 배포 시 이미지 최적화 비용
- **현재 상황:** `images.remotePatterns`에 `hostname: '**'` 와일드카드가 설정되어 있어, 모든 외부 도메인의 이미지를 Next.js 이미지 최적화 API를 통해 처리할 수 있습니다. 현재는 뉴스 사이트 썸네일(10개 도메인)을 로드하기 위해 사용 중입니다.
- **잠재적 위험:**
  - 이론적으로 악의적인 사용자가 이 설정을 악용하여 임의의 이미지 URL을 최적화 요청에 포함시킬 수 있습니다
  - Next.js는 자체적으로 캐싱과 일부 보호 기능이 있지만, 대량의 악의적 요청이 있을 경우 비용이 증가할 수 있습니다
- **개선 제안:**
  - 실제 사용 중인 **특정 도메인만 명시적으로 허용**하여 비용 리스크를 줄입니다.
  - 현재 `content/news.ts`에서 사용 중인 도메인 목록:

  **수정 예시:**
  ```javascript
  // next.config.js
  const nextConfig = {
    images: {
      formats: ['image/avif', 'image/webp'],
      remotePatterns: [
        // 뉴스 사이트 썸네일 도메인
        { protocol: 'https', hostname: 'mmagimg.speedgabia.com' },      // 믹싱
        { protocol: 'https', hostname: 'cdn.ndnnews.co.kr' },           // 공직신문
        { protocol: 'https', hostname: 'cdn.ebn.co.kr' },               // EBN
        { protocol: 'https', hostname: 'cphoto.asiae.co.kr' },          // 아시아경제
        { protocol: 'https', hostname: 'www.news-art.co.kr' },          // 뉴스아트
        { protocol: 'https', hostname: 'flexible.img.hani.co.kr' },     // 한겨레
        { protocol: 'https', hostname: 'cdn.ggoverallnews.co.kr' },     // 경기종합뉴스
        { protocol: 'https', hostname: 'cdn.socialimpactnews.net' },    // 소셜임팩트뉴스
        { protocol: 'https', hostname: 'cdn.abcn.kr' },                 // ABC뉴스
        { protocol: 'https', hostname: 'cdn.eroun.net' },               // 이로운넷
      ],
    },
    reactStrictMode: true,
  };
  ```

  > [!NOTE]
  > 새로운 뉴스 소스를 추가할 때마다 해당 도메인을 이 목록에 추가해야 합니다.

### 3) [정리] 미사용 의존성 제거

- **파일:** `package.json`
- **영향:** `node_modules` 크기, 빌드 시간
- **확인 결과:** `lite-youtube-embed`는 프로젝트에서 실제로 사용되지 않으며, `react-lite-youtube-embed`만 `components/features/VideoEmbed.tsx`에서 사용 중입니다.
- **개선 제안:**
  - 미사용 의존성을 제거합니다.

  **실행 명령어:**
  ```bash
  npm uninstall lite-youtube-embed
  ```

### 4) [장기] 에셋 파일명의 표준화

- **파일:** `public/images/saf2023/ART/` 디렉토리 내부 파일
- **영향:** 크로스 플랫폼 호환성, 배포 안정성
- **문제점:** 작품 이미지 파일명이 한글(Non-ASCII)로 되어 있습니다. 현재는 문제가 없지만, 다양한 환경(OS, 서버, CDN)에서 인코딩 문제나 경로 오류를 유발할 잠재적 위험이 있습니다.
- **개선 제안:**
  - 점진적으로 파일명을 **영문, 숫자, 하이픈(-), 언더스코어(_) 조합**으로 변경합니다.
  - 예시: `작가명-작품명-연도.webp` → `artist-name-artwork-title-2023.webp` 또는 로마자 표기법 사용
  - 파일명 변경 후에는 코드에서 해당 이미지를 참조하는 모든 부분을 업데이트해야 합니다.
  
  > [!TIP]
  > 새로 추가되는 이미지부터 영문 파일명을 사용하고, 기존 파일은 시간이 날 때 점진적으로 변경하는 것을 권장합니다.

### 5) [일관성] `layout.tsx`의 메타데이터 관리 개선

- **파일:** `app/layout.tsx`
- **영향:** 코드 일관성, 유지보수성
- **문제점:** `viewport`, `icon` 등 일부 메타 태그가 `<head>` 내에 직접 하드코딩되어 있습니다. Next.js 13+ (App Router)에서는 `metadata` 객체를 통해 메타데이터를 관리하는 것이 표준 방식입니다.
- **개선 제안:**
  - 하드코딩된 태그를 제거하고, `metadata` 객체로 이동합니다.

  **수정 예시:**
  ```typescript
  // app/layout.tsx
  import type { Metadata } from 'next';

  export const metadata: Metadata = {
    // ... 기존 metadata 설정
    viewport: 'width=device-width, initial-scale=1',
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
  };
  ```

## 3. 우선순위 요약

| 우선순위 | 항목 | 예상 작업 시간 | 영향도 |
|---------|------|-------------|--------|
| 🔴 높음 | BackgroundSlider 성능 개선 | 2-4시간 | 사용자 경험 직접 개선 |
| 🟡 중간 | 이미지 도메인 최적화 | 10분 | 비용 리스크 감소 |
| 🟡 중간 | 미사용 의존성 제거 | 1분 | 빌드 최적화 |
| 🟢 낮음 | 메타데이터 일관성 개선 | 30분 | 코드 품질 향상 |
| 🟢 낮음 | 파일명 표준화 | 장기 프로젝트 | 장기적 안정성 |

## 4. 결론

코드베이스는 견고하게 작성되어 있으며, 대부분의 베스트 프랙티스를 잘 따르고 있습니다. 위에 제안된 개선사항들은 **필수**가 아닌 **권장사항**이며, 특히 **성능 개선**(BackgroundSlider)과 **비용 최적화**(이미지 도메인 화이트리스트)를 우선적으로 고려하는 것을 추천합니다.
