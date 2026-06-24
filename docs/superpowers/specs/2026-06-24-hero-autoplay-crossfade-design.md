# Hero CSS-only Autoplay Crossfade — 설계

- 날짜: 2026-06-24
- 대상: `components/features/HomeHero.tsx`, `lib/now-showing.ts`, `app/[locale]/page.tsx`, i18n
- 상태: 설계 승인 대기

## 배경 / 목적

메인 hero에 올릴 후보가 3개(현재 활성 NOW_SHOWING: 강석태·오윤·박생광). 지금은
`getHeroSlide()`가 `heroPriority` 최고 1개만 풀블리드 정적 이미지로 띄우고, 나머지는
fold-below `NowShowing` 그리드 카드로 노출. 사용자 요청:

1. 하단 NowShowing 그리드를 없애고
2. hero를 풀블리드로 두되 (이미 풀블리드임)
3. 3개 후보가 hero에서 **자동 순환(autoplay)** 되게.

핵심 제약: **PSI mobile 점수(현재 83/99) 저하 없이.** "손으로 넘기기"는 불필요 — **자동 순환만**으로 충분(사용자 확정).

## 회귀 trauma 컨텍스트 (반드시 준수)

과거 hero 슬라이더(embla, JS carousel)에서 PSI mobile 4x throttle 회귀 5종 발생 →
정적 단일 hero로 폐기한 이력. `HomeHero.tsx` 헤더 주석 + 메모리
`feedback_hero_server_island_regression.md` 참조. 데인 원인은 **autoplay 자체가 아니라
JS-driven carousel**(embla + hydration + idleCallback + forced reflow)이었음.

→ 본 설계는 **순수 CSS `@keyframes` autoplay**로 구현. JS 0, hydration 0, 메인스레드 점유 0.
이 카테고리는 trauma 패턴(JS carousel)과 본질적으로 다름.

## 결정 사항 (브레인스토밍 합의)

| 항목          | 결정                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| 전환 모션     | 켄번스(`animate-ken-burns`) + 크로스페이드(`opacity`) — 현행 hero 연장          |
| 순환 대상     | **이미지만** 순환, 텍스트·CTA는 **고정**                                        |
| 고정 텍스트   | **범용 캠페인 메시지** + CTA `전체 작품 보기`(`/artworks`). 특정 전시에 안 묶임 |
| 하단 그리드   | `NowShowing` **제거**                                                           |
| 컴포넌트 종류 | 순수 server component 유지 (`'use client'` 없음)                                |

## 아키텍처

### 1. 순환 이미지 풀

- `lib/now-showing.ts`에 셀렉터 추가: `getHeroSlides(now)` — `getActiveShowingItems()`를
  `heroPriority` 내림차순 정렬해 반환(최대 3장 가정, 가드로 slice). 활성 0개면
  `[NOW_SHOWING[0]]`(강석태 fallback) 1장 반환.
- **Graceful degrade**: 풀이 1장이면 크로스페이드 애니 없이 정적 단일 = 현행과 동일. 박생광
  6/28 종료 시 자동 2장 순환.

### 2. HomeHero 렌더 구조

- 슬라이드 N장을 `absolute inset-0`로 겹쳐 쌓음(컨테이너는 현행 `min-h-[70svh] md:min-h-[85svh]`).
- 각 슬라이드 = `SafeImage`(fill, object-cover) + 슬라이드별 `resolveHeroSoftTreatment` 비네팅.
  (현재 3장 모두 `heroTreatment:'soft'` → 전부 비네팅 유지, 풀스크린 품질 = 현행 단일과 동일)
- 텍스트 블록(뱃지·h1·desc·CTA)·다크 그라디언트·sentinel·sawtooth는 슬라이드 위 단일 레이어로 **현행 유지**.

### 3. CSS autoplay 메커니즘

- 새 `@keyframes heroCrossfade`(`styles/globals.css`): `opacity` 0↔1 사이클. 각 슬라이드는
  동일 keyframe + `animation-delay` stagger로 무한 순환. **`opacity`만** 변화 → compositor 스레드.
- 켄번스는 슬라이드별 `animate-ken-burns` 그대로 → 페이드되며 천천히 줌.
- 슬라이드 수에 따라 주기 가변(2장/3장). N장 기준 1장 표시구간 + 페이드 겹침을 keyframe %로 계산.
  CSS 변수(`--hero-slide-count`)로 N 주입하거나, 슬라이드 인덱스별 inline `animationDelay` 부여.
- **`prefers-reduced-motion`**: 기존 전역 규칙(애니 0.01ms 단축)이 적용 → 첫 슬라이드 고정 노출로 수렴.

### 4. LCP 안전장치 (trauma 직접 회피)

- **1번 슬라이드**: keyframe `0%` 지점 `opacity:1`로 시작(로드 즉시 그려짐, 빈 화면 0) +
  `priority` + `fetchPriority="high"`. 과거 "opacity:0 시작 → LCP 밀림" 정확히 회피.
- **2·3번 슬라이드**: `fetchPriority="low"`(첫 페인트 우선순위 양보). 단 첫 전환 전 decode
  되도록 `loading="lazy"`는 **쓰지 않음**(opacity:0이라 lazy가 영영 트리거 안 될 위험).
- **h1**: 현행처럼 reveal 애니 제외(즉시 완성) — 텍스트 LCP 후보 안전.

### 5. 텍스트 / i18n

- 신규 키 1세트: `home.hero.campaignStatus / campaignTitle / campaignDesc / campaignCta`
  (`messages/ko.json`·`messages/en.json`). ICU 변수(`artistCount`, `artworkCount`)는 기존 패턴 재사용 가능.
- CTA href = `/artworks` 고정. hero 전체가 단일 `Link`(현행 분기 단순화 — `slide.href` 분기 제거).

### 6. page.tsx

- `<HomeTrackedSection section="now-showing">` 블록 + `NowShowing` import 제거.
- `MasterArtists`가 hero 직후 첫 섹션이 됨. hero sawtooth(`canvas-soft`) → MasterArtists 배경 정합 확인.
- `getNowShowingCards()`는 dead code화 → 함께 제거(또는 명시적 보존 주석). `NowShowing.tsx` 컴포넌트 삭제.

## 리스크 / 검증

1. **이미지 payload (유일한 실측 변수)**: 3장 동시 로드. 첫 장 high·나머지 low, `quality={60}`
   유지로 완화. **검증**: 프로토타입 → Vercel 프리뷰 → mobile PSI **3회** + RUM(admin/analytics).
   메모리 `feedback_psi_variance` 준수 — 단일 lab 측정으로 판단 금지.
2. **⚠ Variant B 전환 실험 충돌**: NowShowing은 홈 전환 최적화 실험(PR#139, Variant B "상품 우선
   재배열")의 일부로, pre/post 평가가 **~2026-07-01 미결**. 제거 시 실험 변수를 변경하게 됨.
   완화 논거: hero가 3개 전시를 순환 노출하므로 "상품성"이 hero로 일부 흡수. 단 개별 전시 카드
   클릭 동선(특별전 직행)은 사라지고 CTA가 `/artworks` 단일로 수렴. **PM 판단 필요** — 평가 종료
   후 적용할지, 지금 적용하고 평가를 리셋/병합할지.
3. **coming-soon 예고 카드 상실**: hero 순환 풀은 활성(`getActiveShowingItems`)만 → 미래 시작
   전시 예고 노출 기회 없어짐. 사용자 수용 완료.

## 테스트 / 검증 항목

- `npm run type-check`, `npm run lint`, `npm run build`(SSG 호환).
- `npm test` — i18n placeholder 검증(`verify:i18n-placeholders`).
- e2e a11y: hero CTA 색 대비(`bg-primary-strong`) 유지 확인. 신규 페이지 아님(기존 홈) → 기존 spec 커버.
- 시각 확인은 사용자에게 요청(메모리 `feedback_no_playwright`).

## YAGNI / 비목표

- 터치 스와이프·dot 인디케이터·일시정지 버튼: **안 만듦**(자동 순환만으로 충분, JS 유발 = trauma).
- 슬라이드별 텍스트 전환: 안 함(텍스트 고정 확정).
