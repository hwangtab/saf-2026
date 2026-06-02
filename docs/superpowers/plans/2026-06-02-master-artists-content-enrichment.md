# 거장 컴포넌트 4명 본문 심화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 거장 컴포넌트 4명(신학철·민정기·이철수·박불똥)의 본문을 박생광 페이지 수준의 깊이로 끌어올린다.

**Architecture:** 각 작가 = 1 독립 task. WebSearch로 사실을 검증한 뒤, 박생광 `app/[locale]/special/park-saenggwang/page.tsx`의 "named h3 sub-essay 다수" 패턴을 기존 컴포넌트에 이식한다. bio 심화 + sub-essay 2~4개 + 출처 검증 quote + 전시·소장 카드 구체화 + 연표 구체화. ko/en 병기, 브랜드 토큰만.

**Tech Stack:** Next.js 16 App Router (Server Component), TypeScript strict, Tailwind (브랜드 토큰), next-intl `isEnglish` 분기, WebSearch (사실 검증).

---

## 작업 환경

- 워크트리: `/Users/hwang-gyeongha/saf-2026/.worktrees/master-content`, 브랜치 `feat/master-artists-enrichment` (origin/main 기준)
- **첫 실행 전 1회**: `npm ci` (워크트리에 node_modules·husky 셋업 — type-check/lint/commit hook 정상화)

## 공통 규칙 (모든 task 적용)

**사실성 게이트 (위반 시 해당 요소 삭제):**
- 추가하는 모든 전기·전시·수상·인용은 WebSearch로 교차검증. 1차 출처/권위 매체(MMCA·학고재·언론·위키 등) 우선.
- **작가 quote는 출처 있는 실제 발언만.** 위조·각색 금지. 검증 불가 시 quote 섹션 자체를 넣지 않는다.
- 검증 안 되는 sub-essay 주제는 제외. 작가당 sub-essay 수는 사실이 받쳐주는 만큼만 (2~4개 목표, 1개여도 거짓보다 낫다).
- 캠페인 프레이밍: 거장 = "동료 예술인을 위한 연대자". 금융 피해 당사자 묘사 금지.

**색상·i18n 규칙:**
- 브랜드 토큰만: `charcoal*`·`canvas*`·`gallery*`·`primary*`·`sun*`(텍스트 강조 한정). `slate-*`/`indigo-*`/`blue-*`, raw sun-hex 그림자 금지. `bg-primary`+`text-white`+소형 텍스트 금지(`bg-primary-strong` 또는 large text만).
- ko/en 전체 병기. 영문도 동일 깊이.
- 기존 페이지별 시각 모티프 유지 (신학철 수직 strata 등).

**재사용할 박생광 sub-essay JSX 패턴** (`park-saenggwang/page.tsx` L723~770 기준 — 각 작가 본문에 이식):

```tsx
{/* 큐레이터 sub-essay 섹션: intro 문단 + named h3 다수 + (선택) coda */}
<div className="space-y-10">
  {/* 각 sub-essay 1개 */}
  <div>
    <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
      <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">1</span>
      {isEnglish ? 'English heading' : '한글 소제목'}
    </h3>
    <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
      <p>{isEnglish ? 'English paragraph...' : '한글 문단...'}</p>
    </div>
  </div>
  {/* 다음 sub-essay... 번호 증가 */}
</div>
```

섹션 컨테이너는 각 컴포넌트의 기존 본문 흐름(bio grid 다음, 갤러리 앞)에 자연스럽게 삽입. 기존 카드/타임라인 톤(`border-charcoal`, `font-display`)과 일치시킨다.

---

## Task 1: 환경 셋업 + 박생광 참조 정독

**Files:** (없음 — 준비 작업)

- [ ] **Step 1: 워크트리 의존성 설치**

Run: `cd /Users/hwang-gyeongha/saf-2026/.worktrees/master-content && npm ci`
Expected: 설치 완료, `node_modules/` + `.husky/_/` 생성. (이후 commit hook 정상 작동)

- [ ] **Step 2: baseline type-check**

Run: `npm run type-check`
Expected: PASS (origin/main 깨끗한 baseline 확인)

- [ ] **Step 3: 박생광 sub-essay 섹션 정독**

Read `app/[locale]/special/park-saenggwang/page.tsx` L653~920 (Section 3 "이번 전시" — intro + 5 sub-essay + coda). 이 구조가 4명에 이식할 모델. 별도 커밋 없음.

---

## Task 2: 신학철 본문 심화

**Files:**
- Modify: `components/special/master-artists/ShinHakchulFeature.tsx`

**검증할 사실 (WebSearch — 출처 확보 필수):**
- 「모내기」 사건 세부: 1987 제작 → 1989.9 압수·구속 → 1·2심 무죄 → 1998 대법원 파기 → 1999.8 징역10월 선고유예+몰수 → 2004 UN 자유권규약위(제19조) → 2018 MMCA 위탁. (신학철 기존 spec/연표에 검증됨 — 재사용 가능)
- 「한국근대사」·「한국현대사」 연작의 형식(수직 응축 포토몽타주), 1978 「사진으로 보는 한국 백년」 계기
- 「비상탈출」 등 1970년대 초기작 성격
- 학고재갤러리 개인전 연도(들), MMCA·서울시립 소장작 구체
- 출처 있는 신학철 발언(있으면). 없으면 quote 생략.

- [ ] **Step 1: 사실 리서치**

WebSearch로 위 항목 교차검증, 출처 URL 수집. 기존 `content/artist-articles.ts`의 신학철 큐레이션 링크(학고재·MMCA·부산비엔날레 등) 확인해 재활용.

- [ ] **Step 2: bio 3→5문단 심화 (ko/en)**

기존 bio narrative(h2 "쌓아 올린 역사")의 3문단을 5문단+로 확장. 추가 맥락: 모더니즘 출발의 구체(1960s 말~70s), 1978 전환의 사상적 의미, 연작의 사회사적 위치. 검증된 사실만.

- [ ] **Step 3: sub-essay 섹션 신설 (ko/en)**

bio grid 다음, 갤러리 앞에 박생광 패턴 sub-essay 2~4개 삽입. 채택 후보(검증된 것만):
① 「모내기」, 한 점의 그림이 받은 재판 — 압수~UN 결정 서사
② 수직으로 쌓는 역사 — 「한국근대사」 연작의 형식
③ 모더니스트에서 증언자로 — 1970s 비상탈출 → 1978 전환
위 JSX 패턴 사용. 각 h3 + 2~3문단.

- [ ] **Step 4: quote·전시카드·연표 보강**

- quote: 출처 있는 발언 확보 시 hero 다음에 박불똥/오윤식 quote 블록 추가. 없으면 생략.
- 전시·소장 카드: "개인전 다수 — 학고재갤러리 등" 1줄 → 검증된 개인전 연도·MMCA 소장작·「모내기」 위탁 경위로 구체화 (hyperlink 가능 시 `target="_blank" rel="noopener noreferrer"`).
- 연표: 기존 10개 유지·정밀화.

- [ ] **Step 5: 검증**

Run: `npm run type-check`  → PASS
Run: `npx eslint components/special/master-artists/ShinHakchulFeature.tsx`  → clean
Run: `grep -nE "slate-|indigo-|\bbg-blue|text-blue-|rgba\(247" components/special/master-artists/ShinHakchulFeature.tsx`  → 빈 결과

- [ ] **Step 6: Commit**

```bash
git add components/special/master-artists/ShinHakchulFeature.tsx
git commit -m "feat(master): 신학철 본문 심화 — 모내기 사건·연작 형식 sub-essay

요약: 신학철 페이지 bio 심화 + 「모내기」·「한국근대사」 심층 서사 + 전시 보강"
```

---

## Task 3: 민정기 본문 심화

**Files:**
- Modify: `components/special/master-artists/MinJoungkiFeature.tsx`

**검증할 사실 (WebSearch — 출처 확보 필수):**
- 현실과 발언 창립(1979 결성, 1980 창립전)과 민정기의 참여, 1980년대 도시·이발소 그림 등 초기작
- 2018 판문점 평화의집 「북한산 전도」 게재 (기존 박스에 3개 언론 출처 있음 — 확장)
- 1987 양평 정착 이후 실경/진경 산수로의 전환, 「유연견남산」 등
- 2006 이중섭미술상 등 수상, MMCA 소장
- 출처 있는 민정기 발언(있으면). 없으면 quote 생략.

- [ ] **Step 1: 사실 리서치**

WebSearch로 위 항목 교차검증. 기존 `MinJoungkiFeature.tsx`의 2018 판문점 박스 출처(Nocutnews·경인일보·국민일보) 재활용.

- [ ] **Step 2: bio 3→5문단 심화 (ko/en)**

기존 bio(h2 "저항에서 파노라마로")를 5문단+로. 현실과 발언 시기 → 양평 전환 → 진경 산수의 의미를 더 구체적으로.

- [ ] **Step 3: sub-essay 섹션 신설 (ko/en)**

박생광 패턴 sub-essay 2~4개. 채택 후보(검증된 것만):
① 현실과 발언 — 1980년대, 미술이 현실을 말하다
② 2018 판문점, 정상의 등 뒤에 걸린 「북한산 전도」 (기존 박스 심화)
③ 양평 이후 — 땅을 다시 그리다(실경·진경으로의 전환)

- [ ] **Step 4: quote·전시카드·연표 보강**

- quote: 출처 있는 발언 확보 시 추가, 없으면 생략.
- 전시·소장 카드: 기존 3전시+MMCA를 수상(이중섭미술상)·대표 소장작으로 보강.
- 연표: 기존 8개 정밀화(현실과 발언 창립 연도, 수상 연도 등).

- [ ] **Step 5: 검증**

Run: `npm run type-check`  → PASS
Run: `npx eslint components/special/master-artists/MinJoungkiFeature.tsx`  → clean
Run: `grep -nE "slate-|indigo-|\bbg-blue|text-blue-|rgba\(247" components/special/master-artists/MinJoungkiFeature.tsx`  → 빈 결과

- [ ] **Step 6: Commit**

```bash
git add components/special/master-artists/MinJoungkiFeature.tsx
git commit -m "feat(master): 민정기 본문 심화 — 현실과 발언·판문점·진경 전환 sub-essay

요약: 민정기 페이지 bio 심화 + 현실과 발언·2018 판문점·진경산수 심층 서사"
```

---

## Task 4: 이철수 본문 심화

**Files:**
- Modify: `components/special/master-artists/LeeCheolsooFeature.tsx`

**검증할 사실 (WebSearch — 출처 확보 필수):**
- 1980년대 민중판화(「판화집 」, 「두렁」 동인 등) 활동
- 1987(또는 1988) 충북 제천 낙향, 농사+판화, 선(禪)·일상으로의 전환 시점 정확화
- 나뭇잎 편지·달력·엽서를 통한 대중적 확산 (mokpan.com 공식 샵 — 기존 링크)
- 국제 전시 이력(기존 카드의 독일·스위스 등 — 연도/전시명 보강)
- 기존 quote 출처(충북인뉴스) 유지·보강

- [ ] **Step 1: 사실 리서치**

WebSearch로 위 항목 교차검증, 특히 연표의 모호한 "1990s~/현재"를 구체 연도·전시로 대체할 근거 확보.

- [ ] **Step 2: bio 3→5문단 심화 (ko/en)**

기존 bio(h2 "한 번의 칼질, 한 줄의 글")를 5문단+로. 민중판화 시기 → 제천 낙향 → 글과 그림의 대중성을 더 구체적으로.

- [ ] **Step 3: sub-essay 섹션 신설 (ko/en)**

박생광 패턴 sub-essay 2~4개. 채택 후보(검증된 것만):
① 1980년대, 칼로 새긴 저항
② 제천으로 — 농사짓는 판화가, 선(禪)으로의 전환
③ 달력과 엽서 — 미술관 밖에서 만나는 그림

- [ ] **Step 4: quote·전시카드·연표 보강**

- quote: 기존 충북인뉴스 인용 유지, 검증되면 1개 더 보강 가능.
- 전시·소장 카드: 국제 전시 목록에 연도/전시명 보강.
- 연표: "1990s~/현재" 모호 항목을 구체 연도·사건으로 교체.

- [ ] **Step 5: 검증**

Run: `npm run type-check`  → PASS
Run: `npx eslint components/special/master-artists/LeeCheolsooFeature.tsx`  → clean
Run: `grep -nE "slate-|indigo-|\bbg-blue|text-blue-|rgba\(247" components/special/master-artists/LeeCheolsooFeature.tsx`  → 빈 결과

- [ ] **Step 6: Commit**

```bash
git add components/special/master-artists/LeeCheolsooFeature.tsx
git commit -m "feat(master): 이철수 본문 심화 — 민중판화·제천 낙향·대중 확산 sub-essay

요약: 이철수 페이지 bio 심화 + 민중판화·선(禪) 전환·대중적 확산 심층 서사 + 연표 구체화"
```

---

## Task 5: 박불똥 본문 심화

**Files:**
- Modify: `components/special/master-artists/ParkBuldongFeature.tsx`

**검증할 사실 (WebSearch — 출처 확보 필수):**
- 1956 하동 출생, 홍익대 서양화과(1984 졸업 — 기존 연표) 확인
- 1980년대 민족미술협의회·민중미술 운동 참여, 그림마당 민 전시(눈빛/졸작/결사반대 — 기존 카드)
- 포토몽타주/콜라주 기법의 정치성, 신군부·자본·대중매체 비판 대표 연작명
- 1992 금호미술관·2016 갤러리175 개인전, 1994 「민중미술 15년」 MMCA (기존 링크)
- 출처 있는 박불똥 발언(있으면). 없으면 quote 생략.

- [ ] **Step 1: 사실 리서치**

WebSearch로 위 항목 교차검증. 기존 `content/artist-articles.ts`·`ParkBuldongFeature.tsx`의 전시 링크 재활용. 연표의 "1980s/1990s~" 모호 항목 구체화 근거 확보.

- [ ] **Step 2: bio 3→5문단 심화 (ko/en)**

기존 bio(h2 "가위가 곧 비평")를 5문단+로. 콜라주 매체 선택의 역사적 맥락, 1980년대 운동, 풍자의 작동 방식을 더 구체적으로.

- [ ] **Step 3: sub-essay 섹션 신설 (ko/en)**

박생광 패턴 sub-essay 2~4개. 채택 후보(검증된 것만):
① 가위와 풀 — 포토몽타주라는 무기
② 1980년대, 그림마당 민에서 (민족미술협의회·전시 활동)
③ 권력을 오려내다 — 대표 연작 읽기 (검증된 작품명으로)

- [ ] **Step 4: quote·전시카드·연표 보강**

- quote: 출처 있는 발언 확보 시 hero 다음에 추가(현재 6명 중 유일하게 quote 없음). 없으면 생략.
- 전시·소장 카드: 3개 → 검증된 전시·소장 추가로 보강.
- 연표: "1980s/1990s~" 모호 항목을 구체 연도·사건으로 교체.

- [ ] **Step 5: 검증**

Run: `npm run type-check`  → PASS
Run: `npx eslint components/special/master-artists/ParkBuldongFeature.tsx`  → clean
Run: `grep -nE "slate-|indigo-|\bbg-blue|text-blue-|rgba\(247" components/special/master-artists/ParkBuldongFeature.tsx`  → 빈 결과

- [ ] **Step 6: Commit**

```bash
git add components/special/master-artists/ParkBuldongFeature.tsx
git commit -m "feat(master): 박불똥 본문 심화 — 포토몽타주·민중미술 운동·대표 연작 sub-essay

요약: 박불똥 페이지 bio 심화 + 포토몽타주·그림마당 민·대표 연작 심층 서사 + 연표 구체화"
```

---

## Task 6: a11y ROUTES 추가 + 통합 검증

**Files:**
- Modify: `e2e/a11y/campaign-pages.spec.ts`

- [ ] **Step 1: ROUTES에 3명 경로 추가**

현재 `ROUTES`(신학철 포함)에 민정기·이철수·박불똥 추가:
```tsx
const ROUTES = [
  '/petition/oh-yoon',
  '/special/oh-yoon',
  '/artworks/artist/신학철',
  '/artworks/artist/민정기',
  '/artworks/artist/이철수',
  '/artworks/artist/박불똥',
];
```

- [ ] **Step 2: 전체 type-check + lint**

Run: `npm run type-check`  → PASS
Run: `npm run lint`  → PASS (origin/main 기준. eslint files-scope 이슈는 PR #57에서 별도 — 여기 베이스에 미반영이면 lint가 .cjs로 실패할 수 있음. 그 경우 `npx eslint app components` 로 소스만 검증하고 기록)

- [ ] **Step 3: 프로덕션 빌드**

Run: `npm run build`  → PASS (force-dynamic 작가 페이지 + special 페이지 빌드 에러 없음)

- [ ] **Step 4: 수동 확인 (ko/en)**

`npm run dev` 후:
- `/ko/artworks/artist/신학철`, `/민정기`, `/이철수`, `/박불똥` — 새 sub-essay·심화 bio 렌더
- `/en/...` 동일 — 영문 동일 깊이, 한글 잔존 없음

- [ ] **Step 5: Commit + push + PR**

```bash
git add e2e/a11y/campaign-pages.spec.ts
git commit -m "test(a11y): 거장 4명 페이지 WCAG 검증 경로 추가

요약: 민정기·이철수·박불똥 a11y 회귀 차단"
git push -u origin feat/master-artists-enrichment
gh pr create --base main --head feat/master-artists-enrichment --title "feat(master): 거장 컴포넌트 4명 본문 심화" --body "..."
```

---

## 검증 체크리스트 (spec 대비)

- [x] 대상: 컴포넌트 4명만 (Task 2~5), special 2명 제외
- [x] bio 3→5문단 심화 (각 Step 2)
- [x] sub-essay 2~4개 박생광 패턴 (각 Step 3)
- [x] quote 출처 검증·없으면 생략 (각 Step 4 + 공통 게이트)
- [x] 전시·소장 카드 구체화 (각 Step 4)
- [x] 연표 구체화 (이철수·박불똥 Step 4)
- [x] 사실성 게이트: WebSearch 검증, 위조 quote 금지 (공통 규칙 + 각 Step 1)
- [x] ko/en 병기, 브랜드 토큰, 시각 모티프 유지 (공통 규칙)
- [x] a11y ROUTES 추가 (Task 6)
- [x] 작가 1명 = 1 독립 task (Task 2~5 무의존)
