# 이용약관·개인정보 동의·계약 체결 플로우 점검 보고서 (2026-03-05)

## 점검 범위

- 이용약관(서비스 약관) 노출/동의 수집/저장 여부
- 개인정보처리방침 동의 수집/저장/재동의 강제 여부
- 작가/출품자 계약 체결(온보딩 동의 + 관리자 승인) 과정의 정상 동작 여부
- 권한/검증/예외 처리 관점의 장애 가능 지점

## 결론 요약

- 즉시 빌드 에러나 런타임 크래시를 유발하는 명백한 코드 오류는 확인되지 않았음.
- 다만, 법적/운영적 관점에서 실제 문제를 유발할 수 있는 고위험 지점이 존재함.

## 주요 이슈

### 1) [높음] 이용약관 동의 이력 미수집

- 현황: 이용약관 문서와 버전 상수는 존재함.
  - `app/(public)/terms/page.tsx`
  - `lib/constants.ts`
  - `lib/legal-documents.ts`
- 문제: 회원가입/동의 저장 로직에서 **이용약관 버전 동의 저장**이 확인되지 않음.
  - 가입 화면: `app/(public)/signup/page.tsx`
  - 동의 저장 액션: `app/actions/terms-consent.ts` (역할별 계약/개인정보만 저장)
- 영향: 분쟁 시 이용약관 동의 입증이 어려울 수 있음.

### 2) [높음] 계약 체결(승인) 단계의 검증 우회 가능성

- 작가 승인 로직:
  - `app/actions/admin.ts`의 `approveUser`에서 신청서가 없어도 fallback(`'New Artist'`)로 아티스트 생성 가능.
  - 이후 프로필을 `artist/active`로 갱신.
- 출품자 승인 로직:
  - `app/actions/admin-exhibitors.ts`의 `approveExhibitor`는 신청서 기본 필드(`representative_name/contact/bio`)만 확인.
  - 계약 버전/개인정보 버전 동의 여부까지는 승인 조건으로 검증하지 않음.
- 영향: 관리자가 실수 또는 비정상 시나리오로 승인 시, 동의 요건이 약화될 수 있음.

### 3) [중간] 개인정보 동의의 증적 강도 불균형

- 현황: 계약 동의는 IP/UA를 저장하지만 개인정보 동의는 version/timestamp 중심.
  - 계약: `terms_accepted_ip`, `terms_accepted_user_agent`
  - 개인정보: `privacy_version`, `privacy_accepted_at`
  - 관련 파일: `app/actions/terms-consent.ts`, `supabase/migrations/20260226191000_add_terms_acceptance_to_applications.sql`, `supabase/migrations/20260305090000_add_privacy_version_to_applications.sql`
- 영향: 개인정보 동의에 대한 추적성/소명력 차이가 발생할 수 있음.

### 4) [중간] "문서 끝까지 읽음" 검증의 클라이언트 의존

- 현황:
  - 클라이언트에서 스크롤 완료 시 hidden input 값 변경
  - 서버에서 해당 값으로 읽음 여부 검증
  - 관련 파일: `app/(portal)/onboarding/onboarding-form.tsx`, `app/(portal)/exhibitor/onboarding/exhibitor-onboarding-form.tsx`, `app/actions/terms-consent.ts`
- 영향: 기술적으로는 요청값 조작 가능성이 있어 엄격한 법적 증빙 요구 환경에 취약할 수 있음.

### 5) [중간] 트랜잭션 부재로 인한 부분 성공 리스크

- 현황: 승인 플로우(특히 작가 승인)는 다중 DB 작업을 순차 실행.
  - 예: 아티스트 생성 -> 프로필 활성화
  - 관련 파일: `app/actions/admin.ts`
- 문제: 중간 실패 시 수동 롤백 시도가 있으나(생성 아티스트 삭제), 완전한 원자성 보장은 아님.
- 영향: 희소하지만 "반쯤 승인된 상태"가 생길 가능성 존재.

## 정상 동작 확인 포인트

- 로그인/리다이렉트/동의 강제 라우팅은 서버 측 분기 로직이 존재함.
  - `app/(public)/auth/callback/route.ts`
  - `app/(portal)/dashboard/page.tsx`
  - `app/(portal)/dashboard/pending/page.tsx`
  - `app/(portal)/exhibitor/pending/page.tsx`
  - `lib/auth/terms-consent.ts`

## 실행 검증 결과

- `npm run test -- --runInBand`: 통과 (18 suites, 127 tests)
- `npm run type-check`: 통과
- `npm run build`: 통과

참고:

- 약관/개인정보/계약 체결 플로우를 직접 다루는 전용 테스트는 현재 확인되지 않음.

## 우선 조치 권장안

1. 승인 액션에서 동의 버전(계약/개인정보)을 필수 검증하도록 강화.
2. 이용약관(`TERMS_OF_SERVICE_VERSION`)도 DB 저장 및 재동의 강제 체계에 포함.
3. 법무 요구 수준에 따라 개인정보 동의에도 IP/UA 증적 확장 여부 검토.
4. 승인 핵심 경로를 트랜잭션(RPC/DB 함수) 기반으로 원자화.
5. 동의 플로우 전용 테스트(버전 불일치, 승인 우회, 재동의 강제) 추가.
