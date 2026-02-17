# 단일 승인 구조 전환 구현 계획서

## 1) 목표

현재의 `역할 변경 -> pending -> 온보딩 제출 -> 관리자 승인` 이중 체계를 제거하고,
`가입/초기 진입 시 신청서 제출 -> 관리자 1회 승인`으로 단일화한다.

핵심 원칙:

- 승인 전에는 최종 권한(`artist`/`exhibitor`)을 부여하지 않는다.
- 심사 상태의 단일 소스는 신청서(Application)로 통일한다.
- 관리자 심사는 단일 큐(`submitted`)에서 처리한다.

## 2) 범위

### 포함

- 데이터 모델(신청 상태 모델) 정비
- 가입/초기 진입 UX 및 라우팅 개편
- 관리자 심사 큐 통합 및 승인/반려 액션 정비
- 기존 pending 사용자 마이그레이션

### 제외

- 디자인 전면 리브랜딩
- 외부 결제/정산 로직 변경

## 3) 현재 문제 요약

1. 역할 부여와 운영 승인 분리로 사용자/관리자 인지 부하가 큼
2. exhibitor는 체감상 이중 승인으로 보임
3. 경로별 분기(login/callback/guard) 불일치로 UX 혼선 가능
4. 상태 해석이 분산되어 운영 리스크(잘못된 활성화, 누락 승인)가 증가

## 4) 목표 아키텍처

## 4.1 상태 모델

- `application_status`: `draft | submitted | approved | rejected | withdrawn`
- 사용자 활성 상태(`profiles.status`)는 최소화하여 권한 게이트의 결과값으로만 사용
- 최종 권한(`profiles.role`)은 승인 시점에만 반영

## 4.2 데이터 모델

신규/통합 테이블(권장):

- `applications`
  - `id`
  - `user_id`
  - `target_role` (`artist` | `exhibitor`)
  - `status`
  - `form_snapshot` (jsonb)
  - `submitted_at`
  - `reviewed_at`
  - `reviewer_id`
  - `rejection_reason`
  - `reapply_count`
  - `created_at`, `updated_at`

- `application_events` (append-only 감사 로그)
  - `application_id`
  - `event_type` (`submitted`, `approved`, `rejected`, `reapplied`, `withdrawn`, `reactivated`)
  - `actor_id`
  - `metadata` (jsonb)
  - `created_at`

초기 전환에서는 기존 `artist_applications`, `exhibitor_applications`를 유지해도 되며,
`applications`로 점진 통합한다.

## 5) 플로우 설계

## 5.1 사용자

1. 회원가입
2. 역할 선택(artist/exhibitor) 및 신청서 입력
3. 임시저장(`draft`) 가능
4. 제출 시 `submitted`
5. 결과 페이지: 승인 대기 / 반려 사유 / 재신청

## 5.2 관리자

1. 단일 심사 큐에서 `submitted` 목록 확인
2. 승인: 역할 부여 + 활성화 + 이벤트 기록
3. 반려: 사유 필수 입력 + 이벤트 기록
4. 재신청: 새 제출 이력으로 누적 관리

## 6) 코드 변경 포인트

## 6.1 라우팅/가드

- `app/login/page.tsx`
- `app/auth/callback/route.ts`
- `lib/auth/guards.ts`

변경 방향:

- 승인 전 사용자는 대시보드가 아니라 신청 진행/대기 페이지로 일관 라우팅
- callback/login/guard의 상태 판정 기준을 동일 함수로 통합

## 6.2 신청 액션

- `app/actions/onboarding.ts` (artist)
- `app/actions/exhibitor-onboarding.ts` (exhibitor)

변경 방향:

- 제출 시 status를 신청서 기준으로만 전이
- role 직접 변경 금지
- 스냅샷 + 이벤트 로그 남김

## 6.3 관리자 액션

- `app/actions/admin.ts`
- `app/actions/admin-exhibitors.ts`

변경 방향:

- `updateUserRole`의 즉시 활성화/임시 pending 로직 축소
- 승인 전용 액션에서만 최종 role/status 반영
- 승인/반려 모두 사유/이력 남김

## 6.4 관리자 UI

- `app/admin/users/*`
- `app/admin/exhibitors/*`
- (필요 시) `app/admin/artists/*`

변경 방향:

- 사용자 목록의 역할 변경은 심사 요청 상태를 생성하는 용도로 제한하거나 제거
- `심사 큐` 중심 UI로 통합
- 역할별(artist/exhibitor) 필터는 유지하되 승인 액션은 동일 UX

## 7) 데이터 마이그레이션 전략

## 7.1 백필 규칙

- 기존 `role=artist|exhibitor` + `status=active` -> `approved`로 매핑
- 기존 `pending` + 신청서 존재 -> `submitted`
- 기존 `pending` + 신청서 없음 -> `draft`

## 7.2 롤아웃 단계

1단계 (신규 유저): 단일 승인 플로우 적용
2단계 (기존 유저): 백필 스크립트 적용
3단계 (정리): 구 분기/중복 승인 액션 제거

## 8) 보안/RLS 원칙

- 신청자는 본인 `draft/submitted`만 조회/수정 가능
- 승인 후 신청서 수정은 금지(재신청은 새 이력)
- 관리자 승인 액션은 서버 전용 클라이언트로 실행
- 권한 테이블 GRANT/RLS 점검 SQL을 마이그레이션으로 고정

## 9) 검증 계획

기능 검증 시나리오:

1. 신규 artist 신청 -> submitted -> 관리자 승인 -> artist 대시보드 접근
2. 신규 exhibitor 신청 -> submitted -> 관리자 승인 -> exhibitor 대시보드 접근
3. 반려 -> 사유 노출 -> 재신청 -> 재심사
4. OAuth/이메일 로그인 모두 동일 라우팅 동작

기술 검증:

- `npm run lint`
- `npm run type-check`
- `npm test -- --runInBand`
- `npm run build`
- `lsp_diagnostics` 수정 파일 전체 무오류

## 10) 리스크 및 대응

- 리스크: 기존 관리자 운영 습관과 UI 변경 충돌
  - 대응: 1단계에서 기존 메뉴 유지 + 심사 큐 배너로 유도

- 리스크: 상태 백필 누락
  - 대응: dry-run 스크립트 + 샘플 사용자 수동 검증 후 apply

- 리스크: OAuth 콜백 분기 잔존
  - 대응: 로그인/콜백/가드 공통 상태해석 유틸 도입

## 11) 구현 순서(실행 계획)

1. DB 마이그레이션(상태 모델/이벤트 로그) 작성
2. 신청 액션을 단일 상태모델로 전환
3. 관리자 승인/반려 액션 통합
4. 로그인/콜백/가드 공통화
5. 관리자 UI 큐 통합
6. 백필 스크립트 실행
7. 전체 검증 및 운영 전환

---

승인 요청:

- 위 계획 기준으로 바로 EXECUTION(실제 코드/DB 변경) 진행 가능
- 우선순위는 `exhibitor`를 먼저 단일 승인화 후 `artist`에 동일 패턴 적용으로 제안
