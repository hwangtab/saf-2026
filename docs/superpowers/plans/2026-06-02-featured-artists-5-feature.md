# 주요 작가 5명 전용 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 자료가 풍부한 주요 작가 5명(주재환·손은영·김레이시·정미정·박성완)에게 거장 5명과 동일한 격의 전용 페이지를 만든다 — 단 "거장(master)" 표현은 쓰지 않는다.

**Architecture:** 신학철/박재동 전용 컴포넌트 패턴을 그대로 복제. `components/special/master-artists/` 디렉토리 + `MASTER_ARTIST_FEATURES` dispatch 재사용(내부 인프라). 사용자 노출 카피에서만 "거장" 미사용 → 작가별 정체성·실제 직함. WebSearch + fact reviewer 재검증. ko/en 병기.

**Tech Stack:** Next.js 16 Server Component, TypeScript strict, Tailwind 브랜드 토큰, next-intl `isEnglish`, WebSearch.

---

## 작업 환경

- 워크트리: `/Users/hwang-gyeongha/saf-2026/.worktrees/master-tier2`, 브랜치 `feat/master-artists-untiered-5` (거장 5명 커밋 위에 **이어서 쌓음**). `npm ci` 이미 됨.
- **머지 보류** — push·merge 안 함.

## 공통 규칙 (모든 작가 task)

**복제 모델:** `components/special/master-artists/ShinHakchulFeature.tsx` (구조) + `JoMunhoFeature.tsx`/`ParkBuldongFeature.tsx`(작품 적은 narrative-heavy 사례). export 시그니처·import·normalizer·섹션 골격·JSON-LD 패턴 복제.

**"거장" 미사용 (이 라운드의 핵심 차이):**
- hero 타이틀·배지·부제, PAGE_COPY(title/description/og), sub-essay, schema description 어디에도 "거장"/"master" 단어를 쓰지 않는다.
- 작가 정체성으로 표현 (예: "현실과 발언의 창립자", "회화와 사진 사이의 작가", "추상 회화 작가").
- JSON-LD `jobTitle`은 실제 직함: 화가/Painter, 사진가/Photographer 등. PAGE_COPY title도 "OOO — <정체성>" 형식이되 master/거장 금지.
- 컴포넌트 파일명·변수명·디렉토리는 기존 인프라 일관성을 위해 그대로 사용 가능(사용자 비노출).

**사실성 게이트 (위반 = 요소 삭제):**
- 추가 사실 WebSearch 교차검증 + fact reviewer 재검증. 생존 작가라 자료 적으면 짧고 정직하게(조문호 선례). 미검증 구체 사실(작품명·연도·전시) 제외/일반화. 위조 금지.
- **quote는 출처 있는 실제 발언만.** 검증 불가 시 생략. (단 DB bio가 1인칭 작가 진술이면 prose로 활용, 따옴표 직접인용 귀속은 출처 확인 후에만)
- 기존 DB `bio`/`history`를 1차 재료로 활용(충실함). 외부 사실은 교차확인.
- 캠페인 "연대자" 프레이밍.

**색상·i18n:** 브랜드 토큰만. slate-/indigo-/raw sun-hex 금지. `bg-primary`+흰 소형텍스트 금지. ko/en 동일 깊이, 영문 메타 `robots: noindex`.

**sub-essay JSX 패턴** (신학철 차용):
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

**각 작가 task 절차:** Step1 WebSearch 검증 → Step2 신학철 복제로 컴포넌트 작성(hero·bio 4~5문단·sub-essay 2~3·quote(검증시)·전시카드·연표·갤러리·JSON-LD, ko/en, "거장" 미사용) → Step3 `npm run type-check` + `npx eslint <파일>` + 색상 grep → Step4 커밋. (Step5: 컨트롤러가 fact reviewer 재검증 → 수정)

---

## Task 1: 주재환 (Ju Jaehwan) — `JuJaehwanFeature.tsx`
**정체성:** 「현실과 발언」 창립 멤버, 풍자·콜라주·개념미술. 1940 서울 출생, 홍익대 중퇴. 공개작 1점 → 내러티브 중심.
**검증(WebSearch):** 1940 서울 출생, 현실과 발언 창립(1979/80) 참여, 대표작 「몬드리안 호텔」·「계단을 내려오는 봄비」 등(검증되는 것만), 풍자·일상 오브제 콜라주, 전시·수상, 출처 있는 발언. (별세 여부 확인 — 생몰 정확히)
`JU_JAEHWAN_PATH`, `isJuJaehwanArtist` (keys: '주재환','ju jaehwan','ju jae-hwan','jujaehwan'). jobTitle 화가/Artist.
커밋: `feat(master): 주재환 전용 페이지 — 현실과 발언·풍자 콜라주\n\n요약: 주재환(현실과 발언 창립 멤버, 풍자·개념미술가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Task 2: 손은영 (Son Eunyeong) — `SonEunyeongFeature.tsx`
**정체성:** 회화와 사진의 경계, 도시·야경. 이대 서양화 → 홍익대 사진디자인. 공개작 2점.
**검증:** 이화여대 서양화·홍익대 산업미술대학원 사진디자인, 야경/도시 사진 연작(「도시의 밤」 등 검증되는 것만), 개인전·사진집, 출처 있는 발언. (DB bio 5,304자 풍부 — 1차 재료, 외부 교차확인)
`SON_EUNYEONG_PATH`, `isSonEunyeongArtist` (keys: '손은영','son eunyeong','son eun-yeong','soneunyeong'). jobTitle 사진가·화가/Artist.
커밋: `feat(master): 손은영 전용 페이지 — 회화와 사진의 경계\n\n요약: 손은영(회화와 사진 사이, 도시·야경 작가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Task 3: 김레이시 (Kim Reisi) — `KimReisiFeature.tsx`
**정체성:** 구상에서 추상으로, 내면의 균형. 서울여대 서양화, 영국 노팅엄트렌트·미국 프랫 석사. 공개작 6점.
**검증:** 서울여대 서양화, Nottingham Trent·Pratt Institute 석사, 구상→추상 전환, 추상 회화 연작, 전시(검증되는 것만), 출처 있는 발언. (history 7,033자 풍부 — 1차 재료)
`KIM_REISI_PATH`, `isKimReisiArtist` (keys: '김레이시','kim reisi','kimreisi','kim lacy'). jobTitle 화가/Painter.
커밋: `feat(master): 김레이시 전용 페이지 — 구상에서 추상으로\n\n요약: 김레이시(추상 회화 작가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Task 4: 정미정 (Jeong Mijeong) — `JeongMijeongFeature.tsx`
**정체성:** 시간·공간·기억을 쌓는 다층 회화. 세종대 회화, 런던 첼시 MA. 공개작 2점.
**검증:** 세종대 회화(서양화), Chelsea College of Arts(UAL) MA Fine Art, 시간·기억 다층 회화, 개인전(검증되는 것만), 출처 있는 발언. (history 5,073자 풍부 — 1차 재료)
`JEONG_MIJEONG_PATH`, `isJeongMijeongArtist` (keys: '정미정','jeong mijeong','jeong mi-jeong','jeongmijeong'). jobTitle 화가/Painter.
커밋: `feat(master): 정미정 전용 페이지 — 시간·기억의 다층 회화\n\n요약: 정미정(시간·기억을 쌓는 회화 작가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Task 5: 박성완 (Park Seongwan) — `ParkSeongwanFeature.tsx`
**정체성:** 광주·전남의 삶과 풍경. 전남대 미술·동대학원 서양화. 공개작 3점.
**검증:** 전남대 예술대학 미술학과·동대학원 서양화, 광주·전남 기반 활동, 지역 삶·풍경·인물 회화, 개인전(검증되는 것만), 출처 있는 발언. (bio 1,039 + history 2,225)
`PARK_SEONGWAN_PATH`, `isParkSeongwanArtist` (keys: '박성완','park seongwan','park seong-wan','parkseongwan'). jobTitle 화가/Painter.
커밋: `feat(master): 박성완 전용 페이지 — 광주·전남의 삶과 풍경\n\n요약: 박성완(광주·전남 기반 회화 작가) 전용 페이지 신설\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 6: dispatch 등록 + a11y + 통합 검증

**Files:** Modify `app/[locale]/artworks/artist/[artist]/page.tsx`, `e2e/a11y/campaign-pages.spec.ts`

- [ ] Step 1: page.tsx에 5개 import 추가 (`JuJaehwanFeature, { buildJuJaehwanMetadata }` 등 5개)
- [ ] Step 2: `MASTER_ARTIST_FEATURES`에 5명 등록 (`주재환:`, `손은영:`, `김레이시:`, `정미정:`, `박성완:`)
- [ ] Step 3: `campaign-pages.spec.ts` ROUTES에 5명 경로 추가 (`/artworks/artist/주재환` 등)
- [ ] Step 4: `npm run type-check` → PASS / `npm run lint` → PASS / `npm run build` → PASS
- [ ] Step 5: 커밋 (push·merge 안 함)
```
git add "app/[locale]/artworks/artist/[artist]/page.tsx" e2e/a11y/campaign-pages.spec.ts
git commit -m "feat(master): 주요 작가 5명 dispatch 등록 + a11y

요약: 주재환·손은영·김레이시·정미정·박성완 작가 페이지에 전용 페이지 연결

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 검증 체크리스트
- [x] 주요 작가 5명 각 전용 컴포넌트 (Task 1~5)
- [x] "거장/master" 표현 미사용, 작가 정체성으로 (공통 규칙)
- [x] 신학철 패턴 복제 + ko/en + 브랜드 토큰 (공통)
- [x] 사실성 게이트 + fact reviewer 재검증 (공통 + 각 Step5)
- [x] dispatch 5명 + a11y ROUTES 5명 (Task 6)
- [x] 같은 브랜치에 이어 쌓기, 머지 보류
