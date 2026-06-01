# 신학철 거장 큐레이션 페이지 설계 (`ShinHakchulFeature`)

작성일: 2026-06-01

## 배경 / 문제

거장 라인업 6명(`lib/master-artists.ts`) 중 5명은 작가 페이지(`/artworks/artist/<이름>`)
진입 시 전용 큐레이션 컴포넌트로 분기되어 "거장다운" UI/UX를 갖는다:

- 오윤 → `/special/oh-yoon` 전용 페이지
- 박생광 → `/special/park-saenggwang` 전용 페이지
- 민정기 → `MinJoungkiFeature`
- 이철수 → `LeeCheolsooFeature`
- 박불똥 → `ParkBuldongFeature`

**신학철만 전용 feature가 없어 일반 작가 페이지(`renderArtistPage`) 기본 톤으로 렌더된다.**
이 격차를 없애 신학철도 동일한 수준의 전용 큐레이션 페이지를 갖게 한다.

## 목표

- 신학철 전용 feature 컴포넌트(`ShinHakchulFeature`)를 다른 거장 5명과 **동일한 메커니즘**으로
  작가 페이지 dispatch에 연결한다.
- 신학철 고유의 시각 언어("역사의 지층·수직 축적")로 다른 거장들과 같은 격의 페이지를 만든다.
- 「한국근대사」 연작 미학과 「모내기」 표현의 자유 사건을 내러티브의 두 축으로 다룬다.

## 비목표 (YAGNI)

- 새 URL 라우트 생성 안 함 (`/special/shin-hakchul` 만들지 않음). canonical은 작가 페이지 URL.
- 숨김(`is_hidden=true`) 10점을 공개로 전환하지 않음. **공개 3점만** 노출.
- 거장 6명 페이지의 공통 추상화/리팩터링 안 함 (현재 각 feature는 독립 파일 — 기존 패턴 유지).
- `lib/master-artists.ts`의 카드 정의는 이미 신학철을 포함하므로 변경 불필요.

## 확정된 사실관계 (WebSearch 검증 완료, 2026-06-01)

- 申鶴澈, **1943년 12월 12일 경북 김천 출생**
- **1968년 홍익대학교 서양화과 졸업**
- 모더니스트로 출발 → 1970년대 오브제·콜라주(「비상탈출」 연작) → **1978년 사진집
  「사진으로 보는 한국 백년」 충격** → 1980년대 「한국근대사」·「한국현대사」 연작으로 전환
- 기법: **포토콜라주·포토몽타주**, 인체·사물이 기관차처럼 **수직으로 응축·축적**되는 구성
- 민중미술 1세대 거장
- **「모내기」(1987)** 사건 타임라인:
  - 1989.9 국가보안법상 이적표현물로 압수, 작가 구속
  - 1심·2심 무죄
  - 1998 대법원 파기환송
  - 1999.8 파기환송심 — 국가보안법 위반 징역 10개월 선고유예 + 작품 몰수
  - **2004 UN 자유권규약위원회(Human Rights Committee)** — 자유권규약 제19조(표현의 자유)
    침해 인정, 유죄판결 보상·무효화 한국 정부에 권고
  - 2018 검찰 보관창고 → 국립현대미술관 위탁보관

출처: 나무위키, 학고재갤러리, 뉴스1, 경향신문, vop.co.kr 등 (WebSearch 교차 확인)

## 통합 방식 (architecture)

기존 거장 5명과 **동일한 dispatch 구조**를 그대로 따른다.

### 변경 파일

1. **신규** `components/special/master-artists/ShinHakchulFeature.tsx`
   - `export default async function ShinHakchulFeature({ params })`
   - `export async function buildShinHakchulMetadata({ params }): Promise<Metadata>`
   - `ParkBuldongFeature.tsx`를 구조적 참조 모델로 삼되 시각·콘텐츠는 신학철 전용으로 작성

2. **수정** `app/[locale]/artworks/artist/[artist]/page.tsx`
   - import 추가: `ShinHakchulFeature`, `buildShinHakchulMetadata`
   - `MASTER_ARTIST_FEATURES`에 `신학철: { Component, buildMetadata }` 항목 추가
   - 기존 `isMasterArtist` / metadata·body 분기 로직은 그대로 자동 적용 (추가 분기 코드 불필요)

3. **수정** `e2e/a11y/campaign-pages.spec.ts`
   - 거장 a11y는 이 파일의 `ROUTES` 배열에서 커버됨 (현재 `['/petition/oh-yoon', '/special/oh-yoon']`)
   - 신학철은 `/special/<slug>` 라우트가 없으므로 `/artworks/artist/신학철`(인코딩 형태) 경로 추가
   - WCAG AA 위반(특히 `bg-primary` + 흰 소형 텍스트) 차단 확인

### 데이터 흐름

- `getSupabaseArtworksByArtist('신학철')` → 데이터 레이어가 `is_hidden=true` 제외 → **공개 3점** 반환
  - 한국현대사-유월항쟁도 (1988, 목판화, ₩25,000,000)
  - 무제 (1997, 콜라주, ₩3,000,000)
  - 한국현대사-민주주의 만세(5.18) (2017, 콜라주, ₩12,000,000)
- 작품 3점은 `MasterArtistMediumSections`에 전달
- OG 이미지는 첫 작품 이미지(`resolveSeoArtworkImageUrl`) → 없으면 `OG_IMAGE.url` fallback
- 작품 0점 케이스에도 기존 박불똥 패턴의 "작품 준비 중" fallback 블록 유지 (방어적)

## 시각 컨셉 — "역사의 지층"

- **모티프**: 박불똥의 회전 콜라주 대신, 신학철 연작의 **수직 응축**을 반영한 세로 띠/지층 단면
- **히어로**: 다크 `charcoal` 배경 + 생몰년 배지("신학철 · 1943–") + 수직성을 암시하는 시적 타이틀
  - 한글 예: "역사는 한 사람의 몸으로 / 수직으로 쌓인다"
  - 영문 예: "History stacks vertically — / through a single body"
  - (최종 문구는 구현 시 1차안, 사용자 피드백으로 조정 가능)
- **색상**: 전부 브랜드 토큰만 사용
  - 배경/텍스트: `charcoal`·`charcoal-deep`·`canvas-soft`·`gallery.*`
  - 액센트: `primary`·`primary-strong`·`primary-soft`
  - **금지**: `slate-*`, `indigo-*`/`blue-*` 등 기본 팔레트, `sun-*` 배경
  - **`bg-primary` + `text-white` + 소형 텍스트 금지** → `Button variant="primary"` 또는 `bg-primary-strong` 직접
- `PaperGrain` 컴포넌트 포함
- 헤더 투명화용 `data-hero-sentinel="true"` 요소 히어로에 포함 (기존 거장 동일)

## 콘텐츠 섹션 (위 → 아래)

1. **히어로** — 생몰년 배지 + 시적 타이틀 + 2줄 부제
2. **내러티브** (좌측 2~3문단) — 「한국근대사」 연작의 수직 응축 미학:
   모더니스트 출발 → 1978 사진집 충격 → 역사를 한 화면에 응축하는 포토몽타주로의 전환
3. **주요 테마 3카드** (우측):
   - ① **수직 몽타주** — 인체·사물이 기관차처럼 응축되는 형식미
   - ② **「모내기」와 표현의 자유** — 1989 압수~2004 UN 결정, 예술이 권력과 충돌한 상징적 사건
   - ③ **민중미술 1세대의 역사의식** — 개인이 아닌 집단·역사를 그리는 시선
4. **작가 연표** (`<ol>`): 1943 김천 출생 → 1968 홍익대 졸업 → 1978 사진집 충격 →
   1980년대 「한국근대사」 연작 → 1987 「모내기」 → 1989 압수·구속 → 1999 몰수 확정 →
   2004 UN 자유권규약위 권고 → 2018 국립현대미술관 위탁
5. **예술인 상호부조 배너** — 기존 거장 공통 카피 재사용.
   **캠페인 프레이밍 준수**: 신학철은 "동료 예술인을 위한 연대자". 금융 피해 당사자로 묘사 금지.
6. **작품 갤러리** — `MasterArtistMediumSections`(공개 3점) + 클릭 안내 + 0점 fallback

## 이중언어 + SEO 스키마

- **ko/en 전체 병기.** 영문 locale은 `robots: { index: false, follow: true }` (기존 거장 동일 — thin content)
- **JSON-LD** (`JsonLdScript`):
  - `BreadcrumbList` — Home > Artworks > 신학철
  - `ExhibitionEvent` — VirtualLocation, organizer = SAF organization
  - `Person` — name, birthDate `1943-12-12`, birthPlace 경북 김천,
    alumniOf 홍익대 서양화과, affiliation 민족미술협의회,
    knowsAbout [포토몽타주, 한국 민중미술, 한국근대사], nationality South Korea(Wikidata Q884)
  - `ItemList` (`generateArtworkListSchema`)
  - `AggregateOffer` (`generateGalleryAggregateOffer`)
- 메타데이터: 기존 `ARTIST_SEO_OVERRIDES.신학철` 톤 계승, `PAGE_COPY` 객체로 ko/en 분리
- canonical/OG url = `/artworks/artist/신학철` (locale 적용)

## 에러 처리

- 페이지 전체는 작가 페이지 `renderArtistPage`의 outer try/catch 안에서 dispatch되므로,
  feature 내부 throw 시 `ArtistNotFound` fallback + 200 응답 (기존 안전망 그대로 활용)
- 작품 fetch 0점 → "작품 준비 중" 블록 (throw 아님)
- `export const dynamic = 'force-dynamic'`는 page.tsx 레벨에 이미 설정됨 (feature는 상속)

## 테스트 / 검증

- `e2e/a11y/campaign-pages.spec.ts`의 `ROUTES`에 `/artworks/artist/신학철` 추가 (CLAUDE.md 신규 페이지 필수)
- `npm run type-check` 통과
- `npm run lint` 통과
- `npm run build` 로컬 통과 (SSG 호환 — 인기작가 prerender 영향 확인)
- 수동: ko/en 양 locale에서 히어로·내러티브·연표·작품 3점·스키마 렌더 확인

## 작업 단위 분해 (independent units)

1. `ShinHakchulFeature.tsx` 작성 (metadata 빌더 + 본문 컴포넌트) — 자기완결적, 외부 의존은
   기존 공유 유틸(`MasterArtistMediumSections`, `seo-utils`, `locale-alternates`, `supabase-data`)
2. `page.tsx` dispatch 등록 (2줄 import + 1개 맵 항목)
3. a11y spec 추가
4. 빌드·타입·린트 검증

각 단위는 독립적으로 이해·검증 가능하며, 1번이 핵심이고 2번이 활성화 스위치다.
