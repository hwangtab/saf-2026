# 거장 미전용 5명 전용 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 거장 미전용 5명(박재동·류연복·김준권·최병수·조문호)에게 신학철 수준의 전용 큐레이션 페이지를 만든다.

**Architecture:** 각 작가 = 신규 전용 컴포넌트. `ShinHakchulFeature.tsx`를 구조 모델로 복제(export 시그니처·import·normalizer·JSON-LD 패턴)하고, WebSearch로 검증한 작가별 콘텐츠(hero·bio 5문단+·sub-essay 2~4·quote·전시카드·연표·갤러리)로 채운다. `page.tsx` dispatch + a11y ROUTES 등록. ko/en 병기.

**Tech Stack:** Next.js 16 App Router (Server Component), TypeScript strict, Tailwind 브랜드 토큰, next-intl `isEnglish` 분기, WebSearch.

---

## 작업 환경

- 워크트리: `/Users/hwang-gyeongha/saf-2026/.worktrees/master-tier2`, 브랜치 `feat/master-artists-untiered-5` (origin/main 기준)
- **첫 실행 전 1회**: `npm ci`
- **푸시 정책: 머지 보류.** 커밋만 쌓고 push·merge 하지 않는다 (사용자가 나중에 한번에).

## 공통 규칙 (모든 작가 task)

**복제 모델:** `components/special/master-artists/ShinHakchulFeature.tsx` (origin/main, 이번 세션에서 심화 완료). 이 파일을 읽고 다음을 복제:
- export: `export default async function <Name>Feature({ params })` + `export async function build<Name>Metadata({ params }): Promise<Metadata>`
- import 블록(MasterArtistMediumSections, JsonLdScript, PaperGrain, OG_IMAGE/SITE_URL/CONTACT, seo-utils, locale-alternates, getSupabaseArtworksByArtist, resolveLocale, resolveSeoArtworkImageUrl, types)
- `<ARTIST>_PATH = /artworks/artist/${encodeURIComponent('<한글이름>')}`, `normalizeArtistKey` + `is<Name>Artist` normalizer
- 섹션 골격: PaperGrain → hero(`data-hero-sentinel`) → bio grid → sub-essay 섹션 → 전시·소장 카드 → 연표 → 상호부조 배너 → 갤러리(`MasterArtistMediumSections` + 0점 fallback) → JSON-LD(breadcrumb/ExhibitionEvent/Person/ItemList/AggregateOffer)

**사실성 게이트 (위반 = 요소 삭제):**
- 추가 전기·전시·수상·인용은 WebSearch 교차검증, 출처 URL 확보. 1차 출처/권위 매체 우선.
- **quote는 출처 있는 실제 발언만.** 위조 금지. 검증 불가 시 생략.
- 미검증 구체 사실(작품명·연도·치수·수치)은 제외하거나 일반화("등 다수"). 추측 금지.
- 캠페인 "연대자" 프레이밍. 금융 피해 당사자 묘사 금지.
- 기존 DB `bio`/`history`를 1차 재료로 활용하되, 사실은 WebSearch로 교차확인.

**색상·i18n:**
- 브랜드 토큰만. `slate-*`/`indigo-*`/`blue-*`, raw sun-hex 그림자 금지. `bg-primary`+`text-white`+소형 텍스트 금지.
- ko/en 전체 병기, 영문 동일 깊이. 영문 메타 `robots: { index: false, follow: true }`.

**sub-essay JSX 패턴** (신학철에서 차용):
```tsx
<div className="space-y-10">
  <div>
    <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
      <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">1</span>
      {isEnglish ? 'English heading' : '한글 소제목'}
    </h3>
    <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
      <p>{isEnglish ? 'English…' : '한글…'}</p>
    </div>
  </div>
</div>
```

**각 작가 task 공통 절차 (Step 형식):**
- Step 1: WebSearch 사실 검증 (해당 task의 검증 항목)
- Step 2: 신학철 복제로 컴포넌트 작성 — hero(작가별 모티프) + bio 5문단+ + sub-essay 2~4 + quote(검증 시) + 전시·소장 카드 + 연표 + 갤러리 + JSON-LD, ko/en
- Step 3: 검증 — `npm run type-check` PASS / `npx eslint <파일>` clean / `grep -nE "slate-|indigo-|\bbg-blue|text-blue-|rgba\(247" <파일>` 빈 결과
- Step 4: 커밋 (아래 메시지)
- (Step 5: 각 task 후 컨트롤러가 fact reviewer 독립 재검증 → 미확인 사실 수정)

---

## Task 1: 환경 셋업

- [ ] **Step 1**: `cd /Users/hwang-gyeongha/saf-2026/.worktrees/master-tier2 && npm ci` → 설치 완료, `.husky/_/` 생성
- [ ] **Step 2**: `npm run type-check` → PASS (baseline)
- [ ] **Step 3**: `ShinHakchulFeature.tsx` 정독 (복제 모델). 커밋 없음.

---

## Task 2: 박재동 (Park Jae-dong) — `ParkJaedongFeature.tsx`

**Files:** Create `components/special/master-artists/ParkJaedongFeature.tsx`

**정체성:** 한국 시사만화의 대부. 한겨레 「그림판」. 작품 25점(시사만화/그림) — 갤러리 카피를 만화·그림에 맞게.

**검증 항목 (WebSearch):**
- 1952.12.20 출생(울산 울주?), 서울대 회화과 / 1974 만화 입문
- 한겨레신문 「그림판」 시사만화(1988~) 연재 기간·의미
- 「박재동의 한겨레 그림판」, 애니메이션(「오돌또기」 등 검증되는 것만), 한국예술종합학교 교수
- 출처 있는 박재동 발언

**sub-essay 후보 (검증된 것만 2~4개):** ① 한겨레 「그림판」 — 매일 아침의 시사만화 ② 만화라는 발언 ③ 애니메이션·미술교육

- [ ] Step 1~4 (공통 절차). hero 모티프: 만화/펜선·신문 칸 느낌(브랜드 토큰 내에서). 갤러리 헤더 카피 "작품"→만화·그림 톤.
- 커밋: `feat(master): 박재동 전용 거장 페이지 — 시사만화·그림판\n\n요약: 박재동(한국 시사만화의 대부) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 3: 류연복 (Ryu Yeonbok) — `RyuYeonbokFeature.tsx`

**Files:** Create `components/special/master-artists/RyuYeonbokFeature.tsx`

**정체성:** 칼로 새긴 민중·국토의 목판화. 1958년생. 공개작 4점. (DB bio 1,981자 활용)

**검증 항목 (WebSearch):**
- 1958년생, 홍익대 회화과(기존 SEO override 기재 — 확인), 민주화운동 참여
- 「봄」·국토 연작 등 검증되는 대표작명, 1980년대 민중판화 운동·두렁/광주 관련 여부(불확실하면 생략)
- 출처 있는 발언

**sub-essay 후보:** ① 칼로 새긴 민중의 삶 ② 국토·자연의 목판 ③ 1980년대 민중판화 운동

- [ ] Step 1~4. hero 모티프: 목판 칼선/나뭇결(charcoal 톤).
- 커밋: `feat(master): 류연복 전용 거장 페이지 — 목판화·국토\n\n요약: 류연복(칼로 새긴 민중·국토의 목판화가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 4: 김준권 (Kim Jungwon) — `KimJungwonFeature.tsx`

**Files:** Create `components/special/master-artists/KimJungwonFeature.tsx`

**정체성:** 나무에 새긴 40년, 수묵 목판화. 1955 영암 출생, 홍익대 미술교육과(1982). 공개작 4점. (DB bio 1,688자 활용)

**검증 항목 (WebSearch):**
- 1955 전남 영암 출생, 1982 홍익대 미술교육과, 교사→판화가 전향
- 수묵 목판화(수묵화 기법을 목판으로) 기법, 한국 산하 연작, 대표작·소장처
- 1980년대 민중판화 활동, 출처 있는 발언

**sub-essay 후보:** ① 수묵의 정신을 새긴 목판 ② 한국의 산하 ③ 교사에서 판화가로, 40년 외길

- [ ] Step 1~4. hero 모티프: 수묵 농담/산수(charcoal·canvas 톤).
- 커밋: `feat(master): 김준권 전용 거장 페이지 — 수묵 목판화\n\n요약: 김준권(나무에 새긴 40년, 수묵 목판화가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 5: 최병수 (Choe Byeongsu) — `ChoeByeongsuFeature.tsx`

**Files:** Create `components/special/master-artists/ChoeByeongsuFeature.tsx`

**정체성:** 걸개그림 「한열이를 살려내라」·환경미술. 1960 평택 출생. 공개작 1점 → **내러티브 중심** + 0점/소수 fallback. (DB bio 1,087자 활용)

**검증 항목 (WebSearch):**
- 1960 평택 출생, 목수·노동자 출신, 1987 「한열이를 살려내라」 걸개그림(이한열 추모) — 제작 경위
- 환경미술(남극 펭귄, 고래, 장승 등) 검증되는 작업, 1980년대 민중미술
- 출처 있는 발언

**sub-essay 후보:** ① 「한열이를 살려내라」 — 1987년의 걸개그림 ② 노동자에서 미술가로 ③ 환경·생명의 미술

- [ ] Step 1~4. hero 모티프: 걸개그림 대형 천/현장(charcoal). 작품 1점이므로 갤러리 fallback 카피 자연스럽게.
- 커밋: `feat(master): 최병수 전용 거장 페이지 — 걸개그림·환경미술\n\n요약: 최병수(「한열이를 살려내라」 걸개그림·환경미술가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 6: 조문호 (Jo Munho) — `JoMunhoFeature.tsx`

**Files:** Create `components/special/master-artists/JoMunhoFeature.tsx`

**정체성:** "사람만 찍는" 다큐멘터리 사진. 공개작 2점. **bio 233자로 짧음 → WebSearch 의존 높음**, 검증된 사실로만 구성(부족하면 가볍게 — 거짓보다 나음).

**검증 항목 (WebSearch):**
- 출생연도·지역, 다큐 사진가 경력, 청량리 사창가·인사동 풍류객·정선 만지산·쪽방촌 빈민 등 대표 작업
- 사진집(「청량리 588」 등 검증되는 것), 전시·수상
- 출처 있는 발언 (기존 bio "사람만 찍는 다큐멘터리 사진가다…"는 작가 본인 진술일 수 있으나 출처 확인)

**sub-essay 후보 (검증된 것만):** ① 사람만 찍는다 ② 청량리에서 정선까지 ③ 기록으로서의 사진

- [ ] Step 1~4. hero 모티프: 다큐 흑백사진 톤(charcoal). 검증 사실 부족 시 sub-essay 2개로 축소 가능.
- 커밋: `feat(master): 조문호 전용 거장 페이지 — 다큐멘터리 사진\n\n요약: 조문호(사람만 찍는 다큐멘터리 사진가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 7: dispatch 등록 + a11y + 통합 검증

**Files:**
- Modify `app/[locale]/artworks/artist/[artist]/page.tsx`
- Modify `e2e/a11y/campaign-pages.spec.ts`

- [ ] **Step 1: page.tsx import 추가**

`ShinHakchulFeature` import 블록 아래에 5개 추가:
```tsx
import ParkJaedongFeature, { buildParkJaedongMetadata } from '@/components/special/master-artists/ParkJaedongFeature';
import RyuYeonbokFeature, { buildRyuYeonbokMetadata } from '@/components/special/master-artists/RyuYeonbokFeature';
import KimJungwonFeature, { buildKimJungwonMetadata } from '@/components/special/master-artists/KimJungwonFeature';
import ChoeByeongsuFeature, { buildChoeByeongsuMetadata } from '@/components/special/master-artists/ChoeByeongsuFeature';
import JoMunhoFeature, { buildJoMunhoMetadata } from '@/components/special/master-artists/JoMunhoFeature';
```

- [ ] **Step 2: MASTER_ARTIST_FEATURES에 5명 등록**

`} as const;` 직전에 추가:
```tsx
  박재동: { Component: ParkJaedongFeature, buildMetadata: buildParkJaedongMetadata },
  류연복: { Component: RyuYeonbokFeature, buildMetadata: buildRyuYeonbokMetadata },
  김준권: { Component: KimJungwonFeature, buildMetadata: buildKimJungwonMetadata },
  최병수: { Component: ChoeByeongsuFeature, buildMetadata: buildChoeByeongsuMetadata },
  조문호: { Component: JoMunhoFeature, buildMetadata: buildJoMunhoMetadata },
```

- [ ] **Step 3: a11y ROUTES에 5명 추가**

`campaign-pages.spec.ts`의 `ROUTES` 배열에 추가:
```tsx
  '/artworks/artist/박재동',
  '/artworks/artist/류연복',
  '/artworks/artist/김준권',
  '/artworks/artist/최병수',
  '/artworks/artist/조문호',
```

- [ ] **Step 4: 통합 검증**

Run: `npm run type-check` → PASS
Run: `npm run lint` → PASS (워크트리에 .vercel 없어 eslint files-scope 이슈 없음)
Run: `npm run build` → PASS (force-dynamic 작가 페이지 + 전체 컴파일)

- [ ] **Step 5: 수동 확인 (ko/en)**

`npm run dev` 후 `/ko/artworks/artist/박재동`·`류연복`·`김준권`·`최병수`·`조문호` + `/en/...` 렌더 확인.

- [ ] **Step 6: 커밋 (push·merge 안 함)**

```bash
git add "app/[locale]/artworks/artist/[artist]/page.tsx" e2e/a11y/campaign-pages.spec.ts
git commit -m "feat(master): 거장 미전용 5명 dispatch 등록 + a11y

요약: 박재동·류연복·김준권·최병수·조문호 작가 페이지에 전용 거장 페이지 연결

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

**머지 보류** — push·PR·merge 하지 않는다. 브랜치에 커밋만 쌓아둔 채 종료. 사용자가 나중에 한번에 처리.

---

## 검증 체크리스트 (spec 대비)

- [x] 거장 미전용 5명 각 전용 컴포넌트 (Task 2~6)
- [x] 신학철 패턴 복제 (공통 규칙)
- [x] hero·bio 5문단+·sub-essay 2~4·quote(검증)·전시카드·연표·갤러리·JSON-LD (각 task)
- [x] 사실성 게이트 + fact reviewer 재검증 (공통 + 각 task Step 5)
- [x] ko/en 병기, 브랜드 토큰, 작가별 모티프 (공통)
- [x] page.tsx dispatch 5명 + a11y ROUTES 5명 (Task 7)
- [x] lib/master-artists.ts 카드 추가 안 함 (비목표 — 등록 task에 미포함)
- [x] 머지 보류 (Task 7 Step 6)
- [x] 작가 1명 = 1 독립 task
