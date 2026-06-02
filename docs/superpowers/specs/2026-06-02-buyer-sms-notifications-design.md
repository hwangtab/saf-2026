# 구매자 트랜잭션 SMS 알림 설계

- **작성일**: 2026-06-02
- **상태**: 승인됨 (구현 대기)
- **범위**: 트랜잭션 SMS 1차 (결제·배송 등 정보성). 마케팅 SMS·카카오 알림톡은 별도 cycle.

## 배경

현재 구매자 알림은 Resend 이메일로만 발송된다 ([lib/notify.ts](../../../lib/notify.ts) `sendBuyerEmail`).
결제·입금·배송 등 주요 이벤트에서 구매자가 더 빠르게 인지하도록 **SMS 채널을 추가**한다.
이메일을 대체하는 것이 아니라 **병행 발송**한다.

대행사는 **Solapi (구 CoolSMS)** 로 확정. 사유: 국내 SMS 단가는 8.4~9원으로 대행사 간 차이가
이 프로젝트 발송량에서 무의미하고, API/문서 품질과 향후 카카오 알림톡 확장성(동일 API)에서 Solapi가 우수.

## 비범위 (YAGNI)

- 마케팅/광고성 SMS (수신동의·`(광고)`표기·야간발송금지·무료수신거부 필요 → 별도 cycle)
- 카카오 알림톡 (템플릿 사전심사·발신프로필 등록 필요 → 별도 cycle)
- 국제 SMS (비-KR 번호는 스킵)
- 발송 결과 수신(delivery report) 웹훅 — 1차에서는 발송 시점 status만 기록

## 아키텍처

기존 `resendFetch` 패턴(raw `fetch` + 타임아웃 + 1회 재시도 + never-throw)을 SMS에 복제한다.
Solapi SDK 의존성은 추가하지 않는다 (코드베이스의 raw-fetch 일관성 유지).

### 파일 구조

```
lib/sms/
  ├─ solapi.ts        # 저수준 클라이언트: HMAC-SHA256 서명 + fetch + 1회 재시도 + 5초 타임아웃
  ├─ buyer-sms.ts     # sendBuyerSms(phone, type, data, locale): 타입별 본문 생성 + 발송 + 로그
  └─ phone.ts         # 전화번호 정규화·검증 (하이픈/공백 제거, +82→0, 010 유효성)
```

- notify.ts는 이메일 전용으로 유지. SMS는 `lib/sms/`로 분리해 각 파일 단일 책임.
- `buyer-sms.ts`의 `BuyerSmsData` / `BuyerSmsType`은 기존 `BuyerEmailData` / `BuyerEmailType`와
  동일한 7종 타입을 재사용·정렬 (payment_confirmed, virtual_account_issued, deposit_confirmed,
  shipped, delivered, refunded, auto_cancelled).

### lib/sms/solapi.ts

- 함수 `sendSms(opts): Promise<{ ok: boolean; messageId?: string; segment?: 'SMS' | 'LMS'; error?: string }>`
- Solapi 인증: `Authorization: HMAC-SHA256 apiKey=..., date=<ISO8601>, salt=<random>, signature=<HMAC-SHA256(date+salt, secret)>`
  - `crypto`(node) 사용. `date`는 `new Date().toISOString()`, `salt`은 `crypto.randomBytes`.
- 엔드포인트: `POST https://api.solapi.com/messages/v4/send` (단건). body: `{ message: { to, from, text } }`
  - SMS/LMS 구분은 Solapi가 본문 byte 길이로 자동 판별 → 호출부는 text만 전달.
  - 응답의 `type`(SMS/LMS) 및 `messageId`를 파싱해 반환.
- env 미설정(`SOLAPI_API_KEY`/`SOLAPI_API_SECRET`/`SOLAPI_SENDER`) 시 `{ ok: false, error: 'not-configured' }`로 no-op.
- 429/5xx·타임아웃 시 1회 재시도. 최종 실패는 false 반환 (never throw).

### lib/sms/phone.ts

- `normalizeKoreanMobile(raw: string | null | undefined): string | null`
  - 숫자만 추출 → `+82`/`82` 프리픽스를 `0`으로 치환 → `010`으로 시작하고 11자리면 반환, 아니면 null.
  - null 반환 = 한국 휴대폰 아님 → 발송 스킵 대상.

### lib/sms/buyer-sms.ts

```ts
export type BuyerSmsType = BuyerEmailType; // 동일 7종
export interface BuyerSmsData {
  buyerName: string;
  artworkTitle: string;
  amount: number;
  virtualAccount?: { bankName?: string; accountNumber?: string; dueDate?: string };
  carrier?: string;
  trackingNumber?: string;
}

export async function sendBuyerSms(
  phone: string | null | undefined,
  type: BuyerSmsType,
  data: BuyerSmsData,
  locale: 'ko' | 'en' = 'ko'
): Promise<void>;
```

동작:

1. `locale === 'en'` 이면 스킵 (이메일로만 안내). 1차는 한국어 본문만.
2. `normalizeKoreanMobile(phone)` → null이면 조용히 스킵 (로그 없음).
3. 타입별 한국어 본문 생성 (아래 표).
4. `sendSms` 호출.
5. 결과를 `sms_logs`에 기록 (sent/failed, segment, provider_message_id, error).
6. never throw — try-catch로 감싸 결제 플로우 비차단.

### 발송 본문 (정보성, 한국어, 간결)

모든 본문에 `[씨앗페]` 접두어 (스팸 오인 방지). 정보성이라 `(광고)`·수신거부 불요.

| 타입                   | 본문                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| payment_confirmed      | `[씨앗페] {이름}님, '{작품명}' 결제(₩{금액})가 완료되었습니다. 감사합니다.` |
| virtual_account_issued | `[씨앗페] 입금안내: {은행} {계좌} / ₩{금액} / 기한 {일시}`                  |
| deposit_confirmed      | `[씨앗페] {이름}님, 입금이 확인되었습니다. 작품을 준비합니다.`              |
| shipped                | `[씨앗페] '{작품명}' 발송완료. {택배사} {운송장번호}`                       |
| delivered              | `[씨앗페] '{작품명}' 배송이 완료되었습니다.`                                |
| refunded               | `[씨앗페] ₩{금액} 환불이 처리되었습니다.`                                   |
| auto_cancelled         | `[씨앗페] 주문이 자동취소되었습니다.`                                       |

금액은 `toLocaleString('ko-KR')` 천단위 콤마. 작품명이 길어 본문이 90byte를 넘으면 Solapi가 LMS로 자동 승격.

## 데이터: sms_logs 테이블

SMS는 건당 과금 + 민원 추적이 중요해 이메일과 달리 발송 로그를 남긴다.

```sql
create table public.sms_logs (
  id                  uuid primary key default gen_random_uuid(),
  order_no            text,
  to_phone            text not null,
  type                text not null,
  provider            text not null default 'solapi',
  provider_message_id text,
  status              text not null,         -- 'sent' | 'failed'
  segment             text,                  -- 'SMS' | 'LMS'
  error               text,
  created_at          timestamptz not null default now()
);
create index sms_logs_order_no_idx on public.sms_logs (order_no);
create index sms_logs_created_at_idx on public.sms_logs (created_at desc);

alter table public.sms_logs enable row level security;
-- admin read-only (기존 admin RLS 패턴 따름). 쓰기는 service role(서버)만.
```

마이그레이션 파일은 `supabase/migrations/`에 작성 후 MCP `apply_migration`으로 적용 (사용자 컨펌 필수).

## 트리거 배선

기존 `void sendBuyerEmail(...)` 호출부 옆에 `void sendBuyerSms(...)` 한 줄씩 추가. 둘 다 fire-and-forget.

| 위치                                                                                      | 타입                   | phone 소스                        |
| ----------------------------------------------------------------------------------------- | ---------------------- | --------------------------------- |
| [app/api/payments/toss/confirm/route.ts](../../../app/api/payments/toss/confirm/route.ts) | payment_confirmed      | `order.buyer_phone` (이미 조회됨) |
| 〃                                                                                        | virtual_account_issued | `order.buyer_phone`               |
| [app/api/webhooks/toss/route.ts](../../../app/api/webhooks/toss/route.ts)                 | deposit_confirmed      | `order.buyer_phone` (이미 조회됨) |
| shipped / delivered / refunded / auto_cancelled                                           | 각 발송 지점           | 해당 주문의 `buyer_phone`         |

두 트리거 파일 모두 SELECT에 `buyer_phone`이 이미 포함되어 있어 추가 쿼리 변경 불필요.

## 안전장치 (이메일 패턴 계승)

- env 미설정 시 no-op → dev/test에서 실제 발송·과금 없음.
- never throw → 알림 실패가 결제·웹훅 처리를 막지 않음.
- 5초 타임아웃 + 429/5xx 1회 재시도.
- 비-KR 번호·전화번호 없음·en locale → 스킵.

## 환경변수 (신규)

`.env.local.example`에 주석으로 추가:

```
# SMS 발송 (Solapi). 미설정 시 SMS no-op (이메일은 정상 발송)
# SOLAPI_API_KEY=...
# SOLAPI_API_SECRET=...
# SOLAPI_SENDER=0287654321   # Solapi 콘솔에 사전등록한 발신번호 (숫자만)
```

프로덕션 env는 Vercel에 등록 (사용자 작업).

## 테스트

`__tests__/lib/sms/`:

- `phone.test.ts`: 정규화·검증 (하이픈/공백/+82/82 프리픽스, 010 외 번호 null, 자릿수 미달 null).
- `buyer-sms.test.ts`:
  - 타입 7종 본문 생성 (변수 치환·금액 포맷 검증).
  - env 미설정 시 `sendSms` 미호출 (no-op).
  - en locale·비-KR 번호 시 스킵.
  - `fetch` mock으로 발송 성공/실패 경로 + `sms_logs` 기록 호출 검증.

## 사용자 선행 작업 (코드와 병행)

1. Solapi 가입 + 잔액 충전.
2. 발신번호 사전등록 (명의 서류, 1~2영업일).
3. 발급받은 API Key/Secret·발신번호를 `.env.local` 및 Vercel env에 등록.

코드 구현은 위 작업과 무관하게 선행 가능 (env 미설정 시 no-op).
