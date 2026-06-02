# 작가 전용 페이지 5명 (Round 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 작가 5명(이익태·이호철·강석태·민정See·홍진희)에게 전용 페이지를 만든다 — "거장(master)" 표현 미사용, 작가 정체성으로.

**Architecture:** 신학철/주재환 전용 컴포넌트 패턴 복제. `components/special/master-artists/` + `MASTER_ARTIST_FEATURES` dispatch 재사용. WebSearch + fact reviewer 재검증. ko/en 병기.

**Tech Stack:** Next.js 16 Server Component, TypeScript strict, Tailwind 브랜드 토큰, next-intl `isEnglish`, WebSearch.

---

## 작업 환경
- 워크트리: `/Users/hwang-gyeongha/saf-2026/.worktrees/round3`, 브랜치 `feat/featured-artists-round3` (origin/main 기준). `npm ci` 완료.
- **머지: 작업 완료 후 PR→merge** (이전 라운드와 동일하게 main 반영).

## 공통 규칙
**복제 모델:** `ShinHakchulFeature.tsx`(구조) + `JuJaehwanFeature.tsx`/`SonEunyeongFeature.tsx`(non-master, narrative-heavy). export 시그니처·import·normalizer·섹션 골격·JSON-LD 패턴 복제.

**"거장/master" 미사용:** hero·PAGE_COPY·sub-essay·JSON-LD description에 "거장"/"master [artist]" 금지. 작가 정체성으로. JSON-LD jobTitle은 실제 직함(화가/판화가 등). `MasterArtistMediumSections` import + 일반 "master's degree"는 허용.

**사실성 게이트:** WebSearch 교차검증 + fact reviewer 재검증. DB `bio`/`history`(작가 공식 이력)를 1차 재료로, 외부 교차확인. 미검증 구체사실(작품명·연도·전시·수상·카운트)은 일반화/제거. **정체불명 award body는 제외**(실재 식별 가능 기관만). **quote는 출처 있는 실제 발언만, 없으면 생략**(따옴표 직접인용 귀속 금지). 캠페인 "연대자" 프레이밍.

**색상·i18n:** 브랜드 토큰만. slate-/indigo-/raw sun-hex 금지. `bg-primary`+흰 소형텍스트 금지. ko/en 동일 깊이, 영문 메타 `robots: noindex`.

**sub-essay JSX:** ShinHakchul/Ju 패턴 (numbered `<h3>` + `text-lg leading-[1.85] text-charcoal space-y-4 break-keep`).

**각 작가 절차:** Step1 WebSearch 검증 → Step2 복제 작성(hero·bio 4~5문단·sub-essay 2~3·quote(검증시)·전시카드·연표·갤러리·JSON-LD, ko/en, "거장" 미사용) → Step3 `npm run type-check` + `npx eslint <파일>` + 색상 grep + `거장|master` grep(infra만) → Step4 커밋. (Step5: 컨트롤러 fact reviewer 재검증 → 수정)

---

## Task 1: 이익태 (Lee Iktae, 1947–2025) — `LeeIktaeFeature.tsx`
**정체성:** 영화·연극·퍼포먼스·회화·설치를 넘나든 **토탈 아티스트**, 한국 실험·전위미술의 선구자. **작고(2025)** — 생몰 정확히. (DB bio 2,677자) "거장" 대신 "토탈 아티스트"/"선구자".
**검증(WebSearch):** 1947 출생·2025 작고, 실험영화(한국 실험영화 선구 — 「아침과 저녁 사이」 등 검증되는 것만), 연극·퍼포먼스·설치, 1960~70년대 전위미술 활동, 전시·이력, 출처 있는 발언. 공개작 3점.
`LEE_IKTAE_PATH`, `isLeeIktaeArtist` (keys: '이익태','lee iktae','lee ik-tae','leeiktae'). jobTitle 미술가/Artist. birthDate '1947' (확인 시), 작고 표기.
커밋: `feat(master): 이익태 전용 페이지 — 토탈 아티스트\n\n요약: 이익태(영화·연극·퍼포먼스·회화를 넘나든 토탈 아티스트) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Task 2: 이호철 (Lee Hocheol, 1958–) — `LeeHocheolFeature.tsx`
**정체성:** "일상의 틈"을 들여다보는 화가. 1958 서울 출생, 홍익대 졸업, 회화·판화. (DB bio 2,549자) 공개작 15점.
**검증:** 1958 서울 출생, 홍익대, 회화·판화 작업, 일상 주제 연작, 개인전(검증되는 것만), 출처 있는 발언.
`LEE_HOCHEOL_PATH`, `isLeeHocheolArtist` (keys: '이호철','lee hocheol','lee ho-cheol','leehocheol'). jobTitle 화가/Painter.
커밋: `feat(master): 이호철 전용 페이지 — 일상의 틈\n\n요약: 이호철(일상의 틈을 들여다보는 회화·판화 작가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Task 3: 강석태 (Kang Seoktae) — `KangSeoktaeFeature.tsx`
**정체성:** "마음의 별"을 그리는 화가 — 어린왕자·생텍쥐페리 모티프의 동화적 회화. (DB bio 3,151자) 공개작 16점.
**검증:** 학력·경력, 어린왕자/별 모티프 연작, 개인전(검증되는 것만), 출처 있는 발언. (DB bio가 서사적 — 1차 재료, 구체사실 교차확인)
`KANG_SEOKTAE_PATH`, `isKangSeoktaeArtist` (keys: '강석태','kang seoktae','kang seok-tae','kangseoktae'). jobTitle 화가/Painter.
커밋: `feat(master): 강석태 전용 페이지 — 마음의 별\n\n요약: 강석태(어린왕자·별 모티프의 동화적 회화 작가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Task 4: 민정See (Min JeongSee, 신진) — `MinJeongSeeFeature.tsx`
**정체성:** '플라스틱'이라는 물성으로 현대사회의 표면·위장을 비판하는 판화·드로잉 작가. 홍익대 판화. (DB bio+history 3,600자) 공개작 2점 → 내러티브 중심.
**검증:** 홍익대 판화, 플라스틱 물성 주제, 판화·드로잉, 개인전(검증되는 것만), 출처 있는 발언.
`MIN_JEONGSEE_PATH`, `isMinJeongSeeArtist` (keys: '민정see','min jeongsee','min jeong-see','minjeongsee'). jobTitle 판화가/Printmaker. (이름에 영문 'See' 포함 — normalize 주의)
커밋: `feat(master): 민정See 전용 페이지 — 플라스틱의 표면\n\n요약: 민정See(플라스틱 물성으로 현대사회를 비판하는 판화·드로잉 작가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Task 5: 홍진희 (Hong Jinhui, 신진) — `HongJinhuiFeature.tsx`
**정체성:** 실(thread)로 그린 숲 — 실을 회화 언어로 풀어내는 작가. 홍익대 미술대학. (DB bio+history 3,400자) 공개작 2점 → 내러티브 중심.
**검증:** 홍익대 미술대학, 「실로 그린 숲」 연작, 실/직조 매체, 개인전(검증되는 것만), 출처 있는 발언.
`HONG_JINHUI_PATH`, `isHongJinhuiArtist` (keys: '홍진희','hong jinhui','hong jin-hui','hongjinhui'). jobTitle 화가/Artist.
커밋: `feat(master): 홍진희 전용 페이지 — 실로 그린 숲\n\n요약: 홍진희(실로 그린 숲, 실을 회화로 풀어내는 작가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 6: dispatch 등록 + a11y + 통합 검증
**Files:** Modify `app/[locale]/artworks/artist/[artist]/page.tsx`, `e2e/a11y/campaign-pages.spec.ts`
- [ ] Step 1: page.tsx에 5개 import 추가 (`LeeIktaeFeature, { buildLeeIktaeMetadata }` 등)
- [ ] Step 2: `MASTER_ARTIST_FEATURES`에 5명 등록 (`이익태:`, `이호철:`, `강석태:`, `민정See:`, `홍진희:`)
- [ ] Step 3: `campaign-pages.spec.ts` ROUTES에 5명 경로 추가
- [ ] Step 4: `npm run type-check` / `npm run lint` / `npm run build` 통과
- [ ] Step 5: 커밋
```
git add "app/[locale]/artworks/artist/[artist]/page.tsx" e2e/a11y/campaign-pages.spec.ts
git commit -m "feat(master): Round 3 작가 5명 dispatch 등록 + a11y

요약: 이익태·이호철·강석태·민정See·홍진희 작가 페이지에 전용 페이지 연결

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
- [ ] Step 6: push → PR(base main) → `gh pr merge <#> --merge` (main 반영)

---

## 검증 체크리스트
- [x] 작가 5명 각 전용 컴포넌트 (Task 1~5)
- [x] "거장/master" 미사용, 작가 정체성으로 (공통)
- [x] 신학철 패턴 + ko/en + 브랜드 토큰 (공통)
- [x] 사실성 게이트 + fact reviewer 재검증 (공통 + 각 Step5)
- [x] dispatch 5명 + a11y ROUTES 5명 (Task 6)
- [x] PR→merge로 main 반영
