# SMS/알림톡 확장 설계 (Phase 1–4)

- **작성일**: 2026-06-10
- **상태**: 설계 확정 대기 (사용자 리뷰 전)
- **범위**: 기존 구매자 트랜잭션 SMS(Solapi) 위에 ① 영어 본문, ② 발송 로그 admin, ③ 카카오 알림톡 전환, ④ 마케팅 브로드캐스트 SMS 추가

---

## 0. 배경 / 현황

`lib/sms/`에 구매자 트랜잭션 SMS가 프로덕션 상태로 존재한다. 환경변수(`SOLAPI_API_KEY`/`SOLAPI_API_SECRET`/`SOLAPI_SENDER`)는 `.env.local`에 설정 완료.

| 자산                   | 역할                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/sms/solapi.ts`    | Solapi v4 단건 발송(`sendSolapiSms`). HMAC-SHA256, 미설정 시 no-op, 5초 타임아웃, 429/5xx 1회 재시도. `{ ok, messageId, segment, error }` 반환 |
| `lib/sms/phone.ts`     | `normalizeKoreanMobile` — 010 11자리만 통과, 그 외(고정전화·국제) null                                                                         |
| `lib/sms/buyer-sms.ts` | 트랜잭션 7종(`payment_confirmed` … `auto_cancelled`) 본문 생성 + 발송 + `sms_logs` 기록. `locale==='en'`이면 스킵, never throw                 |
| `sms_logs` 테이블      | `id, order_no, to_phone, type, provider, provider_message_id, status, segment, error, created_at`. admin SELECT-only RLS                       |

목표: 이 기반 위에 4개 기능을 **독립 배포 가능한 단위**로 추가한다. 기존 이메일 브로드캐스트 시스템(`lib/email/`, `app/actions/admin-broadcast.ts`, `app/api/internal/broadcast-dispatch/`)이 매우 잘 구조화돼 있어 Phase 4는 이를 충실히 미러링한다.

### 핵심 설계 결정 (사용자 확정)

1. **알림톡**: 알림톡 우선 → 실패 시 SMS/LMS 자동대체 (Solapi `disableSms: false`)
2. **마케팅 수신동의**: 기존 `profiles.marketing_consent` 통합 사용 (SMS 전용 컬럼 신설 안 함)
3. **마케팅 전화번호 소스**: `orders.buyer_phone` ∪ `profiles.phone` 합집합 (중복제거)
4. **발송 로그 화면**: 별도 `/admin/sms` 페이지
5. **PR 분할**: Phase 1·2 먼저 머지 → Phase 3 → Phase 4 순차 분리

---

## 1. Phase 1 — 영어(en) SMS 본문

### 목표

en locale 구매자(국내 010 번호 보유)에게 영문 트랜잭션 SMS를 발송한다.

### 변경

- `lib/sms/buyer-sms.ts`
  - `buildSmsText(type, data)` → `buildSmsText(type, data, locale)` 로 시그니처 확장. `ko`/`en` 분기로 7종 영문 본문 추가. 접두어는 ko `[씨앗페]` / en `[Seed Art Festival]`.
  - `sendBuyerSms`의 `if (locale === 'en') return;` (L69) **제거** → en이어도 `buildSmsText(type, data, locale)`로 발송.
- `normalizeKoreanMobile`는 **변경 없음** (010만 통과). 해외 번호(국제발송)는 본 범위 밖 — 요금·발신설정이 별도라 명시적으로 스킵 유지. 즉 "국내 거주 영어권 구매자"만 대상.

### 영문 본문 (초안 — 구현 시 확정)

| type                   | en 본문                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| payment_confirmed      | `[Seed Art Festival] {name}, your payment ({amount}) for '{title}' is complete. Thank you.` |
| virtual_account_issued | `[Seed Art Festival] Deposit: {bank} {account} / {amount}{due}`                             |
| deposit_confirmed      | `[Seed Art Festival] {name}, your deposit is confirmed. We're preparing your artwork.`      |
| shipped                | `[Seed Art Festival] '{title}' has shipped.{carrier}{tracking}`                             |
| delivered              | `[Seed Art Festival] '{title}' has been delivered.`                                         |
| refunded               | `[Seed Art Festival] Your refund of {amount} has been processed.`                           |
| auto_cancelled         | `[Seed Art Festival] Your order has been automatically cancelled.`                          |

금액 포맷: ko는 `₩1,500,000`, en도 동일 `₩` 유지(원화 거래이므로). 날짜는 locale별 포맷 헬퍼 분기.

### 테스트

- `__tests__/lib/sms/buyer-sms.test.ts`에 en 케이스 7종 추가 (본문 텍스트, en+010 발송됨, en+비-010 스킵 검증).

### 호출부 영향

`sendBuyerSms`는 이미 호출부에서 `locale` 인자를 받고 있음 (현재는 en이면 내부 스킵). 호출부 변경 불필요 — 내부 스킵 제거만으로 활성화.

---

## 2. Phase 2 — 발송 로그 관리자 화면 (`/admin/sms`)

### 목표

운영자가 `sms_logs`를 조회·필터하고 실패 건을 재발송할 수 있는 화면. admin 포털은 영구 한국어(i18n 비스코프).

### 신규 파일

```
app/(portal)/admin/sms/
├── page.tsx                    # server: requireAdmin() + getSmsLogs(searchParams) → <SmsLogList>
└── _components/
    └── SmsLogList.tsx          # client: 필터바 + 테이블 + 페이지네이션 + 재발송
app/actions/admin-sms.ts        # getSmsLogs(), resendSms(logId)
```

### nav 등록 (단일 출처)

`app/(portal)/admin/_components/admin-nav-items.ts` "도구" 그룹에 추가 (ko L50, en L99):

```ts
{ href: '/admin/sms', label: '문자/SMS' }   // ko
{ href: '/admin/sms', label: 'SMS' }        // en
```

`layout.tsx`·nav 컴포넌트는 그룹을 제네릭하게 순회하므로 다른 수정 불필요.

### `getSmsLogs` 서버 액션

- `getBroadcasts`와 동일한 **페이지네이션 반환형** `{ rows, total, page, pageSize }` (flat array인 `getOrders` 형태 아님 — `EmailPagination` 재사용 위해).
- 필터: `type`, `status`, 기간(`from`/`to`), 검색 `q`(전화번호/주문번호).

### `SmsLogList.tsx`

- 필터바: `AdminCardHeader` 안에 `AdminSelect`(type/status) + `AdminInput type="date"` ×2 + `AdminInput`(검색). `BroadcastHistory`의 `loadPage(page, pageSize)` 모델로 서버 호출.
- 상태 뱃지: `BroadcastHistory`의 `STATUS_META` Record 패턴 → `AdminBadge tone`.
- 페이지네이션: **`EmailPagination` 재사용**. 두 기능이 공유하게 되므로 `admin/_components/AdminPagination.tsx`로 이전하고 email import 1곳 갱신(선택).
- 테이블 컬럼: 유형 / 수신번호 / 상태 / 세그먼트(SMS·LMS) / 주문번호 / 발송시각 / 재발송.
- **재발송**: `<button>` + `useTransition` → `resendSms(logId)`. 비용·재문자 발생이므로 `AdminConfirmModal`로 확인. 성공 시 `loadPage` 재실행. `status === 'sent'`면 비활성(실패 건만 재발송).

### `resendSms(logId)` 서버 액션

- `sms_logs`에서 logId 조회 → `order_no`+`type`으로 원본 데이터 재구성 후 `sendBuyerSms` 재호출. (주문 정보는 `orders`에서 재조회)
- `logAdminAction('sms_resent', ...)` 기록.

### 테스트

- `__tests__/app/actions/admin-sms.test.ts`: getSmsLogs 필터·페이지네이션, resendSms 권한·재발송 경로.

---

## 3. Phase 3 — 카카오 알림톡 전환 (트랜잭션)

### 목표

트랜잭션 7종을 "알림톡 우선 → 실패 시 SMS 자동대체"로 전환. **템플릿 미등록 시 자동으로 기존 SMS-only 동작** (심사 완료 전에도 안전).

### Solapi 알림톡 메커니즘 (조사 확정)

- **같은 엔드포인트**(`/messages/v4/send`)·같은 HMAC 인증. `message`에 `kakaoOptions` 객체만 추가.
- 폴백은 **자동·per-message**: `kakaoOptions.disableSms: false`(기본) → 알림톡 실패 시 Solapi가 `message.text`를 SMS/LMS로 자동 재발송. 추가 API 호출·폴링 불필요.
- `message.from`(발신번호) 필수(폴백 SMS 발신처). `kakaoOptions.pfId`(발신프로필) + `templateId`(승인 템플릿) 필수.
- 변수 치환 `#{변수명}`, `variables` 맵의 **키는 `#{ }` 포함** (`{ "#{name}": "홍길동" }`), 값은 문자열. 승인 템플릿만 채울 수 있음(임의 본문 불가).
- 알림톡=**정보성**(친구·마케팅 동의 불필요, 템플릿 심사 필요, **야간 제한 없음**). 친구톡=광고성(본 범위 아님). → 트랜잭션 알림톡은 야간·동의 가드 불필요.
- **폴백 본문 필드 불확실성**: docs가 `message.text` vs `kakaoOptions.replacements`로 불일치. → `message.text`를 기본 채택(SDK·단건 API 일치), 라이브 테스트로 확인. (구현 리스크로 명시)

### 변경

- `lib/sms/solapi.ts`: `sendSolapiAlimTalk({ to, text, templateId, variables, buttons? })` 추가.
  - body에 `kakaoOptions: { pfId, templateId, disableSms: false, variables, buttons }` 포함, `text`는 폴백 본문.
  - `SOLAPI_KAKAO_PF_ID` 또는 `templateId` 미설정 → **`sendSolapiSms({ to, text })`로 graceful degrade** (no-op 계약 유지).
  - 기존 statusCode `'2000'` 파싱 동일 적용.
- `lib/sms/buyer-sms.ts`:
  - 7종 → 알림톡 템플릿 ID 매핑 테이블 (env `SOLAPI_KAKAO_TEMPLATE_<TYPE>`). 변수 맵 구성.
  - 폴백 텍스트는 기존 `buildSmsText` 재사용.
  - `sendBuyerSms`가 매핑된 템플릿 ID 있으면 `sendSolapiAlimTalk`, 없으면 기존 `sendSolapiSms`.
  - `sms_logs.provider` 값에 `'kakao'` 구분 추가(발송 채널 기록), `segment`에 `'ATA'`(알림톡) 허용.

### 환경변수 (신규, 운영자가 채움)

```
SOLAPI_KAKAO_PF_ID=...                          # 발신프로필 pfId
SOLAPI_KAKAO_TEMPLATE_PAYMENT_CONFIRMED=...     # 7종 각각
SOLAPI_KAKAO_TEMPLATE_VIRTUAL_ACCOUNT_ISSUED=...
... (deposit_confirmed, shipped, delivered, refunded, auto_cancelled)
```

### 외부 선행작업 (운영자, 코드 아님)

1. 카카오 비즈니스 채널 생성 → 채널 검색용 아이디
2. Solapi 발신프로필 등록 → `pfId`
3. 7종 알림톡 템플릿 등록 + 카카오 심사(영업일 소요) → `templateId` 7개

코드는 이 작업과 무관하게 먼저 머지 가능(템플릿 ID 없으면 SMS로 동작).

### 테스트

- `__tests__/lib/sms/solapi.test.ts`: alimtalk body 형태(kakaoOptions, variables 키 `#{}` 포함), pfId/templateId 미설정 시 SMS degrade.
- `__tests__/lib/sms/buyer-sms.test.ts`: 템플릿 매핑 있을 때 알림톡 경로, 없을 때 SMS 경로.

---

## 4. Phase 4 — 마케팅/공지 브로드캐스트 SMS

### 목표

운영자가 세그먼트(거래고객·회원·직접입력) 대상으로 단체 SMS를 작성·발송. 이메일 브로드캐스트 구조를 충실히 미러링.

### 4.1 세그먼트 (채널)

이메일의 member/customer/petition/individual 중 **phone 보유 가능 채널만**:

| 채널         | 소스                                                                                          | 광고성        | 비고                 |
| ------------ | --------------------------------------------------------------------------------------------- | ------------- | -------------------- |
| `customer`   | `profiles(role='user', marketing_consent=true).phone` ∪ `orders.buyer_phone`(최근 6개월 결제) | **광고 강제** | 합집합·중복제거      |
| `member`     | `artists.contact_phone` ∪ `profiles(exhibitor).phone`                                         | 정보성        | 업무 안내, 동의 불요 |
| `individual` | 직접 번호 입력 (최대 500)                                                                     | 토글          |                      |

- **`petition` 채널 제외**: `petition_signatures`에 phone 컬럼 없음(서명 시 미수집) + 청원은 email-only. 향후 phone 수집 시 별도 cycle.

### 4.2 DB 마이그레이션 (이메일 테이블 미러, RLS=email 컨벤션)

타임스탬프는 최신 적용본 `20260610090000` 이후. **MCP `apply_migration` 단건 적용** (CLAUDE.md 정책).

- **A. `profiles.phone` 추가** — `ALTER TABLE profiles ADD COLUMN phone text`. (현재 없음, member/customer 필수)
  - 수집 지점: 회원가입·마이페이지 (Phase 4 범위에 폼 추가 포함). `marketing_consent*`는 기존 컬럼 재사용.
- **B. `sms_suppressions`** — `(phone_hash, channel)` unique, channel `IN ('customer','member','individual','all')`, reason `IN ('unsubscribe','bounce','complaint','manual')`. admin+service_role RLS.
- **C. `sms_broadcasts`** — email 미러, `body_text`(HTML 없음), `subject`/`cta_*`/`petition_slug` 제거, lease-lock 컬럼(`dispatch_locked_until`/`dispatch_lock_token`) 포함, channel `IN ('customer','member','individual')`, status `IN ('draft','queued','sending','sent','failed','cancelled')`.
- **D. `sms_broadcast_recipients`** — `phone`, `name`, `status`, `provider_message_id`, `segment`, `error`, `sent_at`. 부분 인덱스 `(broadcast_id, status) WHERE status='pending'` + `(broadcast_id)`.
- **E. RPC** `claim_sms_broadcast_dispatch`/`renew_sms_broadcast_dispatch` — `20260529130000`의 lease-lock RPC를 테이블명만 바꿔 복제.
- 적용 후 `mcp__claude_ai_Supabase__generate_typescript_types`로 `types/supabase.ts` 재생성.

> DDL 상세 스케치는 본 spec과 함께 조사된 `db-schema-ddl` 브리프에 컬럼 단위로 존재 — 구현 계획에서 마이그레이션 본문으로 옮긴다.

### 4.3 신규 코드 (이메일 → SMS 미러)

| 이메일 파일                                    | 신규 SMS 파일                                                 | 변경점                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/actions/admin-broadcast.ts`               | `app/actions/admin-sms-broadcast.ts`                          | `enqueueSmsBroadcast`, `enqueueIndividualSmsBroadcast`, `getSmsBroadcasts`, `previewSmsAudience`, `sendTestSms`. 5분 dedup, 500 cap, status flow 동일 |
| `lib/email/broadcast-segment.ts`               | `lib/sms/broadcast-segment.ts`                                | discriminated union + `deriveIsAdvertisement` + `buildGroupInput` + `MAX_DIRECT_RECIPIENTS`                                                           |
| `lib/email/audiences/*`                        | `lib/sms/audiences/*` (types, customer, member, individual)   | `Recipient { phone, name, phoneHash }`, `normalizeKoreanMobile` 정규화, `sms_suppressions` 차감                                                       |
| `lib/email/email-hash.ts`                      | `lib/sms/phone-hash.ts`                                       | `hashPhone(phone)=sha256(salt + normalizeKoreanMobile(phone))`. salt 스킴 재사용                                                                      |
| `lib/email/resend-batch.ts`                    | `lib/sms/solapi-batch.ts`                                     | `sendSolapiBatch(items)` — Solapi `messages[]`(다건, 최대 10,000) 또는 `Promise.all`+동시성 캡. `{ ids[], error }`                                    |
| `app/api/internal/broadcast-dispatch/route.ts` | `app/api/internal/sms-broadcast-dispatch/route.ts`            | lease/chunk/finalize 동일, Resend→Solapi. `vercel.json` cron + `maxDuration=300` 등록                                                                 |
| `emails/broadcast.tsx` + `rich-content.ts`     | `lib/sms/broadcast-body.ts`                                   | HTML 없음. `{{name}}` 치환, `[씨앗페]`/`(광고)` prefix, 무료수신거부 라인, byte-length 검증                                                           |
| `BroadcastComposer.tsx`                        | `app/(portal)/admin/sms/_components/SmsBroadcastComposer.tsx` | rich editor→`AdminTextarea`+바이트 카운터+SMS/LMS 표시. subject·CTA 제거                                                                              |
| `BroadcastHistory.tsx`                         | `app/(portal)/admin/sms/_components/SmsBroadcastHistory.tsx`  | 동일 폴링, 컬럼 조정                                                                                                                                  |

`/admin/sms/page.tsx`는 Phase 2의 로그 뷰어 + Phase 4의 Composer/History를 한 페이지에 섹션으로 합친다 (이메일 페이지 구조 미러).

### 4.4 멱등성 (3-layer, 이메일 동일)

1. **5분 enqueue dedup**: 동일 `created_by`+`channel`+`body`(또는 subject 대용 해시), `status IN ('queued','sending')`, 5분 이내 → 기존 broadcastId 반환.
2. **per-broadcast lease lock**: `claim_sms_broadcast_dispatch` (SECURITY DEFINER), `LEASE_SECONDS=120`. 모든 finalize/count UPDATE는 `.eq('dispatch_lock_token', token)` gated.
3. **provider idempotency**: ⚠️ **Solapi엔 Resend의 Idempotency-Key 헤더 없음.** → app-side dedup(`buildBatchIdempotencyKey`는 로깅용 유지)에 의존하지 않고, **lease lock + per-recipient `pending→sent` 전이를 재조회 전에 커밋**하는 것으로 보장 (이메일 dispatch의 "선두 pending chunk 항상 재조회" 패턴 그대로).

### 4.5 법적 준수 가드레일 (정보통신망법 §50) — 광고성(`is_advertisement`)일 때

조사된 `korea-sms-law` 브리프 기준. **트랜잭션(Phase 1·3)은 면제** — 광고 카피 0건일 때만 면제 유지.

1. **분류**: 메시지는 transactional **또는** marketing 하나로만. 거래 안내에 마케팅 카피 혼입 금지(혼입 시 전체 광고 재분류).
2. **`(광고)` 표기**: 광고면 body가 정확히 `(광고)`로 시작하는지 정규식 `^\(광고\)` 검증. 변칙 표기(`(광 고)`, `[광고]`) 차단. 자동 prefix 또는 발송 차단. 발신 브랜드명 포함.
3. **무료수신거부**: 광고 body에 무료 수신거부 번호(080) 또는 무료 방법 포함 검증. 없으면 자동 append 또는 차단. (Solapi 공용 080 활용 가능 — 운영 확인 필요)
4. **야간 차단**: 광고 SMS는 **도달 KST 21:00–08:00 발송 차단**. 본 설계는 단순화를 위해 **익일 예약(reschedule) 대신 발송 자체를 차단**(별도 야간 동의 미수집). 상수 `AD_NIGHT_WINDOW = [21:00, 08:00)`.
5. **동의**: 광고 대상은 `marketing_consent=true`만. 수신거부(`sms_suppressions`)는 무조건 차단.
6. **기록**: 발송 로그에 `is_advertisement`, 발송시각, 표기검증 결과 저장.

> ⚠️ **법적 주의**: 사용자가 "기존 `marketing_consent` 통합 사용"을 선택했으나, 법률 브리프는 SMS 광고 동의가 이메일보다 엄격할 수 있음을 경고. 본 설계는 통합 사용하되, `marketing_consent_source`로 SMS 동의 출처를 구분 기록하고, 향후 분리가 필요하면 컬럼 추가 없이 source 기반으로 필터 가능하게 둔다.

### 4.6 테스트

- `__tests__/lib/sms/broadcast-segment.test.ts`, `audiences/*.test.ts` (합집합·중복제거·suppression).
- `__tests__/lib/sms/phone-hash.test.ts`.
- `__tests__/app/actions/admin-sms-broadcast.test.ts` (5분 dedup, 500 cap, 광고 가드, 야간 차단).
- `__tests__/lib/sms/broadcast-body.test.ts` (광고 prefix·무료거부·바이트 검증).

---

## 5. PR 분할 / 빌드 순서

| PR       | 내용                                     | 의존 | 외부 선행                                        |
| -------- | ---------------------------------------- | ---- | ------------------------------------------------ |
| **PR-1** | Phase 1(영어 본문) + Phase 2(로그 admin) | 없음 | 없음                                             |
| **PR-2** | Phase 3(알림톡 전환)                     | PR-1 | 카카오 채널·발신프로필·템플릿 7종 심사           |
| **PR-3** | Phase 4(마케팅 브로드캐스트)             | PR-1 | profiles.phone 수집 정책, 080 무료거부 번호 확보 |

PR-2·PR-3는 코드 자체는 외부 선행작업 없이 머지 가능(알림톡=템플릿 미등록 시 SMS, 브로드캐스트=phone 미수집 시 대상 0). 단 실제 활성화는 외부 작업 완료 후.

---

## 6. 리스크 / 미해결 질문

1. **Solapi 폴백 본문 필드** (`message.text` vs `kakaoOptions.replacements`) — 라이브 테스트로 확정 필요. 기본 `message.text`.
2. **profiles.phone 수집 정책** — 회원가입·마이페이지 폼에 추가하는 범위가 Phase 4에 포함. 기존 회원은 phone null → member/customer-profile 대상에서 자연 제외(orders.buyer_phone은 그대로 활용).
3. **080 무료수신거부 번호** — 자체 미보유 시 Solapi 공용 080 사용 가능 여부 운영 확인.
4. **SMS 마케팅 동의의 법적 충분성** — `marketing_consent` 통합 사용이 SMS 광고에 충분한지. 본 설계는 통합 사용 + source 구분 기록으로 진행하되, 운영자가 약관·동의 문구를 SMS 포함하도록 갱신할 것을 권고.
5. **Solapi 다건 발송 API** (`messages[]`) 정확한 형태 — 구현 시 SDK/docs 재확인(또는 단건 `Promise.all` 폴백).

---

## 7. 변경하지 않는 것 (범위 밖)

- 국제(비-010) SMS 발송 — `normalizeKoreanMobile` 유지.
- 친구톡(광고성 카카오) — 알림톡(정보성)만.
- petition 채널 SMS — phone 미수집.
- `sms_logs` 스키마 변경(테이블 자체) — Phase 3에서 provider/segment 값 추가만, 컬럼 불변.
