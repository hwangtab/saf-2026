# Oracle 정밀 코드리뷰 결과 (2026-03-05)

## 개요

- 요청: 저장소 전반에 대한 정밀/광범위 코드리뷰를 통해 개선점 도출
- 수행 방식: 읽기 전용 점검 + 정적 검사/테스트 결과 기반 우선순위화
- Oracle 세션: `ses_343bc6393ffeVZbGxIvgRgG6N6`

## 점검 범위

- Architecture / Reliability / Security / Performance
- Type Safety / Accessibility / DX(Maintainability) / Test Strategy
- 참조 근거: 코드 파일 경로, 라인 힌트, 실행 결과(Oracle 보고 기준)

## 최우선 개선 항목 (Impact x Effort)

### 1) [High | Quick] CSV Formula Injection 방어 미흡

- 근거:
  - `app/(portal)/admin/artworks/export/route.ts:32`
  - `app/(portal)/admin/artists/export/route.ts:44`
  - `app/(portal)/admin/revenue/export/route.ts:27`
- 문제: CSV 이스케이프는 따옴표 처리 중심이며, 수식 시작 문자(`=`, `+`, `-`, `@`, 탭/캐리지리턴) 방어가 없음
- 리스크: 관리자 환경에서 CSV 오픈 시 수식 실행 가능
- 권장: `csvSafeCell` 공통 유틸 도입 후 모든 export route에서 일괄 적용

### 2) [High | Short] Service Role 키 권한 경계 과확장

- 근거:
  - `lib/auth/server.ts:29`
  - `app/actions/exhibitor-artists.ts:12`
  - `app/actions/exhibitor-artworks.ts:90`
- 문제: 사용자 플로우에도 admin 성격 클라이언트가 확장될 수 있는 구조
- 리스크: RLS 우회 가능성 증가(로직 실수 시 권한 상승 위험)
- 권장: 사용자/파트너 액션은 server client 고정, admin 전용만 admin client 사용

### 3) [Medium-High | Quick] PostgREST `.or()` 조합 시 입력 sanitize 불균일

- 근거:
  - `app/actions/admin-exhibitors.ts:62`
  - `app/actions/admin-artists.ts:378`
  - `app/actions/admin-logs.ts:1031`
  - 참고 구현: `app/actions/admin.ts:38` (`sanitizeIlikeQuery`)
- 문제: 일부 액션에서 사용자 입력이 `.or()` 문자열에 직접 삽입
- 리스크: 특수문자 케이스에서 필터 오류/조회 실패
- 권장: 공통 sanitize 유틸로 전 경로 통일

### 4) [Medium | Medium] 다중 테이블 업데이트 비원자성

- 근거:
  - `app/actions/admin-artists.ts:414`
  - `app/actions/admin-artists.ts:423`
  - `app/actions/admin-artists.ts:443`
- 문제: 순차 업데이트 중간 실패 시 부분 반영 상태 발생 가능
- 리스크: 데이터 정합성 저하
- 권장: RPC 트랜잭션화 또는 보상 로직 도입

### 5) [Medium | Quick] `edition_limit` 서버 검증 강화 필요

- 근거:
  - `lib/actions/artwork-validation.ts:68`
  - `lib/actions/artwork-validation.ts:74`
- 문제: `!edition_limit` 중심 검증으로 음수/소수 등 비정상 값 유입 여지
- 리스크: 데이터 무결성 저하
- 권장: `Number.isInteger(n) && n > 0` 강제

### 6) [Medium | Short] 테스트 커버리지 전략 부재

- 근거:
  - 전체 커버리지 5.01%(Oracle 보고)
  - `jest.config.js:16`
- 문제: 핵심 서버 액션 회귀 탐지력이 낮음
- 리스크: 권한/정산/동기화 이슈가 늦게 발견될 가능성
- 권장: 핵심 액션 테스트 우선 확충 + coverage threshold 도입

## 도메인별 핵심 관찰

### Reliability

- 다중 단계 업데이트의 부분 성공 상태 가능성 존재
- 서버 측 입력 검증이 일부 케이스에서 충분히 엄격하지 않음

### Security

- CSV 내보내기 수식 주입 방어가 우선 대응 대상
- 권한 경계(서비스 롤 사용 범위) 재정의 필요
- `next.config.js`의 CSP 완화 범위가 넓어 점진적 강화 검토 권장

### Performance

- 전량 조회 후 메모리 필터링 패턴이 일부 액션에 존재
- 1k~2k+ 라인 초대형 파일로 인한 인지/변경 비용 증가

### Type Safety

- 런타임 코드 내 `any` 사용 지점 다수
- React 런타임/타입 버전 정합성 점검 필요

### Accessibility

- 모달 닫힘 시 포커스 복귀 로직 보강 필요

### DX / Maintainability

- 동일 문제(검색 sanitize, revalidate)의 구현 패턴이 파일별로 분산
- 공통 유틸로 일원화 시 유지보수 비용 절감 가능

## 실행 로드맵

### Quick Wins (이번 주)

1. CSV 셀 수식 시작 문자 중화 유틸 도입/적용
2. `.or()` 검색 입력 sanitize 공통화
3. `edition_limit` 서버 검증 강화
4. 모달 포커스 복귀 처리 추가

### Medium (1-2주)

1. Supabase client 경계 재정의(admin 전용/사용자 전용 분리)
2. 핵심 서버 액션 단위 테스트 확충
3. `coverageThreshold` 최소 기준 도입

### Long (분기)

1. 초대형 액션 파일 모듈 분해
2. CSP `Report-Only` 기반 점진 강화

## 권장 후속 작업

1. 위 Top 6 기준 `implementation_plan` 수립(우선순위/담당/일정 포함)
2. 보안 이슈(CSV, 권한 경계)부터 패치 후 회귀 테스트 수행
3. 테스트 임계치 도입 전, 핵심 비즈니스 플로우 테스트 최소 세트 선반영
