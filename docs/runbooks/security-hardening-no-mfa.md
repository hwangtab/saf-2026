# 보안 하드닝 런북 (MFA 제외)

작성일: 2026-04-23  
대상: 운영 배포 담당자, 백엔드/플랫폼 담당자

## 1) Internal Cron 네트워크 보호 (인프라 + 앱)

### 목표

- `/api/internal/*`는 기본 차단하고, 허용 규칙을 통과한 요청만 실행한다.
- 앱 레이어에서는 `CRON_SECRET` + `x-vercel-cron` 검증을 계속 강제한다.

### 인프라 체크리스트

1. Vercel 프로젝트 보안 설정에서 `/api/internal/*` 경로 기본 차단 규칙을 적용한다.
2. 허용 규칙은 Vercel Cron 출처만 통과시키도록 설정한다(공식 문서의 최신 출처 기준).
3. Preview/Production 환경 모두 동일 규칙을 적용하되, 테스트용 예외는 만료 시간을 명시한다.

### 배포 게이트 (필수 통과)

아래 3개 조건이 모두 충족되지 않으면 배포를 진행하지 않는다.

1. `/api/internal/*` 기본 차단 + allowlist 규칙 적용 스크린샷/설정 로그를 티켓에 첨부했다.
2. 운영 환경에서 `CRON_SECRET` 설정 및 `x-vercel-cron` 누락 차단(403) 수동 검증을 완료했다.
3. 예외 우회 플래그를 사용 중이면 만료 시각(최대 24시간)과 사유 티켓 번호를 명시했다.

### 앱 레이어 체크리스트

1. `CRON_SECRET`가 설정되어 있어야 한다.
2. `NODE_ENV=production`에서 `x-vercel-cron` 헤더 없으면 `403` 차단이어야 한다.
3. 인증 헤더 불일치 시 `401` 차단이어야 한다.

## 2) 오탐 대응: 24시간 한시 우회 플래그

기본 정책은 Fail-Closed이며, 아래 두 변수를 **동시에** 넣은 경우에만 한시 우회가 동작한다.

- `INTERNAL_CRON_EMERGENCY_BYPASS_UNTIL`
  - ISO 시간 문자열(예: `2026-04-24T03:00:00Z`)
  - 현재 시점 기준 최대 24시간 이내만 허용
- `INTERNAL_CRON_EMERGENCY_BYPASS_REASON`
  - 사고/장애 티켓 번호 포함 사유 문자열(예: `INC-20260423-001 false-positive`)

### 감사로그 절차

1. 우회 플래그 적용 전 장애 티켓 생성.
2. 적용 시점/사유/만료 시각을 티켓에 기록.
3. 앱 로그에서 `CRON_GUARD_BYPASS_ACTIVE` 로그를 확인해 첨부.
4. 만료 후 즉시 플래그 제거 및 재발 방지 조치 기록.

## 3) 비밀번호 정책 (사용자 불편 최소화)

### 운영 원칙

- 최소 길이 8자.
- 신규 가입/비밀번호 변경/재설정에만 적용.
- 기존 계정의 일반 로그인은 강제 재설정 없이 유지.

### 적용/점검

1. Supabase Auth 비밀번호 최소 길이를 8로 설정.
2. 회원가입 화면의 클라이언트 사전 검증이 8자 기준인지 확인.
3. 서버의 `weak_password` 응답이 사용자 친화 메시지로 노출되는지 확인.

## 4) Supabase CLI 읽기 점검 절차

DB 정책/트리거 영향 확인이 필요한 경우 아래 순서로 읽기 점검한다.

```bash
supabase projects list
supabase link --project-ref <PROJECT_REF>
supabase db dump --linked --schema public --file /tmp/saf-public-schema.sql
rg -n "policy|get_my_role|prevent_profile_self_escalation" /tmp/saf-public-schema.sql
```

주의:

- Auth 런타임 설정(비밀번호 정책/MFA)은 DB 마이그레이션 대상이 아니므로 대시보드 설정값과 별도로 동기화한다.
- 읽기 점검 결과와 실제 운영 설정값이 다르면 배포 전에 운영 체크리스트에 차이를 기록한다.

## 5) 배포 검증 스모크

1. `GET /api/internal/reconcile-payments`
   - 인증/헤더 누락 시 차단되는지 확인
2. 가입 화면에서 7자 비밀번호 입력
   - 클라이언트에서 즉시 거절되는지 확인
3. 8자 비밀번호 가입 시도
   - 정상 진행되는지 확인
