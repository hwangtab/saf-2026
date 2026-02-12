# 관리자 활동 로그 고도화 계획안

## 1) 배경 및 목표

현재 관리자 활동 로그는 `admin_logs` 테이블 기반으로 동작하며, 관리자 액션 일부만 기록/조회하고 있습니다.

- 현재 포함: 관리자 사용자/작가/작품 관련 주요 액션
- 현재 미포함: 아티스트(대시보드)에서의 작품 등록/수정/삭제 활동
- 현재 제한: 검색/필터 기능 부재, 롤백(복구) 기능 부재

본 계획의 목표는 아래 3가지입니다.

1. **감사 범위 확장**: 아티스트 활동까지 관리자 로그 페이지에서 통합 조회
2. **운영 가시성 강화**: 시간/이름/활동/대상 기준 검색·필터·정렬
3. **안전한 복구 체계 도입**: 합의 없는 변경/오수정 발생 시 로그에서 복구 실행

---

## 2) 현재 상태 진단

### 2.1 로그 저장 구조

- 로그 테이블: `public.admin_logs`
  - 컬럼: `id`, `admin_id`, `action`, `target_type`, `target_id`, `details`, `created_at`
  - RLS: 관리자만 조회/삽입
  - 마이그레이션: `supabase/migrations/20260206020000_add_admin_logs.sql`

### 2.2 조회 UI

- 페이지: `app/admin/logs/page.tsx`
- 목록 UI: `app/admin/logs/logs-list.tsx`
- 제공 기능: 페이지네이션(기본 50), 단순 표 조회
- 미제공 기능: 검색, 고급 필터, actor 구분, 롤백 UI

### 2.3 로그 기록 지점

- 기록 함수: `app/actions/admin-logs.ts` 의 `logAdminAction`
- 현재 기록되는 액션 출처:
  - `app/actions/admin.ts` (사용자 승인/거절/재활성화/권한 변경)
  - `app/actions/admin-artists.ts` (작가 생성/수정/삭제)
  - `app/actions/admin-artworks.ts` (작품 생성/수정/삭제/일괄 변경)

### 2.4 구조적 한계

1. `admin_id` 중심 설계라 아티스트 액션을 동일 구조로 담기 어려움
2. `details`는 요약성 메타 중심(제목/개수)으로 **복구용 스냅샷 정보 부족**
3. 로그 엔트리와 실제 변경 트랜잭션 간 연결키(undo용 correlation) 부재
4. 필터 가능한 인덱스(시간+행위자+대상+액션 조합) 부족

---

## 3) 목표 기능 정의

## 3.1 통합 활동 로그 (Admin + Artist)

관리자 페이지에서 아래 행위자를 모두 조회 가능하게 확장합니다.

- 관리자(actor_role=`admin`)
- 아티스트(actor_role=`artist`)

대상 엔터티(초기 범위):

- `artwork`, `artist`, `user`, `content(news/faq/video/testimonial)`

## 3.2 검색/필터/정렬

필수 필터:

- 기간: 시작/종료 시각
- 이름: 행위자 이름 또는 이메일
- 활동: 액션 코드(생성/수정/삭제/상태변경/일괄처리)
- 대상: target_type, target_id

보조 기능:

- 저장된 필터 프리셋
- 최근 24시간/7일/30일 빠른 선택
- 정렬: 최신순 기본, 과거순 전환

## 3.3 로그 기반 복구(Undo/Revert)

복구는 **무조건 덮어쓰기**가 아닌, 아래 안전 절차를 가진 **보상 트랜잭션** 방식으로 구현합니다.

1. 로그 엔트리의 `before_snapshot` 존재 확인
2. 현재 데이터와 스냅샷 간 충돌 검사(버전/updated_at)
3. 관리자 2단계 확인(복구 사유 입력)
4. 복구 실행 + 별도 `revert_executed` 로그 기록

초기 복구 대상(Phase 1):

- 단일 작품 수정(`artwork_updated`) 되돌리기
- 단일 작가 수정(`artist_updated`) 되돌리기

추후 확장(Phase 2):

- 콘텐츠 수정/삭제 복구
- 일괄 변경(batch) 복구(부분 실패 처리 포함)

---

## 4) 데이터 모델 확장안

## 4.1 신규 통합 로그 테이블 제안

`admin_logs`를 대체/병행할 `activity_logs` 도입을 권장합니다.

```sql
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_role text not null check (actor_role in ('admin','artist','system')),
  actor_name text,
  actor_email text,

  action text not null,
  target_type text not null,
  target_id text not null,

  summary text,
  metadata jsonb,

  before_snapshot jsonb,
  after_snapshot jsonb,

  request_id text,
  reversible boolean not null default false,
  reverted_by uuid,
  reverted_at timestamptz,
  revert_reason text,
  reverted_log_id uuid,

  created_at timestamptz not null default now()
);
```

권장 인덱스:

```sql
create index idx_activity_logs_created_at on public.activity_logs(created_at desc);
create index idx_activity_logs_actor on public.activity_logs(actor_role, actor_id, created_at desc);
create index idx_activity_logs_action on public.activity_logs(action, created_at desc);
create index idx_activity_logs_target on public.activity_logs(target_type, target_id, created_at desc);
create index idx_activity_logs_reversible on public.activity_logs(reversible, created_at desc);
create index idx_activity_logs_metadata_gin on public.activity_logs using gin(metadata);
```

## 4.2 호환 전략

- 단기: `admin_logs` 유지 + 신규 `activity_logs` 병행 기록
- 중기: 조회 API를 `activity_logs` 기준으로 전환
- 장기: `admin_logs` 읽기 전용 보관 후 점진 폐기

---

## 5) 서버 아키텍처 계획

## 5.1 공통 로깅 함수 계층화

신규 함수(예: `app/actions/activity-logs.ts`):

- `logActivity(params)`
  - actor 정보, action, target, summary, metadata
  - before/after snapshot
  - reversible 플래그

관리자/아티스트 액션 모두 해당 함수 사용:

- 관리자 액션: `app/actions/admin*.ts`
- 아티스트 액션: `app/actions/artwork.ts` (create/update/delete)

## 5.2 스냅샷 기록 규칙

- UPDATE: 변경 전 row를 `before_snapshot`, 변경 후 row를 `after_snapshot`
- DELETE: 삭제 전 row를 `before_snapshot`, `after_snapshot`는 `null`
- CREATE: `before_snapshot`는 `null`, 생성 결과를 `after_snapshot`

스냅샷 최소화 규칙:

- 용량 과다 방지 위해 대형 필드(예: 장문 transcript)는 선택적으로 제외
- 민감정보/비밀 데이터는 마스킹 또는 미기록

## 5.3 복구 실행 함수

`revertActivityLog(logId, reason)` (관리자 전용)

동작:

1. 로그 조회 + reversible 검사
2. 이미 복구된 로그인지 검사
3. 현재 row와 snapshot 충돌 검사 (`updated_at` 또는 checksum)
4. 대상별 보상 트랜잭션 실행
5. `reverted_*` 필드 업데이트 + `revert_executed` 로그 생성

대상별 복구 매핑(초기):

- `artwork_updated` -> `artworks` row update with `before_snapshot`
- `artist_updated` -> `artists` row update with `before_snapshot`

---

## 6) 관리자 UI/UX 계획

## 6.1 활동 로그 페이지 리디자인

대상 파일:

- `app/admin/logs/page.tsx`
- `app/admin/logs/logs-list.tsx`

구성:

1. 상단 필터 바
   - 기간(시작/종료)
   - 행위자 검색(이름/이메일)
   - 활동(action) multi-select
   - 대상(target_type) select
   - 대상 ID/키워드 검색
2. 결과 테이블
   - 시간, 행위자, 활동, 대상, 요약, 상세 버튼
3. 상세 패널(슬라이드오버/모달)
   - before/after diff 뷰
   - metadata JSON 보기
   - 복구 가능 시 `복구 실행` 버튼

## 6.2 복구 UX 안전장치

- 복구 버튼은 `reversible=true`에서만 노출
- 클릭 시 확인 모달:
  - “현재 데이터가 덮어써질 수 있습니다” 경고
  - 복구 사유 입력 필수
  - 최근 수정자/수정시간 충돌 안내
- 충돌 시:
  - 즉시 실패 + 상세 안내
  - "최신값 기준 새 복구 시도" 경로 제공(Phase 2)

## 6.3 검색/필터 UX 디테일

- URL 쿼리스트링 동기화 (공유 가능한 링크)
- 필터 초기화 버튼
- 최근 사용한 필터 저장(localStorage)
- 서버 페이징 + 필터 적용된 total count 표시

---

## 7) 권한/보안 정책

1. 조회: 관리자만 전체 로그 조회 가능
2. 아티스트: 자신의 활동만 별도 페이지에서 조회(선택 기능)
3. 복구: 관리자 권한 + 별도 permission flag(예: `can_revert=true`) 권장
4. 로그 무결성:
   - 로그 행 수정/삭제 금지(RLS + 정책)
   - 복구는 새 로그 추가 방식으로만 표현
5. 민감 데이터 마스킹:
   - 이메일/연락처는 표시 정책에 따라 마스킹 옵션 제공

---

## 8) 성능 및 운영 고려사항

1. 대량 로그 대응:
   - 기간 기반 파티셔닝(장기)
   - 90일 이전 아카이브 테이블 이관(운영 정책)
2. 쿼리 최적화:
   - 필터 컬럼 인덱스 선행 구축
   - 상세 JSON 조회는 필요 시 lazy fetch
3. 장애 대응:
   - 비즈니스 트랜잭션 성공 후 로그 실패 시 재시도 큐(중기)
4. 관측성:
   - 복구 실행률, 충돌률, 실패율 메트릭 수집

---

## 9) 구현 단계(권장 순서)

## Phase 0: 스키마 준비 (0.5~1일)

- `activity_logs` 테이블 + 인덱스 + RLS
- 마이그레이션 작성/적용

## Phase 1: 기록 확장 (1~2일)

- 공통 `logActivity` 유틸 도입
- 관리자 액션 기록 전환
- 아티스트 작품 액션(create/update/delete) 기록 추가

## Phase 2: 조회/필터 UI (1~2일)

- `getActivityLogs(filters)` 서버 함수
- 관리자 로그 페이지 필터 바 + 페이징 + 상세 패널

## Phase 3: 복구 MVP (1~2일)

- `revertActivityLog` 서버 액션
- 작품/작가 수정 복구 우선 도입
- 복구 확인 모달/사유 입력/충돌 안내

## Phase 4: 고도화 (선택)

- batch 액션 복구
- diff 시각화 개선
- 운영 대시보드(복구 통계)

---

## 10) 테스트 전략

## 10.1 단위 테스트

- 로그 생성 시 before/after snapshot 정확성
- 필터 조합별 쿼리 결과 정확성
- 복구 충돌 감지 로직

## 10.2 통합 테스트

- 관리자/아티스트 액션 -> 로그 반영
- 필터 검색 + 페이지네이션
- 복구 실행 후 데이터/로그 일관성

## 10.3 회귀 테스트

- 기존 관리자 기능(사용자/작가/작품 관리) 정상 동작
- 성능 저하 없는지(대표 쿼리 p95)

---

## 11) 위험요소 및 완화

1. 스냅샷 용량 급증
   - 완화: 필드 화이트리스트, 압축/아카이브 정책
2. 복구 오남용
   - 완화: 권한 분리 + 사유 강제 + 감사기록
3. 동시 수정 충돌
   - 완화: `updated_at` 기반 낙관적 잠금 검사
4. 로그 누락
   - 완화: 공통 로깅 함수 강제 및 lint 규칙/코드리뷰 체크리스트

---

## 12) 즉시 착수 체크리스트

- [ ] `activity_logs` 마이그레이션 초안 작성
- [ ] `logActivity` 공통 함수 생성
- [ ] `app/actions/artwork.ts`에 아티스트 로그 삽입
- [ ] `app/admin/logs` 필터 UI 스켈레톤 추가
- [ ] 복구 MVP 대상 액션 2개(`artwork_updated`, `artist_updated`) 확정

---

## 부록) 현재 코드 기준 주요 참조 파일

- 로그 저장/조회: `app/actions/admin-logs.ts`
- 로그 페이지: `app/admin/logs/page.tsx`, `app/admin/logs/logs-list.tsx`
- 관리자 액션 기록:
  - `app/actions/admin.ts`
  - `app/actions/admin-artists.ts`
  - `app/actions/admin-artworks.ts`
- 아티스트 액션(현재 로그 미기록): `app/actions/artwork.ts`
- 현재 로그 스키마: `supabase/migrations/20260206020000_add_admin_logs.sql`
