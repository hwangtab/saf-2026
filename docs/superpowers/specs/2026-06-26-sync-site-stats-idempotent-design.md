# sync-site-stats 멱등화(idempotent) 설계

- 날짜: 2026-06-26
- 상태: 설계 승인됨 (구현 미착수)
- 범위: `scripts/sync-site-stats.js` 단일 파일

## 배경 / 문제

`lib/site-stats.ts`와 `content/changelog.json`은 빌드 전(prebuild) 스크립트가
생성하는 산출물이며 git에 추적된다. `npm run build`를 로컬에서 돌리면
(CLAUDE.md가 push 전 권장) working tree가 더러워진다.

코드 검증으로 확인한 **비대칭**:

- `scripts/generate-changelog.js`는 이미 "변경 없으면 안 씀" 가드를 보유
  (`generate-changelog.js:228` — 새 commit 없으면 `return`). 따라서
  `changelog.json`은 **진짜 새 커밋이 생겼을 때만** 변한다(정당·불가피한 churn).
- `scripts/sync-site-stats.js`는 **무조건 `writeFileSync`** 하고, 생성 content에
  `// 최종 갱신: ${today}`로 **빌드 당일 날짜를 매번 박는다**
  (`sync-site-stats.js:80,97`). 카운트가 안 바뀌어도 날짜가 매일 달라져
  diff가 발생한다.

즉 working-tree 노이즈의 주범은 "생성물을 커밋하는 설계"가 아니라
**sync-site-stats의 무조건 쓰기 + 휘발성 날짜 주입**이다.

## 목표 / 비목표

**목표**

- `sync-site-stats.js`가 **데이터(작품 수·작가 수)가 실제로 바뀐 경우에만**
  `site-stats.ts`를 다시 쓰도록 만든다(멱등화).
- 같은 카운트로 며칠 뒤 다시 빌드해도 working tree가 깨끗해야 한다.

**비목표 (이번 변경에서 건드리지 않음)**

- `generate-changelog.js` — 이미 자가-가드 보유, 무수정.
- `content/changelog.json`의 churn — 새 커밋 반영이라 정당, 그대로 둔다.
- gitignore / dev(predev·prebuild) 훅 / `package.json` — 변경 없음.
- `lib/site-stats.ts`의 export·소비처(29곳)·헤더 주석 형식 — 불변.
  (생성 결과물의 바이트가 "데이터 변경 시"에만 달라질 뿐 파일 구조는 동일.)
- `site-stats.ts`는 상수를 export하는 **소스 파일**이라 gitignore 불가
  (클론 직후 타입체크·빌드가 깨짐) → 추적 유지가 전제.

## 설계

`sync-site-stats.js` 끝부분(현재 무조건 `writeFileSync`)을
**"기존 파싱 → 날짜 결정 → content 생성 → 기존과 정확히 비교 → 조건부 쓰기"**로
교체한다.

### 1. 기존 파일 파싱

정규식으로 기존 파일에서 추출 (이미 `LOAN_COUNT`를 같은 방식으로 보존 중):

- 기존 `ARTWORK_COUNT`, `ARTIST_COUNT`
- 기존 "최종 갱신" 날짜
- 기존 `LOAN_COUNT` (현행대로 보존)

### 2. 날짜 결정 (핵심)

- DB 카운트(`artworkCount`, `artistCount`)가 기존 파일 값과 **모두 동일**
  → 기존 날짜 **재사용**.
- 하나라도 다름 → `today`로 갱신.

### 3. content 생성 → 기존과 string 비교 → 조건부 쓰기

- 생성 content가 기존 파일과 **바이트 동일** → **쓰지 않음**,
  `[sync-site-stats] unchanged — 작품 N건, 작가 M명` 로그 후 `exit 0`.
- 다름 → `writeFileSync` + 기존 `updated` 로그 (현행 유지).

content를 통째로 비교하므로 카운트·LOAN·포맷 등 어떤 줄이 바뀌어도 정확히 감지된다.

## 엣지 케이스 / fallback

모두 "안전한 쪽 = 갱신(write)"으로 수렴하며, 기존 안전망은 하나도 바꾸지 않는다.

| 상황                                       | 동작                                        |
| ------------------------------------------ | ------------------------------------------- |
| 기존 날짜 파싱 실패(포맷 변경 등)          | `today`로 fallback → write (정보 손실 방지) |
| 기존 카운트 파싱 실패                      | "변경"으로 간주 → write                     |
| Supabase env 없음 / `artworkCount == null` | **현행 그대로** `exit 0`, 파일 무수정       |
| anon key fallback                          | **현행 그대로** 경고 후 진행                |
| `LOAN_COUNT` (수기 관리 영역)              | **현행 그대로** 기존 값 보존                |

## 검증

DB 호출 의존이라 jest 단위 테스트 인프라 밖 → **수동 스모크 2단계**:

1. `node scripts/sync-site-stats.js` 1회 → 변경 반영 확인.
2. **곧바로 한 번 더 실행** → `unchanged` 로그 + `git status` 깨끗
   (파일 무변경) 확인. ← 핵심 회귀 검증.

추가:

- `npm run type-check` — `site-stats.ts` 형식 정합 확인(출력 형식 불변이라 통과 예상).

## 영향 / 리스크

- 영향 면적 최소(스크립트 1파일). 소비처·빌드 파이프라인·배포 동작 불변.
- 배포(Vercel) 시에도 카운트가 바뀌면 정상 갱신, 안 바뀌면 no-op — 기능 동일.
- 리스크: 정규식 파싱이 헤더 주석 문구에 의존 → content 생성 시 헤더 문구를
  바꾸면 파싱과 동기화 필요. 본 설계는 헤더 문구를 바꾸지 않으므로 해당 없음.
