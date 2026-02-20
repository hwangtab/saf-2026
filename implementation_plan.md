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
