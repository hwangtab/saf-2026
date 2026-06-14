# 오윤 40주기 추도식 행사 신청 페이지 — 설계 문서

작성일: 2026-06-14
상태: 설계 승인 대기 → 구현 계획 작성 예정

## 1. 배경 & 목적

오윤 화백 40주기 추도식 참가자를 온라인으로 모집한다. 45인승 버스 1대로 이동하는 선착순 행사이며, 회비(3만원)를 토스로 온라인 결제받는다. 정원 초과 시 대기자 명단을 받고, 신청 확인은 알림톡(SMS)으로 발송한다.

기존 오윤 청원 시스템(`app/[locale]/petition/oh-yoon/`)이 검증된 동일 패턴(공개폼 → server action → Supabase → 알림톡 → admin 관리)을 제공하므로 이를 복제·변형해 구축한다.

### 행사 정보 (단일 출처: `content/events/oh-yoon-memorial.ts`)

- **일시**: 2026-07-05(일)
- **일정**:
  - 09:30 인사동 수운회관 옆 출발
  - 11:00 추도식 진행
  - 12:00 추도식 종료
  - 13:30 인사동 풍류사랑(구 낭만) 점심
- **회비**: 1인 30,000원
- **정원**: 44석 (45인승 버스 운전석 제외 초기값, admin 조정 가능)
- **마감**: 선착순

## 2. 범위

### 포함 (v1)

- 공개 신청 페이지 (1인이 동반 포함 N명 신청, 회비 = 30,000 × N)
- 토스 온라인 결제 연동 (기존 결제 SDK·success/fail 랜딩 재사용)
- 좌석 임시예약(hold) 기반 선착순 정원 보장 (동시성 안전)
- 정원 초과 시 대기자(무료) 등록
- 확인 발송 **알림톡 + 이메일 병행** (신청확인·대기등록·대기자 결제안내). 알림톡은 휴대폰 기반 항상 발송, 이메일은 신청자가 이메일을 입력한 경우 병행 발송 (기존 결제완료 시 sendBuyerEmail + sendBuyerSms 동시 발송 패턴 그대로)
- admin 관리 포털 (참가자/대기자/통계/CSV/정원 조정)

### 제외 (v1)

- 대기자 → 확정 **자동** 승격 (v1은 운영진 수동: 자리 발생 시 알림톡으로 결제 링크 발송)
- 동반자 개별 인명 수집 (인원수만 받음)
- 결제를 기존 작품 주문(order) 시스템에 통합 (행사 전용 도메인으로 분리)
- 다회차/다행사 일반화 (단, `event_slug` 컬럼으로 향후 확장 여지만 남김)

## 3. 아키텍처

선택 접근: **전용 `event_registrations` 테이블 + 토스 결제 흐름(SDK·랜딩)만 재사용.**

작품 주문 통계·환불·CSV가 행사 데이터로 오염되지 않도록 도메인을 분리한다. 결제 SDK와 success/fail 랜딩 인프라는 재사용한다.

### 파일 구조

```
content/events/oh-yoon-memorial.ts        # 행사 정보 단일 출처 (일정/회비/정원/장소)

app/[locale]/event/oh-yoon-memorial/
├── page.tsx                              # SSR, ISR revalidate=60 (실시간 잔여석)
└── _components/
    ├── RegistrationForm.tsx              # 신청 폼 (인원수, 정보, 동의)
    ├── SeatStatusBar.tsx                 # 잔여석/마감/대기자 상태 표시
    ├── EventSchedule.tsx                 # 일정 타임라인
    └── EventFAQ.tsx

app/actions/event-registration.ts        # 공개 신청 server action
app/actions/event-admin.ts               # admin 관리 action

app/(portal)/admin/event/oh-yoon-memorial/
├── page.tsx                             # SSR, requireAdmin()
└── _components/                         # 개요/참가자/대기자/CSV (청원 admin 패턴 복제)

supabase/migrations/<ts>_event_registrations.sql   # 테이블 + RPC 함수

messages/ko.json, messages/en.json       # event.ohYoonMemorial 네임스페이스
```

## 4. 데이터 모델

### 테이블 `event_registrations`

| 컬럼                 | 타입             | 비고                                                           |
| -------------------- | ---------------- | -------------------------------------------------------------- |
| `id`                 | uuid PK          |                                                                |
| `event_slug`         | text             | `'oh-yoon-memorial'` (NOT NULL, 향후 행사 재사용)              |
| `applicant_name`     | text             | 필수 (1~100자)                                                 |
| `phone`              | text             | 필수 (평문 — 청원과 동일 정책)                                 |
| `email`              | text             | 선택 (결제 영수증·안내)                                        |
| `party_size`         | int              | 동반 포함 인원수 ≥ 1, 좌석 차감 단위                           |
| `boarding_confirmed` | bool             | 승차 지점 확인 체크                                            |
| `status`             | text             | `pending` / `confirmed` / `waitlist` / `cancelled` / `expired` |
| `amount`             | int              | `party_size × 30000` (서버 계산, 클라 입력 무시)               |
| `payment_key`        | text null        | 토스 결제 키                                                   |
| `order_no`           | text null        | 토스 주문번호 (customerKey 용도)                               |
| `paid_at`            | timestamptz null | 결제 완료 시각                                                 |
| `hold_expires_at`    | timestamptz null | pending hold 만료 (생성+15분)                                  |
| `agreed_privacy`     | bool             | 개인정보 수집·이용 동의 (필수)                                 |
| `created_at`         | timestamptz      | default now()                                                  |
| `updated_at`         | timestamptz      |                                                                |

인덱스: `(event_slug, status)`, `(order_no)`.

### 좌석 계산 규칙

- **점유 좌석** = `confirmed`의 `party_size` 합 + (미만료 `pending`, 즉 `hold_expires_at > now()`)의 `party_size` 합
- **잔여석** = 정원(44, admin 설정) − 점유 좌석
- `cancelled` / `expired` / `waitlist`는 좌석 점유에 포함하지 않음

### RPC 함수 `register_event_seat(payload)`

행 잠금(`SELECT ... FOR UPDATE` 또는 advisory lock)으로 동시성 안전하게:

1. 만료된 pending을 카운트에서 제외(lazy — 조회 시점 `hold_expires_at < now()` 무시; 선택적으로 같은 트랜잭션에서 `expired`로 갱신)
2. 점유 좌석 계산
3. 잔여석 ≥ 요청 `party_size` → `pending` 행 생성, `hold_expires_at = now()+15분`, 결제 진행용 `order_no` 발급, 반환 `{status:'pending', order_no, amount}`
4. 잔여석 부족 → `waitlist` 행 생성, 반환 `{status:'waitlist'}`

정원 값은 함수 인자 또는 설정 테이블/상수에서 읽는다(admin 조정 반영). v1은 단일 행사라 상수 + admin override로 충분.

## 5. 신청 → 결제 상태 흐름

```
[신청 폼 제출] → event-registration.ts: register()
   │  입력 검증 + rate-limit + register_event_seat() (atomic)
   │
   ├─ 반환 pending → 토스 결제창 (amount = party_size×30000)
   │     ├─ 결제 성공 → success 랜딩 → confirmEventPayment()
   │     │        → 토스 confirm API 검증 → status=confirmed, paid_at 기록
   │     │        → 알림톡(신청확인) 발송 → revalidatePath
   │     └─ 실패/이탈 → hold 유지, 15분 후 다음 조회 시 expired (좌석 자동 반환)
   │
   └─ 반환 waitlist → 대기자 등록 완료 화면 + 알림톡(대기등록)
```

- **결제 성공 랜딩**: `window.location.search`로 결제 파라미터를 읽는다. 서버 `searchParams` 사용 금지 (메모리 교훈: Next.js 16 미들웨어 rewrite가 default-locale query를 떨궈 카드결제 중단 회귀 발생).
- **hold 만료**: cron 없이 조회 시 lazy 계산. 좌석 카운트 함수가 만료 pending을 제외하므로 자리는 즉시 회수된다. (메모리 교훈: 새 cron 추가 전 기존 메커니즘으로 충분한지 검증 — 여기선 lazy로 충분.)
- **금액 위변조 방지**: `amount`는 서버에서 `party_size × 30000`로 계산하며 토스 confirm 시 결제 금액과 대조.

## 6. 대기자 & 마감

- 정원 도달 시 공개 폼은 "대기 신청" 모드로 전환, `SeatStatusBar`는 잔여석 0/마감 표시
- 취소·만료로 자리 발생 → admin이 대기자 목록에서 대상 선택 → 알림톡으로 **결제 링크** 발송 → 대기자가 결제 시 `register_event_seat` 재확인 후 `confirmed` 승격
- v1 자동 승격 없음 (운영진이 연락·환불 동반 판단)

## 7. Admin 포털

청원 admin(`app/(portal)/admin/petition/oh-yoon/`) 패턴 복제. `requireAdmin()` 가드, 한국어 고정(i18n 비-스코프).

- **개요 탭**: 확정 인원/대기 인원/잔여석/총 회비 통계
- **참가자 탭**: 상태 필터(confirmed/pending/waitlist/cancelled), 결제 여부, 연락처, 페이지네이션
- **대기자 탭**: 대기 순번, 결제 링크 발송 액션, 확정 승격
- **CSV 내보내기**: 참가자/대기자 명단 (버스 탑승·점심 예약용)
- **정원 조정**: 정원 값 변경

`event-admin.ts` 액션: 신청 취소/환불 표기, 대기자 결제링크 발송, CSV export, 정원 조정.

## 8. i18n & 알림 발송 (알림톡 + 이메일)

- 공개 페이지: `event.ohYoonMemorial` 네임스페이스, ko/en 메시지 (CLAUDE.md 공개 라우트 규칙 — 한국어 리터럴 직접 사용 금지). force-static locale은 `getTranslations`에 `{locale}` 명시 (메모리 교훈).
- **발송 채널 2종 병행** (기존 결제완료 `sendBuyerEmail` + `sendBuyerSms` 동시 호출 패턴 그대로):
  - 알림톡(Solapi): 휴대폰 기반 항상 발송, env(pfId/templateId) 미설정 시 SMS로 자동 downgrade
  - 이메일(Resend + React Email): 신청자가 이메일 입력 시에만 병행 발송
- 발송 이벤트 3종 (알림톡·이메일 각각):
  1. 신청확인 (결제완료) — `event_payment_confirmed`
  2. 대기등록 완료 — `event_waitlist`
  3. 대기자 결제안내 (자리 발생 시, 결제 버튼 링크 포함) — `event_waitlist_payment`
- **알림톡 템플릿**: 신규 3종은 카카오 심사 필요(기존 7종 심사통과 이력). 코드베이스에 템플릿 등록 자동화가 없으므로 Solapi API(`POST /kakao/v2/templates` + inspection)로 등록·심사 신청하는 일회성 스크립트(`scripts/register-event-alimtalk-templates.ts`)를 작성. 템플릿 ID는 env(`SOLAPI_KAKAO_TEMPLATE_EVENT_*`)로 관리(기존 `ALIMTALK_TEMPLATE_ENV` 패턴 확장). 심사 대기 기간엔 SMS fallback + 이메일이 커버.
- **이메일 템플릿**: `emails/event-*.tsx` React Email 컴포넌트 3종 신규 작성(기존 `emails/payment-confirmed.tsx` 등 복제). `BUYER_EMAIL_SUBJECTS`에 제목 추가.
- env 미설정 시 no-op (기존 정책, throw 없음).

## 9. 디자인 & 컴포넌트 규칙

- `PageHero`, `Section`, `SectionTitle`, `Button`, `SafeImage` 등 표준 컴포넌트 재사용 (메모리 교훈: 인라인 hero/카드 제작 금지). 청원/콜렉션 페이지 패턴을 grep으로 찾아 복제.
- 색상은 브랜드 토큰만 (`primary`, `charcoal-*`, `gallery-*`, `sun-*` 숫자/가격 강조). CTA는 `Button variant="primary"`.
- 폼 입력은 청원 `SignForm`의 `INPUT_BASE`/`LABEL_BASE`/`ERROR_TEXT` 스타일 재사용.
- 공개 페이지에 skeleton `loading.tsx` 추가 금지 (메모리 교훈).
- a11y: `bg-primary` + small text 금지, `e2e/a11y/`에 spec 추가.

## 10. 에러 처리 & 엣지 케이스

- 동일인 중복 신청: 전화번호 기준 confirmed/pending 존재 시 안내(차단까지는 v1 미적용, admin 정리 가능)
- 결제 금액 불일치: confirm 단계에서 거부 + 로깅
- 동시 신청으로 정원 경합: RPC 행 잠금으로 직렬화, 진 쪽은 waitlist로 자동 전환
- 토스 결제 실패/취소: pending 유지 → 15분 후 expired, 재신청 가능
- env(Solapi/Toss) 미설정 환경: 알림톡 no-op, 결제는 키 없으면 명확한 에러

## 11. 테스트

- `register_event_seat` 동시성: 정원 경계에서 동시 신청 시 초과 발생하지 않음 (단위/통합)
- 좌석 계산: 만료 pending 제외, cancelled/waitlist 비점유 검증
- amount 서버 계산 = party_size × 30000
- 폼 검증(필수 필드, party_size ≥ 1, 동의)
- a11y e2e spec (신규 공개 페이지)

## 12. 미해결/후속

- 카카오 알림톡 신규 템플릿 3종: **2026-06-14 등록·검수요청 완료, 현재 카카오 심사중(INSPECTING).** 채널 `한국스마트협동조합`(kosmart), categoryCode `01500020001`(기관/단체·일반단체). 등록 스크립트: `scripts/register-event-alimtalk-templates.mjs` (query/create/submit/status). 템플릿 ID:
  - 신청확인: `KA01TP260614085014314lJqw3BVC7bP` → env `SOLAPI_KAKAO_TEMPLATE_EVENT_PAYMENT_CONFIRMED`
  - 대기등록: `KA01TP260614085014431bnPoiKrAlkt` → env `SOLAPI_KAKAO_TEMPLATE_EVENT_WAITLIST`
  - 대기자 결제안내: `KA01TP260614085014577ff1H3ZS5xW8` → env `SOLAPI_KAKAO_TEMPLATE_EVENT_WAITLIST_PAYMENT`
  - **남은 일**: 심사 승인(영업일 1~3일) 확인 후 production env에 위 3개 등록. 승인 전엔 SMS fallback + 이메일이 커버.
- 대기자 자동 승격은 v2 후보
