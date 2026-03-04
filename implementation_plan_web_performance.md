# SAF 2026 웹 성능 최적화 실행 계획 (Oracle 리뷰 변환본)

## 1) 목표

- Core Web Vitals 개선: LCP/INP/TTFB 중심으로 체감 속도 향상
- 초기 렌더링 시 불필요한 클라이언트 JS/하이드레이션 비용 축소
- 이미지/폰트/서드파티 스크립트 로딩 전략 정리로 네트워크 비용 절감

## 2) 범위

- Public 페이지 중심: `/`, `/artworks/*`, `/news`, `/our-reality`
- 전역 레이아웃/공통 컴포넌트: Header, Footer, SafeImage, ShareButtons
- 데이터 패칭/캐시 전략: 작품 상세, Footer 슬라이더 데이터

## 3) 우선순위 백로그 (ROI 순)

### P0-1) 원격 이미지 `unoptimized` 제거

- 대상 파일: `components/common/SafeImage.tsx`
- 작업:
  - `unoptimized` 및 raw loader 경로 제거
  - `next/image` 기본 최적화 경로 사용
  - `sizes` 속성 점검(카드/썸네일 기준)
- 기대 효과: LCP/전송량 개선, CDN 캐시 효율 향상
- 검증:
  - `npm run build`
  - 주요 페이지 Lighthouse 모바일 비교(전/후 LCP)

### P0-2) Kakao SDK 지연 로딩(사용자 액션 시)

- 대상 파일: `lib/hooks/useKakaoSDK.ts`, `components/common/ShareButtons.tsx`
- 작업:
  - 마운트 시점 로딩 제거
  - 카카오 공유 버튼 클릭 시 SDK 로딩 트리거
  - 로딩/실패 상태 처리
- 기대 효과: 초기 JS 파싱/실행량 감소, INP 개선
- 검증:
  - `npm run lint`
  - 카카오 공유 버튼 E2E 수동 점검(첫 클릭 시 동작)

### P0-3) Footer Slider 불필요 fetch 제거 또는 범위 축소

- 대상 파일: `components/common/Footer.tsx`, `components/common/FooterSlider.tsx`, `lib/path-rules.ts`
- 작업:
  - 전역 마운트 페이지 범위 재정의
  - 가능 시 서버에서 캐시된 데이터 주입으로 전환
  - 중복 API 호출 발생 여부 제거
- 기대 효과: 네트워크 요청/클라이언트 연산 감소, INP 개선
- 검증:
  - DevTools Network에서 페이지 전환 시 `/api/artworks` 호출 횟수 비교
  - `npm run build`

### P0-4) 홈 히어로 초기 정적 렌더 + 애니메이션 지연 시작

- 대상 파일: `app/page.tsx`, `components/features/BackgroundSlider.tsx`
- 작업:
  - 최초 1프레임은 서버 렌더 고정 이미지 사용
  - 슬라이더/모션은 idle 또는 뷰포트 진입 후 시작
  - Framer Motion 의존 구간 최소화
- 기대 효과: 홈페이지 LCP 및 초기 인터랙션 안정성 개선
- 검증:
  - Lighthouse 홈 페이지 비교(LCP, TBT)
  - 모바일 저사양 디바이스 체감 점검

### P1-1) 작품 상세 페이지 캐시/재검증 전략 명시

- 대상 파일: `app/artworks/[id]/page.tsx`, `lib/supabase-data.ts`
- 작업:
  - 상세 데이터 조회를 캐시 가능한 함수로 래핑
  - `revalidate` 정책 명시(예: 300초)
  - 동적 렌더 강제 요인 제거
- 기대 효과: `/artworks/[id]` TTFB/LCP 개선
- 검증:
  - `npm run build` 후 라우트 렌더 모드 확인
  - 반복 조회 시 응답 시간 비교

### P1-2) 루트 레이아웃 하이드레이션 범위 분리

- 대상 파일: `app/layout.tsx`, 라우트 그룹 레이아웃 파일(신규)
- 작업:
  - Public/Portal 레이아웃 분리
  - Header/Footer/Transition/Toast 등 클라이언트 의존을 필요한 구간만 적용
- 기대 효과: 전체 JS 번들/하이드레이션 비용 구조적 감소
- 검증:
  - `npm run type-check`
  - 라우트별 JS 로드량 비교(빌드 분석 도구 사용 가능 시 함께 측정)

### P1-3) 폰트 파이프라인 `next/font/local` + WOFF2 전환

- 대상 파일: `styles/globals.css`, `app/layout.tsx`(또는 폰트 설정 파일)
- 작업:
  - legacy `@font-face` 의존 최소화
  - 핵심 웨이트만 preload
  - WOFF2 자산 우선 사용
- 기대 효과: CLS/LCP 개선, 폰트 전송량 절감
- 검증:
  - Lighthouse CLS/LCP 비교
  - 폰트 로드 waterfall 확인

### P2) `/our-reality` 차트 지연 마운트 강화

- 대상 파일: `components/features/charts/DynamicCharts.tsx`, `app/our-reality/page.tsx`
- 작업:
  - 섹션 단위 IntersectionObserver 기반 마운트
  - 뷰포트 진입 전 차트 청크 로딩 지연
- 기대 효과: 해당 페이지 INP/JS 실행 시간 개선
- 검증:
  - 페이지 진입 직후 JS 실행량 비교
  - 스크롤 시 차트 렌더 타이밍 확인

## 4) 실행 순서 (첫 7액션)

1. `SafeImage` 원격 이미지 최적화 경로 복구 (`unoptimized` 제거)
2. Kakao SDK 클릭 시 지연 로딩으로 전환
3. Footer Slider 데이터 패칭 범위 축소/서버 주입 전환
4. 홈 히어로 초기 정적 페인트 + 모션 지연 시작
5. 작품 상세 데이터 캐시(`revalidate` 포함) 적용
6. 레이아웃을 Public/Portal로 분리해 전역 하이드레이션 축소
7. 폰트 `next/font/local` + WOFF2 전환

## 5) 측정 지표 및 합격선

- CWV(모바일 기준):
  - LCP: 개선 추세 확인(최소 15% 개선 목표)
  - INP: 개선 추세 확인(초기 JS 감소와 동행)
  - CLS: 현행 유지 또는 개선
- 기술 지표:
  - 초기 JS 실행량 감소
  - 중복 API 호출 제거
  - 동적 렌더 페이지 수 감소(가능 범위)

## 6) 공통 검증 체크리스트

- `npm run lint`
- `npm run type-check`
- `npm run build`
- 주요 라우트 수동 점검: `/`, `/artworks`, `/artworks/[id]`, `/news`, `/our-reality`

## 7) 완료 기준 (Definition of Done)

- P0 항목 4개 모두 반영 및 회귀 이슈 없음
- `/artworks/[id]` 캐시 전략 반영 확인
- Public 기준 불필요 전역 하이드레이션 감소 확인
- 성능 측정 리포트(전/후) 1회 이상 기록
