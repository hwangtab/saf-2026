# 단체 이메일 발송 시스템 설계 (Bulk Email / Broadcast)

- 작성일: 2026-05-27
- 상태: 설계 합의 완료, 구현 계획 대기
- 범위: admin이 (1)고객, (2)작가·출품자, (3)청원 서명자에게 단체 이메일을 보내는 통합 시스템

---

## 1. Context — 왜 만드는가

관리자가 "고객 관리"에서 고객에게 단체 이메일을 보내고 싶다는 요청에서 출발했으나, 발송 대상이 세 갈래로 확장됐다:

1. **고객 마케팅** — `role=user` 고객에게 전시·신작·캠페인 홍보 (광고성)
2. **작가·출품자 업무** — 출품 작가·출품자에게 운영 공지 (업무·거래성)
3. **청원 캠페인 알림** — 청원 서명자에게 진행상황 안내 (정보성 후속)

조사 결과 기존에는 트랜잭션 메일(결제·배송·청원 접수 확인)만 Resend로 단건 발송하고 있었고, **단체 발송 인프라·동의·수신거부·발송 이력이 전무**하다. 세 채널은 동의 근거와 컴플라이언스 요건이 다르지만 발송 엔진은 공유할 수 있다. 특히 청원 서명자가 **11,508명**이라 비동기 배치 발송이 필수이며, 이 엔진을 세 채널이 공통으로 쓴다.

**의도된 결과**: 채널별 동의·컴플라이언스 정책을 지키면서, 큐 기반으로 안전하게 대량 발송하고, 발송 이력·수신거부를 추적할 수 있는 재사용 가능한 시스템.

### 현재 규모 (2026-05-27, production 조회)

| 채널          | 대상                                  | 수                             | 이메일 출처                                                                                                                           |
| ------------- | ------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| ① 고객        | `profiles role=user`                  | 9 (전원 이메일) / 거래고객 1   | `profiles.email`                                                                                                                      |
| ② 작가·출품자 | `role=artist` 40 / `role=exhibitor` 0 | 40                             | **`artists.contact_email`** (계정 미연결 작가 다수 → artists가 단일 출처), 출품자는 `profiles.email`/`exhibitor_applications.contact` |
| ③ 청원        | `petition_signatures`                 | **11,508** (distinct·비마스킹) | `petition_signatures.email` (평문)                                                                                                    |

---

## 2. 기존 자산 (재사용) 과 공백 (신규)

### 재사용

- **발송 transport**: [lib/notify.ts](../../../lib/notify.ts) `resendFetch()` — Resend HTTP API 직접 호출(SDK 없음), 429/5xx 1회 재시도. `RESEND_API_KEY`/`RESEND_FROM_EMAIL` env. **단건 전용**이라 batch 로직은 신규.
- **React Email**: `emails/` 디렉토리 + `emails/_components/` (레이아웃·i18n ko/en). 마케팅/브로드캐스트 템플릿은 신규.
- **활동 로그**: [app/actions/activity-log-writer.ts](../../../app/actions/activity-log-writer.ts) `logAdminAction()` — 발송 행위 감사 로그에 재사용.
- **발송자 식별 정보**: [lib/constants.ts](../../../lib/constants.ts) `CONTACT` — 상호(한국스마트협동조합)·대표(서인형)·사업자등록번호(385-86-01622)·통신판매업신고(제2021-서울은평-0715호)·주소·전화 모두 구비. 정보통신망법 광고 메일 푸터에 그대로 사용.
- **고객 추출 패턴**: [app/(portal)/admin/users/page.tsx](<../../../app/(portal)/admin/users/page.tsx>) `role` 필터 쿼리.

### 공백 (신규 구축)

- 단체 발송 엔진(큐 + 배치 + 크론), 발송 이력·수신자 큐 테이블
- 광고 수신동의(opt-in) 컬럼 + 수집 UI(가입/마이페이지)
- 통합 수신거부(opt-out) 테이블 + unsubscribe 엔드포인트
- 채널별 수신자 추출 모듈, 브로드캐스트 템플릿, admin 발송 UI

---

## 3. 통합 아키텍처 — "발송 엔진 1개 + 채널 정책 3개"

```
[admin /admin/email]
   └─ 캠페인 작성(draft) → 대상 미리보기 → 테스트 발송 → 발송 확정(enqueue)
          │
          ▼
[email_broadcasts] ──< [email_broadcast_recipients] (pending 큐, 11,508행까지)
          │                        ▲
          ▼                        │ status/resend_id 갱신
[크론 /api/internal/broadcast-dispatch]
   └─ pending 100건 청크 → Resend batch API → throttle → 반복
                                   │
                                   ▼ 각 메일 푸터
                          [unsubscribe 링크 (HMAC 토큰)]
                                   │
                                   ▼
                          [/api/email/unsubscribe] → email_suppressions insert
```

채널별로 다른 것은 **수신자 추출 + 동의 근거 + 컴플라이언스 데코레이션**뿐이고, 큐·발송·이력·수신거부는 공통.

---

## 4. 데이터 모델 (마이그레이션)

> Migration 파일은 `supabase/migrations/`에 작성하고 MCP `apply_migration`으로 1건씩 적용(CLAUDE.md 정책). project_id `khtunrybrzntlnowlahb` (서울).

### 4.1 `profiles` 광고 수신동의 (고객 채널 opt-in 전용)

```sql
ALTER TABLE public.profiles
  ADD COLUMN marketing_consent      boolean NOT NULL DEFAULT false,
  ADD COLUMN marketing_consent_at   timestamptz,
  ADD COLUMN marketing_consent_source text; -- 'signup' | 'mypage' | 'admin'
```

### 4.2 `email_suppressions` — 전 채널 통합 수신거부

대상 테이블(profiles·artists·petition_signatures)이 제각각이라, **이메일 해시 기준 통합 차단**이 정답. 발송 직전 모든 채널이 이 테이블로 거른다.

```sql
CREATE TABLE public.email_suppressions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash  text NOT NULL,            -- sha256(salt + lower(trim(email))). petition_signatures.email_hash와 동일 salt 정책
  channel     text NOT NULL,            -- 'customer' | 'member' | 'petition' | 'all'
  reason      text,                     -- 'unsubscribe' | 'bounce' | 'complaint' | 'manual'
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_hash, channel)
);
```

- `channel='all'`이면 전 채널 차단. unsubscribe 링크는 해당 메일의 채널만 차단(예: 고객이 마케팅 거부해도 거래 안내는 별개).

### 4.3 `email_broadcasts` — 캠페인 메타·이력

```sql
CREATE TABLE public.email_broadcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         text NOT NULL,                 -- 'customer' | 'member' | 'petition'
  petition_slug   text,                          -- channel='petition'일 때 대상 청원
  subject         text NOT NULL,
  body_md         text NOT NULL,                 -- 마크다운 본문
  cta_label       text,
  cta_url         text,
  audience_filter jsonb NOT NULL DEFAULT '{}',   -- 채널별 추가 필터(예: member 하위구분)
  status          text NOT NULL DEFAULT 'draft', -- draft|queued|sending|sent|failed|cancelled
  recipient_count int  NOT NULL DEFAULT 0,
  sent_count      int  NOT NULL DEFAULT 0,
  failed_count    int  NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  queued_at       timestamptz,
  sent_at         timestamptz
);
```

### 4.4 `email_broadcast_recipients` — 수신자별 큐

```sql
CREATE TABLE public.email_broadcast_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.email_broadcasts(id) ON DELETE CASCADE,
  email        text NOT NULL,
  name         text,
  locale       text NOT NULL DEFAULT 'ko',
  status       text NOT NULL DEFAULT 'pending',  -- pending|sent|failed|skipped
  resend_id    text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_broadcast_recipients_dispatch
  ON public.email_broadcast_recipients (broadcast_id, status);
```

- unsubscribe 토큰은 발송 시점에 `email_hash`/`broadcast_id`로 동적 생성(HMAC) — 별도 컬럼 불필요.

### 4.5 RLS

네 테이블 모두 **admin/service_role 전용**. `email_suppressions`는 unsubscribe route(service_role)와 admin만 insert. anon/authenticated 직접 접근 차단. (RLS 정책 마이그레이션 포함)

---

## 5. 공통 컴포넌트 설계

### 5.1 수신자 추출 `lib/email/audiences/`

공통 인터페이스:

```ts
type Recipient = { email: string; name: string | null; locale: 'ko' | 'en'; emailHash: string };
interface AudienceResolver {
  resolve(filter): Promise<Recipient[]>;
}
```

추출 후 **`email_suppressions`(해당 channel + 'all')로 일괄 차감** → 중복 제거(정규화된 email 기준) → 최종 큐 적재.

- `customer.ts`: `profiles role=user AND (marketing_consent=true OR 최근 6개월 거래고객)`. 거래고객 = `orders` 의 `buyer_user_id`/`buyer_email` (status in paid/shipped/delivered, created_at >= now()-6mo).
- `member.ts`: `artists.contact_email`(NOT NULL) ∪ `profiles role IN (artist, exhibitor)`. 출품자 0명이나 구조 지원.
- `petition.ts`: `petition_signatures WHERE petition_slug=? AND is_masked=false AND email IS NOT NULL`.

### 5.2 발송 엔진

- **enqueue (server action)** `app/actions/admin-broadcast.ts`: `requireAdmin` → audience resolve → `email_broadcasts(status=queued)` + `email_broadcast_recipients(status=pending)` 일괄 insert → `logAdminAction('broadcast_enqueued', ...)`.
- **dispatch (크론)** `app/api/internal/broadcast-dispatch/route.ts`: `status in (queued,sending)` broadcast의 `pending` recipients를 **100건 청크**로 Resend batch API(`POST /emails/batch`) 발송 → recipient.status/resend_id 갱신 → throttle(rate limit 준수). 전량 처리 시 `broadcasts.status=sent`, 부분 실패는 `failed_count` 누적. **멱등성**: 청크 처리 중 크론 재실행돼도 `status=pending`만 집어 중복 발송 방지. `vercel.json` 크론 등록(예: 매분) 또는 enqueue 직후 트리거 + 크론 백업.
- 소규모(고객 9·작가 40)는 동일 파이프라인에서 1청크로 즉시 끝남.

### 5.3 unsubscribe `app/api/email/unsubscribe/route.ts`

- 토큰: `payload = base64url(email_hash + '|' + channel)`, `sig = HMAC_SHA256(secret, payload)`, 링크 = `?t=payload.sig`. 서버 시크릿은 env(`EMAIL_UNSUB_SECRET`).
- 검증 통과 시 `email_suppressions(email_hash, channel, reason='unsubscribe')` upsert. 로그인 불요(법적 무료·간편 수신거부 수단).
- 고객 채널이면 `profiles.marketing_consent=false`도 동기화.

### 5.4 템플릿 `emails/broadcast.tsx` (React Email, ko/en)

- 마크다운 본문 → HTML(안전 렌더), 선택 CTA 버튼, **발송자 정보 푸터**(`CONTACT`: 상호·대표·사업자번호·통신판매신고·주소·전화), **수신거부 링크**.
- 채널별 데코레이션: 고객(광고)은 제목 앞 `(광고)` + 전체 발송자정보, 업무/청원은 `(광고)` 없이 간결 푸터 + 수신거부.

### 5.5 admin UI `/admin/email`

- 채널 선택 → 제목·마크다운 본문·CTA 작성 → **대상 미리보기**("총 N명 = 동의 X + 거래 Y" 등 채널별 분해) → **테스트 발송**(관리자 본인) → **발송 확정**(모달 확인) → 발송 후 **이력 목록**(`email_broadcasts` 상태·발송수·실패수).
- 21~08시 발송 시 **야간 발송 경고**(자동 차단 아님, 경고만).
- admin 포털이므로 **한국어 영구**(i18n 비스코프, CLAUDE.md).

### 5.6 마이페이지 동의 토글 + 가입 동의

- 마이페이지: 광고 수신동의 on/off 토글(기존 고객이 직접 켜는 유일 경로 + opt-out 통일). off 시 `marketing_consent=false` + `email_suppressions(channel='customer')`.
- 회원가입 [signup/page.tsx](<../../../app/(auth)/signup/page.tsx>): 선택적 "(광고) 정보 수신 동의" 체크박스(필수 아님) → `marketing_consent`, `_source='signup'`.

---

## 6. 채널 정책 & 컴플라이언스 매핑 (정보통신망법 제50조)

| 채널               | 동의 근거                                                       | `(광고)` 표기 | 수신거부                         | 발송자 정보                |
| ------------------ | --------------------------------------------------------------- | ------------- | -------------------------------- | -------------------------- |
| ① 고객 마케팅      | opt-in(`marketing_consent`) **또는** 6개월 거래 예외            | **필수**      | **필수**                         | 전체(사업자번호·주소·전화) |
| ② 작가·출품자 업무 | 회원 운영·업무 관계(동의 불요)                                  | 불요          | 권장(링크 제공)                  | 간결                       |
| ③ 청원 알림        | 서명 시 개인정보 동의문에 "진행상황 안내(이메일)" 명시 → 정보성 | 불요          | **필수(지속 발송 opt-out 제공)** | 간결                       |

근거(③): `messages/ko.json` `formPrivacyBlurb`에 "이용 목적: … 진행 상황 안내(이메일·전화)"가 명시되어 있어 청원 진행상황 메일은 광고가 아닌 정보성. 단 지속 발송이므로 수신거부 수단 제공.

> ⚠️ 위 컴플라이언스 해석은 일반적 가이드이며, 실제 발송 전 법무 검토 권장.

---

## 7. 단계 분해 (각 단계 독립 가치)

- **Phase 0 — Foundation**: 마이그레이션 4종(§4) + 발송 엔진(enqueue+dispatch 크론, §5.2) + `email_suppressions`/unsubscribe(§5.3) + `broadcast.tsx` 템플릿(§5.4) + `/admin/email` 골격(§5.5) + audience resolver 인터페이스(§5.1). **이 단계 검증은 작가 채널로 한다.**
- **Phase 1 — 작가·출품자 업무**: `member.ts` resolver, member 발송(동의 불요·최저 리스크). 40명 즉시 실용.
- **Phase 2 — 고객 마케팅**: `profiles.marketing_consent` 활용 + 가입/마이페이지 동의 UI(§5.6) + `customer.ts`(동의자∪거래고객) + `(광고)` 데코레이션.
- **Phase 3 — 청원 캠페인 알림**: `petition.ts` resolver + 대량 발송 운영(아래 §8). 가장 신중하게 마지막.

---

## 8. 미해결 / 운영 확인 사항 (Phase 3 전 필수)

대량 발송(11,508명)은 코드 외 운영 변수가 결정적이다:

- **Resend 요금제 한도·rate limit**: 월 발송량, 초당 요청 한도. 11,508건이 plan 한도 내인지 확인.
- **도메인 평판·인증**: `noreply@saf2026.com`의 SPF/DKIM/DMARC. 대량 일시 발송은 평판 영향 → 점진 발송(throttle) 또는 워밍업 고려.
- **발송 도메인 통일**: 현재 청원 확인 메일은 `noreply@saf2026.com`, 조직 연락은 `contact@kosmart.org`로 불일치 — 발신/reply-to 정책 정리.
- **바운스·컴플레인 처리**: Resend 웹훅 → `email_suppressions(reason='bounce'/'complaint')` 자동 반영(Phase 3에서 추가 권장).
- **야간 발송 회피**: 청원 대량 발송은 주간 시간대로.

---

## 9. 검증 (테스트 전략)

- **단위**: audience resolver(suppression 차감·중복 제거·거래고객 합집합), unsubscribe 토큰 생성/검증(위변조 거부), 템플릿 렌더(ko/en·광고 표기 유무).
- **통합**: dispatch 크론 청크 처리(mock Resend) — pending→sent 전이, 부분 실패 시 failed 기록, **재실행 멱등성**(중복 발송 없음).
- **수동 E2E**: admin에서 작가 채널 테스트 발송 → 본인 수신 확인 → 소수 실발송 → 이력·수신거부 동작 확인.
- 각 Phase 종료 시 `npm run type-check && npm run build && npm test` 게이트.

---

## 10. 범위 외 (YAGNI)

- A/B 테스트, 발송 예약(스케줄러), 오픈·클릭 트래킹, 세그먼트 빌더, 리치 에디터(WYSIWYG) — 현 단계 불필요. 마크다운 + 채널 고정 추출로 충분.
- 별도 consent 이력 테이블 — `profiles` 컬럼 + `email_suppressions`로 충분.
