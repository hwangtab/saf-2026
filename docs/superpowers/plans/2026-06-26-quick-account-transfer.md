# 토스 퀵계좌이체 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작품 구매·이벤트 등록의 "계좌이체"를 수동 무통장입금에서 토스 퀵계좌이체(`method: 'TRANSFER'`)로 완전 대체해, 카드와 동일하게 즉시 출금 → `DONE` → 자동 `paid` 처리한다.

**Architecture:** `TRANSFER` 선택지를 토스 결제창 우회(`createBankTransferOrder`/`register_event_bank_transfer`)에서 카드와 같은 파이프라인(`createOrder`/`register_event_seat` → `requestPayment({ method: 'TRANSFER' })` → confirm)으로 흡수한다. confirm route는 이미 `DONE→paid` + `method` 기록을 처리하므로 무수정. 신규 무통장 주문 생성부만 제거하고, 관리자 입금확인 UI·RPC·마이그레이션은 안전망으로 유지(조건부 렌더라 자연 비활성).

**Tech Stack:** Next.js 16, TypeScript, @tosspayments/tosspayments-sdk v2, Supabase RPC, next-intl.

## Global Constraints

- domestic MID `saf202i818`, client key는 `clientKey` prop으로 주입 (env `NEXT_PUBLIC_TOSS_DOMESTIC_CLIENT_KEY`).
- en(해외)은 `OverseasCheckoutClient`(PayPal) 별도 컴포넌트 — 본 plan의 ko 컴포넌트 변경과 무관. en 가드 불필요.
- i18n: 공개 라우트는 next-intl 메시지 필수, 한국어 리터럴 직접 사용 금지. admin 포털은 한국어 영구 유지.
- 색상/컴포넌트: `Button variant="primary"`, 브랜드 토큰만 (DESIGN.md). 본 plan은 신규 UI 거의 없음.
- 결제 검증: verify-first — 라이브 수동 스모크 필수 (메모 `feedback_payment_diagnosis_verify`). UI 시각검증은 Playwright 금지, 사용자에게 요청 (메모 `feedback_no_playwright`).
- 커밋 컨벤션: `type(scope): subject` + 본문에 `요약:` 줄 필수.
- 동시작업 환경: 커밋 직후 push, subagent에 git reset/checkout/stash 금지.

---

### Task 1: 작품 단건 — CheckoutClient TRANSFER를 카드 파이프라인으로 통합

**Files:**

- Modify: `app/[locale]/checkout/[artworkId]/CheckoutClient.tsx`

**Interfaces:**

- Consumes: `createOrder` (기존), `requestPayment` (Toss SDK), `PAYMENT_CHOICES`.
- Produces: `PaymentChoiceConfig`에 `tossMethod: 'CARD' | 'TRANSFER'` 필드 추가 (Task 2가 동일 패턴 사용).

- [ ] **Step 1: `PaymentChoiceConfig`에 `tossMethod` 추가하고 `PAYMENT_CHOICES` 갱신**

`PaymentChoiceConfig` 인터페이스(현재 57–64행)에 필드 추가:

```typescript
interface PaymentChoiceConfig {
  value: PaymentChoice;
  labelKey: 'methodCard' | 'methodKakaopay' | 'methodTosspay' | 'methodNaverpay' | 'methodTransfer';
  /** 브랜드 로고 렌더링 식별자 — null이면 텍스트 라벨 사용 */
  brand: KoBrand;
  /** Toss SDK v2 requestPayment의 method. 간편결제 4종은 'CARD'+cardOptions, 퀵계좌이체는 'TRANSFER'. */
  tossMethod: 'CARD' | 'TRANSFER';
  /** Toss SDK v2 자체창 직행 옵션. undefined면 통합결제창 (DEFAULT). */
  cardOptions?: CardOptions;
}
```

`PAYMENT_CHOICES` 배열(현재 124–128행 부근)에서 각 항목에 `tossMethod` 지정. CARD/간편결제는 `'CARD'`, TRANSFER는 `'TRANSFER'`:

```typescript
const PAYMENT_CHOICES: PaymentChoiceConfig[] = [
  { value: 'CARD', labelKey: 'methodCard', brand: null, tossMethod: 'CARD' },
  {
    value: 'KAKAOPAY',
    labelKey: 'methodKakaopay',
    brand: 'kakaopay',
    tossMethod: 'CARD',
    cardOptions: { flowMode: 'DIRECT', easyPay: '카카오페이' },
  },
  {
    value: 'TOSSPAY',
    labelKey: 'methodTosspay',
    brand: 'tosspay',
    tossMethod: 'CARD',
    cardOptions: { flowMode: 'DIRECT', easyPay: '토스페이' },
  },
  {
    value: 'NAVERPAY',
    labelKey: 'methodNaverpay',
    brand: 'naverpay',
    tossMethod: 'CARD',
    cardOptions: { flowMode: 'DIRECT', easyPay: '네이버페이' },
  },
  { value: 'TRANSFER', labelKey: 'methodTransfer', brand: null, tossMethod: 'TRANSFER' },
];
```

(기존 배열의 실제 항목 형태에 맞춰 `tossMethod`만 더한다. cardOptions가 별도 줄에 정의돼 있으면 그 구조 유지.)

- [ ] **Step 2: `handlePayment`의 TRANSFER 우회 분기(235–270행) 삭제**

현재 `if (paymentChoice === 'TRANSFER') { const result = await createBankTransferOrder({...}); ... return; }` 블록 전체(232–270행, 주석 포함)를 삭제한다. 이로써 TRANSFER도 아래 `createOrder` 경로로 흐른다.

- [ ] **Step 3: `requestPayment`의 method를 선택값으로 동적화 (345–355행)**

```typescript
const choice = PAYMENT_CHOICES.find((c) => c.value === paymentChoice);
await payment.requestPayment({
  method: choice?.tossMethod ?? 'CARD',
  amount: { currency: 'KRW', value: serverTotal },
  orderId: orderNo,
  orderName,
  customerName: buyerName,
  customerEmail: buyerEmail,
  successUrl,
  failUrl,
  ...(choice?.cardOptions && { card: choice.cardOptions }),
});
```

- [ ] **Step 4: `createBankTransferOrder` import 제거 (12행)**

```typescript
import { createOrder, cancelPendingOrder } from '@/app/actions/checkout';
```

- [ ] **Step 5: 상단 주석 갱신 (21–33행)**

`* - TRANSFER: Toss 우회 + createBankTransferOrder ...` 줄을 다음으로 교체:

```
 * - TRANSFER: 토스 퀵계좌이체 (method: 'TRANSFER'). 카드와 동일 파이프라인 —
 *   실시간 출금 후 DONE으로 즉시 결제 완료. 가상계좌(WAITING_FOR_DEPOSIT) 아님.
```

- [ ] **Step 6: 타입체크 + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS (TRANSFER 분기 제거로 `createBankTransferOrder` 미사용 경고 없음, `tossMethod` 타입 일치)

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/checkout/[artworkId]/CheckoutClient.tsx"
git commit -m "feat(checkout): route single-item TRANSFER through Toss quick account transfer

요약: 작품 단건 계좌이체를 토스 퀵계좌이체(method TRANSFER)로 전환

- createBankTransferOrder 우회 제거, 카드와 동일 createOrder→requestPayment 경로
- PaymentChoiceConfig.tossMethod로 method 동적 결정"
```

---

### Task 2: 작품 카트 — CartCheckoutClient TRANSFER를 카드 파이프라인으로 통합

**Files:**

- Modify: `app/[locale]/checkout/CartCheckoutClient.tsx`

**Interfaces:**

- Consumes: Task 1과 동일 패턴 (`tossMethod` 필드, `requestPayment` 동적 method).

- [ ] **Step 1: `PaymentChoiceConfig`에 `tossMethod` 추가 + `PAYMENT_CHOICES` 갱신**

Task 1 Step 1과 동일하게 이 파일의 `PaymentChoiceConfig`(28행 부근 type/interface)와 `PAYMENT_CHOICES`(48행 부근)에 `tossMethod`를 추가한다. 값 매핑은 Task 1과 동일 (CARD/간편결제='CARD', TRANSFER='TRANSFER').

- [ ] **Step 2: `handlePayment`의 TRANSFER 우회 분기(199–227행) 삭제**

`if (paymentChoice === 'TRANSFER') { const result = await createBankTransferOrder({ items: orderItems, cartCheckout: true, ... }); ... return; }` 블록 전체(주석 199–200행 포함, ~227행까지)를 삭제한다.

- [ ] **Step 3: `requestPayment`의 method 동적화 (270–281행)**

```typescript
const choice = PAYMENT_CHOICES.find((c) => c.value === paymentChoice);
await payment.requestPayment({
  method: choice?.tossMethod ?? 'CARD',
  amount: { currency: 'KRW', value: serverTotal },
  orderId: orderNo,
  orderName,
  customerName: buyerName,
  customerEmail: buyerEmail,
  successUrl,
  failUrl,
  ...(choice?.cardOptions && { card: choice.cardOptions }),
});
```

- [ ] **Step 4: `createBankTransferOrder` import 제거 (15행)**

```typescript
import { createOrder, cancelPendingOrder } from '@/app/actions/checkout';
```

- [ ] **Step 5: TRANSFER 안내 주석 갱신 (95–96행 부근)**

`* 3. createOrder({ items }) ...` 영역 주석에 무통장 언급이 있으면 퀵계좌이체로 정정. (없으면 생략)

- [ ] **Step 6: 타입체크 + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/checkout/CartCheckoutClient.tsx"
git commit -m "feat(checkout): route cart TRANSFER through Toss quick account transfer

요약: 작품 카트 계좌이체를 토스 퀵계좌이체로 전환 (단건과 동일 패턴)"
```

---

### Task 3: 작품 결제수단 안내 문구 i18n 갱신

**Files:**

- Modify: `messages/ko.json`
- Modify: `messages/en.json` (대응 키 존재 시 동기화 — en 컴포넌트는 안 쓰지만 키 정합성 유지)

**Interfaces:**

- Consumes: 없음.
- Produces: 없음. (UI 문구만)

- [ ] **Step 1: `transferDescription` 문구를 퀵계좌이체 의미로 교체**

`messages/ko.json` 977행 `"transferDescription": "안내 계좌 · 입금 확인 후 제작·포장"` 을 다음으로 교체:

```json
    "transferDescription": "토스 퀵계좌이체 · 즉시 출금 후 바로 결제 완료",
```

`methodTransfer`(972행 `"계좌이체"`)는 그대로 두거나 `"퀵계좌이체"`로 변경 (사용자 선호 반영 — 기본은 `"계좌이체"` 유지로 친숙성 우선).

- [ ] **Step 2: en.json 대응 키 동기화**

`messages/en.json`에 `transferDescription`/`methodTransfer` 키가 있으면 영문 표현으로 정정 (예: `"Toss quick account transfer · instant debit, paid immediately"`). 없으면 추가하지 않는다 (en은 OverseasCheckoutClient라 미사용).

- [ ] **Step 3: i18n placeholder 검증 + 빌드 일부**

Run: `npm run type-check`
Expected: PASS. (i18n 키 누락은 빌드의 `verify:i18n-placeholders`가 잡으므로 Task 6 최종 빌드에서 재확인)

- [ ] **Step 4: Commit**

```bash
git add messages/ko.json messages/en.json
git commit -m "i18n(checkout): update transfer copy to quick account transfer

요약: 계좌이체 안내 문구를 토스 퀵계좌이체(즉시 결제)로 수정"
```

---

### Task 4: 이벤트 server action — transfer를 좌석 hold 경로로 통합

**Files:**

- Modify: `app/actions/event-registration.ts`

**Interfaces:**

- Consumes: `register_event_seat` RPC (기존 card 경로).
- Produces: `registerEvent`가 `paymentMethod='transfer'`일 때도 `OK_PENDING`(좌석 hold + payment) 반환. `OK_DEPOSIT` 코드는 더는 반환되지 않음 (Task 5 폼이 이에 의존).

- [ ] **Step 1: RPC 분기를 항상 `register_event_seat`로 변경 (63–66행)**

`isTransfer` 변수 및 RPC 분기를 제거하고 항상 좌석 hold RPC를 호출한다:

```typescript
const supabase = createSupabaseAdminClient();
const { data, error } = await supabase.rpc('register_event_seat', {
  p_payload: {
    event_slug: OH_YOON_MEMORIAL_SLUG,
    applicant_name: name,
    phone,
    email,
    party_size: payload.partySize,
    boarding_confirmed: payload.boardingConfirmed,
    agreed_privacy: payload.agreedPrivacy,
    hold_minutes: OH_YOON_MEMORIAL_HOLD_MINUTES,
    user_agent: meta.userAgent ?? null,
  },
});
```

(`const isTransfer = payload.paymentMethod === 'transfer';` 줄 삭제.)

- [ ] **Step 2: `awaiting_deposit` 분기(148–189행) 삭제**

`if (r.status === 'awaiting_deposit') { ... return { ok: true, code: 'OK_DEPOSIT', deposit: {...} }; }` 블록 전체를 삭제한다. 좌석 hold RPC는 `awaiting_deposit`을 반환하지 않으므로 죽은 분기.

- [ ] **Step 3: 미사용 import 정리**

`OH_YOON_MEMORIAL_BANK`, `OH_YOON_MEMORIAL_BANK_ACCOUNT`, `OH_YOON_MEMORIAL_BANK_HOLDER` import(16–18행)가 Step 2 삭제로 미사용이면 import 문에서 제거한다.

- [ ] **Step 4: `paymentMethod` 정규화는 유지**

`normalizeRegisterEventInput`의 `paymentMethod` 필드(41행)는 **유지**한다 — Task 5 클라이언트가 `requestPayment` method를 결정하는 데 계속 사용하며 server로도 전달된다. (server RPC 분기에서는 더는 안 쓰지만 페이로드 호환·향후 기록용)

- [ ] **Step 5: 타입체크 + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS (미사용 변수/import 없음)

- [ ] **Step 6: Commit**

```bash
git add app/actions/event-registration.ts
git commit -m "feat(event): route memorial transfer through seat-hold + Toss

요약: 추도식 계좌이체를 무통장 대기에서 좌석 hold+퀵계좌이체로 전환

- register_event_bank_transfer 분기 제거, 항상 register_event_seat
- OK_DEPOSIT(계좌안내) 응답 제거 → 카드와 동일 OK_PENDING"
```

---

### Task 5: 이벤트 RegistrationForm — transfer를 퀵계좌이체로 결제

**Files:**

- Modify: `app/[locale]/event/oh-yoon-memorial/_components/RegistrationForm.tsx`

**Interfaces:**

- Consumes: `registerEvent`가 transfer에도 `OK_PENDING` + `payment` 반환 (Task 4).
- Produces: 없음.

- [ ] **Step 1: `startTossPayment`에 `method` 파라미터 추가 (60–101행)**

함수 시그니처와 `requestPayment` 호출을 수정한다:

```typescript
async function startTossPayment(
  payment: {
    orderNo: string;
    amount: number;
    orderName: string;
    customerName?: string;
    customerEmail?: string;
  },
  method: 'CARD' | 'TRANSFER' = 'CARD'
) {
  if (!clientKey) {
    setResult({ ok: false, code: 'INTERNAL_ERROR', message: t('errorGeneric') });
    return;
  }
  const localePrefix = locale === 'en' ? '/en' : '';
  const successUrl = `${window.location.origin}${localePrefix}/event/oh-yoon-memorial/success`;
  const failUrl = `${window.location.origin}${localePrefix}/event/oh-yoon-memorial/fail`;
  const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
  const tossPayments = await loadTossPayments(clientKey);
  const tossPayment = tossPayments.payment({ customerKey: payment.orderNo });
  try {
    await tossPayment.requestPayment({
      method,
      amount: { currency: 'KRW', value: payment.amount },
      orderId: payment.orderNo,
      orderName: payment.orderName,
      customerName: payment.customerName ?? applicantName,
      ...((payment.customerEmail ?? email)
        ? { customerEmail: payment.customerEmail ?? email }
        : {}),
      successUrl,
      failUrl,
    });
    await new Promise(() => {});
  } catch (err) {
    const e = err as { code?: string; message?: string };
    void cancelEventPendingPayment(payment.orderNo, e?.code ?? 'USER_CANCEL');
    if (e?.code === 'USER_CANCEL') return;
    setResult({ ok: false, code: 'INTERNAL_ERROR', message: t('errorGeneric') });
  }
}
```

- [ ] **Step 2: `handleSubmit`에서 선택한 method 전달 (137–139행)**

```typescript
if (res.ok && res.code === 'OK_PENDING' && 'payment' in res && res.payment) {
  await startTossPayment(res.payment, paymentMethod === 'transfer' ? 'TRANSFER' : 'CARD');
}
```

- [ ] **Step 3: `OK_DEPOSIT` 계좌안내 렌더 블록(155–191행) 삭제**

`if (result?.ok && result.code === 'OK_DEPOSIT' && 'deposit' in result && result.deposit) { ... }` 블록 전체를 삭제한다. transfer는 이제 OK_PENDING → 결제창으로 흐른다.

- [ ] **Step 4: 제출 버튼 라벨 정리 (398–406행)**

transfer 선택 시에도 결제창을 띄우므로 `submitTransfer`("계좌이체로 신청") 분기를 결제 라벨로 통합:

```typescript
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? t('submitting') : !canSeat ? t('submitWaitlist') : t('submitPay')}
      </Button>
```

- [ ] **Step 5: transfer 안내 문구(356행) 갱신**

`paymentMethod === 'transfer'`일 때 표시되는 `t('paymentTransferHelp')`를 즉시 결제 의미로. (i18n은 Step 6에서 갱신)

- [ ] **Step 6: i18n 갱신 (`messages/ko.json`)**

이벤트 섹션(1410–1417행 부근):

- `paymentTransferHelp` (1416행): `"토스 퀵계좌이체로 즉시 결제합니다. 결제 완료 시 참가가 바로 확정됩니다."`
- `paymentMethodTransfer` (1415행): `"퀵계좌이체"` (또는 `"계좌이체"` 유지)
- `submitTransfer`(1410행), `depositTitle`/`depositLead`/`depositBankLabel`/`depositAccountLabel`/`depositHolderLabel`/`depositAmountLabel`/`depositNotice`(1417행~): Step 3/4로 미사용 → 키 제거. `messages/en.json`의 동일 키도 함께 제거.

- [ ] **Step 7: 타입체크 + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add "app/[locale]/event/oh-yoon-memorial/_components/RegistrationForm.tsx" messages/ko.json messages/en.json
git commit -m "feat(event): memorial transfer opens Toss quick account transfer window

요약: 추도식 계좌이체 선택 시 토스 퀵계좌이체 결제창 호출

- startTossPayment에 method 파라미터, transfer면 TRANSFER
- 무통장 계좌안내 렌더·미사용 i18n 키 제거"
```

---

### Task 6: 정리 — createBankTransferOrder 본체 제거 + 최종 검증

**Files:**

- Modify: `app/actions/checkout.ts`
- (확인) `app/[locale]/checkout/page.tsx`, `app/[locale]/checkout/[artworkId]/page.tsx`, `OverseasCheckoutClient`

**Interfaces:**

- Consumes: Task 1·2가 `createBankTransferOrder` 호출을 모두 제거했음.
- Produces: 없음.

- [ ] **Step 1: `createBankTransferOrder` 잔여 호출자 확인**

Run: `grep -rn "createBankTransferOrder" app lib components`
Expected: `app/actions/checkout.ts`의 정의(664행)만 남음. 호출자 0건. (남아 있으면 그 호출자도 카드 경로로 전환 후 진행)

- [ ] **Step 2: `createBankTransferOrder` 함수 본체 삭제 (664–878행)**

`export async function createBankTransferOrder(...)` 전체를 삭제한다. 이 함수만 쓰던 헬퍼/상수가 다른 곳에서 안 쓰이면 함께 정리 (예: bank-transfer-info import). `verifyBankTransferLanding`/`cancelLandingOrder` 등 다른 export는 **건드리지 않는다** (success 랜딩이 여전히 사용 가능 — 단 신규 무통장이 없으므로 사실상 dead, 본 plan에서는 보존).

- [ ] **Step 3: 무통장 success 랜딩 경로 확인 (보존 판단)**

`SuccessClient`의 `method=BANK_TRANSFER` 분기와 `verifyBankTransferLanding`는 **삭제하지 않는다** — 과거 awaiting_deposit 주문/가상계좌 안전망. dead path지만 회귀 위험을 피해 보존. (DROP은 별도 정리 사이클, spec 6절·10절)

- [ ] **Step 4: 관리자 입금확인 UI/RPC 보존 확인**

`app/actions/admin-orders.ts`의 `confirmDeposit`, order-detail/EventAdminClient의 입금확인 버튼은 `status==='awaiting_deposit'` 조건부 렌더 → 신규 무통장 미생성으로 자연 비활성. **변경하지 않는다.** (spec 6절보다 보수적: UI 제거 대신 유지)

- [ ] **Step 5: en(해외) 무영향 확인**

`OverseasCheckoutClient`와 카트 en 경로가 `createBankTransferOrder`/TRANSFER를 참조하지 않는지 확인:

Run: `grep -rn "TRANSFER\|createBankTransferOrder" "app/[locale]/checkout/[artworkId]/OverseasCheckoutClient.tsx"`
Expected: 0건. (카트 en 컴포넌트가 별도로 있으면 동일 확인)

- [ ] **Step 6: 전체 빌드 + 타입 + lint + 기존 테스트**

Run: `npm run build && npm run type-check && npm run lint && npm test`
Expected: PASS. 빌드의 `verify:i18n-placeholders`가 i18n 키 정합성까지 검증.

- [ ] **Step 7: Commit + push + PR**

```bash
git add app/actions/checkout.ts
git commit -m "refactor(checkout): remove unused createBankTransferOrder

요약: 퀵계좌이체 전환으로 무통장 주문 생성 함수 제거(호출자 0)

- 관리자 입금확인 UI·RPC·success 무통장 랜딩은 안전망으로 보존(DROP 별도)"
git push -u origin feat/quick-account-transfer
gh pr create --fill --base main
```

- [ ] **Step 8: 라이브 수동 결제 스모크 (verify-first, 사용자 협조 필요)**

PR 머지 또는 프리뷰 배포 후, 토스 라이브 domestic 환경에서:

1. 작품 1건 퀵계좌이체 결제 → `/checkout/.../success` confirm → `orders.status='paid'`, `payments.method` 기록 확인 (`supabase db query --linked`).
2. 동일 주문 환불 1건 → 즉시환불 확인.
3. 이벤트 1건 퀵계좌이체 → `event_registrations.status='confirmed'`, 좌석 차감 확인.

UI 시각확인은 사용자에게 요청 (Playwright 금지). 결과 이상 시 systematic-debugging.

---

## Self-Review

**1. Spec coverage:**

- spec §3 작품 변경 → Task 1·2·3 ✅
- spec §4 이벤트 변경 → Task 4·5 ✅
- spec §5 confirm/DB/webhook 무수정 → 검증으로 충족 (Task 6 Step 6 빌드/테스트) ✅
- spec §6 제거 대상 → Task 1·2(호출부), Task 6(본체). 관리자 UI/RPC는 **유지로 조정**(보수적, plan Task 6 Step 4에 명시) ⚠️ spec과 차이 — 사용자 통지 필요
- spec §7 엣지케이스: en 미노출 → 구조적 충족(OverseasCheckoutClient). USER_CANCEL → 기존 경로 유지. 환불 → 기존 경로. ✅
- spec §8 테스트 → Task 6 Step 6·8 ✅

**2. Placeholder scan:** 모든 스텝에 실제 코드/명령 포함. "적절히 처리" 류 없음. ✅

**3. Type consistency:** `tossMethod: 'CARD' | 'TRANSFER'` Task 1·2 동일. `startTossPayment(payment, method)` Task 5 일관. `OK_PENDING`/`OK_DEPOSIT` 코드명 Task 4·5 일치. ✅

**조정 사항(spec 대비):** spec §6은 관리자 입금확인 UI "진입점 제거"였으나, 조사 결과 모두 `status==='awaiting_deposit'` 조건부 렌더라 신규 무통장 미생성 시 자연 비활성. 제거 대신 **유지**가 과거 주문·가상계좌 안전망으로 더 안전 → plan에서 유지로 변경. 실행 후 사용자에게 통지.
