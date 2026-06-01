# 신학철 거장 큐레이션 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신학철을 다른 거장 5명과 동일한 전용 큐레이션 페이지(`ShinHakchulFeature`)로 끌어올린다.

**Architecture:** 새 라우트를 만들지 않고, 작가 페이지(`/artworks/artist/신학철`) dispatch에 전용 feature 컴포넌트를 끼운다. 기존 `ParkBuldongFeature.tsx`를 구조 템플릿으로 삼아 시각 컨셉("역사의 지층·수직 축적")과 신학철 고유 콘텐츠로 채운다. 작품은 공개 3점만 노출.

**Tech Stack:** Next.js 16 App Router (Server Component), TypeScript strict, Tailwind (브랜드 토큰만), next-intl, Supabase data layer, Playwright + axe (a11y).

---

## 참조 모델 / 핵심 규칙

- **구조 템플릿:** `components/special/master-artists/ParkBuldongFeature.tsx` (641줄). 동일한 섹션 골격·공유 컴포넌트·스키마 패턴을 복제하고 콘텐츠만 신학철로 교체.
- **색상 규칙 (CLAUDE.md):** `charcoal*`·`canvas*`·`gallery*`·`primary*`만. `slate-*`/`indigo-*`/`blue-*` 등 금지. `bg-primary`+`text-white`+소형 텍스트 금지(`bg-primary-strong` 사용).
- **i18n:** 공개 라우트이므로 ko/en 전체 병기. 단 이 거장 feature들은 메시지 키가 아니라 컴포넌트 내 `isEnglish` 분기 + `PAGE_COPY` 객체로 처리하는 게 기존 패턴(ParkBuldong 동일) — 그대로 따른다.
- **캠페인 프레이밍:** 신학철은 "동료 예술인을 위한 연대자". 금융 피해 당사자로 묘사 금지.

## 확정 콘텐츠 (구현 시 그대로 사용 — 추측 금지)

### 메타 (PAGE_COPY)

```
KO title: 신학철 — 한국현대사 연작의 거장
KO description: 한국현대사 연작의 거장 신학철(1943–). 인체와 사물이 기관차처럼 수직으로 응축되는 포토몽타주로 한 세기의 한국 근현대사를 그린 민중미술 1세대 거장. 「모내기」 사건으로 표현의 자유의 상징이 된 신학철의 작품을 씨앗페 온라인에서 감상하고 소장하세요.
KO ogDescription: 한국현대사 연작의 거장 신학철. 인체와 사물이 수직으로 응축되는 포토몽타주로 한 세기의 역사를 한 화면에 담아낸 민중미술 1세대.
KO ogAlt: 신학철 대표 작품
KO twitterTitle: 신학철
KO twitterDescription: 역사는 수직으로 쌓인다 — 한국현대사 연작의 거장 신학철

EN title: Shin Hak-chul — Master of the Korean History Series
EN description: Selected works by Shin Hak-chul (b. 1943), master of the Korean modern history series. Through photomontage in which bodies and objects compress vertically like a locomotive, he painted a century of Korean history. A first-generation minjung art master who became a symbol of free expression through the 〈Rice Planting〉 case. View and collect his works at SAF Online.
EN ogDescription: Shin Hak-chul — master of the Korean history series. Photomontage that compresses a century of history into a single vertical frame.
EN ogAlt: Shin Hak-chul — featured work
EN twitterTitle: Shin Hak-chul
EN twitterDescription: History stacks vertically — master of the Korean modern history series
KO keywords: 신학철 화가, 한국근대사, 한국현대사, 포토몽타주, 민중미술, 모내기, 씨앗페 온라인
EN keywords: Shin Hak-chul artist, Korean modern history, photomontage, minjung misul, Korean political art
```

### 히어로

```
배지 KO: 신학철 · 1943–      배지 EN: Shin Hak-chul · b. 1943
타이틀 KO: 역사는 한 사람의 몸에 / 수직으로 쌓인다
타이틀 EN: History stacks vertically / through a single body
부제 KO:
  한 세기의 무게를 한 화면에 응축하다.
  인체와 사물이 기관차처럼 쌓여 올라가는 한국 근현대사.
부제 EN:
  He compressed the weight of a century into a single frame.
  Bodies and objects stacked like a locomotive of Korean modern history.
```

### 내러티브 (좌측)

```
제목 KO: 쌓아 올린 역사 — / 한 화면에 응축된 한 세기
제목 EN: History, stacked — / a century compressed into one frame

문단 1 KO: 신학철(1943–)은 경북 김천에서 태어나 1968년 홍익대학교 서양화과를 졸업하며 모더니스트로 출발했다. 1970년대에는 오브제와 콜라주로 실험을 거듭했다 — 「비상탈출」 연작이 이 시기의 산물이다.
문단 1 EN: Shin Hak-chul (b. 1943) was born in Gimcheon and graduated from Hongik University's Department of Western Painting in 1968, starting out as a modernist. Through the 1970s he experimented with objet and collage — the 〈Emergency Escape〉 series belongs to this period.

문단 2 KO: 전환점은 1978년이었다. 사진집 「사진으로 보는 한국 백년」을 접한 충격 이후, 그는 개인의 조형 실험을 넘어 한 세기의 집단적 기억으로 향했다. 신문·잡지·교과서의 이미지를 오려 붙인 포토몽타주로, 인체와 사물이 기관차처럼 수직으로 응축되는 「한국근대사」·「한국현대사」 연작이 태어났다.
문단 2 EN: The turning point came in 1978. After the shock of encountering the photo anthology "A Century of Korea in Photographs," he moved beyond personal formal experiment toward the collective memory of an era. Cutting and pasting images from newspapers, magazines, and textbooks, he created the 〈Korean Modern History〉 and 〈Korean Contemporary History〉 series — photomontages in which bodies and objects compress vertically like a locomotive.

문단 3 KO: 그의 화면에서 역사는 평면에 나열되지 않고 수직으로 쌓인다. 한 사람의 몸이 곧 한 시대의 단면이 되고, 그 단면들이 겹겹이 축적되어 한국 근현대사의 지층을 이룬다. 그는 민중미술 1세대의 역사의식을 형식 그 자체로 구현한 거장이다.
문단 3 EN: In his work, history is not laid out flat but stacked vertically. A single body becomes the cross-section of an era, and those cross-sections accumulate layer upon layer into the strata of Korean modern history. He is a master who embodied the historical consciousness of first-generation minjung art in form itself.
```

### 주요 테마 3카드

```
1 KO: 수직 몽타주 / 인체·사물이 기관차처럼 응축되는 형식미. 역사를 평면이 아닌 수직의 지층으로 그린다.
1 EN: Vertical montage / Bodies and objects compress like a locomotive — history rendered not as a flat sequence but as vertical strata.

2 KO: 「모내기」와 표현의 자유 / 1987년 작 「모내기」는 1989년 국가보안법으로 압수되고 작가는 구속됐다. 1·2심 무죄에도 1999년 유죄가 확정됐으나, 2004년 UN 자유권규약위원회는 표현의 자유 침해를 인정했다.
2 EN: 〈Rice Planting〉 and free expression / His 1987 〈Rice Planting〉 was seized under the National Security Act in 1989. Acquitted twice, convicted in 1999 — yet in 2004 the UN Human Rights Committee ruled it a violation of freedom of expression.

3 KO: 민중미술 1세대의 역사의식 / 개인이 아닌 집단과 역사를 향하는 시선. 그의 작업은 한 시대의 증언이자 기록이다.
3 EN: Historical consciousness / A gaze fixed on the collective and on history rather than the individual — his work stands as testimony to an era.
```

### 작가 연표 (`<ol>`, 좌측 연도 / 우측 설명)

```
1943  KO: 경북 김천 출생.                                  EN: Born in Gimcheon, North Gyeongsang province.
1968  KO: 홍익대학교 서양화과 졸업.                          EN: Graduates from Hongik University, Dept. of Western Painting.
1970s KO: 오브제·콜라주 실험, 「비상탈출」 연작.              EN: Experiments with objet and collage; the 〈Emergency Escape〉 series.
1978  KO: 사진집 「사진으로 보는 한국 백년」을 접하고 작업 전환. EN: Encounters "A Century of Korea in Photographs"; turns toward history.
1980s KO: 「한국근대사」·「한국현대사」 연작 발표, 포토몽타주 양식 확립. EN: Begins the 〈Korean Modern History〉 & 〈Korean Contemporary History〉 series.
1987  KO: 「모내기」 제작.                                  EN: Paints 〈Rice Planting〉.
1989  KO: 「모내기」 국가보안법상 이적표현물로 압수, 작가 구속. EN: 〈Rice Planting〉 seized under the National Security Act; the artist is detained.
1999  KO: 대법원 파기환송 후 유죄 확정(징역 10개월 선고유예), 작품 몰수. EN: After Supreme Court remand, convicted (10-month suspended sentence); the work is confiscated.
2004  KO: UN 자유권규약위원회, 표현의 자유 침해 인정·시정 권고. EN: The UN Human Rights Committee rules the conviction a violation of free expression.
2018  KO: 「모내기」 국립현대미술관 위탁보관.                 EN: 〈Rice Planting〉 placed in the custody of MMCA.
```

### 주요 전시·소장 섹션

```
- 단체전: 《민중미술 15년: 1980–1994》, 국립현대미술관 (1994)
  링크: https://www.mmca.go.kr/exhibitions/exhibitionsDetail.do?exhId=200904050002593
  EN: Group exhibition: 《15 Years of Minjung Art: 1980–1994》, MMCA (1994)
- 개인전 다수 — 학고재갤러리 등
  EN: Numerous solo exhibitions — Hakgojae Gallery and others
- 소장: 국립현대미술관, 서울시립미술관
  EN: Collections: MMCA, Seoul Museum of Art
```

### Person 스키마 값

```
name: 신학철 / Shin Hak-chul   (alternateName 반대 언어)
jobTitle: 화가 / Artist
birthDate: 1943-12-12
birthPlace.name: 경북 김천 / Gimcheon, North Gyeongsang, South Korea
alumniOf: 홍익대학교 서양화과 / Hongik University, Dept. of Western Painting
affiliation: 민족미술협의회 / Minjung Misul Hyeopuihoe (National Artists' Association)
knowsAbout: ['Photomontage', 'Korean minjung art', 'Korean modern history']
nationality: South Korea (@id https://www.wikidata.org/wiki/Q884)
description KO: 신학철(1943–)은 인체와 사물이 수직으로 응축되는 포토몽타주로 한 세기의 한국 근현대사를 그려온 민중미술 1세대 거장입니다.
description EN: Shin Hak-chul (b. 1943) is a first-generation Korean minjung art master who painted a century of Korean modern history through photomontage in which bodies and objects compress vertically.
exhibitionEvent startDate: 2026-01-14 (박불똥과 동일 캠페인 기준일)
```

---

## File Structure

- **Create** `components/special/master-artists/ShinHakchulFeature.tsx` — 메타 빌더 + 본문 컴포넌트 (단일 책임: 신학철 거장 페이지 렌더)
- **Modify** `app/[locale]/artworks/artist/[artist]/page.tsx` — dispatch 맵에 신학철 등록
- **Modify** `e2e/a11y/campaign-pages.spec.ts` — a11y 검증 경로 추가

---

## Task 1: `ShinHakchulFeature.tsx` 생성 — 메타데이터 빌더 + 셸/히어로

**Files:**

- Create: `components/special/master-artists/ShinHakchulFeature.tsx`

- [ ] **Step 1: ParkBuldongFeature를 구조 베이스로 새 파일 작성 (import + 상수 + 메타 빌더)**

`ParkBuldongFeature.tsx`의 1–120행을 베이스로 복제하되 다음을 치환한다:

```tsx
// 거장 작가 feature — 작가 페이지(/artworks/artist/신학철)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SHIN_HAKCHUL_PATH = `/artworks/artist/${encodeURIComponent('신학철')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isShinHakchulArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '신학철' ||
    n === 'shin hak-chul' ||
    n === 'shin hakchul' ||
    n.replace(/[\s-]+/g, '') === 'shinhakchul'
  );
};
```

- import 블록은 ParkBuldong과 동일 (`MasterArtistMediumSections`, `JsonLdScript`, `PaperGrain`, `OG_IMAGE`/`SITE_URL`/`CONTACT`, `createBreadcrumbSchema`/`generateArtworkListSchema`/`generateGalleryAggregateOffer`, `buildLocaleUrl`/`createLocaleAlternates`, `getSupabaseArtworksByArtist`, `resolveLocale`, `resolveSeoArtworkImageUrl`, types).
- `PAGE_COPY` 객체를 위 "확정 콘텐츠 > 메타" ko/en 값으로 작성.
- `buildShinHakchulMetadata({ params })`를 `buildParkBuldongMetadata`와 동일 구조로 작성하되 `'박불똥'`→`'신학철'`, `isParkBuldongArtist`→`isShinHakchulArtist`, `Park Bul-ttong`→`Shin Hak-chul`, `PARK_BULDONG_PATH`→`SHIN_HAKCHUL_PATH`, keywords는 PAGE_COPY 기준.

- [ ] **Step 2: 본문 컴포넌트 셸 + 히어로 작성**

`ParkBuldongFeature` 본문(122–278행)을 베이스로 복제:

- 함수명 `ShinHakchulFeature`, `getSupabaseArtworksByArtist('신학철')`, `fullArtworks`는 `allArtworks.filter((a) => isShinHakchulArtist(a.artist))`.
- breadcrumb 마지막 항목 `{ name: isEnglish ? 'Shin Hak-chul' : '신학철', url: pageUrl }`.
- 히어로 섹션: 배지/타이틀/부제를 "확정 콘텐츠 > 히어로"로 교체. `data-hero-sentinel="true"` 요소 유지. 박불똥의 회전 콜라주 장식(`-rotate-1`, `rotate-2`) 대신 **수직 지층 모티프**로 변경 — 히어로 좌우에 세로 라인을 배치:

  ```tsx
  <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
  <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
  <div className="absolute top-0 right-12 h-full w-px bg-white/10" />
  ```

  배지는 회전 없이 `border-l-4 border-primary` 직선 스타일로.

- [ ] **Step 3: 타입 체크**

Run: `npm run type-check`
Expected: PASS (이 시점엔 본문 하단 섹션이 미완이라도 컴포넌트가 닫혀 있으면 통과. 닫히지 않으면 임시로 갤러리 placeholder까지 작성해 닫을 것)

- [ ] **Step 4: Commit**

```bash
git add components/special/master-artists/ShinHakchulFeature.tsx
git commit -m "feat(master): 신학철 feature 셸·히어로·메타데이터

요약: 신학철 거장 페이지 컴포넌트 골격(히어로·메타) 추가"
```

---

## Task 2: 내러티브 + 테마 3카드 + 연표 + 전시/소장 섹션

**Files:**

- Modify: `components/special/master-artists/ShinHakchulFeature.tsx`

- [ ] **Step 1: 내러티브 grid 섹션 작성**

ParkBuldong의 `{/* Bio / Narrative Section */}` grid(281–528행)를 베이스로:

- 좌측 `<h2>` + 3문단 → "확정 콘텐츠 > 내러티브"로 교체.
- 우측 "주요 테마" 카드 3개 → "확정 콘텐츠 > 테마 3카드"로 교체 (번호 1·2·3 유지).
- 시각 모티프 조정: 박불똥의 `shadow-[8px_8px_0px_0px_rgba(247,152,36,0.3)]`(주황 그림자)는 sun 계열 hex라 **회피**. 대신 `shadow-xl` 또는 `shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]`(primary 기반)로 교체. 테두리는 `border-charcoal` 유지 가능.

- [ ] **Step 2: 작가 연표 `<ol>` 작성**

ParkBuldong 연표(412–471행) 구조로, "확정 콘텐츠 > 작가 연표"의 10개 항목을 ko/en 병기로 작성. 연도 셀 `w-12`→`w-14`(2018·1980s 등 폭 확보).

- [ ] **Step 3: 주요 전시·소장 섹션 작성**

ParkBuldong(473–526행) 구조로 "확정 콘텐츠 > 주요 전시·소장" 3항목 작성. MMCA 링크는 `target="_blank" rel="noopener noreferrer"` 유지.

- [ ] **Step 4: 타입 체크 + 색상 규칙 확인**

Run: `npm run type-check`
Expected: PASS

수동 확인: 작성한 JSX에 `slate-`, `indigo-`, `bg-blue`, raw hex(sun 계열) 미사용. `bg-primary`+`text-white`+소형 텍스트 조합 없음.

- [ ] **Step 5: Commit**

```bash
git add components/special/master-artists/ShinHakchulFeature.tsx
git commit -m "feat(master): 신학철 내러티브·테마·연표·전시 섹션

요약: 신학철 「한국근대사」 미학과 「모내기」 사건 서사 본문 작성"
```

---

## Task 3: 상호부조 배너 + 작품 갤러리 + JSON-LD 스키마

**Files:**

- Modify: `components/special/master-artists/ShinHakchulFeature.tsx`

- [ ] **Step 1: 상호부조 배너 작성**

ParkBuldong(567–594행) 블록을 복제하되 작가명만 `박불똥`→`신학철`, `Park Bul-ttong`→`Shin Hak-chul`. 카피 본문(상호부조 기금 프레이밍)은 그대로 — 캠페인 표준 문구.

- [ ] **Step 2: 작품 갤러리 + 0점 fallback 작성**

ParkBuldong(596–636행) 블록 복제:

```tsx
{ARTWORKS.length > 0 ? (
  <MasterArtistMediumSections artworks={ARTWORKS} isEnglish={isEnglish} returnTo={SHIN_HAKCHUL_PATH} />
) : ( /* 박불똥과 동일한 "작품 준비 중" fallback, Link href="/artworks" */ )}
```

갤러리 헤더의 `artworkCountLabel`·"Park Bul-ttong"→"Shin Hak-chul" 치환.

- [ ] **Step 3: JSON-LD 스키마 작성**

ParkBuldong(145–216행) 스키마 블록 복제:

- `breadcrumbSchema`, `itemListSchema`, `aggregateOfferSchema`는 경로/작품만 신학철로.
- `artistPerson` 객체를 "확정 콘텐츠 > Person 스키마 값"으로 작성 (birthDate `1943-12-12`, alumniOf 홍익대, affiliation 민족미술협의회, knowsAbout 배열).
- `exhibitionEventSchema`의 name/description 신학철로, `about: artistPerson`, startDate `2026-01-14`.
- 렌더 상단 `<JsonLdScript data={[breadcrumbSchema, exhibitionEventSchema, itemListSchema]} />` + `{aggregateOfferSchema && <JsonLdScript data={aggregateOfferSchema} />}`.

- [ ] **Step 4: 타입 체크 + 린트**

Run: `npm run type-check && npm run lint`
Expected: 둘 다 PASS

- [ ] **Step 5: Commit**

```bash
git add components/special/master-artists/ShinHakchulFeature.tsx
git commit -m "feat(master): 신학철 상호부조 배너·작품 갤러리·JSON-LD

요약: 신학철 페이지 갤러리·Person/ExhibitionEvent 스키마 완성"
```

---

## Task 4: 작가 페이지 dispatch 등록

**Files:**

- Modify: `app/[locale]/artworks/artist/[artist]/page.tsx`

- [ ] **Step 1: import 추가**

53–55행 `ParkBuldongFeature` import 블록 아래에 추가:

```tsx
import ShinHakchulFeature, {
  buildShinHakchulMetadata,
} from '@/components/special/master-artists/ShinHakchulFeature';
```

- [ ] **Step 2: dispatch 맵 등록**

60–64행 `MASTER_ARTIST_FEATURES`에 항목 추가:

```tsx
const MASTER_ARTIST_FEATURES = {
  민정기: { Component: MinJoungkiFeature, buildMetadata: buildMinJoungkiMetadata },
  이철수: { Component: LeeCheolsooFeature, buildMetadata: buildLeeCheolsooMetadata },
  박불똥: { Component: ParkBuldongFeature, buildMetadata: buildParkBuldongMetadata },
  신학철: { Component: ShinHakchulFeature, buildMetadata: buildShinHakchulMetadata },
} as const;
```

(기존 `isMasterArtist`/metadata·body 분기는 자동 적용 — 추가 코드 불필요)

- [ ] **Step 3: 타입 체크**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/artworks/artist/[artist]/page.tsx
git commit -m "feat(master): 신학철 작가 페이지 dispatch 등록

요약: /artworks/artist/신학철 진입 시 전용 거장 페이지 렌더"
```

---

## Task 5: a11y 검증 경로 추가

**Files:**

- Modify: `e2e/a11y/campaign-pages.spec.ts`

- [ ] **Step 1: ROUTES 배열에 신학철 경로 추가**

4행을 수정:

```tsx
const ROUTES = ['/petition/oh-yoon', '/special/oh-yoon', '/artworks/artist/신학철'];
```

(playwright `page.goto`가 한글 경로를 자동 인코딩 — 인코딩 리터럴 불필요)

- [ ] **Step 2: Commit**

```bash
git add e2e/a11y/campaign-pages.spec.ts
git commit -m "test(a11y): 신학철 거장 페이지 WCAG AA 검증 경로 추가

요약: 신학철 페이지 a11y 회귀 차단"
```

---

## Task 6: 통합 검증

- [ ] **Step 1: 프로덕션 빌드**

Run: `npm run build`
Expected: PASS. `/artworks/artist/[artist]` 라우트 빌드 에러 없음. (force-dynamic이라 prerender throw 무관)

- [ ] **Step 2: dev 서버 수동 확인 (ko/en)**

Run: `npm run dev` 후 브라우저로 확인:

- `http://localhost:3000/ko/artworks/artist/신학철` — 히어로·내러티브·테마3·연표·작품 3점·상호부조 배너 렌더
- `http://localhost:3000/en/artworks/artist/신학철` — 영문 전체 렌더, 한글 잔존 없음
- 페이지 소스에 `ExhibitionEvent`·`Person`(birthDate 1943-12-12) JSON-LD 포함 확인

Expected: 양 locale 정상 200, 다른 거장 페이지와 동일한 격의 레이아웃.

- [ ] **Step 3: a11y 테스트 (선택, 빌드 환경에서)**

Run: `npx playwright test e2e/a11y/campaign-pages.spec.ts`
Expected: 신학철 ko/en 케이스 포함 전체 PASS (WCAG AA 위반 0)

- [ ] **Step 4: 최종 푸시**

```bash
git push origin main
```

---

## 검증 체크리스트 (spec 대비)

- [x] 통합: 새 라우트 없이 dispatch 등록 (Task 4)
- [x] 시각 컨셉 "역사의 지층·수직 축적" (Task 1 Step 2)
- [x] 내러티브 「한국근대사」 + 「모내기」 두 축 (Task 2)
- [x] 작품 공개 3점만 (`getSupabaseArtworksByArtist`, Task 3)
- [x] ko/en 이중언어 + 영문 noindex (Task 1 메타)
- [x] JSON-LD Breadcrumb/ExhibitionEvent/Person/ItemList/AggregateOffer (Task 3)
- [x] 사실관계 WebSearch 검증 값 사용 (확정 콘텐츠)
- [x] a11y 경로 추가 (Task 5)
- [x] 캠페인 "연대자" 프레이밍 (Task 3 Step 1)
- [x] 브랜드 토큰만, sun hex 그림자 회피 (Task 2 Step 1)
