# 관리자 UX 개선 — 묶음 B (신규 이벤트 외부 알림) 설계

날짜: 2026-07-02
작업 브랜치: `feat/admin-ux-batch-b` (main에서 분기)

## 배경

관리자 UX 분석 #4(관리자 외부 알림/다이제스트)를 검증한 결과, 원안의 대부분이 이미 구현돼 있었다:

| 이벤트                      | 외부 알림 상태                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| 카드 결제 성공              | ✅ 이미 발송 (`toss-confirm-success-notifications.ts:53` `notifyEmail('payment', '결제 승인 완료', ...)`) |
| 가상계좌 발급               | ✅ 이미 발송 (같은 파일 :121)                                                                             |
| 무통장 주문 생성            | ✅ 이미 발송 (`checkout.ts`)                                                                              |
| 새 인바운드 메일(고객 회신) | ✅ 이미 발송 (`notifyInboundEmail`, resend webhook route:76-83)                                           |
| **신규 작가 신청**          | ❌ **미발송** — `submitArtistApplication`은 insert·로그만                                                 |
| **새 피드백**               | ❌ **미발송** — `submitFeedback`은 insert만                                                               |
| 일일 다이제스트 cron        | 미구현 (이번 범위 제외 — 묶음 A의 대시보드 큐 카드 + nav 뱃지로 미처리 가시성 이미 확보, YAGNI)           |

**묶음 B**는 남은 실제 gap 2건에 관리자 이메일 알림을 추가한다. 관리자 알림 채널은 이미 `notifyEmail` → `NOTIFY_EMAIL_TO`(이메일)로 확립돼 있어 채널 결정·신규 인프라 불필요. 기존 `after()` + `notifyEmail` 패턴의 삽입 2건.

## 목표 / 비목표

**목표**

- 신규 작가 신청 제출 시 관리자가 접속 없이 인지 → 심사 지연 방지
- 새 피드백 접수 시 관리자가 접속 없이 인지 → 버그·개선 제안 누락 방지

**비목표**

- 일일 다이제스트 cron (별건, 현재 불필요)
- 이미 알림이 있는 이벤트(결제·인바운드·무통장) 중복 추가
- 알림톡 등 이메일 외 채널 (관리자 채널은 이메일로 확립)
- 신청/피드백 폼 UX 변경

## A. 신규 작가 신청 알림

### 현재

- [onboarding.ts](../../../app/actions/onboarding.ts) `submitArtistApplication` (20): `artist_applications` upsert → profile pending 전환 → application 스냅샷 조회 → `logArtistAction`(117-128) → `redirectPath` 설정(130-133). try 밖에서 `redirect(redirectPath)`(141). 외부 알림 없음.
- import 현황: `after`·`notifyEmail` **미import** (추가 필요). `artistName`(44)·`contact`(45)는 함수 스코프에 이미 있음.

### 변경

- import 추가: `import { after } from 'next/server';`, `import { notifyEmail } from '@/lib/notify';`
- `logArtistAction(...)` 직후(128행 다음), `redirectPath` 설정 전에 삽입:
  ```typescript
  after(() =>
    notifyEmail('info', '신규 작가 신청', {
      신청자: artistName || '(이름 미입력)',
      연락처: contact || '(연락처 미입력)',
    })
  );
  ```
- `after()`가 `redirect()` 호출 전(try 내부)에 등록되므로 redirect가 던지는 `NEXT_REDIRECT`와 무관하게 응답 후 실행된다.

## B. 새 피드백 알림

### 현재

- [feedback.ts](../../../app/actions/feedback.ts) `submitFeedback` (18): rate limit → validate → `feedback` insert(43-49) → 실패 시 return → `revalidatePath('/admin/feedback')`(56) → `return { success: true }`. 외부 알림 없음.
- import 현황: `revalidatePath`(next/cache) 있음. `after`·`notifyEmail` 미import.
- `category`·`title`은 함수 스코프에 이미 있음(검증 완료된 값).

### 변경

- import 추가: `import { after } from 'next/server';`, `import { notifyEmail } from '@/lib/notify';`
- insert 성공 확인 후(`if (error) { ... }` 블록 다음, `revalidatePath` 전)에 삽입:
  ```typescript
  after(() =>
    notifyEmail('info', '새 피드백 접수', {
      카테고리: category,
      제목: title,
    })
  );
  ```

## 공통 규칙

- level: 두 알림 모두 `'info'` (결제='payment', 장애='error'와 구분)
- 필드 라벨은 한국어 (관리자 알림 관례 — `buildAdminNotificationFields` 등 기존 알림과 일관)
- `notifyEmail`은 `RESEND_API_KEY`/`NOTIFY_EMAIL_TO`/`RESEND_FROM_EMAIL` 미설정 시 조기 return(no-op) — 로컬/테스트 안전
- `after()` 필수 — 두 함수 모두 서버 액션이라 응답(또는 redirect) 후 함수가 정지하면 bare `void notifyEmail`의 fetch가 abort될 수 있음 (메모리: serverless-notify-after)

## 파일 변경 요약

| 파일                        | 변경                                                          |
| --------------------------- | ------------------------------------------------------------- |
| `app/actions/onboarding.ts` | import 2개 + `submitArtistApplication`에 `after(notifyEmail)` |
| `app/actions/feedback.ts`   | import 2개 + `submitFeedback`에 `after(notifyEmail)`          |

## 테스트 / 검증

- `submitFeedback`·`submitArtistApplication` 전용 서버 액션 단위 테스트 하네스는 **현재 없음**(`__tests__`에 UI용 `onboarding-keyboard-source.test.ts`만 존재). 두 함수는 `requireAuth`·`rateLimit`·`createSupabaseServerClient`(+onboarding은 `redirect`)에 의존해 신규 jest 하네스 구축 비용이 한 줄 `after(notifyEmail)` 추가에 비해 과도하다.
- 따라서 검증은 **type-check + lint + build + 코드 검토**로 갈음한다(리포지토리 관례 — 결제·인바운드 알림도 전용 액션 테스트 없이 배포됨; 묶음 A의 UI/알림 태스크와 동일 판단).
- `notifyEmail`은 `resendFetch`(never-throw, boolean 반환) 경유라 `after()` 콜백에서 throw하지 않음을 코드로 확인(추가 방어 불요).
- env(`NOTIFY_EMAIL_TO` 등) 미설정 시 `notifyEmail` 조기 return(no-op) — 로컬/CI 안전.

## 리스크 / 주의

- `after()` 등록 위치가 `redirect()`보다 앞이어야 함(onboarding) — try 내부 log 직후에 등록
- 스팸 우려 낮음: 신규 신청·피드백은 저빈도 이벤트. rate limit는 피드백 액션에 이미 존재(3/분)
- 알림 실패가 신청/피드백 저장을 되돌리면 안 됨 — `after()` 콜백 내부에서 `notifyEmail`이 자체적으로 throw하지 않도록(현재 `notifyEmail`은 fetch 결과와 무관하게 void 반환·비throw) 보장됨. 추가 try/catch 불요
