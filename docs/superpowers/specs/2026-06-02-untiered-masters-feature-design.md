# 거장 미전용 5명 전용 페이지 설계

작성일: 2026-06-02

## 배경

DB `career_tier='거장'`은 11명이지만, 전용 큐레이션 페이지(`components/special/master-artists/*Feature.tsx`
또는 `/special/*`)를 가진 작가는 6명(오윤·박생광·신학철·민정기·이철수·박불똥)뿐이다.
나머지 **거장 5명은 일반 작가 페이지(`renderArtistPage`) 톤**으로만 노출되어 격차가 크다.

대상 5명 (DB 현황, 2026-06-02):

| 작가 | name_en | 정체성 | 공개작 | bio 길이 | 비고 |
|------|---------|------|:---:|:---:|------|
| 박재동 | Park Jae-dong | 한국 시사만화의 대부 (한겨레 그림판) | 25 | 1,026 | 작품·인지도 최상 |
| 류연복 | Ryu Yeonbok | 칼로 새긴 민중·국토의 목판화 | 4 | 1,981 | bio 풍부 |
| 김준권 | Kim Jungwon | 나무에 새긴 40년, 수묵 목판화 | 4 | 1,688 | bio 풍부 |
| 최병수 | Choe Byeongsu | 걸개그림 「한열이를 살려내라」·환경미술 | 1 | 1,087 | 내러티브 중심 |
| 조문호 | Jo Munho | "사람만 찍는" 다큐멘터리 사진 | 2 | 233 | bio 짧음, 리서치 보강 |

## 목표

거장 미전용 5명에게 신학철/박불똥과 **동일한 격의 전용 큐레이션 페이지**를 부여해 거장 11명의
페이지 격차를 해소한다. 이번 세션에서 검증된 전용 컴포넌트 패턴을 그대로 복제한다.

## 비목표 (YAGNI)

- 새 디자인 패턴 발명 안 함 — 신학철 `ShinHakchulFeature.tsx`를 구조 모델로 복제.
- **`lib/master-artists.ts` 카드 라인업(현재 6명) 추가 안 함** — 사용자 결정: 전용 페이지만,
  홈·푸터 거장 카드 노출은 나중에 별도 판단. 전용 페이지는 카드 없이 `/artworks/artist/<이름>`
  dispatch로 작동.
- 일반 작가 페이지 템플릿(`renderArtistPage`) 개선 안 함 (별도 사안).
- 작품 이미지/portrait 자산 신규 제작 안 함.

## 접근: 신학철 패턴 복제 (작가별 고유 모티프)

각 작가 = 독립 전용 컴포넌트. `ShinHakchulFeature.tsx`의 구조(메타 빌더 + 본문 + JSON-LD)를
복제하되, 작가별 시각 모티프와 고유 서사로 채운다.

### 각 페이지 구성 (신학철 동일)

1. 작가별 hero 모티프 (배지·시적 타이틀·부제) + `data-hero-sentinel`
2. bio 심화 5문단+ (기존 DB bio 활용 + WebSearch 보강)
3. named h3 sub-essay 2~4개 (박생광/신학철 패턴)
4. 출처 검증 quote (있으면; 없으면 생략)
5. 전시·소장 카드 (구체 전시명·연도·소장처)
6. 작가 연표
7. 갤러리 `MasterArtistMediumSections` (작품 적으면 내러티브 중심 + 0점 fallback)
8. JSON-LD: Person / ExhibitionEvent / ItemList / AggregateOffer
9. ko/en 병기, 브랜드 토큰, 작가별 시각 모티프

### 작가별 잠정 모티프·심층 주제 (구현 시 WebSearch 확정)

- **박재동**: 시사만화/그림판 — ① 한겨레 「그림판」과 시사만화 ② 만화의 사회적 발언 ③ 애니메이션·교육
- **류연복**: 목판화 — ① 칼로 새긴 민중의 삶 ② 국토·자연 ③ 1980년대 민중판화 운동
- **김준권**: 수묵 목판화 — ① 수묵의 정신을 새긴 목판 ② 한국의 산하 ③ 40년 판화 외길
- **최병수**: 걸개그림·환경 — ① 「한열이를 살려내라」와 1980년대 ② 환경미술(펭귄·고래 등) ③ 노동자에서 미술가로
- **조문호**: 다큐 사진 — ① "사람만 찍는다" ② 청량리·인사동·정선 ③ 기록으로서의 사진

## 사실성 원칙 (엄격 — 이번 세션 워크플로)

- 모든 추가 전기·전시·수상·인용은 WebSearch 교차검증 → **별도 fact reviewer 독립 재검증** →
  미확인 사실 수정/제거. (이번 세션에서 신학철 「신기루」·민정기 소장처/Bugaksan 오역·이철수
  작품 수·박불똥 24점 등 다수 적발·수정한 절차를 그대로 적용)
- **작가 quote는 출처 있는 실제 발언만.** 위조·각색 금지. 검증 불가 시 생략.
- 검증 안 되는 sub-essay 주제·구체 사실(작품명·연도·치수·수치)은 제외하거나 일반화("등 다수").
- 캠페인 프레이밍: 거장 = "동료 예술인을 위한 연대자". 금융 피해 당사자 묘사 금지.

## 구조·기술 제약

- 신규 파일 5개:
  - `components/special/master-artists/ParkJaedongFeature.tsx`
  - `components/special/master-artists/RyuYeonbokFeature.tsx`
  - `components/special/master-artists/KimJungwonFeature.tsx`
  - `components/special/master-artists/ChoeByeongsuFeature.tsx`
  - `components/special/master-artists/JoMunhoFeature.tsx`
- 수정 파일:
  - `app/[locale]/artworks/artist/[artist]/page.tsx` — `MASTER_ARTIST_FEATURES`에 5명 import + 등록
  - `e2e/a11y/campaign-pages.spec.ts` — ROUTES에 5명 경로 추가
- 각 컴포넌트는 `ShinHakchulFeature.tsx`의 export 시그니처(`default async function XFeature` +
  `buildXMetadata`)·import·normalizer·JSON-LD 패턴을 복제.
- ko/en 병기. 영문 locale `robots: noindex` (기존 거장 동일).
- 브랜드 토큰만: `charcoal*`·`canvas*`·`gallery*`·`primary*`·`sun*`(텍스트). `slate-*`/`indigo-*`,
  raw sun-hex 그림자 금지. `bg-primary`+`text-white`+소형 텍스트 금지.
- 작품 0~2점 작가(최병수·조문호)는 박불똥 선례처럼 내러티브 중심 + "작품 준비 중" fallback 유지.

## 작업 단위 분해

작가 1명 = 1 독립 task (5 task). 각 task 내부:
1. WebSearch 사실 검증 (전기·전시·수상·인용)
2. 신학철 패턴 복제로 전용 컴포넌트 작성 (hero·bio·sub-essay·quote·전시·연표·갤러리·schema, ko/en)
3. type-check + 파일 lint + 색상 grep
4. 커밋
5. (각 task 후) fact reviewer 독립 재검증 → 미확인 사실 수정

+ 1 task: page.tsx dispatch 5명 등록 + a11y ROUTES 5명 추가 + 통합 검증(type-check/lint/build).

작가 간 의존성 없음 — 순서 무관. 신학철 `ShinHakchulFeature.tsx`가 공통 참조 모델.

## 검증

- `npm run type-check` / `npm run lint` / `npm run build` 통과
- 5개 신규 파일 색상 토큰 grep clean
- a11y ROUTES에 5명 추가
- ko/en 양 locale 수동 렌더 확인

## 푸시 정책

- **머지 보류.** origin/main 기준 `feat/master-artists-untiered-5` 브랜치에 커밋을 쌓아두고,
  사용자가 "나중에 한번에" 푸시/머지하겠다고 했으므로 이번 작업에서는 push·merge 하지 않는다.
  (이번 세션 한정 예외 — 평소 기본은 push·머지)

## 리스크

- 조문호: bio 233자로 짧음 → WebSearch 의존도 높음. 검증 가능한 사실로만 구성, 부족하면 페이지가
  다른 4명보다 가벼울 수 있음(허용 — 거짓보다 나음).
- 박재동: 작품 25점이 시사만화/그림이라 갤러리 성격이 회화 거장과 다름 — 갤러리 섹션 카피를
  만화·그림에 맞게 조정.
- 사실 검증 비용: 5명 × 다수 sub-essay = 상당한 WebSearch + fact review. 작가별 순차 진행.
