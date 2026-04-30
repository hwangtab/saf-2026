# SAF 2026 — DESIGN.md

> 현재 시스템 스냅샷 (2026-04-29 기준). 디자인 리뉴얼 시 비교 기준점으로 사용.
> 단일 출처: [lib/colors.ts](../lib/colors.ts), [tailwind.config.ts](../tailwind.config.ts), [styles/globals.css](../styles/globals.css), [app/layout.tsx](../app/layout.tsx).

---

## 1. Visual Theme & Atmosphere

**한 줄 정체성**: 따뜻한 종이 캔버스 위의 사회적 매거진 — Soft Sand 바탕에 진중한 자카드(charcoal) 텍스트, 한국형 디스플레이 폰트의 묵직함, 톱니(SawtoothDivider)가 만드는 인쇄물·우표 같은 손맛.

**무드**: 매거진 / 캠페인 포스터 / 출판물. 디지털 SaaS 제품의 차가운 미니멀리즘이 아니라, **종이·잉크·갤러리 도록**에 가까운 질감.

**밀도**: 중간. 통계·수치는 큰 면적으로 과감히 띄우되, 본문과 카드 그리드는 절제된 여백.

**디자인 철학**:

- 사회적 캠페인이라는 주제 무게에 어울리는 **에디토리얼 진중함**
- 그러나 갤러리 작품을 다루므로 **따뜻함과 호흡**도 필요 → canvas 계열 배경
- 한국어 가독성 최우선: `word-break: keep-all`, `text-balance` 전역 적용
- WCAG AA 준수가 모든 색 결정의 전제

---

## 2. Color Palette & Roles

> 전체 토큰: [lib/colors.ts](../lib/colors.ts). Tailwind 기본 팔레트(`indigo`, `blue`, `slate`, `red`, `green`, `amber`, `sky`, `teal`, `orange`)는 **금지** — 모두 브랜드 토큰 사용.

### Primary (브랜드 블루 — Crayola Blue)

| 토큰              | Hex       | 역할                                     |
| ----------------- | --------- | ---------------------------------------- |
| `primary.DEFAULT` | `#2176FF` | 큰 텍스트/UI 전용 (4.12:1)               |
| `primary.soft`    | `#D2E1FF` | 카드 배경, 인포 박스                     |
| `primary.strong`  | `#0E4ECF` | **링크 텍스트, 강조**, 호버 (6.98:1, AA) |
| `primary.surface` | `#EDF3FF` | 가장 옅은 면 — 정보 섹션 배경            |
| `primary.a11y`    | `#1565D8` | 본문 텍스트 (4.63:1, AA)                 |

### Accent (테라코타 오렌지 — Carrot)

| 토큰             | Hex       | 역할                                       |
| ---------------- | --------- | ------------------------------------------ |
| `accent.DEFAULT` | `#F79824` | **CTA 버튼**, 기부 유도 (장식 전용 2.22:1) |
| `accent.soft`    | `#FFD4A3` | 강조 박스 배경                             |
| `accent.strong`  | `#D97800` | CTA 호버                                   |
| `accent.a11y`    | `#B45309` | 텍스트 가능 (4.78:1, AA)                   |

### Sun (강조 옐로우 — Sun Glow)

| 토큰          | Hex       | 역할                                              |
| ------------- | --------- | ------------------------------------------------- |
| `sun.DEFAULT` | `#FDCA40` | **숫자·통계·가격 강조 전용** — 배경/CTA 사용 금지 |
| `sun.soft`    | `#FEE9A3` | 섹션 배경(highlight 전용)                         |
| `sun.strong`  | `#E3AC0D` | 텍스트                                            |

### Canvas (배경 — Soft Sand)

| 토큰             | Hex       | 역할                                |
| ---------------- | --------- | ----------------------------------- |
| `canvas.DEFAULT` | `#FFF6DD` | 페이지 캔버스 메인                  |
| `canvas.soft`    | `#FFF9E8` | **body 기본 배경** (가장 옅은 sand) |
| `canvas.strong`  | `#F3E2AA` | sand core, 강조 면                  |

### Charcoal (텍스트)

| 토큰               | Hex       | 대비율        | 용도        |
| ------------------ | --------- | ------------- | ----------- |
| `charcoal.deep`    | `#1F2428` | 14.68:1 (AAA) | 헤딩        |
| `charcoal.DEFAULT` | `#31393C` | 11.79:1 (AAA) | 본문        |
| `charcoal.muted`   | `#555E67` | 6.60:1 (AA)   | 보조 텍스트 |
| `charcoal.soft`    | `#6A7378` | 4.84:1 (AA)   | 캡션·헬퍼   |

### Status & Gray

- `success`: `#2E9F7B` / a11y `#1D7A5F`
- `danger`: `#D94F45` / a11y `#B91C1C`
- `warning`: `#FDCA40` (= sun)
- Gray scale: `gray-50 #F7F8FA` → `gray-900 #1F2428` (slate 팔레트는 비활성화)

### 핵심 룰

1. **slate-\* 사용 금지** (tailwind config에서 비활성화)
2. **CTA = accent**, **링크 = primary-strong**, **숫자 강조 = sun**, **배경 = canvas/canvas-soft/sun-soft**
3. 차트·OG 이미지·Satori 등 hex 직접 필요 시 반드시 `import { BRAND_COLORS } from '@/lib/colors'`

---

## 3. Typography Rules

**Noto Sans KR 단일 패밀리** (`next/font/google`, 자동 self-host + unicode-range chunked).
weight로 위계 표현 — Hero/Section/Body 모두 같은 폰트, 굵기로만 구분.

| 변수          | 폰트         | weight 호출         | display |
| ------------- | ------------ | ------------------- | ------- |
| `--font-sans` | Noto Sans KR | 400/500/600/700/900 | swap    |

Tailwind weight ↔ Noto Sans KR 호출:

| 클래스          | weight | 용도               |
| --------------- | ------ | ------------------ |
| `font-normal`   | 400    | 본문               |
| `font-medium`   | 500    | 강조 본문, eyebrow |
| `font-semibold` | 600    | 일반 강조          |
| `font-bold`     | 700    | 섹션·카드 제목     |
| `font-black`    | 900    | Hero·작품 타이틀   |

> `font-light` (300), `font-thin` (100), `font-extralight` (200), `font-extrabold` (800)는 미호출 — 이 weight 사용 시 브라우저 합성 굵기로 떨어지므로 사용 금지.
> `font-display` / `font-section` 토큰은 `font-sans`와 같은 폰트를 가리키되 의미적 구분만 유지 (위계는 weight로).

### 유틸리티 클래스 ([globals.css](../styles/globals.css))

| 클래스                | Tailwind                                                                 | 비고                    |
| --------------------- | ------------------------------------------------------------------------ | ----------------------- |
| `.text-hero`          | `font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight` | Noto Sans KR 900 (Hero) |
| `.text-section-title` | `font-section font-bold text-4xl md:text-5xl leading-snug`               | Noto Sans KR 700        |
| `.text-artwork-title` | `font-display font-black text-2xl md:text-3xl tracking-tight`            | Noto Sans KR 900        |
| `.text-card-title`    | `font-sans font-bold text-xl leading-normal`                             | Noto Sans KR 700        |
| `.text-body-large`    | `font-sans text-lg md:text-xl leading-relaxed`                           | Noto Sans KR 400        |
| `.text-label`         | `font-sans text-sm text-charcoal-muted`                                  | Noto Sans KR 400        |
| `.text-helper`        | `font-sans text-xs text-charcoal-soft`                                   | Noto Sans KR 400        |

### 한국어 룰 (전역 강제)

- `html { word-break: keep-all; overflow-wrap: break-word; }`
- `.text-balance { text-wrap: balance; }` — 한 줄에 한 어절이 외롭게 떨어지지 않도록
- 본문 line-height: `1.6`

---

## 4. Component Stylings

### Button ([components/ui/Button.tsx](../components/ui/Button.tsx) + [button-base.ts](../components/ui/button-base.ts))

베이스: `font-bold rounded-lg transition-all duration-300`. 호버 시 `scale-[1.02]` + shadow.

| variant         | 배경                    | 호버                | 사용처         |
| --------------- | ----------------------- | ------------------- | -------------- |
| `primary`       | `bg-primary` (블루)     | `bg-primary-strong` | 기본 액션      |
| `secondary`     | `bg-gray-900`           | `bg-gray-800`       | 어두운 면      |
| `accent`        | `bg-accent` (테라코타)  | `bg-accent-strong`  | **CTA / 기부** |
| `outline`       | 흰 배경 + gray-200 보더 | 보더 → primary      | 보조 액션      |
| `outline-white` | 투명 + white/50 보더    | 흰 배경             | 다크 히어로 위 |
| `white`         | 흰 배경                 | 보더 → primary      | 강조 면 위     |
| `ghost`         | 투명                    | gray-100 배경       | 인라인         |
| `ghost-white`   | 투명                    | white/10 배경       | 다크 위        |

| size | 패딩          | 텍스트 | 최소 높이   |
| ---- | ------------- | ------ | ----------- |
| `xs` | `px-3 py-1.5` | sm     | 36px        |
| `sm` | `px-4 py-2`   | sm     | 44px (터치) |
| `md` | `px-6 py-2.5` | base   | 44px (터치) |
| `lg` | `px-8 py-4`   | lg     | 52px        |

### Card ([components/ui/Card.tsx](../components/ui/Card.tsx))

```tsx
'rounded-2xl border border-gray-200 bg-white shadow-sm';
// hoverable: 'hover:-translate-y-1 hover:shadow-xl' transition 300ms
```

### Badge ([components/ui/Badge.tsx](../components/ui/Badge.tsx))

`inline-flex items-center rounded-full text-xs font-medium`

| tone              | 색                               |
| ----------------- | -------------------------------- |
| `default`         | gray-100 / charcoal-muted        |
| `info`            | primary-surface / primary-strong |
| `success`         | success/10 / success-a11y        |
| `warning`         | sun-soft / sun-strong            |
| `danger`          | danger/10 / danger-a11y          |
| `outline-primary` | 보더 primary                     |

### Section ([components/ui/Section.tsx](../components/ui/Section.tsx))

배경 variant 12종 (`white`, `gray`, `canvas`, `canvas-soft`, `primary`, `primary-soft`, `primary-surface`, `accent`, `accent-soft`, `sun`, `sun-soft`, `red`). `prevVariant` 지정 시 위 섹션과 자동 그라디언트 전환.

패딩: `default: py-12 md:py-20` / `sm: py-8 md:py-12`.

### PageHero ([components/ui/PageHero.tsx](../components/ui/PageHero.tsx))

- 그라디언트 `from-charcoal-deep via-charcoal to-primary-strong/70`
- `min-h-[60vh]`, 흰 텍스트, 라디얼 액센트 오버레이
- 작품 이미지 배경(`customBackgroundImage`) 시 `bg-black/60` 오버레이
- 하단에 항상 `SawtoothDivider position="bottom"`

### SawtoothDivider ([components/ui/SawtoothDivider.tsx](../components/ui/SawtoothDivider.tsx))

**프로젝트의 시그니처 디테일.** 톱니 패턴(모바일 24px / 데스크톱 40px)으로 섹션 경계를 표현. SVG 패턴 기반.

- `position="top"`은 위 섹션의 마지막 24~40px를 덮음 → 위 컨테이너에 `SAWTOOTH_TOP_SAFE_PADDING = 'pb-24 md:pb-32'` 필수
- 색 지정: `colorClass="text-canvas-soft"` 등

### Rounded radius 표준 매핑

라운드 반경은 컴포넌트 위계와 1:1로 매핑. 같은 위계의 컴포넌트는 같은 반경을 사용해 시각 리듬을 유지함. 현재 코드 분포(2026-04 기준): `rounded-md` 122건 / `rounded-lg` 206건 / `rounded-xl` 52건 / `rounded-2xl` 134건 / `rounded-full` 162건 / `rounded-3xl` 0건.

| 토큰           | 반경 | 표준 사용처                                                            |
| -------------- | ---- | ---------------------------------------------------------------------- |
| `rounded-md`   | 6px  | Input·작은 칩·인디케이터                                               |
| `rounded-lg`   | 8px  | **Button** (button-base default)·작은 카드·뱃지 컨테이너               |
| `rounded-xl`   | 12px | 중간 카드·작은 다이얼로그·alert 박스                                   |
| `rounded-2xl`  | 16px | **Card·Section 카드·메인 컨텐츠 컨테이너** (DESIGN.md §4 Card 표준)    |
| `rounded-full` | ∞    | 점 인디케이터·아바타·circular 버튼·`Badge` (`tone='info'` 등)          |
| `rounded-3xl`  | 24px | **사용 금지** (현재 0건 — 매거진 톤과 어울리지 않음, 의도적 제한 유지) |

같은 컨테이너 안에서 라운드 반경을 섞지 말 것 — 큰 카드 안의 작은 칩이라면 카드 `rounded-2xl` + 칩 `rounded-md` 식으로 위계가 명확해야 함. 동일 위계의 형제 요소가 서로 다른 반경을 가지면 시각 정렬이 깨짐.

---

## 5. Layout Principles

### 컨테이너

```css
.container-max {
  @apply max-w-screen-xl mx-auto px-4 sm:px-5;
}
```

`max-w-screen-xl` = 1280px. 좌우 여백 모바일 16px / sm+ 20px.

### 그리드 / 브레이크포인트

| BP   | 폭     | 전환                                      |
| ---- | ------ | ----------------------------------------- |
| `sm` | 640px  | 본문 여백 확대                            |
| `md` | 768px  | 2열 시작, SawtoothDivider 데스크톱 사이즈 |
| `lg` | 1024px | **모바일/데스크톱 네비 전환**             |
| `xl` | 1280px | container-max 도달                        |

### 여백 철학

- 섹션 간: `py-12 md:py-20` (Section default)
- 카드 간: `gap-6` ~ `gap-8`
- Footer 위 안전 여백: `pb-24 md:pb-32` (SAWTOOTH_TOP_SAFE_PADDING)
- 터치 타겟: 최소 44px (`min-h-[44px]`)

### Spacing 표준

| 영역                      | 클래스                           | 비고                                  |
| ------------------------- | -------------------------------- | ------------------------------------- |
| 섹션 간 (vertical rhythm) | `py-12 md:py-20`                 | Section default                       |
| 카드 그리드 gap           | `gap-6` (모바일) ~ `gap-8` (md+) | 같은 행 카드 사이                     |
| Footer 안전 패딩          | `pb-24 md:pb-32`                 | `SAWTOOTH_TOP_SAFE_PADDING` 상수 사용 |
| Hero top                  | `pt-16 md:pt-20`                 | 헤더 높이 보정 포함                   |
| Hero bottom               | `pb-24 md:pb-32`                 | SawtoothDivider 안전 영역             |

#### 카드 내부 패딩 (위계별)

| 위계 | 클래스                       | 사용처                                 |
| ---- | ---------------------------- | -------------------------------------- |
| 작음 | `p-4` (16px)                 | 칩·작은 정보 카드·테이블 셀 컨테이너   |
| 일반 | `p-6` (24px)                 | **Card 기본**·뱃지·아이콘 박스         |
| 강조 | `p-8` (32px) ~ `p-10` (40px) | 메인 CTA 카드·Hero 내부 박스·증언 카드 |

#### Line-height 표준

| 클래스            | 값    | 사용처                                         |
| ----------------- | ----- | ---------------------------------------------- |
| `leading-tight`   | 1.25  | Hero 타이틀 (`.text-hero`)                     |
| `leading-snug`    | 1.375 | 헤딩·섹션 타이틀 (`.text-section-title`)       |
| `leading-normal`  | 1.5   | Card 타이틀 (`.text-card-title`)               |
| `leading-relaxed` | 1.625 | **본문 기본** (`.text-body-large`·매거진 본문) |

본문은 한국어 가독성을 위해 `leading-relaxed`가 default. `leading-loose` (2.0)는 쓰지 않음 — 줄 사이가 끊겨 보임.

---

## 6. Depth & Elevation

매우 절제됨. 강한 그림자 거의 없음.

| 레이어         | 그림자                    | 용례                     |
| -------------- | ------------------------- | ------------------------ |
| Surface        | `shadow-sm`               | Card, ArtworkCard        |
| Hover          | `shadow-md` ~ `shadow-lg` | 버튼 호버, 카드 들어올림 |
| Modal/Lightbox | `shadow-xl`               | Modal, 작품 라이트박스   |
| Hero text      | `drop-shadow-lg`          | 다크 히어로 위 흰 텍스트 |

호버 인터랙션: `hover:-translate-y-1` (들어올림) + shadow 동시 사용. `transition-[transform,box-shadow] duration-300 ease-out`.

`@media (hover: none)` 가드: 터치 디바이스에서는 hover scale/translate/shadow 모두 끔 — sticky hover 방지.

### Transition duration 표준

전환 시간은 **인터랙션의 무게**에 매핑. 너무 짧으면 잘려 보이고, 너무 길면 응답성이 떨어짐. 현재 코드 분포(2026-04 기준): `duration-200` 16건 / `duration-300` 56건 / `duration-500` 16건 / `duration-700` 2건.

| 클래스         | 시간  | 표준 사용처                                                       |
| -------------- | ----- | ----------------------------------------------------------------- |
| `duration-150` | 150ms | **사용 금지** — 너무 빠름, 끊겨 보임. 대신 `duration-200`         |
| `duration-200` | 200ms | hover·active·focus 같은 즉각 반응 (Button hover, link underline)  |
| `duration-300` | 300ms | **default** — Card hoverable, color/background 변화, 일반 UI 전환 |
| `duration-500` | 500ms | 큰 시각 변화 (이미지 zoom, slide-in, masonry reveal)              |
| `duration-700` | 700ms | **사용 자제** — 정말 필요한 큰 reveal에만 (현재 2건, 검토 권장)   |

`transition-[transform,box-shadow]` 등 **속성 분리 표기**는 그대로 유지 — `transition-all`보다 비용이 낮고 불필요한 속성 변화가 트리거되지 않음. 호버 인터랙션에서는 `transition-[transform,box-shadow] duration-300 ease-out` 패턴을 default로 사용.

---

## 7. Do's and Don'ts

### ✅ Do

- 색은 항상 `BRAND_COLORS` 토큰 사용 (`text-charcoal-deep`, `bg-canvas-soft`, `text-primary-strong`)
- 사용자 노출 텍스트는 next-intl 메시지로 (`messages/ko.json` + `useTranslations`)
- 이미지: **모두 `SafeImage`로 통일** (`@/components/common/SafeImage`). Vercel Image Optimization 기반으로 Supabase URL 자동 정규화 + onError 1x1 투명 fallback 포함
- 한국어는 `text-balance` + `keep-all` 활용 — 어색한 줄바꿈 방지
- 새 hero 페이지 추가 시 [lib/hero-routes.ts](../lib/hero-routes.ts)에 등록
- Button·LinkButton의 `leadingIcon`/`trailingIcon` prop 사용 — 텍스트 옆에 화살표 직박 금지
- 화살표·아이콘은 [lucide-react](https://lucide.dev) 컴포넌트 사용 (`ArrowRight`, `ChevronDown`, `ExternalLink` 등)
- 이모지는 **콘텐츠 영역**(매거진 본문·증언·아티클)에만 사용. 구조적 UI(버튼·뱃지·메뉴 라벨)에는 lucide 아이콘만

### ❌ Don't

- `slate-*`, `indigo-*`, `blue-*`, `red-*`, `green-*`, `amber-*`, `sky-*`, `teal-*`, `orange-*` Tailwind 기본 팔레트
- `import Image from 'next/image'` 직접 사용 — 대신 `SafeImage` 사용 (Supabase URL 정규화·onError fallback 미동작 방지). 단 `SafeImage` 자체 구현체는 예외
- 배지·상태 라벨에 한글 리터럴 박기 (`"예약중"`, `"SOLD"` 직박 금지)
- `pathname.startsWith('/foo')` 하드코딩 (대신 `isHeroRoute(pathname)`)
- `pb-12` 같은 짧은 하단 패딩 (SawtoothDivider에 묻힘)
- `sun.DEFAULT`를 배경/CTA로 사용 (강조 전용)
- 공개 라우트에 skeleton `loading.tsx` 추가
- 출품 작가를 "금융 차별 피해자"로 프레이밍 (CLAUDE.md 캠페인 구조 참조)
- **텍스트 화살표 직박** (`>`, `→`, `↓`, `‹`, `›`) — 폰트 baseline 어긋남, lucide SVG 컴포넌트 사용 필수
- **구조적 UI에 이모지 사용** — 버튼·뱃지·메뉴 등은 lucide만. 콘텐츠 본문은 OK
- `duration-150` / `duration-700` — 표준 어긋남 (200/300/500이 표준, §6 Transition duration 참조)
- `rounded-3xl` — 매거진 톤과 어울리지 않음 (§4 Rounded radius 표준 참조)

---

## 8. Responsive Behavior

- **모바일 우선**. 768px / 1024px가 핵심 분기
- 1024px(`lg`)에서 모바일 햄버거 → 데스크톱 인라인 네비
- 터치 타겟 최소 44px (Button sm/md 기본 충족)
- 호버 효과는 `@media (hover: none)`에서 자동 비활성
- safe-area: `spacing.safe = max(1rem, env(safe-area-inset-bottom))`
- `prefers-reduced-motion`: 모든 애니메이션 0.01ms로 단축

---

## 9. Agent Prompt Guide

### 빠른 색 참조

```
배경:           #FFF9E8 (canvas-soft)
페이지 캔버스:  #FFF6DD (canvas)
본문 텍스트:    #31393C (charcoal)
헤딩:           #1F2428 (charcoal-deep)
링크/강조 블루: #0E4ECF (primary-strong)
CTA 오렌지:     #F79824 (accent)
숫자 강조:      #FDCA40 (sun) — 배경 사용 금지
보더:           #D1D7E0 (gray-200)
```

### 빠른 클래스 조합

```tsx
// 페이지 컨테이너 (Footer 위)
<div className={`min-h-screen ${SAWTOOTH_TOP_SAFE_PADDING}`}>

// 컨텐츠 폭
<div className="container-max">

// 섹션 헤더
<h2 className="text-section-title text-balance text-center">

// 본문
<p className="text-body-large text-charcoal">

// CTA
<Button variant="accent" size="lg">기부하기</Button>

// 카드
<Card hoverable className="p-6">
```

### 에이전트에게 줄 프롬프트 예시

> "이 페이지는 사회적 캠페인의 일부입니다. 톤은 매거진/포스터에 가깝고, 차가운 SaaS 미니멀리즘은 피하세요. 배경은 `bg-canvas-soft`, 본문은 `text-charcoal`, CTA는 `Button variant=accent`를 사용하세요. 섹션 경계가 필요하면 `<SawtoothDivider position=bottom>`을 쓰고, 위 컨테이너에 `SAWTOOTH_TOP_SAFE_PADDING`을 추가하세요. Tailwind 기본 팔레트(blue/red/green 등)는 절대 사용하지 말고 모두 브랜드 토큰을 쓰세요."

---

## Appendix: 리뉴얼 시 검토 후보

현재 시스템에서 **건드리면 안 되는 것** (강한 정체성):

- Soft Sand 캔버스 (`canvas-soft #FFF9E8`)
- SawtoothDivider 톱니 디테일
- Noto Sans KR 단일 패밀리 (weight로만 위계 표현)
- WCAG AA 모든 색 검증

**리뉴얼에서 검토할 만한 것**:

- Primary 블루(`#2176FF`)가 캔버스 톤과 강도 차이 큼 — 더 데시추레이트된 잉크 블루로?
- 카드 `rounded-2xl`이 매거진 톤과 어울리는지 (잡지는 보통 0~4px)
- `shadow-sm/md/lg/xl` 4단계가 종이 질감과 충돌 — flat + border만으로?
- 모든 섹션 패딩 `py-12 md:py-20` 일률 — 챕터 구조 강조 위해 가변화?
- 단일 패밀리 통합으로 폰트 위계 정리됨 (2026-04 기준)
