# 오윤 40주기 추도식 행사 신청 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오윤 40주기 추도식 참가자를 선착순 정원(버스 44석) 내에서 온라인으로 모집하고, 회비(1인 3만원)를 토스로 결제받으며, 정원 초과 시 대기자를 받아 알림톡·이메일로 안내하는 공개 신청 페이지 + admin 관리 포털을 구축한다.

**Architecture:** 전용 `events`/`event_registrations` 테이블 + 동시성 안전 좌석예약 RPC(`register_event_seat`, advisory lock). 토스 결제는 기존 SDK·랜딩 패턴만 재사용하되 행사 전용 confirm 라우트로 분리. 발송은 기존 `sendBuyerSms`/`sendBuyerEmail` 패턴을 복제한 `lib/events/notify.ts`. 공개 페이지는 청원 페이지(`app/[locale]/petition/oh-yoon`) 구조를, admin은 청원 admin 구조를 복제.

**Tech Stack:** Next.js 16 (App Router, [locale] 라우팅, ISR), TypeScript strict, Supabase(Postgres RPC, SECURITY DEFINER), 토스페이먼츠 SDK v2, Solapi 알림톡, Resend + React Email, next-intl, Vitest.

**작업 위치:** worktree `/Users/hwang-gyeongha/saf-2026/.claude/worktrees/oh-yoon-memorial` (브랜치 `worktree-oh-yoon-memorial`, base `origin/main` + 이벤트 커밋 3개).

**선행 사실:**

- 알림톡 템플릿 3종 이미 카카오 심사중. env 키: `SOLAPI_KAKAO_TEMPLATE_EVENT_PAYMENT_CONFIRMED` / `_WAITLIST` / `_WAITLIST_PAYMENT` (`.env.local.example`에 templateId 주석으로 기록됨).
- Supabase는 **MCP `apply_migration` 우선**(단건). migration 파일은 `supabase/migrations/`에 작성 후 본문을 `apply_migration`의 `query`로 전달. 위험 작업이므로 사용자 컨펌.
- admin 포털은 **영구 한국어**(i18n 비-스코프). 공개 페이지는 ko/en 필수.

---

## File Structure

**생성:**

- `content/events/oh-yoon-memorial.ts` — 행사 정보 단일 출처(일정/회비/정원/장소/슬러그/경로 상수)
- `supabase/migrations/<ts>_event_registrations.sql` — `events` + `event_registrations` 테이블, RPC 3종, 인덱스, RLS
- `lib/events/notify.ts` — 행사 알림톡 + 이메일 발송 래퍼(`sendEventSms`, `sendEventEmail`)
- `emails/event-payment-confirmed.tsx`, `emails/event-waitlist.tsx`, `emails/event-waitlist-payment.tsx` — React Email 3종
- `app/actions/event-registration.ts` — 공개 신청 server action(`registerEvent`)
- `app/api/payments/event/confirm/route.ts` — 행사 결제 confirm 라우트
- `app/[locale]/event/oh-yoon-memorial/page.tsx` — 공개 페이지(SSR, ISR 60s)
- `app/[locale]/event/oh-yoon-memorial/_components/RegistrationForm.tsx` — 신청 폼 + 토스 결제 시작
- `app/[locale]/event/oh-yoon-memorial/_components/SeatStatusBar.tsx` — 잔여석/마감/대기 상태 바
- `app/[locale]/event/oh-yoon-memorial/_components/EventSchedule.tsx` — 일정 타임라인
- `app/[locale]/event/oh-yoon-memorial/_components/EventFAQ.tsx` — FAQ
- `app/[locale]/event/oh-yoon-memorial/success/page.tsx` + `success/SuccessClient.tsx` — 결제 성공 랜딩
- `app/[locale]/event/oh-yoon-memorial/fail/page.tsx` + `fail/FailClient.tsx` — 결제 실패 랜딩
- `app/(portal)/admin/event/oh-yoon-memorial/page.tsx` + `_components/*` — admin 관리
- `app/actions/event-admin.ts` — admin action(취소/대기자 결제링크 발송/CSV/정원 조정)
- `__tests__/lib/event-registration.test.ts` — 좌석/금액/검증 단위 테스트
- `e2e/a11y/event-oh-yoon-memorial.spec.ts` — a11y e2e

**수정:**

- `messages/ko.json`, `messages/en.json` — `event.ohYoonMemorial` 네임스페이스 추가
- `types/supabase.ts` (또는 생성 위치) — `generate_typescript_types` 재생성
- `.env.local.example` — 이미 템플릿 env 주석 존재(확인만)

---

## Task 1: 행사 정보 상수 (단일 출처)

**Files:**

- Create: `content/events/oh-yoon-memorial.ts`

- [ ] **Step 1: 상수 파일 작성**

```typescript
// content/events/oh-yoon-memorial.ts
/** 오윤 40주기 추도식 행사 정보 단일 출처. 페이지·알림톡·이메일·admin이 공통 참조. */

export const OH_YOON_MEMORIAL_SLUG = 'oh-yoon-memorial' as const;

/** 공개 페이지 경로(locale 미포함). 토스 successUrl/failUrl·revalidatePath에 사용. */
export const OH_YOON_MEMORIAL_PATH = '/event/oh-yoon-memorial' as const;

/** admin 경로. */
export const OH_YOON_MEMORIAL_ADMIN_PATH = '/admin/event/oh-yoon-memorial' as const;

/** 1인 회비(원). 금액은 항상 서버에서 fee × party_size로 계산. */
export const OH_YOON_MEMORIAL_FEE = 30_000 as const;

/** 기본 정원(운전석 제외). admin에서 events.capacity로 조정 가능 — 이 값은 시드 초기값. */
export const OH_YOON_MEMORIAL_DEFAULT_CAPACITY = 44 as const;

/** pending(결제대기) 좌석 hold 유지 시간(분). */
export const OH_YOON_MEMORIAL_HOLD_MINUTES = 15 as const;

/** 행사 일정(표시용). i18n 메시지가 아닌 구조 데이터 — 라벨은 메시지에서. */
export const OH_YOON_MEMORIAL_SCHEDULE = [
  { time: '09:30', key: 'depart' },
  { time: '11:00', key: 'ceremony' },
  { time: '12:00', key: 'end' },
  { time: '13:30', key: 'lunch' },
] as const;

/** 행사일 ISO(KST). */
export const OH_YOON_MEMORIAL_DATE = '2026-07-05' as const;
```

- [ ] **Step 2: 타입체크**

Run: `npm run type-check`
Expected: PASS (route types 생성 후 tsc 통과)

- [ ] **Step 3: 커밋**

```bash
git add content/events/oh-yoon-memorial.ts
git commit -m "feat(event): 추도식 행사 정보 상수 단일 출처 추가

요약: 추도식 일정/회비/정원/경로 상수 파일 추가"
```

---

## Task 2: DB 스키마 + 좌석예약 RPC (migration)

기존 `supabase/migrations/20260427034000_petition_signatures.sql`의 패턴(SECURITY DEFINER, service_role 가드, jsonb payload, EXCEPTION 처리)을 따른다.

**Files:**

- Create: `supabase/migrations/<ts>_event_registrations.sql` (`<ts>`는 `date +%Y%m%d%H%M%S` 형식, 기존 최신 migration보다 큰 값)

- [ ] **Step 1: migration SQL 작성**

```sql
-- events: 행사 메타(정원/회비/마감). 단일 행사라도 capacity admin 조정 위해 테이블화.
CREATE TABLE IF NOT EXISTS public.events (
  slug            text PRIMARY KEY,
  title           text NOT NULL,
  capacity        integer NOT NULL CHECK (capacity >= 0),
  fee_per_person  integer NOT NULL CHECK (fee_per_person >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  registration_deadline timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 시드: 오윤 추도식
INSERT INTO public.events (slug, title, capacity, fee_per_person, registration_deadline)
VALUES ('oh-yoon-memorial', '오윤 40주기 추도식', 44, 30000, '2026-07-05T08:00:00+09:00')
ON CONFLICT (slug) DO NOTHING;

-- event_registrations: 참가 신청
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug      text NOT NULL REFERENCES public.events(slug) ON DELETE RESTRICT,

  applicant_name  text NOT NULL CHECK (char_length(btrim(applicant_name)) BETWEEN 1 AND 100),
  phone           text NOT NULL,
  email           text,

  party_size      integer NOT NULL CHECK (party_size BETWEEN 1 AND 20),
  boarding_confirmed boolean NOT NULL DEFAULT false,

  -- pending: 결제대기(좌석 hold) / confirmed: 결제완료 / waitlist: 대기 / cancelled / expired
  status          text NOT NULL CHECK (status IN ('pending','confirmed','waitlist','cancelled','expired')),

  amount          integer NOT NULL CHECK (amount >= 0),   -- party_size * fee, 서버 계산
  order_no        text UNIQUE,                            -- 토스 주문번호 겸 customerKey
  payment_key     text,
  paid_at         timestamptz,
  hold_expires_at timestamptz,                            -- pending 만료(생성+15분)

  agreed_privacy  boolean NOT NULL CHECK (agreed_privacy = true),

  user_agent      text,
  ip_hash         text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_reg_slug_status
  ON public.event_registrations (event_slug, status);
CREATE INDEX IF NOT EXISTS idx_event_reg_slug_created
  ON public.event_registrations (event_slug, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
-- 공개/인증 클라이언트 직접 접근 차단. 모든 접근은 service_role(RPC/admin client) 경유.
-- (정책 미생성 = 기본 deny. petition_signatures와 동일 전략.)

-- 점유 좌석 = confirmed + 미만료 pending 의 party_size 합
CREATE OR REPLACE FUNCTION public.event_occupied_seats(p_slug text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(SUM(party_size), 0)::integer
  FROM public.event_registrations
  WHERE event_slug = p_slug
    AND (
      status = 'confirmed'
      OR (status = 'pending' AND hold_expires_at > now())
    );
$$;

-- 좌석 현황(공개 페이지 표시용): capacity / occupied / remaining / is_open
CREATE OR REPLACE FUNCTION public.event_seat_status(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_occupied integer;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  v_occupied := public.event_occupied_seats(p_slug);
  RETURN jsonb_build_object(
    'found', true,
    'capacity', v_event.capacity,
    'occupied', v_occupied,
    'remaining', GREATEST(v_event.capacity - v_occupied, 0),
    'is_open', v_event.is_active
      AND (v_event.registration_deadline IS NULL OR v_event.registration_deadline > now())
      AND (v_event.capacity - v_occupied) > 0,
    'fee_per_person', v_event.fee_per_person
  );
END;
$$;

-- 좌석 예약(원자적). advisory lock으로 같은 행사 신청을 직렬화.
-- 잔여석 >= party_size → pending(hold) 생성, 부족 → waitlist 생성.
CREATE OR REPLACE FUNCTION public.register_event_seat(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role     text;
  v_slug     text;
  v_event    public.events%ROWTYPE;
  v_party    integer;
  v_amount   integer;
  v_occupied integer;
  v_status   text;
  v_hold     timestamptz;
  v_order_no text;
  v_id       uuid;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'EVENT_REGISTER_FORBIDDEN';
  END IF;

  v_slug  := p_payload->>'event_slug';
  v_party := COALESCE((p_payload->>'party_size')::integer, 0);
  IF v_party < 1 OR v_party > 20 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_PARTY_SIZE');
  END IF;

  -- 같은 행사 신청 직렬화 (트랜잭션 종료 시 자동 해제)
  PERFORM pg_advisory_xact_lock(hashtext('event:' || v_slug));

  SELECT * INTO v_event FROM public.events WHERE slug = v_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EVENT_NOT_FOUND');
  END IF;
  IF NOT v_event.is_active
     OR (v_event.registration_deadline IS NOT NULL AND v_event.registration_deadline <= now()) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EVENT_CLOSED');
  END IF;

  v_amount   := v_event.fee_per_person * v_party;
  v_occupied := public.event_occupied_seats(v_slug);

  IF (v_event.capacity - v_occupied) >= v_party THEN
    v_status   := 'pending';
    v_hold     := now() + (COALESCE((p_payload->>'hold_minutes')::int, 15) || ' minutes')::interval;
    v_order_no := 'EVT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  ELSE
    v_status   := 'waitlist';
    v_hold     := NULL;
    v_order_no := NULL;
  END IF;

  INSERT INTO public.event_registrations (
    event_slug, applicant_name, phone, email, party_size, boarding_confirmed,
    status, amount, order_no, hold_expires_at, agreed_privacy, user_agent, ip_hash
  ) VALUES (
    v_slug,
    btrim(p_payload->>'applicant_name'),
    btrim(p_payload->>'phone'),
    NULLIF(btrim(COALESCE(p_payload->>'email','')), ''),
    v_party,
    COALESCE((p_payload->>'boarding_confirmed')::boolean, false),
    v_status,
    v_amount,
    v_order_no,
    v_hold,
    (p_payload->>'agreed_privacy')::boolean,
    p_payload->>'user_agent',
    p_payload->>'ip_hash'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_id, 'status', v_status,
    'order_no', v_order_no, 'amount', v_amount
  );
END;
$$;

-- 결제 확정: pending → confirmed. hold 만료됐어도 좌석 재확인 후 승격, 초과 시 거부.
CREATE OR REPLACE FUNCTION public.confirm_event_registration(
  p_order_no text, p_payment_key text, p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role     text;
  v_reg      public.event_registrations%ROWTYPE;
  v_event    public.events%ROWTYPE;
  v_occupied integer;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'EVENT_CONFIRM_FORBIDDEN';
  END IF;

  SELECT * INTO v_reg FROM public.event_registrations WHERE order_no = p_order_no FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_reg.status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', true, 'code', 'ALREADY_CONFIRMED', 'id', v_reg.id);
  END IF;
  IF v_reg.amount <> p_amount THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AMOUNT_MISMATCH');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('event:' || v_reg.event_slug));
  SELECT * INTO v_event FROM public.events WHERE slug = v_reg.event_slug;

  -- hold가 만료된 경우(다른 confirmed가 자리를 채웠을 수 있음) 재확인
  IF v_reg.hold_expires_at IS NULL OR v_reg.hold_expires_at <= now() THEN
    v_occupied := public.event_occupied_seats(v_reg.event_slug);
    IF (v_event.capacity - v_occupied) < v_reg.party_size THEN
      RETURN jsonb_build_object('ok', false, 'code', 'SOLD_OUT');
    END IF;
  END IF;

  UPDATE public.event_registrations
  SET status = 'confirmed', payment_key = p_payment_key, paid_at = now(),
      hold_expires_at = NULL, updated_at = now()
  WHERE id = v_reg.id;

  RETURN jsonb_build_object('ok', true, 'code', 'CONFIRMED', 'id', v_reg.id);
END;
$$;

REVOKE ALL ON FUNCTION public.register_event_seat(jsonb) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.confirm_event_registration(text, text, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.register_event_seat(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_event_registration(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.event_seat_status(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.event_occupied_seats(text) TO service_role;
```

- [ ] **Step 2: migration 적용 (MCP, 사용자 컨펌)**

`mcp__claude_ai_Supabase__apply_migration` 사용, `project_id=khtunrybrzntlnowlahb`, `name=event_registrations`, `query`=위 SQL 본문. **위험 작업이므로 실행 전 사용자 확인.**

- [ ] **Step 3: 적용 검증**

`mcp__claude_ai_Supabase__execute_sql`로:

```sql
SELECT public.event_seat_status('oh-yoon-memorial');
```

Expected: `{"found":true,"capacity":44,"occupied":0,"remaining":44,"is_open":true,"fee_per_person":30000}`

- [ ] **Step 4: advisors 보안 점검**

`mcp__claude_ai_Supabase__get_advisors` (type=security) — 새 테이블 RLS 경고 없는지 확인(정책 없이 deny가 의도).

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/
git commit -m "feat(event): event_registrations 스키마 + 좌석예약 RPC

요약: 행사 신청 테이블·정원 RPC(advisory lock 동시성 안전) 추가"
```

---

## Task 3: Supabase 타입 재생성

**Files:**

- Modify: 타입 정의 파일(기존 위치 — `grep -rl "export type Database" --include=*.ts .`로 확인)

- [ ] **Step 1: 타입 생성**

`mcp__claude_ai_Supabase__generate_typescript_types` (`project_id=khtunrybrzntlnowlahb`) 호출 → 결과를 기존 타입 파일에 반영.

- [ ] **Step 2: 타입체크 + 커밋**

```bash
npm run type-check   # PASS
git add -A && git commit -m "chore(types): regenerate supabase types with event_registrations

요약: 행사 테이블 타입 반영"
```

---

## Task 4: 행사 발송 래퍼 (알림톡 + 이메일)

`lib/sms/buyer-sms.ts`·`lib/notify.ts` 패턴을 복제하되 행사 전용으로 분리(작품 주문 타입 오염 방지).

**Files:**

- Create: `lib/events/notify.ts`
- Create: `emails/event-payment-confirmed.tsx`, `emails/event-waitlist.tsx`, `emails/event-waitlist-payment.tsx` (Task 5에서 작성 — 여기선 import만 선언, Task 5와 함께 통과시켜도 됨)
- Test: `__tests__/lib/event-notify.test.ts`

- [ ] **Step 1: 실패 테스트 작성 (변수 빌더)**

```typescript
// __tests__/lib/event-notify.test.ts
import { describe, it, expect } from 'vitest';
import { buildEventAlimTalkVariables, EVENT_ALIMTALK_TEMPLATE_ENV } from '@/lib/events/notify';

describe('buildEventAlimTalkVariables', () => {
  it('payment_confirmed 변수 매핑', () => {
    const v = buildEventAlimTalkVariables('payment_confirmed', {
      name: '홍길동',
      partySize: 2,
      amount: 60000,
    });
    expect(v['#{name}']).toBe('홍길동');
    expect(v['#{partySize}']).toBe('2');
    expect(v['#{amount}']).toBe('60,000');
  });
  it('waitlist_payment 은 deadline 포함', () => {
    const v = buildEventAlimTalkVariables('waitlist_payment', {
      name: '김씨',
      partySize: 1,
      amount: 30000,
      deadline: '6월 20일 18시',
    });
    expect(v['#{deadline}']).toBe('6월 20일 18시');
  });
  it('env 매핑은 3종', () => {
    expect(Object.keys(EVENT_ALIMTALK_TEMPLATE_ENV).sort()).toEqual([
      'payment_confirmed',
      'waitlist',
      'waitlist_payment',
    ]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- event-notify`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: `lib/events/notify.ts` 구현**

```typescript
// lib/events/notify.ts
import React from 'react';
import { render } from '@react-email/render';
import { sendSolapiAlimTalk, sendSolapiSms, type KakaoButton } from '@/lib/sms/solapi';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { normalizeKoreanMobile } from '@/lib/sms/phone'; // buyer-sms가 쓰는 동일 헬퍼(경로 확인)
import EventPaymentConfirmedEmail from '@/emails/event-payment-confirmed';
import EventWaitlistEmail from '@/emails/event-waitlist';
import EventWaitlistPaymentEmail from '@/emails/event-waitlist-payment';
import { OH_YOON_MEMORIAL_PATH } from '@/content/events/oh-yoon-memorial';

export type EventNotifyType = 'payment_confirmed' | 'waitlist' | 'waitlist_payment';

export interface EventNotifyData {
  name: string;
  partySize: number;
  amount: number;
  deadline?: string; // waitlist_payment 전용
  paymentUrl?: string; // waitlist_payment 버튼 링크
}

const won = (n: number) => n.toLocaleString('ko-KR');

export const EVENT_ALIMTALK_TEMPLATE_ENV: Record<EventNotifyType, string> = {
  payment_confirmed: 'SOLAPI_KAKAO_TEMPLATE_EVENT_PAYMENT_CONFIRMED',
  waitlist: 'SOLAPI_KAKAO_TEMPLATE_EVENT_WAITLIST',
  waitlist_payment: 'SOLAPI_KAKAO_TEMPLATE_EVENT_WAITLIST_PAYMENT',
};

function eventTemplateId(type: EventNotifyType): string {
  return process.env[EVENT_ALIMTALK_TEMPLATE_ENV[type]] ?? '';
}

/** 알림톡 실패 시 자동대체될 SMS 본문(템플릿 미승인 기간 fallback). 본문은 카카오 템플릿과 동일 톤. */
function buildEventSmsText(type: EventNotifyType, d: EventNotifyData): string {
  switch (type) {
    case 'payment_confirmed':
      return `[씨앗페] ${d.name}님, 오윤 40주기 추도식 신청이 완료되었습니다. (인원 ${d.partySize}명 / 회비 ${won(d.amount)}원 결제완료) 7월 5일(일) 09:30 인사동 수운회관 옆 출발.`;
    case 'waitlist':
      return `[씨앗페] ${d.name}님, 오윤 40주기 추도식 대기 신청이 접수되었습니다. 자리가 나면 순서대로 결제 안내를 드립니다.`;
    case 'waitlist_payment':
      return `[씨앗페] ${d.name}님, 추도식에 자리가 생겼습니다. (인원 ${d.partySize}명 / 회비 ${won(d.amount)}원) ${d.deadline ?? ''}까지 결제하시면 확정됩니다: ${d.paymentUrl ?? ''}`;
  }
}

export function buildEventAlimTalkVariables(
  type: EventNotifyType,
  d: EventNotifyData
): Record<string, string> {
  switch (type) {
    case 'payment_confirmed':
      return { '#{name}': d.name, '#{partySize}': String(d.partySize), '#{amount}': won(d.amount) };
    case 'waitlist':
      return { '#{name}': d.name };
    case 'waitlist_payment':
      return {
        '#{name}': d.name,
        '#{partySize}': String(d.partySize),
        '#{amount}': won(d.amount),
        '#{deadline}': d.deadline ?? '',
      };
  }
}

/** 행사 알림톡(우선) → 미승인/미설정 시 SMS 자동대체. never throw. */
export async function sendEventSms(
  phone: string | null | undefined,
  type: EventNotifyType,
  data: EventNotifyData,
  orderNo?: string
): Promise<{ ok: boolean; skipped: boolean }> {
  try {
    const to = normalizeKoreanMobile(phone);
    if (!to) return { ok: false, skipped: true };
    const text = buildEventSmsText(type, data);
    const templateId = eventTemplateId(type);
    const useAlimTalk = templateId.length > 0 && Boolean(process.env.SOLAPI_KAKAO_PF_ID);

    let buttons: KakaoButton[] | undefined;
    if (type === 'waitlist_payment' && data.paymentUrl) {
      buttons = [
        {
          buttonType: 'WL',
          buttonName: '결제하기',
          linkMo: data.paymentUrl,
          linkPc: data.paymentUrl,
        },
      ];
    }

    const result = useAlimTalk
      ? await sendSolapiAlimTalk({
          to,
          text,
          templateId,
          variables: buildEventAlimTalkVariables(type, data),
          buttons,
        })
      : await sendSolapiSms({ to, text });

    try {
      const admin = createSupabaseAdminClient();
      await admin.from('sms_logs').insert({
        order_no: orderNo ?? null,
        to_phone: to,
        type: `event_${type}`,
        provider: useAlimTalk ? 'kakao' : 'solapi',
        provider_message_id: result.messageId ?? null,
        status: result.ok ? 'sent' : 'failed',
        segment: result.segment ?? null,
        error: result.ok ? null : (result.error ?? 'unknown'),
      });
    } catch (e) {
      console.error(`[event-sms:${type}] log insert failed:`, e);
    }
    return { ok: result.ok, skipped: false };
  } catch (err) {
    console.error(`[event-sms:${type}] failed:`, err);
    return { ok: false, skipped: false };
  }
}

const EVENT_EMAIL_SUBJECTS: Record<EventNotifyType, string> = {
  payment_confirmed: '[씨앗페] 오윤 40주기 추도식 신청이 완료되었습니다',
  waitlist: '[씨앗페] 오윤 40주기 추도식 대기 신청 접수',
  waitlist_payment: '[씨앗페] 오윤 40주기 추도식 좌석 안내',
};

/** 행사 이메일(이메일 입력 시에만). never throw. */
export async function sendEventEmail(
  to: string | null | undefined,
  type: EventNotifyType,
  data: EventNotifyData
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !to) return;
  try {
    let el: React.ReactElement;
    if (type === 'payment_confirmed') el = React.createElement(EventPaymentConfirmedEmail, data);
    else if (type === 'waitlist') el = React.createElement(EventWaitlistEmail, data);
    else el = React.createElement(EventWaitlistPaymentEmail, data);
    const html = await render(el);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: EVENT_EMAIL_SUBJECTS[type], html }),
    });
    if (!res.ok) console.error(`[event-email:${type}] resend ${res.status}`);
  } catch (err) {
    console.error(`[event-email:${type}] failed:`, err);
  }
}

void OH_YOON_MEMORIAL_PATH; // (paymentUrl 구성은 호출부에서)
```

> **참고:** `normalizeKoreanMobile` 실제 경로는 `lib/sms/buyer-sms.ts`의 import를 grep해 확인하고 동일 경로로 맞출 것. `sms_logs.type` 컬럼이 enum이면 `event_*` 값 허용 여부 확인 — enum이면 migration에 값 추가 또는 free-text 컬럼 확인.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- event-notify`
Expected: PASS

- [ ] **Step 5: 커밋** (emails 미작성이면 Task 5와 합쳐 커밋)

```bash
git add lib/events/notify.ts __tests__/lib/event-notify.test.ts
git commit -m "feat(event): 행사 알림톡/이메일 발송 래퍼

요약: 추도식 신청확인·대기·결제안내 발송 래퍼(알림톡+SMS fallback+이메일)"
```

---

## Task 5: React Email 컴포넌트 3종

`emails/payment-confirmed.tsx` + `emails/_components/saf-email-layout.tsx`/`order-info-table.tsx`를 미러링.

**Files:**

- Create: `emails/event-payment-confirmed.tsx`, `emails/event-waitlist.tsx`, `emails/event-waitlist-payment.tsx`

- [ ] **Step 1: 신청확인 이메일**

```tsx
// emails/event-payment-confirmed.tsx
import { Section, Text } from '@react-email/components';
import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';

export interface EventPaymentConfirmedProps {
  name: string;
  partySize: number;
  amount: number;
}

export default function EventPaymentConfirmedEmail({
  name,
  partySize,
  amount,
}: EventPaymentConfirmedProps) {
  const rows = [
    { label: '신청자', value: `${name}님` },
    { label: '인원', value: `${partySize}명` },
    { label: '회비', value: `${amount.toLocaleString('ko-KR')}원 (결제완료)`, bold: true },
    { label: '일시', value: '2026년 7월 5일(일) 09:30 출발' },
    { label: '집결', value: '인사동 수운회관 옆' },
  ];
  return (
    <SAFEmailLayout
      headerColor="#1D7A5F"
      headerTitle="[씨앗페] 오윤 40주기 추도식 신청 완료"
      previewText={`${name}님, 추도식 참가 신청이 완료되었습니다.`}
      locale="ko"
    >
      <Text style={{ margin: '0 0 12px', color: '#555E67', fontSize: '15px' }}>
        {name}님, 오윤 40주기 추도식 참가 신청이 완료되었습니다.
      </Text>
      <OrderInfoTable rows={rows} />
      <Section style={{ marginTop: '16px' }}>
        <Text style={{ color: '#555E67', fontSize: '14px' }}>
          일정: 11시 추도식 / 12시 종료 / 13시 30분 점심(인사동 풍류사랑). 당일 안내사항은 추후 다시
          연락드립니다.
        </Text>
      </Section>
    </SAFEmailLayout>
  );
}
```

- [ ] **Step 2: 대기등록 이메일**

```tsx
// emails/event-waitlist.tsx
import { Text } from '@react-email/components';
import SAFEmailLayout from './_components/saf-email-layout';

export interface EventWaitlistProps {
  name: string;
  partySize: number;
  amount: number;
}

export default function EventWaitlistEmail({ name }: EventWaitlistProps) {
  return (
    <SAFEmailLayout
      headerColor="#1D7A5F"
      headerTitle="[씨앗페] 오윤 40주기 추도식 대기 신청 접수"
      previewText={`${name}님, 대기자로 등록되었습니다.`}
      locale="ko"
    >
      <Text style={{ color: '#555E67', fontSize: '15px' }}>
        {name}님, 현재 버스 정원이 마감되어 대기자로 등록되었습니다. 취소 등으로 자리가 나면 신청
        순서대로 결제 안내를 드립니다. 신청해 주셔서 감사합니다.
      </Text>
    </SAFEmailLayout>
  );
}
```

- [ ] **Step 3: 대기자 결제안내 이메일**

```tsx
// emails/event-waitlist-payment.tsx
import { Section, Text, Button } from '@react-email/components';
import SAFEmailLayout from './_components/saf-email-layout';

export interface EventWaitlistPaymentProps {
  name: string;
  partySize: number;
  amount: number;
  deadline?: string;
  paymentUrl?: string;
}

export default function EventWaitlistPaymentEmail({
  name,
  partySize,
  amount,
  deadline,
  paymentUrl,
}: EventWaitlistPaymentProps) {
  return (
    <SAFEmailLayout
      headerColor="#1D7A5F"
      headerTitle="[씨앗페] 오윤 40주기 추도식 좌석 안내"
      previewText={`${name}님, 추도식에 자리가 생겼습니다.`}
      locale="ko"
    >
      <Text style={{ color: '#555E67', fontSize: '15px' }}>
        {name}님, 대기 신청하신 추도식에 자리가 생겼습니다. 인원 {partySize}명 / 회비{' '}
        {amount.toLocaleString('ko-KR')}원.
        {deadline ? ` ${deadline}까지 ` : ' '}아래 버튼에서 결제하시면 참가가 확정됩니다.
      </Text>
      {paymentUrl && (
        <Section style={{ marginTop: '16px', textAlign: 'center' }}>
          <Button
            href={paymentUrl}
            style={{
              background: '#0E4ECF',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '15px',
            }}
          >
            결제하기
          </Button>
        </Section>
      )}
    </SAFEmailLayout>
  );
}
```

> **검증:** `OrderInfoTable`의 row 타입(`{label,value,bold?}`)이 실제 정의와 일치하는지 `emails/_components/order-info-table.tsx`를 열어 확인.

- [ ] **Step 4: 타입체크 + 커밋**

```bash
npm run type-check   # PASS
git add emails/event-*.tsx
git commit -m "feat(event): 추도식 이메일 템플릿 3종 (React Email)

요약: 신청확인·대기등록·대기자결제안내 이메일 컴포넌트"
```

---

## Task 6: 공개 신청 server action

`app/actions/petition.ts` 구조 복제(validate → rate-limit → admin RPC → 결과 반환). 단 발송은 결제 confirm 시점(Task 7)에 하므로, pending은 결제창으로 보내고, waitlist는 즉시 발송.

**Files:**

- Create: `app/actions/event-registration.ts`
- Test: `__tests__/lib/event-registration.test.ts`

- [ ] **Step 1: 검증 단위 테스트**

```typescript
// __tests__/lib/event-registration.test.ts
import { describe, it, expect } from 'vitest';
import { validateEventInput } from '@/app/actions/event-registration';

describe('validateEventInput', () => {
  const base = {
    applicantName: '홍길동',
    phone: '010-1234-5678',
    email: '',
    partySize: 1,
    boardingConfirmed: true,
    agreedPrivacy: true,
  };
  it('정상 입력은 에러 없음', () => {
    expect(Object.keys(validateEventInput(base))).toHaveLength(0);
  });
  it('이름 누락 에러', () => {
    expect(validateEventInput({ ...base, applicantName: '' }).applicantName).toBeTruthy();
  });
  it('동의 누락 에러', () => {
    expect(validateEventInput({ ...base, agreedPrivacy: false }).agreedPrivacy).toBeTruthy();
  });
  it('party_size 범위 에러', () => {
    expect(validateEventInput({ ...base, partySize: 0 }).partySize).toBeTruthy();
    expect(validateEventInput({ ...base, partySize: 21 }).partySize).toBeTruthy();
  });
  it('이메일 형식 오류(입력 시)', () => {
    expect(validateEventInput({ ...base, email: 'bad' }).email).toBeTruthy();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- event-registration`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: action 구현**

```typescript
// app/actions/event-registration.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { getRequestMetadata } from './request-metadata';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import {
  OH_YOON_MEMORIAL_SLUG,
  OH_YOON_MEMORIAL_PATH,
  OH_YOON_MEMORIAL_HOLD_MINUTES,
} from '@/content/events/oh-yoon-memorial';

export interface RegisterEventInput {
  applicantName: string;
  phone: string;
  email: string;
  partySize: number;
  boardingConfirmed: boolean;
  agreedPrivacy: boolean;
}

export type RegisterEventCode =
  | 'OK_PENDING'
  | 'OK_WAITLIST'
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'EVENT_CLOSED'
  | 'INTERNAL_ERROR';

export interface RegisterEventResult {
  ok: boolean;
  code: RegisterEventCode;
  errors?: Partial<Record<keyof RegisterEventInput, string>>;
  message?: string;
  // pending일 때 결제 진행용
  payment?: { orderNo: string; amount: number; orderName: string };
}

export function validateEventInput(
  input: RegisterEventInput
): NonNullable<RegisterEventResult['errors']> {
  const errors: NonNullable<RegisterEventResult['errors']> = {};
  if (!input.applicantName?.trim() || input.applicantName.trim().length > 100)
    errors.applicantName = '이름을 입력해 주세요.';
  if (!/^[0-9\-+\s]{9,20}$/.test((input.phone ?? '').trim()))
    errors.phone = '연락 가능한 휴대폰 번호를 입력해 주세요.';
  if (input.email && input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    errors.email = '이메일 형식이 올바르지 않습니다.';
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > 20)
    errors.partySize = '인원수를 확인해 주세요.';
  if (!input.agreedPrivacy) errors.agreedPrivacy = '개인정보 수집·이용 동의가 필요합니다.';
  return errors;
}

export async function registerEvent(input: RegisterEventInput): Promise<RegisterEventResult> {
  const errors = validateEventInput(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, code: 'INVALID_INPUT', errors, message: '입력을 확인해 주세요.' };
  }

  const meta = await getRequestMetadata();
  const ipKey = meta.ip ?? 'unknown-ip';
  const limit = await rateLimit(`event:register:${ipKey}`, { limit: 5, windowMs: 60_000 });
  if (!limit.success)
    return { ok: false, code: 'RATE_LIMITED', message: '잠시 후 다시 시도해 주세요.' };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('register_event_seat', {
    p_payload: {
      event_slug: OH_YOON_MEMORIAL_SLUG,
      applicant_name: input.applicantName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() ?? '',
      party_size: input.partySize,
      boarding_confirmed: input.boardingConfirmed,
      agreed_privacy: input.agreedPrivacy,
      hold_minutes: OH_YOON_MEMORIAL_HOLD_MINUTES,
      user_agent: meta.userAgent ?? null,
      ip_hash: meta.ipHash ?? null, // getRequestMetadata가 제공하는 필드명에 맞춤
    },
  });

  if (error) {
    console.error('[event-register] rpc error:', error);
    return { ok: false, code: 'INTERNAL_ERROR', message: '신청 처리 중 오류가 발생했습니다.' };
  }

  const r = data as {
    ok: boolean;
    code?: string;
    status?: string;
    order_no?: string;
    amount?: number;
  };
  if (!r.ok) {
    if (r.code === 'EVENT_CLOSED' || r.code === 'EVENT_NOT_FOUND') {
      return { ok: false, code: 'EVENT_CLOSED', message: '신청이 마감되었습니다.' };
    }
    return { ok: false, code: 'INTERNAL_ERROR', message: '신청 처리 중 오류가 발생했습니다.' };
  }

  revalidatePath(OH_YOON_MEMORIAL_PATH);
  revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);

  if (r.status === 'waitlist') {
    // 대기자는 즉시 안내 (무료)
    void sendEventSms(input.phone, 'waitlist', {
      name: input.applicantName.trim(),
      partySize: input.partySize,
      amount: r.amount ?? 0,
    });
    if (input.email?.trim())
      void sendEventEmail(input.email.trim(), 'waitlist', {
        name: input.applicantName.trim(),
        partySize: input.partySize,
        amount: r.amount ?? 0,
      });
    return { ok: true, code: 'OK_WAITLIST', message: '대기자로 등록되었습니다.' };
  }

  // pending → 결제창으로
  return {
    ok: true,
    code: 'OK_PENDING',
    payment: { orderNo: r.order_no!, amount: r.amount!, orderName: '오윤 40주기 추도식 회비' },
  };
}
```

> **검증:** `getRequestMetadata()`가 반환하는 필드명(`ip`/`userAgent`/`ipHash`)을 `app/actions/request-metadata.ts`에서 확인하고 맞출 것.

- [ ] **Step 4: 테스트 통과 + 커밋**

Run: `npm test -- event-registration` → PASS

```bash
git add app/actions/event-registration.ts __tests__/lib/event-registration.test.ts
git commit -m "feat(event): 공개 신청 server action (좌석예약+대기자)

요약: registerEvent — 검증·rate-limit·좌석RPC·대기자 즉시 발송"
```

---

## Task 7: 행사 결제 confirm 라우트

`app/api/payments/toss/confirm/route.ts`를 단순화해 행사 전용으로. 토스 `confirmPayment`(`lib/integrations/toss`)와 `confirm_event_registration` RPC 사용.

**Files:**

- Create: `app/api/payments/event/confirm/route.ts`

- [ ] **Step 1: 라우트 구현**

```typescript
// app/api/payments/event/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm'; // 실제 export 경로 확인
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import { notifyEmail } from '@/lib/notify';
import { OH_YOON_MEMORIAL_PATH } from '@/content/events/oh-yoon-memorial';

export async function POST(req: NextRequest) {
  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || typeof amount !== 'number') {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: reg, error: regErr } = await supabase
    .from('event_registrations')
    .select('id, applicant_name, phone, email, party_size, amount, status, order_no')
    .eq('order_no', orderId)
    .single();
  if (regErr || !reg)
    return NextResponse.json({ error: 'registration_not_found' }, { status: 404 });

  // 금액 검증
  if (reg.amount !== amount)
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });

  // 이미 확정?
  if (reg.status === 'confirmed') {
    return NextResponse.json({ success: true, alreadyConfirmed: true });
  }

  // 토스 승인
  const confirmResult = await confirmPayment(
    { paymentKey, orderId, amount },
    `event-confirm-${orderId}`,
    'domestic'
  );
  if (!confirmResult.success) {
    void notifyEmail('error', '추도식 결제 승인 실패', {
      주문번호: orderId,
      에러: confirmResult.error?.message ?? '',
    });
    return NextResponse.json({ error: 'payment_confirmation_failed' }, { status: 400 });
  }
  const toss = confirmResult.data;

  // 좌석 확정(원자적, hold 만료 시 재확인)
  const { data: confirmData, error: confErr } = await supabase.rpc('confirm_event_registration', {
    p_order_no: orderId,
    p_payment_key: toss.paymentKey,
    p_amount: amount,
  });
  const c = confirmData as { ok: boolean; code?: string } | null;

  if (confErr || !c?.ok) {
    // 좌석 초과(SOLD_OUT) 등 → 자동 환불
    if (c?.code === 'SOLD_OUT') {
      const { cancelPayment } = await import('@/lib/integrations/toss/cancel');
      try {
        await cancelPayment(
          toss.paymentKey,
          { cancelReason: '정원 초과 — 자동 환불' },
          `event-refund-${orderId}`,
          'domestic'
        );
      } catch (e) {
        console.error('[event-confirm] auto-refund failed:', e);
      }
      await supabase
        .from('event_registrations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('order_no', orderId);
      return NextResponse.json({ error: 'sold_out_refunded' }, { status: 409 });
    }
    return NextResponse.json({ error: 'confirm_failed' }, { status: 400 });
  }

  revalidatePath(OH_YOON_MEMORIAL_PATH);
  revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);

  // 발송 (fire-and-forget)
  void notifyEmail('payment', '추도식 결제 완료', {
    신청자: reg.applicant_name,
    인원: String(reg.party_size),
    금액: String(reg.amount),
  });
  void sendEventSms(
    reg.phone,
    'payment_confirmed',
    { name: reg.applicant_name, partySize: reg.party_size, amount: reg.amount },
    orderId
  );
  if (reg.email)
    void sendEventEmail(reg.email, 'payment_confirmed', {
      name: reg.applicant_name,
      partySize: reg.party_size,
      amount: reg.amount,
    });

  return NextResponse.json({ success: true });
}
```

> **검증:** `confirmPayment`/`cancelPayment`의 실제 시그니처·import 경로를 `app/api/payments/toss/confirm/route.ts`의 import에서 확인해 정확히 맞출 것. 토스 응답 타입(`toss.paymentKey` 등) 동일.

- [ ] **Step 2: 타입체크 + 커밋**

```bash
npm run type-check   # PASS
git add app/api/payments/event/confirm/route.ts
git commit -m "feat(event): 행사 결제 confirm 라우트 (좌석확정+발송)

요약: 토스 승인→좌석확정 RPC→초과시 자동환불→알림톡/이메일"
```

---

## Task 8: 공개 페이지 + i18n 메시지

**Files:**

- Create: `app/[locale]/event/oh-yoon-memorial/page.tsx`
- Modify: `messages/ko.json`, `messages/en.json` (`event.ohYoonMemorial` 네임스페이스)

- [ ] **Step 1: i18n 메시지 추가**

`messages/ko.json`과 `messages/en.json` 양쪽에 `event.ohYoonMemorial` 키를 추가. 최소 키 집합(양쪽 locale 동일 키):

```jsonc
// event.ohYoonMemorial
{
  "metaTitle": "오윤 40주기 추도식 참가 신청",
  "metaDescription": "2026년 7월 5일 오윤 40주기 추도식. 인사동 출발 버스 동행 신청.",
  "heroTitle": "오윤 40주기 추도식",
  "heroSubtitle": "2026년 7월 5일(일) · 인사동 출발",
  "heroCta": "참가 신청하기",
  "scheduleTitle": "당일 일정",
  "schedule.depart": "인사동 수운회관 옆 출발",
  "schedule.ceremony": "추도식 진행",
  "schedule.end": "추도식 종료",
  "schedule.lunch": "인사동 풍류사랑(구 낭만) 점심",
  "feeNotice": "회비 1인 30,000원 · 45인승 버스 1대 선착순",
  "seatRemaining": "잔여 {remaining}석",
  "seatClosed": "정원이 마감되었습니다 (대기 신청 가능)",
  "formNameLabel": "성함",
  "formPhoneLabel": "휴대폰 번호",
  "formEmailLabel": "이메일",
  "formEmailHelp": "결제 영수증·안내를 받으시려면 입력해 주세요 (선택)",
  "formPartySizeLabel": "참가 인원 (본인 포함)",
  "formBoardingLabel": "인사동 수운회관 옆 09:30 출발 탑승에 동의합니다",
  "formPrivacyLabel": "개인정보 수집·이용에 동의합니다 (필수)",
  "formFeeSummary": "회비 합계: {amount}원",
  "submitPay": "회비 결제하고 신청",
  "submitWaitlist": "대기 신청하기",
  "submitting": "처리 중...",
  "waitlistTitle": "대기자로 등록되었습니다",
  "waitlistBody": "자리가 나면 신청 순서대로 결제 안내를 드립니다.",
  "errorGeneric": "신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  "faqTitle": "자주 묻는 질문",
}
```

> en.json은 동일 키에 영문 값. `verify:i18n-placeholders`가 `{remaining}`/`{amount}` ICU 플레이스홀더 양쪽 일치를 검사하므로 동일 변수명 유지.

- [ ] **Step 2: 페이지 구현**

```tsx
// app/[locale]/event/oh-yoon-memorial/page.tsx
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import Section from '@/components/ui/Section';
import { createStandardPageMetadata } from '@/lib/seo-utils'; // 실제 헬퍼명 확인
import { OH_YOON_MEMORIAL_SLUG, OH_YOON_MEMORIAL_PATH } from '@/content/events/oh-yoon-memorial';
import RegistrationForm from './_components/RegistrationForm';
import SeatStatusBar from './_components/SeatStatusBar';
import EventSchedule from './_components/EventSchedule';
import EventFAQ from './_components/EventFAQ';

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

function resolveLocale(raw: string): 'ko' | 'en' {
  return raw === 'en' ? 'en' : 'ko';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'event.ohYoonMemorial' });
  return createStandardPageMetadata(
    t('metaTitle'),
    t('metaDescription'),
    `https://www.saf2026.com${OH_YOON_MEMORIAL_PATH}`,
    OH_YOON_MEMORIAL_PATH,
    locale
  );
}

async function fetchSeatStatus() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.rpc('event_seat_status', { p_slug: OH_YOON_MEMORIAL_SLUG });
  return data as {
    found: boolean;
    capacity: number;
    occupied: number;
    remaining: number;
    is_open: boolean;
    fee_per_person: number;
  };
}

export default async function OhYoonMemorialEventPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'event.ohYoonMemorial' });
  const seat = await fetchSeatStatus();

  return (
    <main className="bg-canvas text-pretty">
      <section className="relative isolate overflow-hidden pt-28 md:pt-36 pb-20 bg-charcoal-deep text-white">
        <div className="relative container-max text-center max-w-3xl mx-auto px-4">
          <h1 className="font-display font-black text-4xl md:text-6xl">{t('heroTitle')}</h1>
          <p className="mt-4 text-lg md:text-xl opacity-90">{t('heroSubtitle')}</p>
          <p className="mt-2 text-sun font-semibold">{t('feeNotice')}</p>
          <SeatStatusBar remaining={seat?.remaining ?? 0} isOpen={seat?.is_open ?? false} />
        </div>
      </section>

      <Section variant="white" className="py-16 md:py-20">
        <EventSchedule />
      </Section>

      <Section variant="canvas" className="py-16 md:py-20">
        <div className="max-w-xl mx-auto">
          <RegistrationForm
            isOpen={seat?.is_open ?? false}
            remaining={seat?.remaining ?? 0}
            feePerPerson={seat?.fee_per_person ?? 30000}
          />
        </div>
      </Section>

      <Section variant="white" className="py-16 md:py-20">
        <EventFAQ />
      </Section>
    </main>
  );
}
```

> **검증:** `Section` import 경로·`variant` 값, `createStandardPageMetadata` 시그니처를 청원 페이지에서 확인. hero는 청원 hero 패턴 복제. `bg-primary`+small text 금지 규칙 준수.

- [ ] **Step 3: 빌드 확인 + 커밋**

```bash
npm run type-check   # PASS
git add app/[locale]/event messages/ko.json messages/en.json
git commit -m "feat(event): 추도식 공개 페이지 + i18n 메시지

요약: 추도식 신청 페이지(hero/일정/폼/FAQ) + ko/en 메시지"
```

---

## Task 9: 신청 폼 + 토스 결제 시작 (클라이언트)

`SignForm.tsx` + `CheckoutClient.tsx`의 결제 시작 패턴 결합.

**Files:**

- Create: `app/[locale]/event/oh-yoon-memorial/_components/RegistrationForm.tsx`

- [ ] **Step 1: 폼 구현**

```tsx
// _components/RegistrationForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import {
  registerEvent,
  type RegisterEventInput,
  type RegisterEventResult,
} from '@/app/actions/event-registration';

const INPUT_BASE =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-charcoal-deep focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100';
const LABEL_BASE = 'block text-sm font-semibold text-charcoal-deep mb-1.5';
const ERROR_TEXT = 'mt-1.5 text-sm text-danger';

export default function RegistrationForm({
  isOpen,
  remaining,
  feePerPerson,
}: {
  isOpen: boolean;
  remaining: number;
  feePerPerson: number;
}) {
  const t = useTranslations('event.ohYoonMemorial');
  const [applicantName, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [boardingConfirmed, setBoarding] = useState(false);
  const [agreedPrivacy, setAgreed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RegisterEventResult | null>(null);

  const amount = partySize * feePerPerson;
  const canSeat = isOpen && remaining >= partySize;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const res = await registerEvent({
        applicantName,
        phone,
        email,
        partySize,
        boardingConfirmed,
        agreedPrivacy,
      });
      setResult(res);
      if (res.ok && res.code === 'OK_PENDING' && res.payment) {
        await startTossPayment(res.payment);
      }
    });
  }

  async function startTossPayment(payment: { orderNo: string; amount: number; orderName: string }) {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!; // checkout과 동일 env 확인
    const successUrl = `${window.location.origin}/event/oh-yoon-memorial/success`;
    const failUrl = `${window.location.origin}/event/oh-yoon-memorial/fail`;
    const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
    const tossPayments = await loadTossPayments(clientKey);
    const tossPayment = tossPayments.payment({ customerKey: payment.orderNo });
    await tossPayment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: payment.amount },
      orderId: payment.orderNo,
      orderName: payment.orderName,
      successUrl,
      failUrl,
    });
  }

  if (result?.ok && result.code === 'OK_WAITLIST') {
    return (
      <div
        className="rounded-xl border border-primary/30 bg-white px-6 py-10 text-center"
        role="status"
      >
        <h3 className="font-display font-bold text-2xl text-charcoal-deep">{t('waitlistTitle')}</h3>
        <p className="mt-3 text-charcoal">{t('waitlistBody')}</p>
      </div>
    );
  }

  const err = (k: keyof RegisterEventInput) =>
    result && !result.ok ? result.errors?.[k] : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-xl bg-white p-6 md:p-8 shadow-sm border border-gray-200"
    >
      <div>
        <label htmlFor="ev-name" className={LABEL_BASE}>
          {t('formNameLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="ev-name"
          type="text"
          value={applicantName}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          className={INPUT_BASE}
        />
        {err('applicantName') && <p className={ERROR_TEXT}>{err('applicantName')}</p>}
      </div>
      <div>
        <label htmlFor="ev-phone" className={LABEL_BASE}>
          {t('formPhoneLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="ev-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={30}
          required
          placeholder="010-1234-5678"
          className={INPUT_BASE}
        />
        {err('phone') && <p className={ERROR_TEXT}>{err('phone')}</p>}
      </div>
      <div>
        <label htmlFor="ev-email" className={LABEL_BASE}>
          {t('formEmailLabel')}
        </label>
        <input
          id="ev-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          className={INPUT_BASE}
        />
        <p className="mt-1.5 text-xs text-charcoal-muted">{t('formEmailHelp')}</p>
        {err('email') && <p className={ERROR_TEXT}>{err('email')}</p>}
      </div>
      <div>
        <label htmlFor="ev-party" className={LABEL_BASE}>
          {t('formPartySizeLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="ev-party"
          type="number"
          min={1}
          max={20}
          value={partySize}
          onChange={(e) => setPartySize(Math.max(1, Number(e.target.value) || 1))}
          required
          className={INPUT_BASE}
        />
        {err('partySize') && <p className={ERROR_TEXT}>{err('partySize')}</p>}
      </div>
      <div className="flex items-start gap-3 rounded-lg bg-canvas p-4">
        <input
          id="ev-boarding"
          type="checkbox"
          checked={boardingConfirmed}
          onChange={(e) => setBoarding(e.target.checked)}
          className="mt-1 h-4 w-4 rounded"
        />
        <label htmlFor="ev-boarding" className="text-sm text-charcoal break-keep">
          {t('formBoardingLabel')}
        </label>
      </div>
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
        <label className="flex items-start gap-3 text-sm text-charcoal break-keep cursor-pointer">
          <input
            type="checkbox"
            checked={agreedPrivacy}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded"
            required
          />
          <span>{t('formPrivacyLabel')}</span>
        </label>
        {err('agreedPrivacy') && <p className={ERROR_TEXT}>{err('agreedPrivacy')}</p>}
      </fieldset>

      <p className="text-right text-sm font-semibold text-charcoal-deep">
        {t('formFeeSummary', { amount: amount.toLocaleString('ko-KR') })}
      </p>

      {result && !result.ok && result.message && (
        <p
          role="alert"
          className="rounded-lg border-2 border-danger/40 bg-white px-4 py-3 text-sm text-danger-a11y"
        >
          {result.message}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? t('submitting') : canSeat ? t('submitPay') : t('submitWaitlist')}
      </Button>
    </form>
  );
}
```

> **검증:** 토스 client key env명(`NEXT_PUBLIC_TOSS_CLIENT_KEY` 등)과 `requestPayment` 인자 형식을 `CheckoutClient.tsx`에서 정확히 확인(통합결제창 옵션 포함). `Button` import 경로 확인.

- [ ] **Step 2: 타입체크 + 커밋**

```bash
npm run type-check   # PASS
git add app/[locale]/event/oh-yoon-memorial/_components/RegistrationForm.tsx
git commit -m "feat(event): 신청 폼 + 토스 결제 시작 클라이언트

요약: 인원/정보/동의 입력, pending→토스 결제창, waitlist→완료화면"
```

---

## Task 10: 상태바 · 일정 · FAQ 컴포넌트

**Files:**

- Create: `_components/SeatStatusBar.tsx`, `_components/EventSchedule.tsx`, `_components/EventFAQ.tsx`

- [ ] **Step 1: SeatStatusBar**

```tsx
// _components/SeatStatusBar.tsx
'use client';
import { useTranslations } from 'next-intl';
export default function SeatStatusBar({
  remaining,
  isOpen,
}: {
  remaining: number;
  isOpen: boolean;
}) {
  const t = useTranslations('event.ohYoonMemorial');
  return (
    <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2">
      <span className="text-base font-semibold">
        {isOpen ? t('seatRemaining', { remaining }) : t('seatClosed')}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: EventSchedule** (상수 `OH_YOON_MEMORIAL_SCHEDULE` + 메시지 라벨)

```tsx
// _components/EventSchedule.tsx
import { getTranslations } from 'next-intl/server';
import { OH_YOON_MEMORIAL_SCHEDULE } from '@/content/events/oh-yoon-memorial';
export default async function EventSchedule() {
  const t = await getTranslations('event.ohYoonMemorial');
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="font-display font-bold text-2xl text-charcoal-deep mb-6">
        {t('scheduleTitle')}
      </h2>
      <ol className="space-y-3">
        {OH_YOON_MEMORIAL_SCHEDULE.map((s) => (
          <li key={s.key} className="flex gap-4">
            <span className="font-semibold text-primary-strong tabular-nums">{s.time}</span>
            <span className="text-charcoal">{t(`schedule.${s.key}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

> `EventSchedule`은 server component(async) — page에서 `<EventSchedule />` 직접 호출. 만약 client 트리 안에 둘 필요가 생기면 메시지를 props로 내려줄 것.

- [ ] **Step 3: EventFAQ** (간단 정적 — 메시지 기반 Q/A 1~3개; CLAUDE.md 표준 컴포넌트 있으면 재사용)

```tsx
// _components/EventFAQ.tsx
import { getTranslations } from 'next-intl/server';
export default async function EventFAQ() {
  const t = await getTranslations('event.ohYoonMemorial');
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="font-display font-bold text-2xl text-charcoal-deep mb-6">{t('faqTitle')}</h2>
      {/* Q/A 항목은 메시지 키 faqQ1/faqA1 ... 추가해 매핑. 기존 FAQ 컴포넌트(있으면) 재사용 */}
    </div>
  );
}
```

> FAQ Q/A 메시지 키(`faqQ1`,`faqA1`,…)를 Task 8 메시지에 함께 추가. 회비 환불/취소, 탑승 장소, 점심 포함 여부 등 3~4개.

- [ ] **Step 4: 타입체크 + 커밋**

```bash
npm run type-check   # PASS
git add app/[locale]/event/oh-yoon-memorial/_components/
git commit -m "feat(event): 잔여석 상태바·일정·FAQ 컴포넌트"
```

---

## Task 11: 결제 성공/실패 랜딩

`app/[locale]/checkout/[artworkId]/success` 패턴 복제. **server searchParams 금지, window.location.search 사용.**

**Files:**

- Create: `success/page.tsx`, `success/SuccessClient.tsx`, `fail/page.tsx`, `fail/FailClient.tsx`

- [ ] **Step 1: success/page.tsx**

```tsx
// app/[locale]/event/oh-yoon-memorial/success/page.tsx
import type { Metadata } from 'next';
import SuccessClient from './SuccessClient';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Page() {
  return <SuccessClient />;
}
```

- [ ] **Step 2: SuccessClient.tsx**

```tsx
// success/SuccessClient.tsx
'use client';
import { useEffect, useState } from 'react';
export default function SuccessClient() {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const paymentKey = p.get('paymentKey');
    const orderId = p.get('orderId');
    const amount = Number(p.get('amount'));
    if (!paymentKey || !orderId || !amount) {
      setState('error');
      return;
    }
    fetch('/api/payments/event/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then((r) => r.json())
      .then((d) => setState(d.success ? 'ok' : 'error'))
      .catch(() => setState('error'));
  }, []);
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 text-center">
      {state === 'loading' && <p className="text-charcoal">결제 확인 중입니다...</p>}
      {state === 'ok' && (
        <div>
          <h1 className="font-display font-bold text-3xl text-charcoal-deep">
            신청이 완료되었습니다
          </h1>
          <p className="mt-3 text-charcoal">확인 안내를 알림톡(및 이메일)으로 보내드렸습니다.</p>
        </div>
      )}
      {state === 'error' && (
        <div>
          <h1 className="font-display font-bold text-2xl text-charcoal-deep">
            결제 확인에 문제가 있습니다
          </h1>
          <p className="mt-3 text-charcoal">
            잠시 후에도 안내를 받지 못하면 사무국으로 연락 주세요.
          </p>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: fail/page.tsx + FailClient.tsx** (실패 안내 + 재시도 링크 `/event/oh-yoon-memorial`)

```tsx
// fail/page.tsx
import type { Metadata } from 'next';
import FailClient from './FailClient';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Page() {
  return <FailClient />;
}
```

```tsx
// fail/FailClient.tsx
'use client';
export default function FailClient() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display font-bold text-2xl text-charcoal-deep">
          결제가 취소되었습니다
        </h1>
        <p className="mt-3 text-charcoal">다시 시도하시려면 신청 페이지로 돌아가 주세요.</p>
        <a
          href="/event/oh-yoon-memorial"
          className="mt-6 inline-block text-primary-strong font-semibold underline"
        >
          신청 페이지로
        </a>
      </div>
    </main>
  );
}
```

> pending hold(15분)는 만료되면 좌석 자동 반환되므로 실패 시 별도 정리 불필요.

- [ ] **Step 4: 타입체크 + 커밋**

```bash
npm run type-check   # PASS
git add app/[locale]/event/oh-yoon-memorial/success app/[locale]/event/oh-yoon-memorial/fail
git commit -m "feat(event): 결제 성공/실패 랜딩 (window.location.search confirm)"
```

---

## Task 12: Admin 관리 포털

청원 admin(`app/(portal)/admin/petition/oh-yoon/`) 구조 복제. **한국어 고정.**

**Files:**

- Create: `app/(portal)/admin/event/oh-yoon-memorial/page.tsx` + `_components/EventAdminClient.tsx` (탭: 개요/참가자/대기자)
- Create: `app/actions/event-admin.ts`

- [ ] **Step 1: admin action**

```typescript
// app/actions/event-admin.ts
'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import {
  OH_YOON_MEMORIAL_SLUG,
  OH_YOON_MEMORIAL_ADMIN_PATH,
  OH_YOON_MEMORIAL_PATH,
} from '@/content/events/oh-yoon-memorial';

export interface EventAdminResult {
  ok: boolean;
  message?: string;
}

/** 신청 취소(좌석 반환). 결제 환불은 토스 콘솔/별도 — v1은 상태만 cancelled. */
export async function cancelRegistration(id: string): Promise<EventAdminResult> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { error } = await db
    .from('event_registrations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: '취소 실패' };
  revalidatePath(OH_YOON_MEMORIAL_ADMIN_PATH);
  revalidatePath(OH_YOON_MEMORIAL_PATH);
  return { ok: true };
}

/** 대기자에게 결제 안내 발송(좌석은 결제 시 확정). */
export async function sendWaitlistPaymentLink(
  id: string,
  deadlineLabel: string
): Promise<EventAdminResult> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data: reg, error } = await db
    .from('event_registrations')
    .select('applicant_name, phone, email, party_size, amount, status')
    .eq('id', id)
    .single();
  if (error || !reg) return { ok: false, message: '대상 없음' };
  if (reg.status !== 'waitlist') return { ok: false, message: '대기자가 아닙니다' };
  const paymentUrl = `https://www.saf2026.com${OH_YOON_MEMORIAL_PATH}`; // 재신청 유도(또는 전용 결제링크 추후)
  void sendEventSms(reg.phone, 'waitlist_payment', {
    name: reg.applicant_name,
    partySize: reg.party_size,
    amount: reg.amount,
    deadline: deadlineLabel,
    paymentUrl,
  });
  if (reg.email)
    void sendEventEmail(reg.email, 'waitlist_payment', {
      name: reg.applicant_name,
      partySize: reg.party_size,
      amount: reg.amount,
      deadline: deadlineLabel,
      paymentUrl,
    });
  return { ok: true };
}

/** 정원 조정. */
export async function updateCapacity(capacity: number): Promise<EventAdminResult> {
  await requireAdmin();
  if (!Number.isInteger(capacity) || capacity < 0) return { ok: false, message: '정원 값 오류' };
  const db = createSupabaseAdminClient();
  const { error } = await db
    .from('events')
    .update({ capacity, updated_at: new Date().toISOString() })
    .eq('slug', OH_YOON_MEMORIAL_SLUG);
  if (error) return { ok: false, message: '정원 변경 실패' };
  revalidatePath(OH_YOON_MEMORIAL_ADMIN_PATH);
  revalidatePath(OH_YOON_MEMORIAL_PATH);
  return { ok: true };
}

/** CSV: 확정 참가자 명단(버스/점심 예약용). */
export async function exportConfirmedCsv(): Promise<{ ok: boolean; csv?: string }> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('event_registrations')
    .select('applicant_name, phone, email, party_size, amount, paid_at')
    .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
    .eq('status', 'confirmed')
    .order('paid_at', { ascending: true });
  const header = '이름,휴대폰,이메일,인원,회비,결제시각';
  const rows = (data ?? []).map((r) =>
    [r.applicant_name, r.phone, r.email ?? '', r.party_size, r.amount, r.paid_at ?? '']
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(',')
  );
  return { ok: true, csv: [header, ...rows].join('\n') };
}
```

- [ ] **Step 2: admin page + client (탭 UI)**

```tsx
// app/(portal)/admin/event/oh-yoon-memorial/page.tsx
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { OH_YOON_MEMORIAL_SLUG } from '@/content/events/oh-yoon-memorial';
import EventAdminClient from './_components/EventAdminClient';

export const dynamic = 'force-dynamic';

export default async function EventAdminPage() {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const [{ data: seat }, { data: regs }, { data: ev }] = await Promise.all([
    db.rpc('event_seat_status', { p_slug: OH_YOON_MEMORIAL_SLUG }),
    db
      .from('event_registrations')
      .select('id, applicant_name, phone, email, party_size, amount, status, paid_at, created_at')
      .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
      .order('created_at', { ascending: true }),
    db.from('events').select('capacity').eq('slug', OH_YOON_MEMORIAL_SLUG).maybeSingle(),
  ]);
  return <EventAdminClient seat={seat} registrations={regs ?? []} capacity={ev?.capacity ?? 44} />;
}
```

`EventAdminClient.tsx`: 개요(잔여석/확정/대기/총회비) + 참가자 표(상태 배지, 취소 버튼) + 대기자 표(결제안내 발송) + 정원 입력 + CSV 다운로드 버튼. 청원 admin client(`PetitionAdminClient`) 패턴 복제.

- [ ] **Step 3: admin nav 링크 추가**

admin 레이아웃 네비게이션(`app/(portal)/admin/layout.tsx` 등)에 "추도식" 항목 추가 — 청원 링크가 있는 곳에 동일 패턴으로.

- [ ] **Step 4: 타입체크 + 커밋**

```bash
npm run type-check   # PASS
git add app/(portal)/admin/event app/actions/event-admin.ts app/(portal)/admin/layout.tsx
git commit -m "feat(event): admin 추도식 관리(참가자/대기자/정원/CSV)

요약: 개요·참가자·대기자 탭, 취소·결제안내·정원조정·CSV"
```

---

## Task 13: a11y e2e + 최종 검증

**Files:**

- Create: `e2e/a11y/event-oh-yoon-memorial.spec.ts`

- [ ] **Step 1: a11y spec** (`e2e/a11y/`의 기존 spec 1개를 열어 동일 패턴 복제 — axe 검사, ko/en 경로)

```typescript
// e2e/a11y/event-oh-yoon-memorial.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright'; // 기존 spec의 import 방식 확인
for (const path of ['/event/oh-yoon-memorial', '/en/event/oh-yoon-memorial']) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
```

- [ ] **Step 2: 전체 검증**

Run: `npm run lint && npm run type-check && npm test`
Expected: 모두 PASS

- [ ] **Step 3: 빌드 (SSG/SSR 호환)**

Run: `npm run build`
Expected: 성공 (i18n placeholder 검증 통과)

- [ ] **Step 4: 커밋**

```bash
git add e2e/a11y/event-oh-yoon-memorial.spec.ts
git commit -m "test(event): 추도식 페이지 a11y e2e spec"
```

---

## Task 14: 수동 검증 (로컬) + PR

- [ ] **Step 1: 로컬 결제 플로우 수동 검증**

`npm run dev` → `/event/oh-yoon-memorial` 신청 → 토스 테스트 결제 → success 랜딩 → confirm 라우트 → `event_registrations` status=confirmed 확인 (Supabase MCP `execute_sql`로 조회). 정원을 작게(예: 1) 임시 조정해 waitlist 분기도 확인 후 복구.

- [ ] **Step 2: 알림톡/이메일 발송 확인**

심사 승인 전이면 SMS fallback 동작 확인(로그 `sms_logs`). 승인 후 production env에 templateId 3개 등록.

- [ ] **Step 3: PR 생성 + 머지**

```bash
git push -u origin worktree-oh-yoon-memorial
gh pr create --title "feat(event): 오윤 40주기 추도식 신청 페이지" --body "..."
# 검토 후
gh pr merge --merge
```

---

## Self-Review (작성자 점검 결과)

**Spec 커버리지:** §1 상수(Task1) · §4 스키마/RPC(Task2-3) · §5 결제흐름(Task7,9,11) · §6 대기자(Task6,12) · §7 admin(Task12) · §8 알림톡+이메일(Task4-5) · §9 디자인규칙(Task8-10) · §10 엣지케이스(Task2 RPC, Task7 자동환불) · §11 테스트(Task4,6,13) — 모두 태스크 존재.

**플레이스홀더:** 코드 블록은 전부 구체 구현. "검증" 노트는 의도적(기존 시그니처 대조 지점) — TODO 아님.

**타입 일관성:** `EventNotifyType`/`EVENT_ALIMTALK_TEMPLATE_ENV`/`sendEventSms`/`sendEventEmail`(Task4) ↔ Task7,12 호출 일치. `RegisterEventResult.code`(`OK_PENDING`/`OK_WAITLIST`)(Task6) ↔ Task9 분기 일치. `register_event_seat`/`confirm_event_registration`/`event_seat_status`(Task2) ↔ action/route/page 호출 일치.

**미확정(구현 중 grep 확인 필요):** `normalizeKoreanMobile` 경로, `getRequestMetadata` 필드명, `confirmPayment`/`cancelPayment` 시그니처, `NEXT_PUBLIC_TOSS_CLIENT_KEY` env명, `createStandardPageMetadata` 시그니처, `Section`/`Button` import 경로, `sms_logs.type` 컬럼 enum 여부, `OrderInfoTable` row 타입. 각 태스크에 "검증" 노트로 명시.
