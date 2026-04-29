# SAF 2026 — Design Renewal Proposal (v2, 재작성)

> **이전 버전 폐기**. 첫 제안서는 SAF를 "사회 캠페인 사이트"로 잘못 프레이밍해서 Notion(따뜻한 워크스페이스 톤)을 추천했음. 실제로 SAF는 **현대미술 작품을 판매하는 사이트**이고 캠페인은 그 의미일 뿐 — 표면 톤은 갤러리여야 함.
>
> 비교 기준: [docs/DESIGN.md](DESIGN.md)
> 레퍼런스: **Apple · Figma · Tesla** (현대 갤러리·미술관 모델), 보조: The Verge (에디토리얼 매거진)
> 작성일: 2026-04-29

---

## TL;DR (v2)

**현대미술 사이트**에 가장 가까운 모델은 **Apple과 Figma**. 둘 다 "white gallery wall" 철학 — 인터페이스는 흑백 무채색, **색은 작품(콘텐츠)에서만 나옴**. David Zwirner / Gagosian / Hauser & Wirth 같은 톱 갤러리들이 정확히 이 모델.

> **Apple DESIGN.md 자기소개**: _"photography-first interface that turns marketing into a museum gallery"_
> **Figma DESIGN.md 자기소개**: _"Figma's marketing page is essentially a white gallery wall displaying colorful art"_

SAF의 가장 큰 구조적 문제는 **`bg-canvas-soft #FFF9E8`을 body 기본 배경으로 쓰는 것**. 이건 갤러리 벽이 아니라 캠페인 포스터 종이임. 작품 사진을 띄울 때 작품의 진짜 색이 따뜻한 sand 위에서 왜곡됨. 현대미술 사이트라면 흰 벽 위에서 작품 색이 정확히 보여야 함.

---

## 1. 프레이밍 정정

|                       | 잘못된 프레이밍 (v1)       | 정확한 프레이밍 (v2)                           |
| --------------------- | -------------------------- | ---------------------------------------------- |
| **사이트 정체성**     | 사회 캠페인 사이트         | **현대미술 작품 판매 사이트** (캠페인은 WHY)   |
| **주력 콘텐츠**       | 통계·메시지                | **127명 작가의 원본 작품 이미지**              |
| **사용자 동선**       | 캠페인 정보 → 기부         | 갤러리 둘러보기 → 작품 상세 → 구매             |
| **레퍼런스 카테고리** | 워크스페이스/SaaS          | **갤러리·뮤지엄·럭셔리 커머스**                |
| **톤 모델**           | Notion (따뜻한 미니멀리즘) | **Apple/Tesla/Figma (white cube + 사진 우선)** |

**여전히 진실인 것**: 캠페인 의미는 사라지지 않음. /about, /our-reality, /magazine 같은 콘텐츠 페이지에서는 따뜻함이 어울림. 즉 **두 톤 시스템**이 필요 — 갤러리(작품·커머스)와 매거진(캠페인·이야기).

---

## 2. 레퍼런스 재평가

### Apple — 적합도 ★★★★★ (1순위 모델)

> _"Edge-to-edge product tiles alternate light and dark canvases, framed by SF Pro Display headlines with negative letter-spacing and a single Action Blue (#0066cc) interactive color. UI chrome recedes so the product can speak — no decorative gradients, no shadows on chrome, only the one signature drop-shadow under product imagery resting on a surface."_

**왜 1순위**:

- "marketing as museum gallery"가 자기 정의. 정확히 SAF가 가야 할 곳.
- **Light + dark canvas alternation** — 갤러리 큐레이션 리듬. SAF Section variant로 바로 적용 가능.
- **단일 액센트 색**: Action Blue `#0066cc` — 그 외 색은 작품에서만. SAF도 primary 하나로 줄일 수 있음.
- **Chrome에 그림자 없음**, 작품 이미지 아래만 시그니처 drop-shadow. SAF의 과한 호버 그림자 정리 근거.
- 사진 기반 페이지가 모델: **edge-to-edge tile** = SAF 작품 갤러리에 직결.

**가져올 것**:

1. `surface-pearl #fafafc`, `canvas-parchment #f5f5f7`, `canvas #ffffff` — 흰 계열의 미세한 농도 차로 챕터 만들기
2. **Light/dark alternation**: surface-tile-1~3 (`#272729`, `#2a2a2c`, `#252527`) 다크 섹션. 작가 인터뷰·캠페인 메시지 같은 진중한 챕터에 사용
3. **단일 시그니처 그림자**: 작품 이미지에만 — `0 30px 60px -15px rgba(0,0,0,0.15)` 형태
4. Hairline border `#e0e0e0` — Notion whisper와 같은 철학이지만 더 차가움

### Figma — 적합도 ★★★★★ (공동 1순위, 타이포 모델)

> _"the interface chrome is strictly black-and-white (literally only #000000 and #ffffff detected as colors), while the hero section and product showcases explode with vibrant multi-color gradients. This separation means the design system itself is colorless, treating the product's colorful output as the hero content. Figma's marketing page is essentially a white gallery wall displaying colorful art."_

**왜 공동 1순위**:

- **"design system itself is colorless, treating the product's colorful output as the hero content"** — 미술 갤러리 사이트의 정의 그 자체.
- 가변 폰트 weight(320, 330, 340, 450, 480, 540) — 위계를 미세 weight 차이로. **고급 에디토리얼/현대미술 사이트의 시그니처**.
- Negative letter-spacing 전반 적용 — 디스플레이부터 본문까지. **프린트 도록 같은 정밀도**.
- Pill (50px) + circle(50%) — 모던 미술 사이트가 자주 쓰는 기하학.

**가져올 것** (조정해서):

1. **Strict B&W chrome 원칙**: 인터페이스 자체에 색 없음. SAF의 sun yellow를 background로 쓰는 패턴은 폐기. Primary blue도 CTA에만.
2. **음수 letter-spacing**: 한국어 영향은 작지만 영문 라벨/제목·작품명에서 큼. PartialSansKR 디스플레이에 `-0.02em` 정도 적용 검토.
3. **Mono uppercase 라벨** (Verge에서도 차용): "OIL ON CANVAS · 2024" 같은 메타에 mono 14px uppercase tracking-wide. 갤러리 사이트의 고전 패턴.

**가져오지 않을 것**:

- 가변 폰트 weight (Paperlogy local woff2 3종이라 불가능 — 한국어 로컬 폰트의 한계)
- Dashed focus outline (Figma 내부 메타 디자인 — SAF에는 안 맞음)
- pill 50px 일색 (한국어 캠페인 매거진 톤과 충돌)

### Tesla — 적합도 ★★★★☆ (사진 우선 미니멀리즘)

> _"radical subtraction — a digital showroom where the product is everything and the interface is almost nothing. Full-viewport hero sections (100vh) dominated by cinematic car photography with minimal overlay UI. Near-zero UI decoration: no shadows, no gradients, no borders, no patterns anywhere. Single accent color — Electric Blue (#3E6AE1)."_

차를 작품으로 바꾸면 SAF가 됨. 가져올 것:

- **Hero 100vh + 작품 사진 풀블리드** — `/artworks` 페이지 또는 작품 상세에 적용
- **장식 요소 zero**: 그라디언트·패턴·shadow를 chrome에서 모두 제거
- **단일 액센트**: 모든 CTA를 한 색으로. 현재 `accent #F79824`(테라코타) + `primary #2176FF`(블루) 둘 다 있는 상태 → 정리
- **0.33s cubic-bezier 일관 타이밍** — 모든 인터랙션 같은 리듬

### The Verge — 적합도 ★★★☆☆ (매거진 챕터에서만)

매거진/매트릭스 페이지(/magazine, /our-reality, /admin/changelog) 한정으로 차용:

- **Mono UPPERCASE 메타 라벨** — "FEATURE · 2026.04.28" 같은 큐레이터 톤
- **Eyebrow/kicker 위계** — 작품 카드 위에 카테고리/매체 표시

**Verge의 다크 캔버스·민트·울트라바이올렛은 거부**. 우리 톤 아님.

### Notion / Pinterest — 적합도 ★★☆☆☆ (이전 1순위에서 강등)

- Notion: 워크스페이스의 "approachable warmth" — **현대미술 사이트는 approachable이 아니라 aspirational해야 함**. 갤러리는 친근함이 아니라 큐레이션의 권위로 작동.
- Pinterest: 따뜻한 sand + masonry — 영감 보드 톤. SAF 작품 페이지에 잘못 들어오면 "Etsy 공예품 마켓"처럼 보임.

---

## 3. SAF 현 시스템 재진단 (갤러리 모델 기준)

### 가장 큰 문제: 흰 벽이 아닌 따뜻한 종이

```css
body {
  background-color: var(--color-canvas-soft); /* #FFF9E8 */
}
```

**문제**:

- 작품 이미지의 흰 캔버스(유화·종이·캔버스 자체)가 sand 배경 위에서 노란 톤으로 왜곡됨
- 색이 강한 작품(레드·블루·블랙)은 sand와 충돌해서 색 정확도 떨어짐
- 사용자가 "작품 실제 색이 어떻지?" 의심하게 됨 — **커머스에서 치명적**
- 현대미술 사이트의 제1 룰을 위반함: _"chrome is colorless so the artwork is the color"_

**어떻게 풀 것인가**: 두 톤 시스템.

| 표면                                                                   | 현재                | 제안                                                              |
| ---------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------- |
| `/`, `/artworks`, `/artworks/[id]`, `/artists/[slug]` (커머스 갤러리)  | `bg-canvas-soft`    | **`bg-white`** + `surface-pearl #fafafc` 알터네이션               |
| `/about`, `/our-reality`, `/magazine`, `/transparency` (캠페인·매거진) | `bg-canvas-soft`    | **`bg-canvas-soft` 유지** — 따뜻한 챕터로 의도적 사용             |
| Hero / 다크 챕터                                                       | charcoal 그라디언트 | **`#1F2428` 단색** + 작품 이미지가 색 (Apple `surface-tile` 모델) |

이건 토큰 추가만으로 가능: `gallery-canvas`, `gallery-pearl`, `gallery-tile` 같은 새 토큰 도입.

### 2번째 문제: 두 개의 액센트 색

현재 `primary #2176FF`(블루)와 `accent #F79824`(테라코타)가 동시에 CTA에 사용 중. 갤러리 모델은 단 하나의 액센트 색만 허용 (Apple `#0066cc`, Tesla `#3E6AE1`, Notion `#0075de`, Pinterest `#e60023`).

**제안**: **Primary blue 단일화**. accent(테라코타)는 캠페인 페이지(/about, /our-reality)에서만 보존, 커머스에서는 제거.

이유: 작품 페이지에서 오렌지 CTA는 작품 자체 색과 충돌. 차분한 inky blue가 작품 어떤 색과도 안 부딪힘.

### 3번째 문제: 호버 인터랙션이 SaaS 제품 톤

```ts
// button-base.ts 현재
'hover:scale-[1.02] hover:shadow-lg';
```

갤러리 사이트는 호버에 scale·translate 안 씀. Apple, Tesla, Figma 모두 그림자/색만 변화. SAF의 `scale-[1.02]` + `translate-y-1` + shadow 3종 세트는 **현대미술 사이트에서 가장 어색한 디테일**.

### 4번째 문제: Sun yellow를 배경에 쓸 위치

`bg-sun-soft #FEE9A3`이 강조 섹션 배경으로 등록되어 있는데, 갤러리 모델에서는 작품 외 색면이 인터페이스에 들어오면 안 됨. **sun은 통계 숫자 강조 전용으로만 유지**, 섹션 배경 사용처는 제거.

### 5번째 문제: Sawtooth Divider — 양면

이건 SAF의 시그니처 디테일. Apple/Tesla 같은 사이트엔 없음.

**판단**: **유지 권장**. 단, **위치 조정** — 갤러리 챕터 사이에는 사용 금지(흰 벽이 끊김), 캠페인 챕터 ↔ 갤러리 챕터 경계, Footer 위 같은 의미 있는 전환 지점에만. 이렇게 하면 SAF가 generic Apple 클론으로 안 보이는 정체성 유지 가능.

---

## 4. 재구성된 약점 목록 (갤러리 기준)

| #   | 현재                                                                                 | 갤러리 모델 위반                        | 제안                                                                         |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------- |
| W1  | body bg `canvas-soft #FFF9E8`                                                        | 흰 벽 아님                              | 커머스 페이지 `bg-white` / 캠페인 페이지만 canvas 유지                       |
| W2  | 두 액센트(primary + accent)                                                          | 단일 액센트 룰                          | **primary 단일화**, accent는 캠페인 페이지 한정                              |
| W3  | 호버 `scale-[1.02]` + translate                                                      | 갤러리는 정적                           | scale/translate 제거, 색·border만 변화                                       |
| W4  | sun-soft 섹션 배경                                                                   | chrome에 색 금지                        | sun은 통계 숫자 강조 전용                                                    |
| W5  | 작품 카드에 호버 `shadow-xl`                                                         | Apple 모델: 작품에 시그니처 단일 그림자 | 작품 호버는 그림자만 미세하게 깊이                                           |
| W6  | 모든 카드 `rounded-2xl`                                                              | 갤러리는 보통 0~4px (도록 톤)           | **작품 이미지: rounded-none** 또는 `rounded-sm`. 작품 외 카드만 `rounded-lg` |
| W7  | 메타 정보(매체·연도·사이즈) 위계 약함                                                | 갤러리는 mono uppercase 캡션            | `text-eyebrow` 도입: mono 12px UPPERCASE tracking-wide                       |
| W8  | 다크 챕터에 `bg-gradient-to-br from-charcoal-deep via-charcoal to-primary-strong/70` | Apple 모델: 단색 다크 surface           | 다크 hero를 `bg-charcoal-deep` 단색으로                                      |
| W9  | 작품 카드 hover에 `-translate-y-1`                                                   | 갤러리 작품은 들어올리지 않음           | 호버는 image 미세 zoom(`scale-[1.02]` IMG에만) 또는 캡션 페이드인만          |

---

## 5. 구체 변경 제안 (재정렬)

### Phase 1 — 토큰/유틸리티 추가 (무위험)

```ts
// lib/colors.ts에 추가
gallery: {
  canvas: '#FFFFFF',           // 흰 갤러리 벽 (커머스 기본)
  pearl: '#FAFAFC',            // 미세 농도 차 챕터 1
  parchment: '#F5F5F7',        // 미세 농도 차 챕터 2
  hairline: '#E0E0E0',         // 작품 카드 1px border
  divider: '#F0F0F0',          // 섹션 divider
  tile: '#1F2428',             // 다크 챕터 단색 (charcoal-deep와 동일)
}
```

```ts
// tailwind.config.ts boxShadow 추가
boxShadow: {
  'gallery-artwork': '0 20px 40px -12px rgba(0,0,0,0.12)',     // 작품 이미지 시그니처
  'gallery-hover': '0 30px 60px -15px rgba(0,0,0,0.18)',       // 호버 시 깊이
}
```

```css
/* globals.css에 추가 */
@layer utilities {
  .text-eyebrow {
    @apply font-mono text-[11px] uppercase tracking-[0.15em] text-charcoal-muted;
  }
  .text-caption-meta {
    /* 매체·연도·사이즈 */
    @apply font-mono text-xs uppercase tracking-wider text-charcoal-soft;
  }
  .text-artwork-title {
    /* 작품명: 이탤릭 가능 */
    @apply font-display text-2xl md:text-3xl tracking-tight;
  }
}
```

### Phase 2 — 시범 페이지 (1주)

**시범 대상: `/artworks` (작품 갤러리)** — 임팩트 가장 크고 갤러리 모델 핵심.

변경:

1. 페이지 컨테이너 bg `bg-white`로 (`canvas-soft` 제거)
2. ArtworkCard 호버에서 `scale`, `translate`, `shadow-xl` 제거 → `shadow-gallery-artwork` 단일 + 이미지 미세 줌만
3. 작품 카드 라벨을 `text-eyebrow` + `text-artwork-title` + `text-caption-meta`로 재구성
4. CTA "구매하기"는 primary 한 색으로 통일
5. SawtoothDivider 사용 위치 조정

### Phase 3 — 핵심 컴포넌트 (조건부)

Phase 2 검증 후:

- `Card.tsx` `hoverable` 기본 동작에서 scale/translate 제거 → 자동 전파
- `button-base.ts`의 `hover:scale-[1.02]` 전체 제거
- `/`, `/artists/[slug]`, `/artworks/[id]` 페이지 적용
- 다크 hero 단색화 (`PageHero` 컴포넌트)

### Phase 4 — 캠페인 페이지 분리 톤 (장기)

`/about`, `/our-reality`, `/magazine`, `/transparency`는 **의도적으로** `canvas-soft` + `accent` 테라코타 보존. 갤러리 챕터와 캠페인 챕터의 명확한 톤 분리가 SAF 정체성.

이 분리를 [docs/DESIGN.md](DESIGN.md)에 명시: "Gallery surfaces" vs "Editorial surfaces".

---

## 6. 무엇을 절대 건드리지 말 것

|                                                                    | 이유                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Sawtooth Divider                                                   | SAF 시그니처. 갤러리/매거진 경계에만 — 사용처 줄이되 보존                      |
| Korean font stack (Paperlogy + PartialSansKR + HakgyoansimPosterB) | 한국어 캠페인 정체성, 커스텀 폰트 교체는 비용 대비 효과 작음                   |
| BRAND_COLORS WCAG AA 검증 결과                                     | 모든 색 결정의 전제                                                            |
| 캠페인 톤 (canvas + accent)                                        | 의미를 잃으면 SAF가 아님 — 갤러리 페이지에서만 빠지고 캠페인 페이지에서는 보존 |

---

## 7. 결정해야 할 핵심 질문

이 제안서는 두 톤 시스템(갤러리 + 매거진)을 가정합니다. 그러나 다른 선택지도 있음:

**옵션 A — 두 톤 시스템** (이 제안)

- 커머스(/, /artworks, /artwork/[id], /artists) = 흰 갤러리
- 캠페인(/about, /our-reality, /magazine) = 따뜻한 매거진
- 장점: 각 영역의 본질에 충실
- 단점: 일관성이 낮아 보일 수 있음

**옵션 B — 전체 갤러리 톤**

- 모든 페이지를 흰 갤러리로 통일
- 캠페인 메시지는 타이포·콘텐츠로만 표현, 색·배경 따뜻함 포기
- 장점: 강한 단일 정체성, 톱 갤러리 사이트와 동급
- 단점: 캠페인 메시지 따뜻함 약화

**옵션 C — 전체 매거진 톤** (현재)

- 지금 유지, 갤러리 디테일만 부분 보강
- 장점: 작업량 작음, 정체성 유지
- 단점: 작품 색 정확도 문제 안 풀림 (가장 큰 문제)

**제 추천: 옵션 A**. 이유: 작품 색 정확도는 커머스에서 양보 못 함. 그러나 SAF의 사회적 의미를 색·배경으로 표현하는 캠페인 페이지를 통째로 흰 캔버스로 바꾸는 건 정체성 손실. 두 톤 분리가 둘 다 살림.

---

## 8. 다음 액션

지금 결정 필요:

1. **A/B/C 중 어느 옵션** — 이거 정해야 다음 단계 짤 수 있음
2. **Phase 1 즉시 진행 여부** — 토큰/유틸 추가는 무위험, 결정 빠르면 바로 가능
3. **시범 페이지** — `/artworks` (옵션 A·B)가 임팩트 최대, 검증 후 전파

원하시면 옵션 A 가정 하에 Phase 1을 PR로 묶어 드리겠습니다.
