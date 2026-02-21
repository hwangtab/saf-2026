# 이미지 업로드 장애 수정 계획서

## 1) 목표

- 아티스트/출품자 작품 등록 화면에서 이미지 업로드가 정상 동작하도록 복구한다.
- 브라우저 CSP 차단(`blob:`)으로 발생하는 클라이언트 단계 실패를 해소한다.
- 출품자 계정의 Storage 업로드 권한/경로 불일치를 해결한다.

## 2) 확인된 원인

1. `img-src` CSP에 `blob:`이 없어, 업로드 전 이미지 최적화 단계(`URL.createObjectURL`)가 차단됨.
2. 출품자 작품 업로드 경로가 `exhibitor-artwork-{artworkId}`인데, `artworks` 버킷 정책은 기본적으로 아티스트 경로 규칙(artist id 폴더) 중심이라 권한 불일치가 발생함.

## 3) 구현 범위

### 포함

- `next.config.js` CSP의 `img-src`에 `blob:` 추가
- 출품자 작품 폼의 업로드 경로를 아티스트 ID 기반으로 정렬
- Supabase migration 추가: `artworks` Storage 정책에 `exhibitor(active)` + `artists.owner_id` 기반 권한 허용
- lint/type-check 수행

### 제외

- Vercel Analytics 설정 자체 변경
- 기존 업로드 파일의 대규모 경로 마이그레이션

## 4) 구현 단계

1. CSP 수정
2. 출품자 작품 업로드 경로 수정
3. Storage policy migration 추가
4. 정적 점검 및 타입 점검 실행
5. `walkthrough.md`에 결과 기록

## 5) 검증 계획

- `npm run lint`
- `npm run type-check`
- (가능 시) 출품자/아티스트 작품 수정 화면에서 이미지 1장 업로드 수동 확인

## 6) 완료 기준 (Definition of Done)

1. `blob:` CSP 차단 콘솔 에러가 사라진다.
2. 아티스트 계정으로 작품 이미지 업로드가 성공한다.
3. 출품자 계정으로 본인 소유 작가의 작품 이미지 업로드가 성공한다.
4. lint/type-check가 통과한다.

## 승인 상태

- 사용자 응답(“응”)에 따라 본 계획으로 즉시 실행.

---

# 관리자 대시보드 최근 등록 검수 큐 전환 계획서

## 1) 목표

- 관리자 대시보드의 최근 등록 작품 카드에서 `전체 보기` 대신 검수 목적의 동선으로 이동시킨다.
- `/admin/artworks` 진입 시 “작가 직접 등록 최근작 검수” 맥락이 유지되도록 큐 모드를 제공한다.
- 목록 화면에서 최근작 여부를 명확히 인지할 수 있도록 등록일 중심 UI를 보강한다.

## 2) 구현 범위

### 포함

- 대시보드 최근 작품 섹션 CTA를 `최근 등록 검수하기`로 교체
- 대시보드 최근 작품 데이터 소스를 `artist_artwork_created` 로그 우선으로 변경
- `/admin/artworks?queue=artist-recent` 큐 모드 추가
- 큐 모드에서:
  - 작가 계정 연결 작품만 조회
  - 기본 정렬을 등록일 최신순으로 설정
  - 검수 큐 안내 배지/안내문/일반 목록 복귀 버튼 제공
  - 등록일 컬럼 추가

### 제외

- 별도 검수 상태(예: pending_review/approved/rejected) DB 스키마 추가
- 검수 액션 전용 서버 액션(정상/수정요청/보류) 신규 개발

## 3) 구현 단계

1. 대시보드 통계 액션에서 최근 작품 소스를 “작가 직접 등록” 기준으로 보강
2. 대시보드 카드 문구/링크를 검수 큐 진입 형태로 변경
3. 관리자 작품 목록 페이지에 `queue=artist-recent` 서버 필터 모드 추가
4. 목록 클라이언트 컴포넌트에 검수 큐 UI/등록일 정렬/등록일 컬럼 추가
5. `lint`/`type-check` 검증
6. `task.md`, `walkthrough.md` 반영

## 승인 상태

- 사용자 요청(“제대로 구현해줘요”)에 따라 본 계획으로 즉시 실행.

---

# 최근 등록 정렬 필터 전환 계획서 (방향 변경)

## 1) 목표

- 검수 큐 개념을 제거하고 `작품 관리` 페이지 자체에서 최근 등록 작품을 쉽게 확인하도록 단순화한다.
- 대시보드의 최근 작품 CTA를 작품 관리의 최근 등록 정렬 상태로 직접 연결한다.

## 2) 구현 범위

### 포함

- 대시보드 최근 작품 CTA를 `/admin/artworks?sort=recent`로 변경
- `작품 관리`에 정렬 필터 추가: `기본 정렬 / 최근 등록순 / 오래된 등록순`
- 정렬 필터 상태를 URL 쿼리(`sort`)로 유지
- 최근 작품 카드 데이터는 전체 등록 작품 기준 최신 5개로 복원

### 제외

- 검수 전용 큐/배지/전용 라우트
- 등록 주체(작가/출품자/관리자)별 분리 필터

## 3) 구현 단계

1. 대시보드 최근 작품 카드 문구/링크 수정
2. 작품 관리 페이지에서 `queue` 모드 제거 및 `sort` 파라미터 도입
3. 리스트 컴포넌트에 정렬 필터 UI/URL 동기화 로직 추가
4. 대시보드 최근 작품 데이터 소스를 전체 최신 등록 기준으로 정리
5. `lint`/`type-check` 검증 및 문서 반영

## 승인 상태

- 사용자 요청(“최근 등록순 필터를 만들고 그 페이지로 연결”)에 따라 본 계획으로 즉시 실행.

---

# Cafe24 초기 매핑/자동 동기화 전환 계획서

## 1) 목표

- 기존 `docs/cafe24-products-*.csv`를 단일 기준 데이터로 병합해 초기 매핑 테이블을 만든다.
- 이미지 참조 오류를 사전에 정리할 수 있는 `image-manifest`를 생성해 API 업로드 준비를 끝낸다.
- 이후 단계에서 작품 등록 시 `shop_url` 수동 입력을 제거할 수 있도록 멱등 키(`custom_product_code`) 중심 구조를 확정한다.

## 2) 구현 범위

### 포함

- CSV 병합/중복제거/필수값 검증 자동화 스크립트 추가
- 이미지 경로 정합성 검사 및 확장자 fallback 매니페스트 생성
- 실행 산출물(`master-products`, `initial-mapping`, `missing-images`, `summary`) 자동 생성
- 운영 문서(`scripts/cafe24/README.md`) 추가

### 제외

- Cafe24 OAuth 토큰 발급/갱신 자동화 코드
- Admin/Artist/Exhibitor 폼의 `shop_url` UI 제거
- Supabase 스키마 확장(`cafe24_product_no`, sync status 등)

## 3) 구현 단계

1. `scripts/cafe24/build_initial_mapping.py` 작성
2. `package.json`에 실행 스크립트(`cafe24:build-mapping`) 등록
3. 스크립트 실행 후 `docs/cafe24-mapping/*` 산출물 생성
4. 누락 이미지/필수값 누락 건수 확인
5. 결과를 기반으로 API 연동 2단계 설계로 이관

## 4) 검증 계획

- `npm run cafe24:build-mapping`
- 산출물 확인:
  - `docs/cafe24-mapping/summary.json`
  - `docs/cafe24-mapping/missing-images.csv`
  - `docs/cafe24-mapping/initial-mapping.csv`

## 5) 완료 기준 (Definition of Done)

1. CSV 전수(현재 패턴 매칭 파일) 병합 결과가 생성된다.
2. 각 작품별 API 준비 상태(`ready_for_api`)가 계산된다.
3. 이미지 누락/확장자 불일치가 `missing-images.csv`로 분리된다.
4. 동일 절차를 팀원이 재실행할 수 있는 문서/명령이 제공된다.

## 승인 상태

- 사용자 응답(“네 해봅시다.”)에 따라 본 계획으로 즉시 실행.

---

# Cafe24 자동 동기화 2단계 계획서 (토큰 영구저장 + 등록 자동 생성)

## 1) 목표

- OAuth 콜백에서 획득한 토큰을 DB에 영구 저장하고 만료 시 자동 갱신한다.
- 작품 등록/수정 시 Cafe24 상품을 자동 생성/갱신하여 `shop_url`을 자동 반영한다.
- 이미지 URL이 있을 경우 Cafe24 상품 이미지 업로드까지 자동 시도한다.

## 2) 구현 범위

### 포함

- `cafe24_tokens` 테이블 및 작품 동기화 메타 컬럼 마이그레이션
- OAuth 콜백의 토큰 DB 저장 로직 추가
- Cafe24 API 클라이언트(Access Token 자동 refresh 포함) 추가
- 작품 액션(artist/exhibitor/admin)에서 동기화 트리거 연동

### 제외

- 기존 작품 전체 재동기화 배치 작업
- 웹훅 소비(주문 상태 역동기화)
- 동기화 실패 재시도 큐(백그라운드 잡)

## 3) 구현 단계

1. DB 스키마 확장 마이그레이션 추가
2. Cafe24 클라이언트/토큰 저장/토큰 갱신 유틸 작성
3. OAuth callback에서 토큰 영구 저장 연결
4. 작품 생성/수정/이미지변경 액션에 자동 동기화 연결
5. lint/type-check 검증 및 운영 문서 업데이트

## 4) 검증 계획

- `npm run lint`
- `npm run type-check`
- OAuth 연결 후 작품 1건 생성 시:
  - `artworks.shop_url` 자동 채움
  - `artworks.cafe24_product_no` 채움
  - 실패 시 `artworks.cafe24_sync_error` 기록 확인

## 승인 상태

- 사용자 요청(“이거 해줘”)에 따라 본 계획으로 즉시 실행.

---

# 관리자 사용자 검색/필터 안정화 계획서 (admin/users)

## 1) 목표

- 관리자 사용자 관리 페이지에서 검색어 입력 중 값이 튕기거나 이전 값으로 되돌아가는 현상을 제거한다.
- 검색/필터 변경 시 URL 동기화 과정에서 다른 필터가 덮어써지는 레이스 컨디션을 제거한다.
- 작품 관리 페이지에 적용한 안정화 방식과 동일한 원칙으로 동작 일관성을 맞춘다.

## 2) 확인된 원인

1. `debouncedQuery` 변경 시 `router.push`가 반복 호출되어 서버 재렌더가 잦게 발생함.
2. `updateFilters`가 `useSearchParams()` 스냅샷을 기준으로 URL을 조합해, 연속 입력/필터 변경 시 stale 값으로 다음 URL을 만들 수 있음.
3. 서버에서 돌아온 `initialFilters.q`를 `setQuery`로 재주입하는 흐름이 입력 중인 로컬 값을 덮어쓸 수 있음.

## 3) 구현 범위

### 포함

- `app/admin/users/user-list.tsx`의 검색/필터 URL 동기화 로직을 `window.location.search` 기준으로 재작성
- 검색 디바운스 동기화 비교 기준을 `initialFilters.q`가 아닌 현재 URL `q`로 변경
- 자동 검색 동작은 히스토리 누적 없이 URL 반영되도록 정리 (`replaceState` 또는 동등 동작)
- Enter 제출/필터 드롭다운 변경 시에도 동일한 URL 병합 규칙 사용

### 제외

- 서버 쿼리(`app/admin/users/page.tsx`)의 검색 조건/정렬 정책 변경
- 사용자 테이블 렌더링/권한 변경 기능 수정
- 다른 페이지(`logs`, `trash`, `revenue`)의 UX 정책 변경

## 4) 구현 단계

1. `app/admin/users/user-list.tsx`에서 URL 갱신 유틸을 단일 함수로 정리
2. 검색 디바운스 effect를 현재 URL 기준 비교로 변경하여 튕김 방지
3. 필터 변경(`applicant/role/status`)과 검색 제출이 동일한 URL 병합 함수를 사용하도록 통합
4. 필요 시 `useSearchParams` 의존 제거/축소로 stale 파라미터 경로 차단
5. 정적 검증 실행 (`eslint`, `type-check`)

## 5) 검증 계획

- 기능 점검
  - 사용자 관리에서 검색어 연속 입력 시 값이 되돌아가지 않는지 확인
  - 검색 중 `status/role/applicant` 변경 시 다른 필터가 사라지지 않는지 확인
  - Enter 제출 후에도 입력값/필터가 유지되는지 확인
- 명령 검증
  - `npx eslint app/admin/users/user-list.tsx`
  - `npm run type-check`

## 6) 리스크 및 롤백

- 리스크: URL 동기화 방식 변경으로 브라우저 뒤로가기 동작 체감이 일부 달라질 수 있음
- 롤백: `app/admin/users/user-list.tsx`의 URL 동기화 부분만 이전 `router.push + searchParams` 방식으로 되돌림

## 승인 상태

- 승인 완료 (사용자 응답: “승인”)
- 실행 완료 (admin/users 안정화 반영)

---

# 검색 UX 개선 계획서 (한글 초성 혼합 입력 대응)

## 1) 목표

- 모든 주요 검색 필터에서 한글 초성 혼합 입력(`오ㅇ`)이 자연스럽게 동작하도록 개선한다.
- 입력 중 결과가 갑자기 사라졌다가 완성형 입력에서만 다시 나타나는 UX 단절을 제거한다.
- 검색 로직을 공통 유틸로 통일해 화면별 동작 차이를 줄인다.

## 2) 확인된 문제

1. 현재 다수의 검색 필터가 단순 `includes` 매칭만 사용하고 있어, `오ㅇ` 같은 입력을 `오윤`에 매칭하지 못함.
2. `admin/users`는 서버 쿼리(`ilike`)를 먼저 적용해 초성 혼합 입력 시 서버 단계에서 결과가 0건으로 잘릴 수 있음.

## 3) 구현 범위

### 포함

- 공통 검색 유틸 추가(공백 제거 + 소문자화 + 한글 초성 매칭 지원)
- 검색 필터 사용 화면에 공통 유틸 적용
  - `admin/artworks`, `admin/artists`, `admin/users`
  - `admin/content`(news/faq/videos/testimonials)
  - `exhibitor` 작가/작품 검색
  - 작품 등록 폼의 작가 선택 검색(관리자/출품자)
- `admin/users` 서버 검색에서 초성 혼합 입력 시 서버 `ilike`를 우회하고 클라이언트 필터로 보완

### 제외

- DB 레벨 전문 검색 도입(trigram, n-gram, 별도 인덱스)
- 공개 페이지 검색 알고리즘 전면 교체

## 4) 구현 단계

1. `lib`에 한글 초성 매칭 유틸 추가
2. 각 검색 필터 컴포넌트의 `includes` 로직을 공통 유틸 호출로 교체
3. `admin/users/page.tsx`에 초성 혼합 입력 감지 로직 추가(서버 쿼리 우회)
4. `admin/users/user-list.tsx`에 클라이언트 검색 필터 보강
5. 정적 검증 실행 (`eslint`, `type-check`)

## 5) 검증 계획

- 수동 시나리오
  - `오` 입력 시 `오윤` 노출
  - `오ㅇ` 입력 시 결과가 유지되어 `오윤` 계속 노출
  - `오유`/`오윤` 입력 시 점진적으로 정상 좁혀짐
- 명령 검증
  - `npm run lint`
  - `npm run type-check`

## 승인 상태

- 승인 완료 (사용자 요청: “개선하고 빌드 테스트 후 푸시”)
- 실행 완료 (공통 검색 유틸 + 필터 전역 반영 + 빌드 통과)

---

# 휴지통 영구삭제 로그 대상명 누락 개선 계획서

## 1) 목표

- `trash_purged` 로그에서 대상명이 `이름 정보 없음 (식별 ID ...)`로 보이는 케이스를 줄인다.
- 수동 영구삭제/자동 만료 정리 모두에서 대상 식별 정보를 일관되게 남긴다.
- 관리자 로그 화면의 액션 문구를 대상 중심으로 개선한다.

## 2) 확인된 원인

1. 영구삭제 시 원본 삭제 로그의 `before_snapshot`/`after_snapshot`를 `null`로 비우면서, 새 `trash_purged` 로그에는 `target_name`이 저장되지 않는다.
2. 대상 레코드가 이미 실제 테이블에서 삭제된 상태라 `enrichActivityLogTargets` 재조회로는 이름을 복원할 수 없다.
3. 결과적으로 로그 목록 UI가 UUID 기반 fallback(`이름 정보 없음...`)으로 내려간다.

## 3) 구현 범위

### 포함

- `app/actions/admin-logs.ts`
  - 영구삭제 직전 원본 로그(`metadata`, `before_snapshot`)에서 대상명/대상명맵 추출
  - `trash_purged` 메타데이터에 `target_name`, `target_names` 저장
- `app/api/internal/purge-trash/route.ts`
  - 자동 만료 정리 경로에도 동일 메타데이터 저장 로직 반영
- `scripts/purge-expired-trash.js`
  - 운영 스크립트 경로에도 동일 메타데이터 저장 로직 반영
- `app/admin/logs/logs-list.tsx`
  - `trash_purged` 액션 표시 문구를 `대상명 + 로그ID` 형태로 개선

### 제외

- 과거에 이미 생성된 `trash_purged` 로그의 백필 마이그레이션
- 휴지통 외 다른 액션의 문구 전면 개편

## 4) 구현 단계

1. 공통 대상명 추출 헬퍼를 각 경로(server action / cron route / script)에 추가
2. 수동/자동 영구삭제 로그 메타데이터에 대상명 저장 반영
3. 로그 목록 액션 문구 개선
4. `npm run lint`, `npm run type-check` 검증
5. `walkthrough.md` 결과 기록

## 5) 완료 기준 (Definition of Done)

1. 신규 생성되는 `trash_purged` 로그에서 대상 컬럼이 UUID fallback 대신 실제 제목/이름을 표시한다.
2. 자동 정리(CRON) 경로에서도 동일하게 대상명이 남는다.
3. lint/type-check가 통과한다.

## 승인 상태

- 사용자 승인 대기

---

# 검색 UX 재수정 계획서 (오ㅇ IME 조합 입력 누락 보완)

## 1) 배경

- 기존 개선 이후에도 `오ㅇ` 입력 구간에서 결과가 사라지는 케이스가 재현됨.
- 원인: IME 조합 중 `오ㅇ`이 `옹`(종성 포함 완성형)으로 입력될 때, 일부 경로에서 이를 초성 혼합 의도로 해석하지 못함.

## 2) 수정 목표

- `옹` 입력 상태에서도 `오ㅇ` 의도 검색을 병행해 `오윤` 같은 결과가 유지되도록 개선
- 클라이언트/서버 검색 분기 로직을 동일 기준으로 정렬해 페이지별 편차 제거

## 3) 구현 항목

1. `lib/search-utils.ts`

- 종성 포함 마지막 음절의 분해 쿼리 생성(예: `옹` → `오ㅇ`)
- `matchesSearchText`에서 원본 쿼리 + 분해 쿼리 후보를 모두 검사
- 서버 분기에서 재사용할 감지 함수(`hasComposedTrailingConsonantQuery`) 추가

2. 서버 필터 보강

- `/admin/users` 서버 `ilike` 우회 조건에 조합형 종성 입력 감지 추가
- `searchUsersByName` / `searchUnlinkedArtists`에도 동일 조건 반영

3. 회귀 테스트 추가

- `__tests__/lib/search-utils.test.ts` 신설
- `오ㅇ`, `옹`, `오윤` 케이스 검증

## 4) 검증 계획

- `npm test -- __tests__/lib/search-utils.test.ts`
- `npm run lint`
- `npm run type-check`
- `npm run build`

## 승인 상태

- 승인 완료 (사용자 피드백: “이거 개선 안되었다.” 이후 즉시 재수정 요청)
- 실행 완료 (IME 조합 입력 보완 + 검증 통과)

---

# 메인 하이라이트 작품 노출 랜덤화 계획서

## 1) 목표

- 메인 히어로 아래 `온라인 전시 하이라이트` 작품 노출을 최신 등록순 고정에서 랜덤 노출로 전환한다.
- 서버에서 셔플하여 SSR/ISR 렌더 안정성은 유지한다.

## 2) 구현 범위

- `/Users/hwang-gyeongha/saf/lib/supabase-data.ts`
  - `getSupabaseHomepageArtworks`의 `created_at desc + limit` 고정 정렬 제거
  - 판매 가능 작품 풀(`is_hidden=false`, `status!=sold/reserved`) 조회 후 서버 셔플 + 상위 `limit` 반환
  - Supabase 미연결/테이블 미존재 fallback 경로도 동일하게 랜덤 반환

## 3) 검증 계획

- `npm run lint`
- `npm run type-check`

## 승인 상태

- 승인 완료 (사용자 요청: “1번으로 해주세요”)
