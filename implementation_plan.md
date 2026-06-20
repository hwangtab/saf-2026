# 결제·캐시·운영 검증 회귀 개선 Implementation Plan (2026-06-20)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. 모든 구현 작업은 `superpowers:test-driven-development` 순서(실패 테스트 확인 → 최소 구현 → 통과 확인)를 따른다.

**Goal:** 결제 완료 증거 누락, 관리자 작품 등록 후 공개 캐시 stale, 운영 env 검증 공백, draft 이미지 purge 누락, stale ID 삭제 성공 오인을 제거한다.

**Architecture:** 결제 정합성은 Toss 응답을 `payments` row로 보존하는 helper를 공통화하고, confirm/webhook/reconcile이 같은 불변조건을 쓰게 한다. 공개 캐시는 기존 `revalidatePublicArtworkSurfaces()`를 비동기 후처리로 재도입해 관리자 등록 응답 교착을 피하면서 공개 표면은 같은 정책으로 무효화한다. 검증/삭제/purge 항목은 작은 순수 helper와 targeted 테스트로 잠근다.

**Tech Stack:** Next.js App Router server actions/route handlers, Supabase JS v2, Jest, TypeScript, Vercel CI.

## Global Constraints

- `AGENTS.md`: 실행 전 계획은 한국어로 `implementation_plan.md`에 남기고, 승인 전에는 코드 수정하지 않는다.
- 결제 불변조건: 주문이 `paid` 또는 `awaiting_deposit`이면 같은 Toss 결제에 대한 `payments` row가 존재해야 한다.
- 공개 작품 불변조건: 관리자 create/update/delete/sales 후 공개 KO/EN 목록, API 캐시 tag, 관련 작가 경로는 같은 제품 의도에 따라 갱신되어야 한다.
- 운영 검증 불변조건: CI placeholder env가 운영 Supabase 오설정을 정상처럼 통과시키면 안 된다.
- 삭제/정리 불변조건: stale ID를 성공으로 보고하지 않고, purge는 참조 스캔 누락 시 fail-closed 한다.

---

### Task 1: Toss payment row 보존 helper 추가

**Files:**

- Create: `lib/payments/toss-payment-record.ts`
- Test: `__tests__/lib/toss-payment-record.test.ts`

**Interfaces:**

- Produces: `ensureTossPaymentRecord(input): Promise<{ ok: true; paymentId: string | null; created: boolean } | { ok: false; error: string }>`
- Consumes: Supabase-like client, order id, Toss payment response, idempotency key, optional method detail override.

- [x] **Step 1: Write the failing test**

```ts
it('inserts a sanitized payment row when no payment exists', async () => {
  const supabase = makePaymentRecordClient({ existingPayment: null });
  const result = await ensureTossPaymentRecord({
    supabase,
    orderId: 'order-1',
    tossPayment: tossDonePayment,
    idempotencyKey: 'confirm-SAF-001',
  });
  expect(result).toEqual({ ok: true, paymentId: 'payment-1', created: true });
  expect(supabase.insertedPayment).toEqual(
    expect.objectContaining({
      order_id: 'order-1',
      payment_key: 'pay-key',
      toss_order_id: 'SAF-001',
      amount: 100000,
      status: 'DONE',
      idempotency_key: 'confirm-SAF-001',
    })
  );
});

it('returns ok false when the payment row cannot be stored', async () => {
  const supabase = makePaymentRecordClient({ existingPayment: null, insertError: 'db down' });
  await expect(
    ensureTossPaymentRecord({
      supabase,
      orderId: 'order-1',
      tossPayment: tossDonePayment,
      idempotencyKey: 'confirm-SAF-001',
    })
  ).resolves.toEqual({ ok: false, error: 'db down' });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/toss-payment-record.test.ts --runInBand`
Expected: FAIL because `@/lib/payments/toss-payment-record` does not exist.

- [x] **Step 3: Write minimal implementation**

Implement `ensureTossPaymentRecord` with:

- `.select('id').eq('payment_key', tossPayment.paymentKey).maybeSingle()`
- existing row returns `{ ok: true, created: false }`
- insert uses `sanitizeConfirmResponse(tossPayment)` and card/virtualAccount method detail
- Supabase select/insert errors return `{ ok: false, error }`

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/toss-payment-record.test.ts --runInBand`
Expected: PASS.

### Task 2: Confirm/webhook/reconcile payment-row-missing 경로 보정

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts`
- Modify: `app/api/webhooks/toss/route.ts`
- Modify: `app/api/internal/reconcile-payments/route.ts`
- Test: `__tests__/app/toss-confirm-payment-record-failure.test.ts`
- Test: `__tests__/app/toss-webhook-status-changed-missing-payment.test.ts`
- Test: `__tests__/app/reconcile-payments-missing-payment-source.test.ts`

**Interfaces:**

- Consumes: `ensureTossPaymentRecord` from Task 1.
- Produces: no `orders.status = paid|awaiting_deposit` transition unless `payments` row exists or was just created.

- [x] **Step 1: Write the failing tests**

```ts
it('does not mark an order paid when the payment row insert fails after Toss DONE', async () => {
  const supabase = createConfirmMock({ paymentInsertError: 'db down' });
  const { POST } = await import('@/app/api/payments/toss/confirm/route');
  const response = await POST(makeConfirmRequest());
  expect(response.status).toBeGreaterThanOrEqual(500);
  expect(supabase.orderStatusUpdates).not.toContain('paid');
});
```

```ts
it('creates the missing payment row from verified STATUS_CHANGED DONE before order repair', async () => {
  const supabase = createWebhookMock({ paymentByKey: null, orderByNo: pendingOrder });
  const { POST } = await import('@/app/api/webhooks/toss/route');
  const response = await POST(makeStatusChangedDoneRequest());
  expect(response.status).toBe(200);
  expect(supabase.insertedPayment).toEqual(expect.objectContaining({ payment_key: 'pay-key' }));
  expect(supabase.orderStatusUpdates).toContain('paid');
});
```

```ts
it('documents that reconcile checks paid or awaiting_deposit orders missing a payment row', () => {
  const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');
  expect(src).toContain('missingPaymentOrders');
  expect(src).toContain(".in('status', ['paid', 'awaiting_deposit'])");
  expect(src).toContain('ensureTossPaymentRecord');
});
```

- [x] **Step 2: Run tests to verify they fail**

Run:

- `npm test -- __tests__/app/toss-confirm-payment-record-failure.test.ts --runInBand`
- `npm test -- __tests__/app/toss-webhook-status-changed-missing-payment.test.ts --runInBand`
- `npm test -- __tests__/app/reconcile-payments-missing-payment-source.test.ts --runInBand`

Expected: FAIL because current confirm continues order update, webhook 500s on missing payment, reconcile only scans `pending_payment`.

- [x] **Step 3: Write minimal implementation**

Implementation rules:

- Confirm route calls `ensureTossPaymentRecord` immediately after Toss success.
- If `ensureTossPaymentRecord` fails, do not update order status; notify/log; return a server error so the existing pending-order reconcile path can repair instead of creating `paid` without evidence.
- STATUS_CHANGED DONE webhook, after Toss API verification, if `payments` row is missing, find the order by `verified.orderId`, call `ensureTossPaymentRecord`, then continue with the existing DONE repair flow.
- Reconcile adds a second pass for `paid`/`awaiting_deposit` orders in the same recent window that have no joined `payments` row; it fetches Toss by `order_no` and calls `ensureTossPaymentRecord`.

- [x] **Step 4: Run targeted tests**

Run:

- `npm test -- __tests__/lib/toss-payment-record.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/reconcile-payments-missing-payment-source.test.ts --runInBand`

Expected: PASS.

### Task 3: Admin artwork create 공개 캐시 무효화 복구

**Files:**

- Modify: `app/actions/admin-artworks.ts`
- Modify: `__tests__/app/admin-artwork-create-image-upload-source.test.ts`

**Interfaces:**

- Consumes: `revalidatePublicArtworkSurfaces(artistNames?)`.
- Produces: create action response remains light enough for hard navigation, but public surfaces get tag/path invalidation through post-response work.

- [x] **Step 1: Write the failing test**

```ts
it('schedules public artwork cache invalidation after create without blocking the action response', () => {
  const action = actionSource();
  expect(action).toContain('after(() =>');
  expect(action).toContain('revalidatePublicArtworkSurfaces');
  expect(action).toContain("revalidatePath('/admin/artworks')");
  expect(action).not.toContain('신규 작품의 공개면 노출은 다음 자연 revalidate');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/app/admin-artwork-create-image-upload-source.test.ts --runInBand`
Expected: FAIL because current test/code intentionally removes public revalidation.

- [x] **Step 3: Write minimal implementation**

Implementation rules:

- Keep synchronous `revalidatePath('/admin/artworks')`.
- Schedule public revalidation with `after(() => revalidatePublicArtworkSurfaces([artistName]))` or equivalent post-response pattern already used in the repo.
- Fetch only the created artist display name needed for artist-path invalidation.
- Do not reintroduce redirect/router behavior in the server action.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/app/admin-artwork-create-image-upload-source.test.ts --runInBand`
Expected: PASS.

### Task 4: CI Supabase placeholder를 명시적 fallback 모드로 제한

**Files:**

- Modify: `lib/supabase.ts`
- Modify: `.github/workflows/ci.yml`
- Test: `__tests__/lib/supabase-config.test.ts`

**Interfaces:**

- Produces: placeholder Supabase URL is treated as “no live Supabase config” unless `ALLOW_SUPABASE_PLACEHOLDER_FALLBACK=true`.

- [x] **Step 1: Write the failing test**

```ts
it('does not treat placeholder Supabase env as live config by default', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder';
  delete process.env.ALLOW_SUPABASE_PLACEHOLDER_FALLBACK;
  const mod = await import('@/lib/supabase');
  expect(mod.hasSupabaseConfig).toBe(false);
  expect(mod.supabase).toBeNull();
});

it('allows placeholder fallback only when CI opts in explicitly', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder';
  process.env.ALLOW_SUPABASE_PLACEHOLDER_FALLBACK = 'true';
  const mod = await import('@/lib/supabase');
  expect(mod.hasSupabaseConfig).toBe(true);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/supabase-config.test.ts --runInBand`
Expected: FAIL because placeholder currently counts as configured.

- [x] **Step 3: Write minimal implementation**

Implementation rules:

- Add `isPlaceholderSupabaseConfig`.
- Set `hasSupabaseConfig` false for placeholder unless `ALLOW_SUPABASE_PLACEHOLDER_FALLBACK === 'true'`.
- Add `ALLOW_SUPABASE_PLACEHOLDER_FALLBACK: true` to CI jobs that intentionally use static fallback.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/supabase-config.test.ts --runInBand`
Expected: PASS.

### Task 5: Draft purge activity_logs pagination

**Files:**

- Modify: `lib/admin/draft-image-purge.ts`
- Modify: `__tests__/lib/draft-image-purge.test.ts`

**Interfaces:**

- Produces: `buildReferencedArtworkPaths` scans `activity_logs` with `.range()` pages exactly like `artworks`.

- [x] **Step 1: Write the failing test**

```ts
it('paginates active trash snapshot logs so old referenced drafts are protected after page 1', async () => {
  const supabase = makeMockSupabase({
    artworksRows: [],
    logPages: [
      [{ before_snapshot: null, after_snapshot: null }],
      [{ before_snapshot: { images: [objectUrl(DRAFT_B)] }, after_snapshot: null }],
      [],
    ],
  });
  const referenced = await buildReferencedArtworkPaths(supabase);
  expect(referenced.has(DRAFT_B)).toBe(true);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/draft-image-purge.test.ts --runInBand`
Expected: FAIL because the mock expects `.range()` on activity_logs but current code does not paginate.

- [x] **Step 3: Write minimal implementation**

Implementation rules:

- Wrap `activity_logs` scan in the same `PAGE = 1000` loop.
- Preserve `.in('action', TRASHABLE_ACTIONS).is('reverted_at', null).is('purged_at', null)`.
- Throw on any page error; break on empty or short page.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/draft-image-purge.test.ts --runInBand`
Expected: PASS.

### Task 6: Admin artwork delete stale ID 성공 오인 차단

**Files:**

- Modify: `app/actions/admin-artworks.ts`
- Modify: `__tests__/actions/admin-artworks-delete.test.ts`

**Interfaces:**

- Produces: single delete throws `작품을 찾을 수 없습니다.` when the row is absent; batch delete reports only actually found ids and fails when none exist.

- [x] **Step 1: Write the failing tests**

```ts
it('rejects single delete when the artwork row no longer exists', async () => {
  mockHasActiveOrdersForArtworks.mockResolvedValue(false);
  mockRequireAdminClient.mockResolvedValue(makeDeleteMock({ artwork: null }));
  const { deleteAdminArtwork } = await import('@/app/actions/admin-artworks');
  await expect(deleteAdminArtwork('missing-art')).rejects.toThrow('작품을 찾을 수 없습니다.');
});

it('does not report requested ids as deleted when batch rows are missing', async () => {
  mockHasActiveOrdersForArtworks.mockResolvedValue(false);
  mockRequireAdminClient.mockResolvedValue(makeBatchDeleteMock({ artworks: [{ id: 'art-1' }] }));
  const { batchDeleteArtworks } = await import('@/app/actions/admin-artworks');
  const result = await batchDeleteArtworks(['art-1', 'missing-art']);
  expect(result).toEqual(
    expect.objectContaining({
      success: true,
      partial: true,
      count: 1,
      succeededIds: ['art-1'],
      failedIds: ['missing-art'],
    })
  );
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/actions/admin-artworks-delete.test.ts --runInBand`
Expected: FAIL because current delete accepts null single snapshot and batch returns requested id count.

- [x] **Step 3: Write minimal implementation**

Implementation rules:

- Single delete checks fetch `error` and `artwork`; absent row throws `작품을 찾을 수 없습니다.`
- Batch delete computes `foundIds`, `missingIds`; if `foundIds.length === 0`, return/throw an operator-facing “선택한 작품을 찾을 수 없습니다.”
- Delete only `foundIds`.
- Return `BatchArtworkMutationResult` for batch delete with `partial`, `succeededIds`, `failedIds`, `errors`.
- Log snapshot count and summary with actual deleted count.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/actions/admin-artworks-delete.test.ts --runInBand`
Expected: PASS.

### Task 7: Final verification

**Files:**

- Modify: `walkthrough.md`

- [x] **Step 1: Run targeted regression suite**

Run:

- `npm test -- __tests__/lib/toss-payment-record.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/reconcile-payments-missing-payment-source.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/lib/supabase-config.test.ts __tests__/lib/draft-image-purge.test.ts __tests__/actions/admin-artworks-delete.test.ts --runInBand`

- [x] **Step 2: Run broad verification**

Run:

- `npm run lint`
- `npm run type-check`
- `npm test -- --runInBand`
- `npm run validate-artworks`
- `npm run build`

- [x] **Step 3: Document outcome**

Update `walkthrough.md` with:

- changed invariants
- tests run and results
- any remaining data warnings from `validate-artworks`
- note that Vercel CLI should be updated with `npm i -g vercel@latest` or `pnpm add -g vercel@latest` before Vercel CLI-based deployment/debugging.

---

# 관리자 포털 stale 번들 자동 갱신 구현 계획 (2026-06-19)

## 목표

- 관리자 화면을 오래 열어 둔 상태에서 새 배포가 나가도 구버전 RSC 메시지 payload가 계속 남아 `{title}` 같은 이전 번역 버그가 다시 보이지 않게 한다.
- 운영자에게 “새로고침하세요”라고 떠넘기지 않고, 포털이 현재 배포 버전을 감지해 스스로 최신 화면으로 갱신한다.
- 삭제 확인 모달의 title 치환 수정은 유지하고, 이번 원인인 stale client payload를 포털 공통 정책으로 막는다.

## 원인

1. 최신 `origin/main`과 Vercel 배포 소스의 `messages/ko.admin.json`은 이미 `〈{title}〉`로 수정되어 있었다.
2. 실제 Chrome 탭의 `__next_f` payload에는 새로고침 전 `'{title}' 작품...` 구버전 메시지가 남아 있었다.
3. 같은 탭을 새로고침하자 payload와 삭제 모달이 `〈되살아나는 풍경 5〉 작품...`로 정상 치환됐다.
4. 따라서 남은 문제는 메시지 파일 자체가 아니라 배포 후에도 열려 있던 관리자 클라이언트가 오래된 RSC payload를 계속 쓰는 구조다.

## 구현 범위

1. 관리자 전용 배포 버전 API를 추가한다.
   - `GET /api/admin/deployment-version`
   - `requireAdmin()`으로 관리자만 호출 가능하게 한다.
   - 응답은 `deploymentId`와 `Cache-Control: no-store`를 포함한다.
2. 관리자 layout에 client refresh guard를 추가한다.
   - 서버에서 현재 배포 식별자를 prop으로 내려준다.
   - 탭 focus, visibility 복귀, 주기적 확인 시 API의 배포 식별자와 비교한다.
   - 식별자가 달라지면 현재 페이지를 한 번 새로고침해 최신 RSC payload와 번역 메시지를 받는다.
3. 회귀 테스트를 추가한다.
   - 삭제 확인 번역 소스 테스트는 유지한다.
   - refresh guard가 `/api/admin/deployment-version`을 no-store로 조회하고, 버전이 다를 때 reload 경로를 갖는지 확인한다.
   - API가 no-store 응답과 배포 식별자를 반환하는지 확인한다.

## 검증

- `npm test -- __tests__/lib/admin-i18n-placeholders.test.ts`
- 새로 추가한 관리자 배포 갱신 테스트
- `npm run lint`
- `npm run type-check`
- 배포 후 실제 로그인 Chrome에서 `/admin/artworks` 삭제 모달이 작품명으로 치환되는지 확인한다.

---

# 관리자 포털 페이지 전환 시 스크롤 초기화 구현 계획 (2026-06-19)

# 관리자 작품 등록 후 목록 이동 근본 수정 계획 (2026-06-19)

## 목표

- 작품 등록 성공 후 클라이언트 `router.push` 상태에 의존하지 않고 목록으로 이동한다.
- 포털 라우트(`/admin/*`)에서는 public i18n navigation이 아니라 `next/link` / `next/navigation` 기반을 사용한다.
- 등록 이미지 업로드와 업로드 중 등록 차단 흐름은 유지한다.

## 구현 범위

1. `createAdminArtwork`의 기존 `{ success, id }` 반환 API는 보존한다.
2. 실제 insert/revalidate/log 로직은 내부 공통 함수로 분리한다.
3. 폼 제출 전용 `createAdminArtworkAndRedirect` 서버 액션을 추가하고, 성공 시 `redirect('/admin/artworks')`를 호출한다.
4. `ArtworkEditForm`의 신규 등록 성공 분기는 `createAdminArtworkAndRedirect(formData)`만 호출하게 한다.
5. `목록으로`는 공용 `Button href` 대신 `next/link`와 `buttonVariants`를 사용한다.

## 검증

- 기존 소스 회귀 테스트를 서버 액션 redirect 흐름과 포털-safe 링크 기준으로 갱신한다.
- `npm test -- __tests__/app/admin-artwork-create-image-upload-source.test.ts`
- `npm run lint`
- `npm run type-check`

---

## 목표

- 관리자 포털에서 다른 작업 화면으로 이동하면 항상 화면 최상단에서 시작한다.
- 같은 화면 안에서 필터, 기간, 정렬 등 query string만 바뀌는 전환은 현재 스크롤을 유지한다.
- 개별 링크마다 우회 설정을 붙이지 않고 포털 공통 전환 정책으로 처리한다.

## 구현 범위

1. `NavigationProgress`에 pathname 변경 전용 스크롤 초기화 effect를 추가한다.
2. 최초 렌더에서는 `window.scrollTo`를 호출하지 않는다.
3. `pathname`이 바뀐 경우에만 `window.scrollTo({ top: 0, left: 0, behavior: 'auto' })`를 호출한다.
4. `searchParams`만 바뀐 경우에는 스크롤하지 않는다.
5. 기존 progress bar animation은 pathname/searchParams 변경에 계속 반응하게 유지한다.
6. 기존 `{ scroll: false }` 필터 전환 코드는 그대로 둔다.

## 검증

- `__tests__/components/NavigationProgress.test.tsx`에 pathname 변경, query-only 변경, 최초 렌더 회귀 테스트를 추가한다.
- `npm test -- __tests__/components/NavigationProgress.test.tsx`를 실행한다.
- `npm run lint`를 실행한다.

---

# 관리자 작품 등록 화면 이미지 통합 업로드 구현 계획 (2026-06-19)

## 업로드 중 등록 차단 보강 (2026-06-19)

- `ImageUpload`에서 업로드 진행 상태를 부모 폼으로 전달하는 optional callback을 추가한다.
- 신규 작품 등록 모드에서는 이미지 업로드 중 `등록` 제출과 버튼 활성화를 차단한다.
- 업로드 진행 중임을 `작품 이미지` 제목 옆에 표시해 운영자가 완료 후 등록하도록 안내한다.
- 기존 수정 모드의 즉시 이미지 저장 동작은 유지한다.

---

## 목표

- 관리자 새 작품 등록 화면에서 이미지 업로드를 바로 가능하게 한다.
- 운영자는 작품 정보와 이미지를 같은 화면에서 준비한 뒤 `등록` 한 번으로 `artworks.images`까지 함께 저장한다.
- 등록 성공 후에는 방금 만든 작품 수정 화면으로 이동해 저장 결과와 이미지를 확인한다.

## 구현 범위

1. 신규 등록 모드에서도 `ArtworkEditForm`의 `작품 이미지` 카드를 표시한다.
2. 신규 등록용 storage prefix는 클라이언트 mount 후 `admin-artwork-draft-${crypto.randomUUID()}`로 생성한다.
3. 업로드된 이미지 URL과 draft prefix를 hidden input으로 제출한다.
4. `createAdminArtwork`는 draft prefix에 속한 `artworks` bucket URL만 검증해 insert payload의 `images`에 포함한다.
5. 수정 모드의 즉시 이미지 저장과 기존 저장 후 목록 이동 동작은 유지한다.

## 검증

- 신규 등록 이미지 카드, hidden input, 성공 후 상세 이동, 수정 모드 유지에 대한 소스 회귀 테스트를 추가한다.
- `createAdminArtwork`의 이미지 검증 및 insert payload 포함을 회귀 테스트로 확인한다.
- `npm test -- __tests__/app/admin-artwork-create-image-upload-source.test.ts`, `npm run lint`, `npm run type-check`를 실행한다.

---

# 서브 히어로 이미지 품질 보정 구현 계획 (2026-06-18)

## 목표

- `customBackgroundImage`가 있는 `PageHero`에만 저화질 보정 연출을 적용한다.
- 홈 히어로와 같은 운영 의도(저화질 이미지를 숨기지 않고 의도된 배경처럼 보이게 함)를 따르되, 홈 LCP 경로와 서브 히어로 경로는 분리한다.
- 단색 히어로와 utility/legal/portal 페이지는 기존 렌더를 유지한다.

## 구현 범위

1. `PageHero`에 `backgroundTreatment?: 'auto' | 'soft' | 'sharp'` 옵션을 추가한다.
2. URL 기반 resolver를 추가해 `auto/soft/sharp`와 빌드 타임 품질 JSON을 합산한다.
3. `PageHeroBackground`는 보정 시 이미지에 약한 `brightness/saturate` 조정만 적용하고, 블러는 쓰지 않는다.
4. `PageHero` 오버레이는 보정 시 중앙 그라디언트와 radial vignette만 강화한다.
5. 새 스크립트 `scripts/measure-page-hero-image-quality.js`를 추가해 정적 서브 히어로 후보를 측정하고 `lib/page-hero-image-quality.generated.json`을 갱신한다.
6. `npm run build` 파이프라인에 서브 히어로 측정 단계를 추가한다.

## 검증

- resolver 단위 테스트로 `auto/soft/sharp` 매트릭스를 검증한다.
- 측정 스크립트 단위 테스트로 로컬 public 이미지, 원격 이미지, 실패 URL 폴백 경로를 검증한다.
- `npm run type-check`, `npm run lint`, targeted Jest를 실행한다.

---

# CI e2e-a11y 실패 수정 계획 (2026-06-14)

## 확인된 실패 범위

- 최신 GitHub Actions `CI` run에서 기본 `ci` job은 통과했고, `e2e-a11y` job만 실패했다.
- 실패 항목은 카트/체크아웃 a11y와 오윤 추도식 신청 a11y 경로였다.

## 원인

1. 카트 a11y 테스트 seed 작품 ID가 정적 fallback 데이터에 없어, CI placeholder Supabase 환경에서 실제 항목 UI가 안정적으로 렌더되지 않았다.
2. `getCartArtworks`가 공개 카트 조회임에도 service-role admin client를 요구해 CI e2e 런타임에서 `AUTH_CFG_MISSING_ADMIN_KEY`가 발생했다.
3. 카트 sold-out/가격 UI와 추도식 예술 의미 번호 텍스트가 WCAG AA 대비 기준에 못 미쳤다.
4. 추도식 안내 카드의 `<dl>` 내부 `dt/dd`가 axe 규칙이 기대하는 그룹 구조에서 벗어나 있었다.
5. CI e2e 환경에 Toss 키가 없어 `/checkout`이 결제 셸 대신 404를 렌더할 수 있었고, 테스트의 `networkidle` 대기가 이미지/외부 요청 상태에 취약했다.

## 수정 계획

1. `getCartArtworks`를 공개 Supabase anon client + 정적 fallback 기반으로 바꾸고, placeholder Supabase 환경에서는 즉시 fallback을 사용한다.
2. a11y 카트 테스트 seed를 정적 fallback에도 존재하는 공개 작품 UUID로 교체한다.
3. 카트 sold-out/가격/경고 텍스트와 추도식 번호 텍스트를 접근성 대비가 확보된 브랜드 토큰으로 교체한다.
4. 추도식 안내 `<dl>` 구조를 axe가 허용하는 직접 `dt/dd` 그룹 구조로 정리한다.
5. CI e2e job에 checkout 렌더용 Toss placeholder env를 추가한다.
6. Playwright a11y 테스트는 `networkidle` 대신 실제 heading/seed 작품 렌더를 기다리도록 안정화한다.
7. targeted Playwright a11y, lint/type-check/build/Jest/작품 검증을 실행하고 결과를 `walkthrough.md`에 정리한다.

---

# 결제 흐름 보안 강화 실행 계획 (2026-06-14)

## 추도식 행사 잔여 버그 2차 수정 계획 (2026-06-14)

### 목표

- Supabase migration version timestamp 중복을 제거해 원격 DB 적용 충돌을 막는다.
- 자동환불 실패 건을 일반 `cancelled`로 숨기지 않고 관리자 화면에서 수동 환불 대상으로 식별 가능하게 한다.
- 대기자 결제 링크가 만료된 경우 기존 대기자 행을 다시 안내할 수 있게 복구한다.
- 결제 실패 랜딩은 실제로 취소된 행이 있을 때만 취소 완료 메시지를 표시한다.

### 구현 범위

1. Migration 정리
   - 행사 관련 migration 3개를 장바구니 migration과 겹치지 않는 고유 timestamp로 rename한다.
   - 테스트가 새 migration 경로를 참조하도록 갱신한다.

2. 자동환불 실패 상태
   - 결제 확정 실패 후 자동환불 실패 시 `expired`와 `payment_key`로 운영 확인 상태를 남긴다.
   - 관리자 화면에서 `expired + payment_key`는 수동 환불 취소 액션을 표시한다.

3. 대기자 결제 링크 만료 복구
   - 만료된 pending 대기자 결제 조회 시 행을 다시 `waitlist`로 되돌린다.
   - 관리자 화면에서 만료 pending도 결제 안내 재발송 대상이 되게 한다.

4. 실패 랜딩 정확성
   - 행사 pending 취소 액션은 update 영향 row를 확인한다.
   - 변경된 행이 없으면 성공 메시지를 표시하지 않는다.

5. 테스트
   - migration version 중복 가드를 추가한다.
   - 자동환불 실패, 만료 복구, 실패 랜딩 취소 row-count 확인을 회귀 가드로 추가한다.

## 추도식 행사 잔여 버그 수정 계획 (2026-06-14)

### 목표

- 대기자 결제 안내가 실제 문자 발송 시도 전에 성공으로 표시되지 않게 한다.
- 행사 결제창 취소/실패 후 `pending` 좌석 hold가 15분간 남지 않게 한다.
- 관리자 확정자 환불 중 Toss 설정/네트워크 예외가 화면 오류로 번지지 않게 한다.

### 구현 범위

1. 대기자 결제 안내
   - `sendWaitlistPaymentLink`가 SMS 발송 결과를 기다린 뒤 성공을 반환한다.
   - SMS 발송 실패 시 승격한 행을 다시 `waitlist`로 되돌리고, 관리자에게 실패 메시지를 반환한다.

2. 행사 결제 실패 랜딩
   - 실패 랜딩에서 Toss `orderId`/`code`/`message`를 브라우저 URL에서 읽는다.
   - `orderId`가 있으면 공개 server action으로 해당 `pending` 행사 신청을 `cancelled`로 정리한다.
   - 실패 사유와 주문번호를 사용자에게 표시한다.

3. 관리자 환불 안정화
   - `refundConfirmedRegistration`의 Toss cancel 호출을 `try/catch`로 감싼다.
   - 관리자 client의 공통 `run()`도 action reject를 실패 메시지로 표시한다.

4. 테스트
   - 행사 fail client가 URL orderId를 읽고 pending 취소 액션을 호출하는지 정적 회귀 가드를 추가한다.
   - 대기자 발송 실패 rollback과 관리자 환불 throw 처리 가드를 추가한다.

## 추도식 행사 결제/대기자 운영 개선 계획 (2026-06-14)

### 목표

- 행사 결제 confirm에서 `pending`이 아닌 신청은 Toss 승인 전에 차단하고, 승인 이후 DB 확정이 실패한 경우에는 자동 환불을 시도한다.
- 관리자 화면에서 확정 결제자를 단순 상태 변경으로 취소하지 못하게 하고, 확정자는 Toss 환불을 거친 취소 흐름으로 분리한다.
- 대기자 결제 안내는 새 신청을 유도하지 않고 기존 대기자 행을 `pending`으로 승격해 동일 행에서 결제를 이어가게 한다.
- 영문 행사 페이지에서 시작한 결제는 영문 success/fail 랜딩으로 돌아오게 한다.

### 구현 범위

1. DB RPC
   - `promote_waitlist_event_registration(id, hold_minutes)` RPC를 추가해 대기자 행을 lock 후 `pending`으로 승격하고 `order_no`/hold를 발급한다.
   - 기존 좌석 계산과 같은 advisory lock을 사용해 정원 초과 승격을 차단한다.

2. 서버 액션/API
   - 행사 confirm API는 `pending` 외 상태를 Toss confirm 전에 거부한다.
   - Toss 승인 후 `confirm_event_registration`이 실패하면 자동 환불을 시도하고 신청 상태/`payment_key`를 운영 확인 가능하게 남긴다.
   - 관리자 취소 액션은 `pending`/`waitlist`만 상태 취소하고, `confirmed`는 별도 환불 액션으로 처리한다.
   - 대기자 결제 안내 액션은 승격 RPC를 호출한 뒤 `eventOrderNo`가 포함된 결제 재개 링크를 발송한다.
   - 공개 페이지용 결제 재개 액션을 추가해 `eventOrderNo`로 pending 결제 정보를 조회한다.

3. 클라이언트
   - 행사 신청 폼은 locale을 반영해 success/fail URL을 만든다.
   - `eventOrderNo` 링크로 들어온 사용자가 기존 pending 결제를 버튼으로 이어서 진행할 수 있게 한다.
   - 관리자 화면은 확정자에게 환불 취소 버튼을 분리해 표시한다.

4. 테스트
   - 행사 confirm route의 상태 가드와 자동 환불 경로를 단위 테스트로 검증한다.
   - 대기자 승격/결제 재개/locale URL은 정적 회귀 테스트로 검증한다.

## 추가 개선 계획 (2026-06-14)

### 목표

- Toss가 success/fail URL에 결제 파라미터를 붙이는 과정에서 기존 query와 충돌하지 않도록, 카드/간편결제/PayPal 콜백 URL 자체에는 checkout token query를 싣지 않는다.
- 결제창 취소처럼 Toss가 `orderId`를 돌려주지 않는 실패 랜딩에서도, 같은 탭의 sessionStorage에 보관한 주문번호와 token으로 `pending_payment` 주문을 정리한다.
- 토큰 도입 전 legacy 무통장 성공 랜딩 허용은 `metadata.payment_provider = "manual_bank_transfer"` 주문으로 제한한다.

### 구현 범위

1. 결제 클라이언트
   - 주문 생성 직후 `orderNo`와 `checkoutToken`을 sessionStorage에 저장한다.
   - Toss SDK/hosted checkout으로 전달하는 success/fail URL은 query 없는 canonical 경로로 유지한다.
   - success/fail 랜딩은 URL query의 token을 우선 사용하되, 없으면 sessionStorage에서 `orderId` 기준 또는 작품별 최근 주문 기준으로 복구한다.

2. 서버 액션
   - `initiatePayment`가 Toss hosted checkout payload에 token query를 추가하지 않도록 조정한다.
   - `verifyBankTransferLanding`의 legacy 허용을 manual bank transfer 주문으로 한정한다.

3. 테스트
   - Toss URL payload에 checkout token이 포함되지 않는지 검증한다.
   - fail 랜딩이 token query 없이도 sessionStorage fallback으로 취소 액션을 호출하는지 정적 회귀 가드를 추가한다.
   - legacy 무통장 검증이 `manual_bank_transfer` metadata에만 열려 있는지 검증한다.

## 잔여 버그 개선 계획 (2026-06-14)

### 목표

- sessionStorage 저장 실패, 새 탭, 외부 브라우저 전환 등으로 client-side checkout session이 사라져도 정상 결제 confirm이 막히지 않도록 서버 쿠키 fallback을 추가한다.
- `/fail` 직접 진입만으로 최신 pending 주문이 취소되지 않도록, orderId 없는 fallback 취소는 Toss 실패 신호가 있는 경우로 제한한다.

### 구현 범위

1. 서버 checkout session cookie
   - `createOrder` 성공 시 `orderNo`별 checkout cookie와 작품별 latest checkout cookie를 저장한다.
   - cookie에는 raw token과 필요한 최소 정보만 넣고, DB에는 계속 SHA-256 hash만 유지한다.
   - `/api/payments/toss/confirm`은 request body token이 없을 때 order cookie에서 token을 복구한다.

2. 실패 랜딩 취소
   - `FailClient`는 URL의 `orderId`가 없을 때 Toss `code`가 있는 경우에만 latest fallback을 사용한다.
   - sessionStorage가 없더라도 서버 액션이 latest checkout cookie에서 token/orderId를 복구해 취소할 수 있게 한다.

3. 테스트
   - confirm route가 token 없는 body에서도 order cookie fallback으로 Toss confirm을 진행하는지 검증한다.
   - fail client가 code 없는 직접 진입에서 latest fallback 취소를 하지 않는지 정적 가드를 추가한다.

## 목표

- 주문번호만으로 `pending_payment` 주문을 취소하거나 결제 랜딩을 검증할 수 있는 흐름을 차단한다.
- 주문 생성 시 1회성 checkout token을 발급하고, DB에는 원문이 아닌 SHA-256 해시만 `orders.metadata.checkout_token_hash`에 저장한다.
- 결제 시작, Toss confirm, 실패 랜딩 취소, 계좌이체 성공 랜딩 검증에서 동일 token을 요구한다.

## 구현 범위

1. `app/actions/checkout.ts`
   - checkout token 생성/해시/검증 헬퍼 추가
   - `CreateOrderResult` 성공 타입에 `checkoutToken` 추가
   - `createOrder` insert metadata에 `checkout_token_hash` 저장
   - `initiatePayment` 입력에 `checkoutToken` 추가 및 Toss 세션 생성 전 검증
   - `createBankTransferOrder` metadata update와 redirect URL에 token 반영
   - `verifyBankTransferLanding(orderId, checkoutToken)`로 변경
   - `cancelLandingOrder(orderId, checkoutToken)`로 변경

2. 결제 클라이언트/confirm API
   - 국내/해외 결제 success/fail URL에 `checkoutToken` query 추가
   - PayPal `initiatePayment` 호출에 token 전달
   - `SuccessClient`가 URL token을 읽어 confirm API와 계좌이체 검증에 전달
   - `FailClient`가 token이 있을 때만 landing cancel 호출
   - `/api/payments/toss/confirm` request body에 token을 요구하고 Toss confirm 전 검증

3. 테스트
   - 주문 생성 시 raw token 반환 및 hash 저장 검증
   - token 없는/불일치 landing cancel 차단 검증
   - token 불일치 `initiatePayment`가 Toss 호출 전 실패하는지 검증
   - 랜딩 클라이언트의 token 전달 정적 회귀 테스트 추가

## 검증 명령

- `npm test -- --runTestsByPath __tests__/actions/checkout.test.ts __tests__/app/checkout-landing-client-search.test.ts __tests__/app/checkout-success-analytics.test.ts --runInBand`
- `npm run lint -- --quiet`
- 필요 시 `npm run type-check`

---

# Google Merchant API 상품 동기화 실행 계획 (2026-06-09)

## 목표

Google Merchant Center의 쇼핑 탭 상품 등록을 수동 입력이나 웹사이트 자동 크롤링에만 의존하지 않고, Merchant API로 SAF 작품 데이터를 직접 create/update/delete 할 수 있게 만든다.

## 공식 문서 기준

- Merchant API는 Content API for Shopping의 후속 방향이다.
- 상품 업로드 전 `API` input 타입의 primary product data source가 필요하다.
- 상품 create/update/delete는 `accounts/{ACCOUNT_ID}/productInputs` 리소스를 대상으로 한다.
- 인증 scope는 `https://www.googleapis.com/auth/content`이다.
- API 상품은 만료 방지를 위해 최소 30일마다 갱신해야 한다.

## 환경변수

- `GOOGLE_MERCHANT_ACCOUNT_ID`: Merchant Center account ID
- `GOOGLE_MERCHANT_DATASOURCE_NAME`: `accounts/{accountId}/dataSources/{dataSourceId}`
- `GOOGLE_MERCHANT_OAUTH_CLIENT_ID`
- `GOOGLE_MERCHANT_OAUTH_CLIENT_SECRET`
- `GOOGLE_MERCHANT_OAUTH_REFRESH_TOKEN`

서비스 계정이 Merchant Center 권한에 정상 연결되는 경우 `GOOGLE_MERCHANT_SERVICE_ACCOUNT_KEY`도 지원할 수 있으나, Merchant API 문서상 기본 흐름은 OAuth 2.0 사용자 권한이다. 먼저 OAuth refresh token 방식을 기본값으로 둔다.

## 구현 범위

1. Merchant API client 추가
   - `lib/google-merchant/client.ts`
   - OAuth refresh token 기반 access token 발급
   - REST 호출 wrapper
   - dry-run 모드에서는 외부 요청 생략

2. 작품 → Merchant product input 매핑 추가
   - `lib/google-merchant/product-mapper.ts`
   - 판매 가능 작품만 기본 포함
   - `sold`, `reserved`, `hidden`, 가격 미확정 작품은 제외 또는 `out_of_stock` 정책으로 분기
   - SAF 작품 특성상 `identifier_exists: false`
   - currency는 `KRW`
   - target country/feed label은 1차 `KR`
   - language는 1차 `ko`

3. 동기화 스크립트 추가
   - `scripts/google-merchant-sync.js`
   - 기본 `--dry-run`
   - `--apply`를 붙일 때만 실제 insert/delete 실행
   - `--limit`, `--only-id`, `--delete-missing`, `--refresh-all` 옵션 지원
   - 실행 결과를 `reports/google-merchant-sync-YYYY-MM-DD.{json,md}`로 저장

4. npm script 추가
   - `merchant:sync`: dry-run 기본 실행
   - `merchant:sync:apply`: 실제 반영

5. 테스트 추가
   - 상품 payload 필수 필드 검증
   - 가격 파싱 불가/품절/예약/숨김 작품 제외 검증
   - 상품 ID 안정성 검증
   - dry-run이 외부 API를 호출하지 않는지 검증

## 상품 필드 1차 매핑

- `offerId`: SAF artwork id
- `contentLanguage`: `ko`
- `feedLabel`: `KR`
- `channel`: `ONLINE`
- `attributes.title`: 작품명 + 작가명
- `attributes.description`: 작품 설명 + 재료/크기/연도 요약
- `attributes.link`: `https://www.saf2026.com/artworks/{id}`
- `attributes.imageLink`: 대표 이미지 URL
- `attributes.additionalImageLinks`: 나머지 이미지
- `attributes.price`: `{ amountMicros, currencyCode: 'KRW' }`
- `attributes.availability`: `IN_STOCK` 또는 정책상 제외
- `attributes.condition`: `NEW`
- `attributes.brand`: `SAF2026`
- `attributes.customLabel0`: 작가명
- `attributes.customLabel1`: 카테고리
- `attributes.customLabel2`: edition type 또는 edition
- `attributes.identifierExists`: false

## 실행 순서

1. Merchant Center에서 `설정 완료`를 눌러 비즈니스/배송/반품/웹사이트 확인을 끝낸다.
2. OAuth refresh token과 Merchant account ID를 환경변수로 넣는다.
3. `npm run merchant:sync -- --dry-run --limit 5`로 payload를 검토한다.
4. Merchant API data source가 없으면 스크립트 또는 별도 setup 명령으로 생성한다.
5. `npm run merchant:sync:apply -- --limit 5`로 소수 상품을 먼저 반영한다.
6. Merchant Center 진단에서 승인/불승인 사유를 확인한다.
7. 전체 상품 반영 후 주기적 refresh를 cron/GitHub Actions/Vercel Cron 중 하나로 연결한다.

## 위험 및 보류 판단

- 실제 작품이 원작/사후판화이므로 Google product data specification의 `brand`, `gtin`, `mpn` 요구를 일반 공산품처럼 채우면 안 된다. `identifier_exists: false`를 기본으로 한다.
- 배송/반품/세금 설정이 Merchant Center에서 완료되지 않으면 API 상품 자체는 올라가도 쇼핑 노출이 제한될 수 있다.
- 기존 GSC Product snippets 오류를 재발시키지 않기 위해, 페이지 JSON-LD에 `Product`를 되살리는 작업은 이번 범위에서 제외한다.
- API 반영은 `--apply` 없이는 절대 실행하지 않는다.

## 검증

- `npm test -- __tests__/lib/google-merchant/product-mapper.test.ts`
- `npm test -- __tests__/scripts/google-merchant-sync.test.js`
- `npm run type-check`
- `npm run lint`
- dry-run 리포트에서 상품 수, 제외 사유, 샘플 payload 확인

---

# GSC 잔존 개선사항 정리 실행계획 (2026-06-09)

## 1) 목표

- GSC 전수 감사 리포트에 남은 P1/P2 rich result 오류·경고를 코드 레벨에서 제거하거나, 정책상 보강 가능한 필드는 실제 데이터와 맞게 추가한다.
- 가짜 리뷰·평점처럼 Google 정책 위반 소지가 있는 데이터는 생성하지 않고, 해당 rich result eligibility를 끊는다.

## 2) 수정 범위

- 작품 상세 JSON-LD
  - `FAQPage` 주입을 제거해 `Duplicate field "FAQPage"` 오류를 차단한다.
  - `VisualArtwork`에서 `offers`, `audience` 등 Product/Merchant 감지 유발 필드를 제거해 Product snippets/Merchant listings 경고를 줄인다.
  - `ImageObject`에 실제 작가 기준 `creditText`, `copyrightNotice`를 추가한다.
- 작가 페이지 JSON-LD
  - `CollectionPage.mainEntity -> ItemList` 연결을 제거해 `Invalid object type for field "mainEntity"` 오류를 차단한다.
- 현실 페이지 JSON-LD
  - 증언을 `Review` rich result로 발행하지 않아 `Invalid object type for field "itemReviewed"` 오류를 제거한다.

## 3) 검증

- 회귀 테스트를 먼저 추가해 현재 코드에서 실패를 확인한다.
- 수정 후 관련 테스트, `npm run type-check`, `npm run lint`를 실행한다.
- 배포 후에는 GSC 감사 스크립트로 동일 샘플 URL을 재점검한다.

---

# Resend 회신 수신·저장·스레드 답장 구현 계획 (2026-06-09)

## 1) 목적

- Resend Inbound `email.received` webhook을 SAF 앱에서 검증·수신한다.
- Resend Receiving API로 본문/헤더를 조회해 Supabase `email_inbound_messages`에 멱등 저장한다.
- 관리자가 `/admin/email`에서 받은 회신을 확인하고 같은 메일 스레드로 답장할 수 있게 한다.

## 2) 구현 범위

- Supabase migration
  - `email_inbound_messages` 테이블, 인덱스, RLS, admin/service_role 정책과 grants를 추가한다.
  - `resend_email_id` unique 제약으로 webhook 재시도 중복 저장을 방지한다.

- Resend webhook/수신 처리
  - 기존 `app/api/webhooks/resend/route.ts`의 Svix 서명 검증과 bounce/complaint 처리를 유지한다.
  - `email.received` 이벤트를 분기 처리한다.
  - webhook 메타데이터를 먼저 upsert한 뒤 Resend Receiving API로 `html`, `text`, `headers`를 조회해 저장한다.
  - `In-Reply-To`/`References` 또는 수신 주소 태그로 기존 `email_broadcast_recipients`와 best-effort 매칭한다.
  - 운영자 알림 메일 발송 실패는 저장 성공을 깨지 않도록 로그만 남긴다.

- 발송/답장
  - 브로드캐스트/테스트 메일은 `reply+{recipientRowId}@reply.saf2026.com` 형태의 `reply_to`를 포함한다.
  - 구매자/작가/관리자 알림성 메일은 기본 `reply@reply.saf2026.com`을 사용한다.
  - 관리자 답장은 받은 메일의 `message_id`를 `In-Reply-To`/`References` 헤더로 넣어 Resend API로 발송한다.

- 관리자 UI
  - `/admin/email`에 “받은 회신” 섹션을 추가한다.
  - 목록/상세, 본문 미리보기, 첨부 메타데이터, 상태, 답장 폼을 제공한다.

## 3) 테스트 계획

- 실패 테스트를 먼저 추가한다.
  - `parseResendEvent`가 `email.received` 메타데이터를 보존한다.
  - inbound 저장 헬퍼가 webhook 메타데이터 upsert → Receiving API 조회 → update 순서를 수행한다.
  - 동일 `resend_email_id` 재처리는 중복 insert 없이 update로 귀결된다.
  - Receiving API 실패 시 webhook이 500으로 재시도 가능 상태를 반환한다.
  - 답장 헬퍼가 `In-Reply-To`/`References` 헤더를 포함한다.
- 검증 명령:
  - `npm test -- __tests__/lib/email/resend-webhook.test.ts`
  - `npm test -- __tests__/lib/email/inbound.test.ts`
  - `npm test -- __tests__/app/resend-webhook-route.test.ts`
  - `npm run type-check`

## 4) 승인

사용자 발화 `PLEASE IMPLEMENT THIS PLAN`에 따라 위 범위 실행을 승인된 것으로 간주하고 진행한다.

---

# GSC 개선사항 오류 전수 점검 실행 기록 (2026-06-09)

## 1) 목적

- Google Search Console URL Inspection API로 SAF 2026의 리치 결과 개선사항 오류/경고를 전수 점검한다.
- Search Analytics 최근 28일 노출 URL과 sitemap URL을 합쳐 검사 대상을 만들고, 오류 유형별 원인 코드 경로와 우선순위를 리포트한다.

## 2) 구현 범위

- `scripts/gsc-rich-results-audit.js`
  - GSC Search Analytics API에서 최근 28일 URL 수집
  - `https://www.saf2026.com/sitemap.xml` 재귀 수집
  - URL Inspection API 저병렬 검사
  - rich result issue grouping, severity/priority mapping, route classification
  - JSON/Markdown 리포트 생성
- `__tests__/scripts/gsc-rich-results-audit.test.js`
  - route classification, severity priority, issue grouping, markdown rendering 테스트
- `package.json`
  - `npm run gsc:rich-audit` 스크립트 추가
- `reports/gsc-rich-results-audit-2026-06-09.{json,md}`
  - 865개 URL 실제 전수 감사 결과 저장

## 3) 실행 결과

- 검사 대상: Search Analytics URL 250개 + sitemap URL 808개 = union 865개
- Inspection 실패: 0개
- Indexed URL: 724개
- Rich result PASS URL: 542개
- Rich result FAIL URL: 181개
- ERROR issue: 525개
- WARNING issue: 603개

## 4) 주요 이슈 그룹

- P1 `Product snippets`: `offers/review/aggregateRating` 중 하나 필요 — 371건, 대부분 매거진 글
- P1 `FAQ`: `Duplicate field "FAQPage"` — 106건, 작품 상세
- P1 `Unknown rich result`: `Invalid object type for field "mainEntity"` — 32건, 작가 페이지
- P1 `Review snippets`: `Invalid object type for field "itemReviewed"` — 15건, `/our-reality`
- P2 `Image Metadata`: `creditText`, `copyrightNotice` 누락 — 각 199건, 작품 상세
- P2 `Merchant listings`: `size`, `audience` object type 경고 — 28건, 작품 상세

## 5) 검증

- `npm test -- --runInBand __tests__/scripts/gsc-rich-results-audit.test.js` 통과
- `npm run gsc:rich-audit -- --dry-run --delay-ms 100 --concurrency 2` 통과
- `npm run gsc:rich-audit -- --delay-ms 100 --concurrency 4 --progress-every 50` 통과

---

# GSC 제품 스니펫 Product mention 오류 수정 계획 (2026-06-09)

## 1) 목적

- Google Search Console 제품 스니펫에서 관련 작품이 불완전한 `Product`로 집계되는 문제를 줄인다.
- 작품 상세의 `VisualArtwork` 전략과 매거진 `BlogPosting.mentions` 타입을 일관되게 맞춘다.
- 실제 리뷰/평점이 없는 작품에 가짜 `review` 또는 `aggregateRating`을 추가하지 않는다.

## 2) 구현 범위

- `lib/schemas/content.ts`
  - `BlogPostingMention.type`에서 작품 타입을 `Product`가 아니라 `VisualArtwork`로 허용한다.
  - 주석을 현재 구조화 데이터 전략에 맞게 정리한다.

- `app/[locale]/stories/[slug]/page.tsx`
  - 매거진 본문 관련 작품 `mentions` 타입을 `VisualArtwork`로 변경한다.

- `__tests__/schemas/schema-validation.test.ts`
  - `generateBlogPostingSchema`가 `VisualArtwork` mention을 그대로 내보내고, `Product` mention을 만들지 않는 회귀 테스트를 추가한다.

## 3) 완료 기준

- 코드베이스에서 매거진 관련 작품 mention에 `Product` 타입이 남지 않는다.
- schema 단위 테스트가 통과한다.
- 가능하면 `npm run type-check`로 타입 정합성을 확인한다.

---

# 관리자 이메일 발송 UX 전면 재정리 실행 계획 (2026-06-03)

## 1) 목적

- 관리자 이메일 폼을 내부 발송 모드가 아니라 `받는 사람` 구성 중심으로 재정리한다.
- 명단에 없는 이메일도 직접 입력해 발송 대상에 추가할 수 있게 한다.
- 실제 동작에 맞게 버튼과 성공 메시지를 `발송하기` / `발송을 시작했습니다` 기준으로 통일한다.

## 2) 구현 범위

- `BroadcastForm`
  - `세그먼트 발송` / `검색 발송` 노출 제거
  - `받는 사람` 섹션에서 `그룹 전체 선택` 또는 `개별로 추가`를 고르게 변경
  - 개별 추가 안에서 명단 검색과 이메일 직접 입력을 함께 지원
  - 직접 입력 이메일은 쉼표/줄바꿈으로 파싱하고, 형식 오류/중복/이미 추가됨을 즉시 요약
  - 최종 CTA를 `발송하기`, 테스트 CTA를 `나에게 테스트 보내기`로 변경

- `ContactSearch`
  - `명단에서 찾아 추가`, `추가`, `선택된 받는 사람` 문구로 변경
  - 선택된 받는 사람 목록에서 개별 해제/전체 해제 유지

- 서버 액션
  - 성공 메시지를 `발송을 시작했습니다`로 변경
  - 광고성 개별 발송은 고객 마케팅 수신거부도 함께 제외
  - 기존 큐/수신거부/중복 제거 구조는 유지

## 3) 완료 기준

- UI에 `검색 발송`, `세그먼트 발송`, `발송 예약` 문구가 남지 않는다.
- 명단 검색 결과와 직접 입력 이메일을 같은 선택 목록에 추가할 수 있다.
- 대상 0명 또는 입력 중인 이메일 미추가 상태는 발송 전에 차단된다.

# 관리자 이메일 작품 구매자 대상 검색 선택 계획 (2026-06-03)

## 1) 목적

- 관리자가 특정 작품 구매자 발송 대상을 UUID 직접 입력 없이 작품명/작가명 검색으로 선택하게 한다.
- 웹사이트 작품 검색과 같은 `matchesAnySearch` 기반 한글 완화 검색을 사용한다.
- 선택된 작품 ID만 기존 `ArtworkBuyerAudienceResolver`로 전달해 발송 정책은 유지한다.

## 2) 구현 범위

- 관리자 이메일 서버 액션
  - 작품 검색 액션 추가
  - 검색 대상: 작품명, 영문 작품명, 작가명, 영문 작가명
  - 반환: 작품 ID, 제목, 작가명, 상태, 대표 이미지

- 관리자 이메일 UI
  - `특정 작품 구매자` 선택 시 UUID input 대신 실시간 작품 검색/선택 UI 표시
  - 300ms 디바운스 검색, 검색 결과 없음 안내, 선택된 작품 요약과 해제 지원
  - 선택된 작품 ID는 기존 `SegmentSelection.artworkId`에 저장

## 3) 완료 기준

- 작품명 일부 또는 작가명 일부를 입력하면 후보 작품이 실시간 표시된다.
- 후보를 클릭하면 작품 ID가 내부 상태에 저장되고 수신자 미리보기에 반영된다.
- 작품 선택 전에는 발송 예약이 차단된다.

# 관리자 이메일 발송 UX 메인 반영 계획 (2026-06-03)

## 1) 목적

- main의 최신 관리자 이메일 발송 UI에서 검색 발송 선택 상태와 발송 전 차단 사유를 더 명확히 표시한다.
- 기존 세그먼트 발송, 검색 발송, 템플릿, 테스트 발송 구조는 유지한다.

## 2) 구현 범위

- `BroadcastForm`
  - 검색 발송 수신자 0명, 청원 미선택, 작품 구매자 작품 ID 미입력 상태를 발송 전 차단한다.
  - 차단 사유를 발송 버튼 위에 표시한다.
  - 기존 submit/test/contact-search 로딩 분리는 유지한다.

- `ContactSearch`
  - 검색 결과 0건 안내를 표시한다.
  - 선택된 수신자를 이름과 이메일로 검토할 수 있는 패널로 변경한다.
  - 선택 수신자 개별 해제와 전체 해제를 지원한다.

## 3) 완료 기준

- 검색 발송에서 수신자 0명일 때 발송 예약 버튼이 비활성화된다.
- 세그먼트 발송 필수 조건이 빠졌을 때 차단 사유가 보인다.
- 선택된 수신자 이메일을 한눈에 확인하고 해제할 수 있다.

---

# 관리자 이메일 시스템 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 이메일 시스템의 중복 큐 등록, 청원 수신자 미리보기, 발송 통계 불일치, 마크다운 안내 오해를 줄인다.

**Architecture:** 서버 액션의 수신자 미리보기 입력을 실제 발송 입력과 맞추고, 큐 등록 멱등성은 DB 제약으로 보강한다. 디스패치 통계는 최종 상태 전체를 반영하도록 집계하고, 마크다운 렌더링을 추가하지 않는 대신 UI 문구를 현재 동작과 일치시킨다.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Jest, React Email

---

## 1) 범위

- 수정:
  - `app/actions/admin-broadcast.ts`
  - `app/(portal)/admin/email/_components/AudiencePreview.tsx`
  - `app/(portal)/admin/email/_components/BroadcastForm.tsx`
  - `app/api/internal/broadcast-dispatch/route.ts`
  - `supabase/migrations/20260604090000_email_broadcast_idempotency_key.sql`
- 테스트 추가:
  - `__tests__/actions/admin-broadcast.test.ts`
  - `__tests__/app/broadcast-dispatch.test.ts`
- 문서:
  - `walkthrough.md`

## 2) 구현 작업

### Task 1: 청원 수신자 미리보기 입력 정합성

**Files:**

- Modify: `app/actions/admin-broadcast.ts`
- Modify: `app/(portal)/admin/email/_components/AudiencePreview.tsx`
- Modify: `app/(portal)/admin/email/_components/BroadcastForm.tsx`
- Test: `__tests__/actions/admin-broadcast.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`previewAudience`가 청원 슬러그를 받아 실제 `PetitionAudienceResolver`를 호출하는지 테스트한다.

```ts
it('petition preview uses petitionSlug and returns signer count', async () => {
  mockRequireAdmin.mockResolvedValue({ id: 'admin-1' });
  mockPetitionResolve.mockResolvedValue([
    { email: 'one@example.com', name: 'one', locale: 'ko', emailHash: 'h1' },
    { email: 'two@example.com', name: 'two', locale: 'ko', emailHash: 'h2' },
  ]);

  const result = await previewAudience({ channel: 'petition', petitionSlug: 'oh-yoon' });

  expect(mockPetitionResolver).toHaveBeenCalledWith('oh-yoon');
  expect(result).toEqual({ total: 2, breakdown: { petition: 2 } });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:

```bash
npm test -- --runInBand __tests__/actions/admin-broadcast.test.ts
```

Expected: `previewAudience`가 현재 `BroadcastChannel`만 받기 때문에 TypeScript 또는 런타임 기대값 불일치로 실패한다.

- [ ] **Step 3: 서버 액션 시그니처 변경**

`app/actions/admin-broadcast.ts`의 `previewAudience`를 아래 형태로 바꾼다.

```ts
export interface PreviewAudienceInput {
  channel: BroadcastChannel;
  petitionSlug?: string;
}

export async function previewAudience(input: PreviewAudienceInput): Promise<{
  total: number;
  breakdown: Record<string, number>;
}> {
  await requireAdmin();

  const { channel, petitionSlug } = input;

  if (channel === 'member') {
    const resolver = new MemberAudienceResolver();
    const recipients = await resolver.resolve();
    return { total: recipients.length, breakdown: { member: recipients.length } };
  }

  if (channel === 'customer') {
    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();
    return { total: recipients.length, breakdown: { '동의자·거래고객': recipients.length } };
  }

  if (channel === 'petition') {
    if (!petitionSlug?.trim()) {
      return { total: 0, breakdown: { '청원 슬러그 필요': 0 } };
    }
    const resolver = new PetitionAudienceResolver(petitionSlug.trim());
    const recipients = await resolver.resolve();
    return { total: recipients.length, breakdown: { petition: recipients.length } };
  }

  return { total: 0, breakdown: {} };
}
```

- [ ] **Step 4: 클라이언트 입력 연결**

`AudiencePreview` props를 `{ channel, petitionSlug }`로 확장하고, `BroadcastForm`에서 `petitionSlug` 상태를 전달한다.

```tsx
<AudiencePreview channel={channel} petitionSlug={petitionSlug} />
```

`handlePreview`는 아래처럼 호출한다.

```ts
const r = await previewAudience({ channel, petitionSlug });
```

- [ ] **Step 5: 테스트 통과 확인**

Run:

```bash
npm test -- --runInBand __tests__/actions/admin-broadcast.test.ts
```

Expected: PASS.

### Task 2: 브로드캐스트 큐 등록 멱등성 DB 보강

**Files:**

- Modify: `app/actions/admin-broadcast.ts`
- Create: `supabase/migrations/20260604090000_email_broadcast_idempotency_key.sql`
- Test: `__tests__/actions/admin-broadcast.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

동일 admin/channel/subject가 동시에 들어올 때 `23505` unique violation을 사용자 친화 메시지로 처리하는지 테스트한다.

```ts
it('returns existing-campaign message when idempotency unique constraint races', async () => {
  mockRequireAdmin.mockResolvedValue({ id: 'admin-1' });
  mockMemberResolve.mockResolvedValue([
    { email: 'artist@example.com', name: 'artist', locale: 'ko', emailHash: 'h1' },
  ]);
  mockBroadcastInsert.mockResolvedValue({
    data: null,
    error: { code: '23505', message: 'duplicate key value violates unique constraint' },
  });

  const result = await enqueueBroadcast({
    channel: 'member',
    subject: '공지',
    bodyMd: '본문',
  });

  expect(result).toEqual({
    message: '동일한 캠페인이 최근 등록되어 있습니다. 기존 발송이 진행 중입니다.',
    error: false,
  });
});
```

- [ ] **Step 2: DB 마이그레이션 추가**

최근 5분 조건은 partial unique index로 표현하기 어렵기 때문에, 생성 시각을 5분 버킷으로 고정한 멱등성 키 컬럼을 둔다.

```sql
ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_email_broadcasts_idempotency_key_active
  ON public.email_broadcasts (idempotency_key)
  WHERE idempotency_key IS NOT NULL
    AND status IN ('queued', 'sending');
```

- [ ] **Step 3: 서버 액션에서 키 생성**

`enqueueBroadcast`에서 insert 전에 아래 키를 만든다.

```ts
const idempotencyBucket = Math.floor(Date.now() / (5 * 60 * 1000));
const idempotencyKey = `${admin.id}:${channel}:${subject.trim()}:${idempotencyBucket}`;
```

insert payload에 추가한다.

```ts
idempotency_key: idempotencyKey,
```

`broadcastError?.code === '23505'`이면 중복 캠페인 메시지를 반환한다.

```ts
if (broadcastError?.code === '23505') {
  return {
    message: '동일한 캠페인이 최근 등록되어 있습니다. 기존 발송이 진행 중입니다.',
    error: false,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run:

```bash
npm test -- --runInBand __tests__/actions/admin-broadcast.test.ts
```

Expected: PASS.

### Task 3: 디스패치 최종 집계 상태 보정

**Files:**

- Modify: `app/api/internal/broadcast-dispatch/route.ts`
- Test: `__tests__/app/broadcast-dispatch.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`bounced`와 `complained`가 있는 브로드캐스트를 finalize할 때 `failed_count`에 포함되는지 테스트한다.

```ts
it('counts bounced and complained recipients as failed when finalizing broadcast', async () => {
  mockPendingQuery.mockResolvedValue({ data: [], error: null });
  mockCountByStatus.mockImplementation((status: string) => {
    const counts: Record<string, number> = { sent: 8, failed: 1, bounced: 2, complained: 1 };
    return Promise.resolve({ count: counts[status] ?? 0, error: null });
  });

  await GET(makeCronRequest());

  expect(mockBroadcastUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ sent_count: 8, failed_count: 4 })
  );
});
```

- [ ] **Step 2: 집계 로직 변경**

기존 `sent`, `failed`만 세는 로직을 유지하되 `bounced`, `complained`도 실패 계열로 더한다.

```ts
const { count: bouncedCount } = await supabase
  .from('email_broadcast_recipients')
  .select('id', { count: 'exact', head: true })
  .eq('broadcast_id', broadcast.id)
  .eq('status', 'bounced');

const { count: complainedCount } = await supabase
  .from('email_broadcast_recipients')
  .select('id', { count: 'exact', head: true })
  .eq('broadcast_id', broadcast.id)
  .eq('status', 'complained');

const finalFailedCount = (failedCount ?? 0) + (bouncedCount ?? 0) + (complainedCount ?? 0);
```

update payload는 아래처럼 바꾼다.

```ts
failed_count: finalFailedCount,
```

- [ ] **Step 3: 테스트 통과 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/broadcast-dispatch.test.ts
```

Expected: PASS.

### Task 4: 본문 입력 라벨을 실제 동작과 일치

**Files:**

- Modify: `app/(portal)/admin/email/_components/BroadcastForm.tsx`

- [ ] **Step 1: 라벨과 placeholder 변경**

마크다운 렌더링을 추가하지 않고 현재 구현에 맞춰 “문단 텍스트”로 표현한다.

```tsx
<label htmlFor="broadcast-body" className="mb-1 block text-sm font-medium text-charcoal">
  본문
</label>
```

```tsx
placeholder = '이메일 본문을 입력하세요. 빈 줄로 문단을 구분합니다.';
```

- [ ] **Step 2: 정적 확인**

Run:

```bash
rg -n "본문 \\(마크다운\\)|마크다운" 'app/(portal)/admin/email'
```

Expected: 관리자 이메일 폼 경로에서 해당 문구가 나오지 않는다.

### Task 5: 검증 및 보고

**Files:**

- Modify: `walkthrough.md`

- [ ] **Step 1: 관련 테스트 실행**

Run:

```bash
npm test -- --runInBand __tests__/actions/admin-broadcast.test.ts __tests__/app/broadcast-dispatch.test.ts __tests__/lib/email/audiences/customer.test.ts __tests__/lib/email/audiences/member.test.ts __tests__/lib/email/audiences/petition.test.ts __tests__/lib/email/unsubscribe-token.test.ts __tests__/lib/email/resend-webhook.test.ts
```

Expected: PASS.

- [ ] **Step 2: 타입 및 lint 확인**

Run:

```bash
npm run lint
npm run type-check
```

Expected: 두 명령 모두 exit code 0.

- [ ] **Step 3: walkthrough 작성**

`walkthrough.md` 상단에 아래 내용을 추가한다.

```md
# 관리자 이메일 시스템 개선 결과 (2026-06-04)

## 변경 사항

- 청원 이메일 수신자 미리보기가 실제 청원 슬러그 기준 수신자 수를 보여주도록 수정.
- 브로드캐스트 중복 큐 등록을 DB unique index와 서버 액션 처리로 보강.
- 바운스/컴플레인 수신자를 최종 실패 통계에 포함.
- 관리자 이메일 본문 입력 라벨을 실제 문단 텍스트 동작과 일치시킴.

## 검증

- `npm test -- --runInBand ...`
- `npm run lint`
- `npm run type-check`
```

## 3) 완료 기준

- 청원 채널 미리보기가 `petitionSlug` 기준 실제 수신자 수를 반환한다.
- 동일 admin/channel/subject/5분 버킷의 중복 큐 등록이 DB 레벨에서 차단된다.
- 발송 완료 이력에서 `bounced`, `complained`가 실패 통계에 포함된다.
- 관리자 이메일 폼이 마크다운 렌더링을 암시하지 않는다.
- 관련 Jest, lint, type-check가 통과한다.

---

# 주문/검색 잔여 버그 개선 실행 계획 (2026-06-03)

## 1) 목적

- 전체 코드베이스 리뷰에서 발견한 실제 위험 2개를 고친다.
- 다른 기존 변경은 건드리지 않는다.

## 2) 수정 대상

### A. 주문 생성 시 기존 pending 주문 취소 조건 강화

- 현재 문제:
  - `createOrder`가 같은 `artworkId + buyerEmail`의 기존 `pending_payment` 주문을 바로 취소한다.
  - 다른 사람이 이메일을 알고 있으면 결제 대기 주문을 취소할 수 있다.
- 개선 방향:
  - 자동 취소 대상을 더 좁힌다.
  - 오래된 pending 주문만 정리하거나, 같은 세션/사용자 조건이 확인될 때만 취소한다.
  - 최소 수정으로는 “짧은 시간 내 타인의 주문 취소”가 불가능하도록 시간 조건을 추가한다.

### B. 검색 API limit 검증 강화

- 현재 문제:
  - `limit=-1`, `limit=abc` 같은 값이 들어오면 의도와 다른 결과가 나올 수 있다.
- 개선 방향:
  - `limit`을 정수로 파싱한다.
  - 허용 범위는 `1~20`으로 고정한다.
  - 잘못된 값은 기본값 `8`로 처리한다.

## 3) 테스트 계획

1. 검색 API limit 단위 테스트 추가
   - 음수 limit은 기본값 또는 최소값으로 안전 처리되는지 확인
   - 큰 limit은 20개로 제한되는지 확인
2. 주문 pending 취소 조건 테스트 추가
   - 같은 이메일/작품이어도 너무 최근 주문은 자동 취소하지 않는지 확인
   - 오래된 pending 주문만 정리되는지 확인

## 4) 검증

- 관련 Jest 테스트
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- 필요 시 전체 Jest

## 5) 완료 기준

- 두 버그가 테스트로 재현되고, 수정 후 통과한다.
- lint/type 검사가 통과한다.
- 변경 범위는 관련 테스트, `checkout.ts`, `app/api/search/route.ts`, 문서 기록으로 제한한다.

# 잔여 lint 경고 정리 실행 계획 (2026-06-03)

## 1) 목적

- 실제 서비스 코드 버그는 없지만, lint 경고가 너무 많아 중요한 문제를 보기 어렵다.
- 임시 실험 파일 경고와 React Compiler 경고를 먼저 줄인다.

## 2) 수정 범위

- `eslint.config.mjs`
  - `tmp/**`를 lint 제외 대상에 추가한다.
  - 이유: 임시 조사 스크립트의 `console.log` 경고가 서비스 코드 신호를 가린다.
- `components/common/GoogleAnalytics.tsx`
  - React Compiler가 싫어하는 `function (this: void)` 표현을 더 단순한 함수 표현으로 바꾼다.

## 3) 제외 범위

- 작품 데이터 경고 63개는 이번 작업에서 고치지 않는다.
- 여러 접근성 경고는 화면 동작 영향이 있을 수 있어 별도 작업으로 분리한다.

## 4) 검증

1. 수정 전 `npm run lint` 경고 상태를 기준으로 삼는다.
2. 수정 후 `npm run lint`를 다시 실행한다.
3. `npx tsc --noEmit --pretty false`를 실행한다.
4. 필요하면 관련 Jest 테스트를 실행한다.

## 5) 완료 기준

- lint error 0개를 유지한다.
- `tmp/**` 경고가 사라진다.
- `GoogleAnalytics.tsx`의 React Compiler 경고가 사라진다.
- 코드 변경은 위 두 파일에만 제한한다.

# 스토리 제목 하이픈 정리 실행 계획 (2026-04-09)

## 1) 목적

- Partial Sans가 대시류 문자를 제대로 처리하지 못하는 문제를 피하기 위해, 스토리 제목의 대시류 문자를 콜론으로 정리한다.
- 대상은 Supabase `stories` 테이블의 공개/비공개 전체 스토리 제목이다.

## 2) 구현 범위

- Supabase `stories.title`, `stories.title_en`에서 대시류 문자를 `:`로 일괄 변경
- 치환 대상:
  - `-`
  - `–`
  - `—`
  - `‑`
- 코드 수정은 하지 않고 데이터만 정리

## 3) 구현 절차

1. Supabase에서 대시류 문자가 포함된 스토리 제목 목록 조회
2. 실제 포함 문자가 ASCII `-`가 아니라 `—` 중심임을 확인
3. `stories.title`, `stories.title_en` 일괄 업데이트
4. 변경 후 목록 재조회로 결과 검증
5. 재현용 SQL을 `supabase/migrations`에 기록
6. `walkthrough.md`에 반영 결과 기록

## 4) 완료 기준

- 대시류 문자가 제목 구분자로 쓰인 스토리 제목이 모두 콜론으로 바뀐다.
- 변경 전/후 목록을 확인한다.

# 매거진 공통 하단 링크 단순화 실행 계획 (2026-04-09)

## 1) 목적

- 매거진 모든 게시물 하단에 동일한 형식의 링크 블록을 공통으로 붙인다.
- 링크는 복잡한 별도 섹션이 아니라, 기존 본문 흐름을 해치지 않는 단순한 인라인 형태로 제공한다.
- 작가 글은 `OOO의 작품 보기`, 그 외 글은 `작품 보기`로 연결한다.

## 2) 구현 범위

- `app/[locale]/stories/[slug]/page.tsx`
  - 모든 게시물에 공통 하단 링크 2개 렌더링
  - 링크 구성:
    - 작품 보기
    - 관련 매거진
  - 기존 과한 footer 섹션 제거
  - 관련 작품 폴백 로직은 원래처럼 단순하게 유지

- 정리 범위
  - 관리자 `tags` 편집 UI/액션 변경은 이번 수정에서 제외
  - 데이터 백필/운영 구조 변경은 추가하지 않음

## 3) 구현 절차

1. 스토리 상세 하단 링크를 모든 게시물 공통 인라인 블록으로 단순화
2. 작가 글 여부에 따라 첫 번째 링크 문구와 목적지만 분기
3. 기존 별도 footer 섹션 제거
4. `npm run lint`
5. `npm run type-check`
6. `walkthrough.md` 업데이트

## 4) 완료 기준

- 모든 매거진 게시물 하단에 같은 스타일의 링크 블록이 보인다.
- 작가 글은 `OOO의 작품 보기`, 일반 글은 `작품 보기`를 노출한다.
- `관련 매거진` 링크가 함께 노출된다.
- `npm run lint`, `npm run type-check`를 통과한다.

# 작품 이미지 AI 업스케일 실행 계획 (2026-04-02)

## 1) 목적

- 저해상도 작품 이미지를 단계적으로 업스케일해 공개 갤러리/상세 화면의 품질 저하를 줄인다.
- 원본이 너무 작은 이미지는 "업스케일"과 "원본 재수급 필요"를 구분해 처리한다.
- 레거시 파일명(`36.jpeg` 같은 bare filename) 상태의 이미지 매핑도 함께 정리해, 업스케일 결과가 실제 서비스에 안정적으로 반영되도록 한다.

## 2) 조사 결과 요약

- 전체 작품: 351점
- 장변 800px 미만: 74점
- 장변 800~1199px: 43점
- 장변 1200~1599px: 49점
- 합계 166점이 현재 상세 프리셋 목표(1600px) 미만
- 레거시 파일명 상태 이미지: 9점

## 3) 우선순위

### 1순위: 즉시 업스케일 대상

- 장변 800px 미만 74점
- 이유: 카드/상세/라이트박스에서 모두 품질 저하가 명확함
- 대표 작가군:
  - 오윤
  - 신학철
  - 천지수
  - 이윤엽
  - 라인석

### 2순위: 상세페이지 보강 대상

- 장변 800~1199px 43점
- 이유: 카드 영역은 일부 버티지만 상세/확대 화면에서 열세가 큼

### 3순위: 선택 업스케일 대상

- 장변 1200~1599px 49점
- 이유: 현재 상세 프리셋(1600px)만 미달하며, 시각적 급함은 1·2순위보다 낮음

## 4) 실행 범위

### Phase 1

- 1순위 74점 업스케일
- 레거시 파일명 9점의 실제 소스 경로 확인 및 매핑 정리

### Phase 2

- 2순위 43점 업스케일
- 결과 비교 후 필요한 작품만 재시도

### Phase 3

- 3순위 49점 중 실제 화면 체감이 큰 작품만 선별 업스케일

## 5) 구현 절차

1. 현재 원본 소스 인벤토리 확정
   - Supabase 원본 URL 사용 작품
   - `out/images/artworks/*` 로컬 원본 사용 작품
2. 업스케일 대상별 before 메타데이터 기록
   - 파일명/작가/작품명
   - 원본 픽셀 크기
   - 원본 파일 크기
3. AI 업스케일 실행
   - 목표: 장변 최소 1600px 확보
   - 필요 시 장변 1920px 버전까지 생성
4. 결과 검수
   - 노이즈, 가장자리 깨짐, 텍스트/판화 결 디테일 훼손 여부 확인
   - 원본보다 부자연스러운 경우 재시도 또는 제외
5. 서비스 반영
   - 최종 이미지 업로드/교체
   - 레거시 파일명 엔트리의 이미지 URL 정리
6. 검증 및 문서화
   - 변경 내역 정리
   - `walkthrough.md`에 결과 및 검증 기록

## 6) 품질 기준

- 최종 반영본은 장변 1600px 이상을 기본 목표로 한다.
- 원본이 300px 이하인 극저해상도 이미지는 AI 업스케일만으로 복원이 제한될 수 있으므로, 결과가 부자연스러우면 "원본 재수급 필요"로 분류한다.
- 사후판화/목판화처럼 결이 중요한 작품은 과도한 샤프닝이나 허위 디테일 생성이 보이면 반영하지 않는다.

## 7) 검증 계획

1. 업스케일 전/후 해상도 비교표 작성
2. 대표 저해상도 작가군(오윤, 신학철 등) 우선 육안 검수
3. 레거시 파일명 9점이 placeholder 대신 정상 이미지로 연결되는지 확인
4. 코드/데이터 수정이 발생하면:
   - `npm run lint`
   - `npm run type-check`
   - 필요 시 `npm run validate-artworks`

## 8) 리스크 및 대응

- 원본이 지나치게 작으면 AI가 실제 디테일이 아닌 가짜 결을 만들 수 있음
  - 대응: 해당 작품은 재수급 권고 목록으로 분리
- 레거시 파일명 엔트리는 실제 서비스 연결 경로가 깨질 수 있음
  - 대응: 업스케일 반영 전 URL 정규화 우선
- 작가별로 동일 계열 작품이 많아 결과 일관성이 깨질 수 있음
  - 대응: 작가 단위로 묶어서 동일 파라미터로 처리 후 비교

## 9) 완료 기준

- 1순위 74점이 우선 반영되거나, 반영 불가 사유가 작품별로 정리된다.
- 레거시 파일명 9점의 실제 서비스 이미지 연결 상태가 정리된다.
- 업스케일 결과와 제외 사유가 `walkthrough.md`에 기록된다.

# Cafe24 판매/매출 블라인드스팟 개선 실행 계획

## 1) 목적

운영 중 재발한 핵심 리스크(중복 삽입, 커서 정지, 취소/환불 미반영, 배치 부분성공 불일치)를 제거하고,
`artwork_sales` 기반 집계/재고/판매상태를 일관되게 유지한다.

## 2) 우선순위(치명 → 높음 → 중간)

### 치명

1. CSV 재구축 스크립트 재실행 시 중복 삽입 방지(멱등성)
2. Cafe24 주문 일부 실패 시 전체 커서 정지 방지

### 높음

3. 취소/환불 주문의 역동기화(void 처리) 반영
4. 관리자 배치 상태/숨김 변경 시 실패 ID DB 롤백

### 중간

5. legacy cafe24(외부 주문키 없는 이관분) 추적성 강화
6. CSV no_match(alias) 운영 가드 강화

## 3) 구현 상세

### 3-1) 치명-1: CSV 멱등성

- 대상: `scripts/rebuild-sales-source-from-csv.js`
- DB 컬럼 추가
  - `artwork_sales.import_batch_id text`
  - `artwork_sales.import_row_no integer`
  - unique constraint: `(import_batch_id, import_row_no)`
- 스크립트 변경
  - `--apply` 실행 시 `--import-id` 필수
  - insert → upsert(`onConflict: import_batch_id,import_row_no`)
  - 동일 import-id 재실행 시 0 변경 보장

### 3-2) 치명-2: 실패주문 큐 + 커서 전진

- 대상: `lib/integrations/cafe24/sync-sales.ts`
- DB 테이블 추가
  - `cafe24_sales_sync_failed_orders` (mall_id, order_id PK, retry_count, last_error, resolved_at)
- 로직 변경
  - 주문 단위 실패는 큐에 적재(경고)하고 전체 실패로 승격하지 않음
  - 다음 동기화에서 실패주문 우선 재시도
  - 구조적 실패가 아니면 커서(`last_synced_paid_at`) 전진

### 3-3) 높음-1: 취소/환불 역동기화

- DB 컬럼 추가
  - `artwork_sales.voided_at timestamptz`
  - `artwork_sales.void_reason text`
- 동기화 로직
  - 취소/환불 상태 아이템 발견 시 기존 cafe24 판매 레코드 void 처리
  - void 대상 작품은 상태/재고 재계산 수행
- 집계 반영
  - 매출/대시보드 집계에서 `voided_at IS NULL`만 포함

### 3-4) 높음-2: 배치 변경 롤백

- 대상: `app/actions/admin-artworks.ts`
- 변경
  - 배치 status/hidden 변경 후 Cafe24 sync 실행
  - 실패한 ID만 before snapshot 기준 즉시 롤백
  - 성공/실패 ID를 분리한 오류 메시지 반환

### 3-5) 중간-1: legacy cafe24 추적 강화

- `artwork_sales.source_detail` 컬럼 추가
  - 값: `manual`, `manual_csv`, `cafe24_api`, `legacy_csv`
- 백필
  - `source='cafe24' AND external_order_item_code IS NULL` → `legacy_csv`
  - API 동기화 insert는 `cafe24_api` 지정
  - CSV 이관 insert는 `manual_csv/legacy_csv` 지정

### 3-6) 중간-2: CSV 매칭 가드

- 대상: `scripts/rebuild-sales-source-from-csv.js`
- 변경
  - alias 매핑 외부 파일화(운영 수정 가능)
  - `--strict` 모드에서 unresolved 존재 시 apply 차단

## 4) 마이그레이션 계획

- 신규 SQL 1개로 일괄 반영:
  - `artwork_sales` 확장(import/void/source_detail)
  - unique/check/index 추가
  - 실패주문 큐 테이블 생성
  - legacy source_detail 백필

## 5) 검증 계획

1. `sales:rebuild-source:dry` 후 같은 import-id 2회 적용 시 건수/매출 불변
2. Cafe24 sync에서 주문 1건 강제 실패 시:
   - 전체 작업은 완료(경고)
   - failed_orders 큐 적재
   - 커서 전진 확인
3. 취소/환불 케이스에서:
   - 해당 row `voided_at` 설정
   - 매출 집계 즉시 감소
4. 배치 status/hidden 변경에서 일부 실패 시:
   - 실패 ID만 원복
   - 성공 ID만 유지
5. `npm run lint`, `npm run type-check` 통과

## 6) 완료 기준

- 동일 CSV 재적용으로 매출 뻥튀기가 재발하지 않는다.
- 주문 일부 실패가 있어도 동기화 파이프라인이 멈추지 않는다.
- 취소/환불이 매출/판매상태/재고에 반영된다.
- 배치 조작에서 DB와 Cafe24 상태 불일치가 남지 않는다.

---

# i18n 영문 누수(P0) 실행 계획 (2026-03-12)

## 1) 목적

- 영어 로케일(`en`)에서 한국어가 노출되는 P0 구간을 우선 제거한다.
- 번역 키 누락이 아닌 하드코딩/상수 우회 구간을 `next-intl` 경로로 일원화한다.

## 2) P0 범위

- 공개 라우트:
  - `app/[locale]/news/page.tsx`
  - `app/[locale]/our-proof/page.tsx`
  - `app/[locale]/archive/2023/page.tsx`
  - `app/[locale]/special/oh-yoon/page.tsx`
- 공용 컴포넌트:
  - `components/common/ShareButtons.tsx`

---

# 포털 진행바 rAF 충돌 수정 실행 계획 (2026-04-02)

## 1) 목적

- 포털 레이아웃의 상단 진행바에서 연속 네비게이션 시 이전 애니메이션 프레임이 다음 사이클에 섞이는 문제를 제거한다.
- 진행바의 시작/완료/숨김 상태 전이를 한 사이클 단위로 정리해, 폭이 튀거나 조기 완료처럼 보이는 현상을 방지한다.

## 2) 문제 요약

- 대상 파일: `components/layout/NavigationProgress.tsx`
- 현재 구현은 다음 메커니즘을 함께 사용한다.
  - double `requestAnimationFrame`
  - 중첩 `setTimeout`
  - DOM `style` 직접 변경
- 하지만 이전 사이클의 rAF id를 저장/취소하지 않아, 빠른 라우트 전환 또는 검색 파라미터 연속 변경 시 이전 write가 뒤늦게 실행될 여지가 있다.

## 3) 수정 범위

- `components/layout/NavigationProgress.tsx`
- 필요 시 관련 테스트 추가:
  - `__tests__/components/NavigationProgress*.test.tsx` 또는 기존 레이아웃/컴포넌트 테스트 파일
- 문서화:
  - `walkthrough.md`

## 4) 구현 방안

1. 진행바 사이클 상태 정리
   - rAF id를 `useRef`로 저장
   - effect cleanup에서 예약된 rAF를 반드시 취소
2. 타이머 정리 강화
   - 현재 하나의 ref에 덮어쓰는 timeout 관리 구조를 점검
   - 시작/완료/숨김 단계별 예약이 다음 사이클로 누수되지 않도록 cleanup 보강
3. DOM write 순서 안정화
   - 새 사이클 시작 시 이전 사이클의 잔여 transition/width/opactiy 상태를 초기화
   - 동일 노드에 대한 style 변경 순서를 고정
4. 회귀 테스트 추가
   - 짧은 간격으로 pathname/searchParams가 바뀌는 상황에서:
     - 이전 rAF가 취소되는지
     - 진행바가 새 사이클 기준으로만 동작하는지 검증

## 5) 검증 계획

1. 단위 테스트
   - 연속 라우트 변경 시 진행바 width가 이전 사이클 값으로 덮이지 않는지 확인
   - cleanup 시 `cancelAnimationFrame` 및 timer 정리가 수행되는지 확인
2. 정적 검증
   - `npm run lint`
   - 필요 시 해당 테스트만 선택 실행 후 전체 테스트 영향 확인

## 6) 리스크 및 대응

- DOM style을 직접 제어하는 구조라 테스트가 구현 세부사항에 과도하게 묶일 수 있음
  - 대응: 최종 style 상태와 cleanup 호출 여부 중심으로 검증
- 포털 전역 레이아웃에서만 쓰이는 컴포넌트라 수동 재현이 늦게 드러날 수 있음
  - 대응: 빠른 연속 네비게이션을 흉내내는 회귀 테스트를 우선 추가

## 7) 완료 기준

- 이전 사이클의 rAF/timeout이 다음 진행바 사이클에 영향을 주지 않는다.
- 빠른 연속 라우트 변경에서도 진행바가 튀지 않고, 시작 → 진행 → 완료 → 숨김 순서를 안정적으로 유지한다.
- 관련 테스트와 `walkthrough.md`가 업데이트된다.
  - `components/ui/ArtworkCard.tsx`
  - `components/features/TrustBadges.tsx`
  - `components/features/ArtworkDetailNav.tsx`
  - `components/features/BackgroundSlider.tsx`
  - `components/features/ExpandableHistory.tsx`

## 3) 구현 방법

1. 각 파일의 하드코딩 한글 문자열을 `useTranslations`/`getTranslations` 기반으로 치환
2. `messages/ko.json`, `messages/en.json`에 대응 키 추가
3. 의미상 데이터 문구(예: `'문의'`, `'확인 중'`)는 키 기반 상수로 통일

## 4) 검증

- 수정 파일 LSP 진단 오류 0
- `npm run lint` 통과
- `npm run type-check` 통과
- `npm run build` 통과(환경 의존 이슈가 있으면 로그와 함께 명시)

## 5) 완료 기준

- P0 대상 파일에서 영어 로케일 시 한국어 UI 문구가 노출되지 않는다.
- ko/en 메시지 키 정합성이 유지된다.

---

# 출품작 페이지 전환 중간화면(3열 스켈레톤/연노랑 배경) 근본 개선 계획 (2026-03-13)

## 1) 목적

- 출품작 라우트 전환 시 간헐적으로 노출되는 불쾌한 중간 프레임(3열 스켈레톤 + 연노랑 계열 배경)을 제거한다.
- 로딩/전환 UI를 라우트별로 일관화해 "가끔 보임" 같은 타이밍 의존 현상을 줄인다.

## 2) 원인 요약 (확인 완료)

1. `app/[locale]/artworks/loading.tsx`가 데스크톱 기준 `lg:grid-cols-3` 스켈레톤을 강제 렌더링함.
2. 같은 파일에서 `bg-[var(--color-primary-surface)]`를 사용하지만, `styles/globals.css`의 `:root`에는 `--color-primary-surface`가 정의되어 있지 않음.
3. 결과적으로 로딩 구간에서 의도한 배경 대신 body 기본 배경(`--color-canvas-soft`, 연노랑 톤)이 드러나며, 전환 타이밍에 따라 중간 화면으로 체감됨.
4. 전환 경로가 `app/[locale]/layout.tsx`의 `Suspense` + 세그먼트 `loading.tsx` 조합이라 네트워크/프리패치 타이밍에 따라 간헐적으로 노출됨.

## 3) 근본 해결 전략

### 3-1) 로딩 UI 정책 일원화 (핵심)

- 출품작 라우트(`list/detail/artist`)에 대해 "콘텐츠 형태를 흉내내는 스켈레톤"을 지양하고, 공통 로더 패턴으로 통일.
- 구체안:
  - `app/[locale]/artworks/loading.tsx`의 3열 카드 스켈레톤 제거
  - 전환 중에는 단일 안정 로더(레이아웃 점프가 적은 형태)만 노출
  - 필요 시 `app/[locale]/artworks/[id]/loading.tsx`, `app/[locale]/artworks/artist/[artist]/loading.tsx`도 동일 정책으로 맞춤

### 3-2) 색상 토큰 정합성 복구

- `bg-[var(--color-primary-surface)]` 제거 후 Tailwind 토큰 클래스(`bg-primary-surface`) 사용으로 통일.
- 또는 `styles/globals.css`에 `--color-primary-surface`를 명시적으로 추가하되, 프로젝트 표준은 Tailwind 토큰 우선으로 유지.

### 3-3) 전환 타이밍 노출 최소화

- 출품작 내부 프로그래매틱 네비게이션(`router.push`) 경로를 점검하고 필요 시 `startTransition` 래핑하여 fallback 노출 빈도 완화.
- 현재 쿼리 기반 필터 전환은 이미 `useArtworkFilter`에서 `startTransition` 사용 중이므로, 아티스트 전환 등 미적용 경로만 보강.

### 3-4) PageTransition/로더 충돌 점검

- `components/common/PageTransition.tsx`와 route loading이 동시에 체감되는 구간을 최소화하도록, 불필요한 중간 opacity 프레임 노출 여부 점검.
- 변경 시 전체 라우트 영향이 있으므로 출품작 경로 한정 A/B 비교 후 확정.

## 4) 구현 대상 파일

- `app/[locale]/artworks/loading.tsx`
- `app/[locale]/artworks/[id]/loading.tsx` (신규 가능)
- `app/[locale]/artworks/artist/[artist]/loading.tsx` (신규 가능)
- `components/features/ArtworkGalleryWithSort.tsx`
- `lib/hooks/useArtworkFilter.ts` (필요 시)
- `components/common/PageTransition.tsx` (필요 시)
- `styles/globals.css` 또는 토큰 사용부(변수 정합성 선택안에 따라)

## 5) 검증 계획

1. 기능 검증
   - `/en/artworks` 진입 시 3열 카드형 스켈레톤이 중간에 노출되지 않는지 확인
   - `/en/artworks` ↔ `/en/artworks/artist/[artist]` ↔ `/en/artworks/[id]` 왕복 전환 반복(최소 20회)
2. 시각 검증
   - 전환 영상 캡처(데스크톱/모바일)로 배경 플래시 재현 여부 확인
3. 정적 검증
   - `npm run lint`
   - `npm run type-check`
   - `npm run build`
   - `npm test -- --runInBand`

## 6) 완료 기준

- 출품작 전환 중 "3열 스켈레톤 + 연노랑 배경" 중간 프레임이 재현되지 않는다.
- 로딩 UI가 list/detail/artist 간 일관되게 동작한다.
- 전역 라우트 전환 품질 저하(깜빡임 증가, 레이아웃 점프 증가)가 없다.

---

# 작품 상세 페이지 작가 관련 URL 확장 계획 (2026-04-01)

## 1) 목적

- 작품 상세 페이지의 작가 관련 자료를 의미 있는 URL 중심으로 확장한다.
- 작가 웹사이트, SNS, 소속 소개 페이지는 수집 대상에서 제외한다.
- 이미 등록된 URL과 중복되지 않도록 수집/정규화 기준을 먼저 세운다.
- 동명이인 리스크가 있는 작가는 식별 근거를 남기며 보수적으로 수집한다.

## 2) 현재 상태 요약

- 공개 작품 상세 페이지는 [content/artist-articles.ts]의 작가명 키를 기준으로 관련 자료를 렌더링한다.
- 현재 확인 기준:
  - 출품 작가: 112명
  - `artist-articles.ts` 등록 작가: 107명
  - 등록 URL: 375개
  - 파일 내부 exact URL 중복: 0건
- 자료가 아예 없는 출품 작가:
  - `남진현`, `림지언`, `박영선`, `손장섭`, `작가미상`, `칡뫼 김구`
- 엔트리는 있으나 URL이 0개인 작가:
  - `김영서`, `변경희`, `이지은`, `이채원`, `김유진`
- URL 1개인 작가가 다수 존재하므로, "없는 작가 우선" 이후 "1개만 있는 작가 보강" 순서가 효율적이다.

## 3) 핵심 리스크

### 3-1) 동명이인

- 현재 구조는 `artist name -> Article[]` 단일 키 방식이어서 동명이인 대응이 약하다.
- 특히 `김지영`, `김정원`, `김유진`, `이지은`, `안소현`, `박지혜`처럼 일반적인 이름은 이름만으로 검색하면 오수집 가능성이 높다.

### 3-2) URL 품질 편차

- 기관/미술관/언론 기사와 재게시 기사/검색 유입용 페이지가 섞일 수 있다.
- 자료 수만 늘리면 상세 페이지의 신뢰도가 오히려 떨어질 수 있다.

### 3-3) 중복의 기준 불명확

- 추적 파라미터가 붙은 URL, 모바일 링크, 공유용 링크, 유튜브 단축 링크는 육안상 다른 URL처럼 보일 수 있다.
- 같은 기사 재배포본을 여러 건 넣으면 실질적 중복이 된다.

## 4) 수집 원칙

### 4-1) 소스 우선순위

1. 국공립 미술관 / 공공기관 / 비엔날레 / 아트페어 / 소장 기관 페이지
2. 신뢰 가능한 언론 인터뷰 / 전시 기사 / 영상 인터뷰
3. 전시 리뷰 / 아카이브 / 연구·비평 성격의 제3자 자료
4. 블로그 / 브런치 / 나무위키 / 커뮤니티는 원칙적으로 제외하고, 대체재가 전혀 없을 때만 보류 후보로만 관리

### 4-2) 작가당 목표 수량

- 최소 기준: 작가당 3개
- 우선 보강 대상: 0개 → 1개 → 2개 순
- 최대 수량은 일률적으로 늘리기보다, 품질이 낮은 URL 추가는 지양한다.

### 4-3) 제외 기준

- 작가 웹사이트, 작가 본인 SNS, 소속 갤러리/에이전시 프로필
- 작가 동일성 근거가 부족한 링크
- 로그인 필요, 만료 가능성 높음, 리디렉션 체인 과다 링크
- 단순 판매 페이지, 복사 기사, 출처 불명 요약문
- 다른 매체/세대/분야의 동명이인 링크

## 5) 동명이인 판별 규칙

### 5-1) 검색용 식별자 구성

- [content/artists-data.ts]를 기준으로 아래 식별자를 조합한다.
  - 매체: 회화, 사진, 도예, 판화, 조각 등
  - 학력: 학교명, 학위, 교수명
  - 전시/시리즈: 대표 개인전명, 대표 연작명
  - 활동 지역/기관: 미술관, 레지던시, 소장처, 전시 공간

### 5-2) 수집 승인 조건

- 최소 2개 이상의 식별 근거가 일치할 때만 채택한다.
- 예시:
  - 이름 + 매체 일치
  - 이름 + 학교/전시명 일치
  - 이름 + 전시 기관/소장처 일치

### 5-3) 보수적 처리 대상

- `작가미상`은 수집 대상에서 제외한다.
- 근거가 약한 동명이인 의심 링크는 보류 목록으로 분리한다.

## 6) 중복 방지 규칙

### 6-1) URL 정규화

- 저장 전 아래 정규화를 적용한다.
  - `utm_*`, `fbclid`, `gclid`, `srsltid` 제거
  - `http` → `https` 가능한 경우 canonical 우선
  - trailing slash 정리
  - YouTube short URL과 watch URL 통일
  - 모바일/AMP/공유 링크 대신 원문 canonical 사용

### 6-2) 중복 판정 기준

- exact URL 중복
- 정규화 후 canonical URL 중복
- 동일 기사/영상의 재게시본 중복

### 6-3) 저장 전 체크

- `artist-articles.ts` 전체에서 URL exact match 확인
- 정규화 후 canonical URL match 확인
- 동일 작가 내 중복뿐 아니라 작가 간 중복도 확인

## 7) 실행 배치 전략

### 7-1) 1차 배치: 공백 해소

- 자료가 전혀 없는 출품 작가 6명
- 엔트리만 있고 URL 0개인 작가 5명

### 7-2) 2차 배치: 빈약한 엔트리 보강

- URL 1개인 작가 21명

### 7-3) 3차 배치: 품질 균형화

- URL 2개인 작가 13명
- 이미 3개 이상인 작가는 품질 이슈가 있을 때만 선별 보강

## 8) 작업 방식

### 8-1) 사전 정리

- 작가별 수집 시트 작성
  - `artist`
  - `priority`
  - `search clues`
  - `candidate url`
  - `canonical url`
  - `source type`
  - `identity evidence`
  - `confidence`
  - `status(accept / hold / reject)`

### 8-2) 수집 단위

- 한 번에 5~10명씩 소배치로 진행
- 소배치마다 중복/동명이인 검수 후 반영

### 8-3) 반영 파일

- 1차 반영: [content/artist-articles.ts]
- 필요 시 후속 개선 검토:
  - 내부 관리용 메타(검색 힌트, 보류 사유, canonical_url)를 별도 파일로 분리

## 9) 후속 구조 개선 제안

- 장기적으로는 단순 작가명 키 대신 내부 관리용 `artistKey` 도입 검토
- UI는 기존 구조를 유지하되, 수집/검수용 데이터 레이어를 분리하면 동명이인 대응이 쉬워진다.
- 예:
  - `artist-resource-registry.ts`: 식별자/검색 힌트/제외 키워드
  - `artist-articles.ts`: 상세 페이지 렌더링용 확정 데이터

## 9-1) 수집 범위 메모

- 이번 작업의 목표는 "작가가 직접 운영하는 채널"이 아니라 "작가를 설명하거나 검증해 주는 제3자 자료" 확보다.
- 따라서 링크 수집은 아래 범위로 제한한다.
  - 기관 전시/소장/아카이브 페이지
  - 언론 기사, 인터뷰, 리뷰
  - 공공기관 또는 신뢰 가능한 문화예술 플랫폼의 작가 소개/전시 기록
- 아래 범위는 수집하지 않는다.
  - 개인 웹사이트
  - 인스타그램, 페이스북, X, 유튜브 채널 홈 등 SNS
  - 소속 갤러리, 에이전시, 플랫폼 입점 소개 페이지

## 10) 검증 계획

1. 수집 전후 작가별 URL 개수 비교
2. exact URL 중복 0건 확인
3. 정규화 후 canonical 중복 0건 확인
4. 동명이인 주의 작가 샘플 수동 검수
5. 작품 상세 페이지에서 링크 렌더링 이상 여부 확인
6. 데이터 수정 시 필요하면 `npm run lint`, `npm run type-check` 실행

## 11) 완료 기준

- 공백 작가(0개)가 우선 해소된다.
- 신규 추가 URL은 중복 없이 저장된다.
- 동명이인 가능성이 있는 링크는 근거 없이 반영되지 않는다.
- 작가당 최소 3개 목표에 맞춰 점진적으로 품질 있는 자료가 축적된다.

## 12) 승인 후 실행 순서

1. 1차 배치 대상 작가 목록 확정
2. 작가별 검색 힌트 시트 작성
3. 실제 웹 수집 및 후보 URL 정리
4. 중복/동명이인 검수
5. `content/artist-articles.ts` 반영
6. 검증 및 `walkthrough.md` 기록

---

# 주문 취소 활동 로그 표시 개선 계획 (2026-04-09)

## 문제 요약

- 주문 취소 시 활동 로그에는 `order_awaiting_cancelled` 액션이 기록됨
- 하지만 활동로그 UI에서 이 액션을 해석하는 매핑이 없어 `정의되지 않은 활동`으로 표시됨
- 대상 타입도 `order`에 대한 라벨/링크/이름 해석이 없어 `order`와 `이름 정보 없음`으로 표시됨
- 활동로그 필터 목록에도 주문 관련 액션이 빠져 있어 조회성이 떨어짐

## 확인한 원인

1. `app/actions/admin-orders.ts`
   - 주문 취소는 정상적으로 `logAdminAction('order_awaiting_cancelled', 'order', ...)` 호출
   - 입금 확인, 상태 변경, 운송장 수정, 환불 등도 모두 `order` 대상 로그를 남기고 있음
2. `app/(portal)/admin/logs/_utils.ts`
   - `formatActionDescription()`에 주문 관련 액션 분기 없음
   - `getTargetTypeLabel()`에 `order` 타입 분기 없음
   - `getTargetLink()`에 주문 상세(`/admin/orders/[id]`) 연결 없음
   - `getLogTargetDisplayName()`가 `order_no` 같은 주문 식별값을 우선 사용하지 않음
3. `app/actions/admin-logs.ts`
   - 대상 이름 보강 로직이 `artwork`, `artist`, 신청서 계열만 지원
   - `order`는 조회 보강 대상에서 빠져 있어 기존 로그 재표시 품질이 낮음
4. `app/(portal)/admin/logs/page.tsx`
   - 활동 필터 옵션에 주문 관련 액션이 없음
5. `messages/ko.admin.json`, `messages/en.admin.json`
   - `targetTypeOrder` 번역 키 없음

## 수정 계획

1. 활동로그 표시 유틸 보강
   - 주문 관련 액션(`order_awaiting_cancelled`, `order_deposit_confirmed`, `order_status_updated`, `order_tracking_updated`, `order_refunded`) 표시 문구 추가
   - `order` 대상 라벨, 상세 링크, 표시 이름 해석 추가
   - 표시 이름은 `target_name` → `order_no` → 구매자명 순으로 우선 사용
2. 서버 측 대상 이름 보강 확장
   - `app/actions/admin-logs.ts`의 target enrichment에 `order` 추가
   - `orders` 테이블에서 `id, order_no, buyer_name` 조회 후 `target_name`/`target_names` 주입
   - 기존 로그도 조회 시 주문번호 기반으로 자연스럽게 노출되도록 처리
3. 활동로그 필터 개선
   - 주문 관련 액션을 관리자 활동로그 필터 옵션에 추가
   - `order` 대상 번역 키 추가
4. 검증
   - 변경 파일 기준 타입 오류 확인
   - `npm run lint`, `npm run type-check` 실행

## 예상 결과

- 주문 취소 로그가 `입금대기 주문 취소: 주문번호` 형태로 표시됨
- 대상 열이 `주문` + 실제 주문번호로 표시되고, 상세 페이지로 이동 가능해짐
- 주문 관련 다른 로그도 동일한 방식으로 일관되게 보이게 됨

## 2026-04-09 admin feedback 해결 버튼 오류 수정 계획

### 문제 요약

- 관리자 피드백 페이지에서 `해결` 버튼 클릭 시 브라우저 콘솔에 `Failed to execute 'appendChild' on 'Node': Invalid or unexpected token` 오류가 발생합니다.
- 같은 시점에 React minified error `#418`도 함께 발생합니다.
- 현재 코드 경로상 상태 변경 성공 후 `router.refresh()`가 실행되고, 이 과정에서 루트 레이아웃의 JSON-LD `<script>`가 클라이언트에서 다시 주입됩니다.
- `components/common/JsonLdScript.tsx`는 `escapeJsonLdForScript(JSON.stringify(data))`를 사용하지만, 실제 이스케이프 함수는 `<` 문자만 처리하고 있어 스크립트 본문 내 특정 유니코드 구분 문자(U+2028/U+2029 등)나 기타 파싱 민감 문자를 안전하게 막지 못할 가능성이 있습니다.

### 가설

1. `router.refresh()` 이후 React가 JSON-LD 스크립트 노드를 다시 생성하면서 스크립트 문자열 파싱 오류가 발생한다.
2. 현재 JSON-LD 이스케이프가 불충분해 브라우저가 script text를 유효한 JavaScript 문자열/토큰으로 해석하지 못한다.
3. 이 오류가 연쇄적으로 hydration/update mismatch를 유발해 React error `#418`로 이어진다.

### 실행 계획

1. `lib/schemas/utils.ts`의 `escapeJsonLdForScript`를 보강해 JSON-LD 스크립트 삽입 시 문제가 될 수 있는 문자들을 안전하게 이스케이프합니다.
2. 필요 시 `components/common/JsonLdScript.tsx` 또는 관련 호출부를 함께 점검해 동일 경로에서 재발하지 않도록 정리합니다.
3. `npm run lint` 또는 대상 파일 중심 검증을 실행해 타입/문법 문제가 없는지 확인합니다.
4. 수정 결과와 검증 내용을 `walkthrough.md` 없이 응답에서 간단히 요약합니다.

### 예상 변경 파일

- `lib/schemas/utils.ts`
- 필요 시 `components/common/JsonLdScript.tsx`

---

# 작품 썸네일 전면 비율 보존 + 저채도 브랜드 프레임 적용 실행 계획 (2026-04-09)

## 1) 목적

- 모든 작품 썸네일 노출 구간에서 이미지 비율을 보존한다.
- 비율 보존으로 생기는 여백은 저채도 브랜드 컬러로 처리해, 빈칸이 아닌 “의도된 프레임”으로 보이게 한다.
- 작가 의도(구도/여백/서명) 훼손 리스크를 최소화한다.

## 2) 정책 원칙 (확정)

1. **전면 비율 보존**: 작품 썸네일은 기본적으로 `object-contain`을 사용한다.
2. **저채도 프레임**: 여백 배경은 고채도 색을 금지하고 아래만 사용한다.
   - 라이트: `bg-primary-surface`, `bg-canvas-soft`, `bg-gray-50`
   - 다크: `bg-charcoal`, 필요 시 `bg-charcoal-deep`
3. **작품 우선**: hover scale/시각효과가 작품 일부를 잘라 보이게 하지 않도록 카드별 효과를 조정한다.
4. **전역 기본값 일괄 변경 금지**: `SafeImage` 전역 기본값(`fill -> cover`)을 먼저 바꾸지 않고, 썸네일 surface부터 명시적으로 정책 적용 후 필요 시 2차로 확장한다.

## 3) 적용 범위

### 3-1) 공개(우선순위 P0)

- `components/ui/ArtworkCard.tsx`
  - `gallery`: `aspect-[4/5]` 유지 + `object-cover` -> `object-contain`
  - `slider`: `aspect-square` 유지 + `object-cover` -> `object-contain`
  - 이미지 영역 배경을 테마별 저채도 컬러로 통일
- `components/features/HeroGalleryGrid.tsx`
  - `object-cover` -> `object-contain`
  - 카드 배경을 저채도 브랜드 프레임으로 교체
- `components/features/ArtworkHighlightSlider.tsx`
  - 내부 `ArtworkCard` 정책 변경 반영 확인
- `components/features/MasonryGallery.tsx`
  - `ArtworkCard` 정책 반영 후 간격/리듬감 확인
- `components/features/RelatedArtworksSlider.tsx`
  - `ArtworkCard` slider 정책 반영 후 가독성/밀도 확인
- `components/features/RecentlySoldSection.tsx`
  - `ArtworkCard` 정책 반영 확인
- `app/[locale]/artworks/[id]/page.tsx`
  - 하단 관련 작품 영역의 카드 표시 품질 확인

### 3-2) 포털(우선순위 P1, 모두 비율 보존 요구 반영)

- `app/(portal)/admin/artworks/admin-artwork-list.tsx`
  - 48px 썸네일 `object-cover` -> `object-contain`
  - 저채도 배경 유지(`bg-gray-100` 계열)
- `app/(portal)/dashboard/(artist)/artworks/artwork-list.tsx`
  - 64px 썸네일 `object-cover` -> `object-contain`
- `app/(portal)/exhibitor/(dashboard)/artworks/_components/exhibitor-artwork-list.tsx`
  - 48px 썸네일 `object-cover` -> `object-contain`

## 4) 구현 절차

1. **공통 클래스 정리**
   - 썸네일 프레임 공통 클래스 규칙 정의(라이트/다크 배경 포함)
   - 카드별 중복 스타일 최소화
2. **공개 썸네일 전환(P0)**
   - `ArtworkCard`, `HeroGalleryGrid` 우선 변경
   - 관련 재사용 컴포넌트에서 시각 회귀 확인
3. **포털 썸네일 전환(P1)**
   - admin/artist/exhibitor 목록 썸네일을 비율 보존으로 통일
4. **시각 디테일 보정**
   - contain 전환 후 과도한 여백 구간에 패딩/배경 농도 미세 조정
   - hover 인터랙션이 작품 표현을 방해하지 않도록 조정
5. **문서화**
   - `walkthrough.md`에 변경 파일, 정책 근거, 전/후 차이 요약

## 5) 검증 계획

1. 정적 검증
   - 수정 파일 `lsp_diagnostics` 오류 0
   - `npm run lint`
   - `npm run type-check`
2. 기능/시각 검증
   - 공개 경로:
     - `/[locale]/artworks`
     - `/[locale]/artworks/[id]`
     - 홈 하이라이트/푸터 슬라이더
   - 포털 경로:
     - `/admin/artworks`
     - `/dashboard/artworks`
     - `/exhibitor/artworks`
   - 체크 항목:
     - 작품 잘림 없음(모서리, 서명, 상하 여백 포함)
     - 저채도 배경이 작품보다 튀지 않음
     - 카드 높이/레이아웃 붕괴 없음

## 6) 리스크 및 대응

- 리스크: 세로/가로 극단 비율 작품에서 여백이 크게 보일 수 있음
  - 대응: 배경 컬러 농도 통일 + 내부 패딩 최소 조정
- 리스크: 슬라이더 카드에서 시각적 밀도 저하
  - 대응: 텍스트 영역 대비와 카드 간격 미세 조정
- 리스크: 전역 `SafeImage` 정책과 충돌 가능성
  - 대응: 전역 변경 없이 surface 단위 명시 적용 후 필요 시 후속 통합

## 7) 완료 기준

- 공개/포털의 작품 썸네일이 모두 비율 보존으로 표시된다.
- 고정 비율 슬롯 내 여백은 저채도 브랜드 프레임으로 일관 적용된다.
- `lint`, `type-check` 통과 및 주요 경로 시각 검증 완료.

---

# GSC 기술 경고 감소 개선 실행 계획 (2026-06-04)

## 1) 목적

GSC의 페이지 색인/제외 보고서에 쌓일 수 있는 공개 URL 쿼리 파라미터 중복 신호를 줄입니다. 특히 `/artworks?sort=...`, `/artworks?category=...`, `/artworks/:id?returnTo=...`처럼 canonical은 동일하지만 HTML은 200으로 응답하는 URL을 렌더 전에 정규 URL로 308 리다이렉트해 Google이 중복 URL을 계속 발견하지 않게 합니다.

## 2) 현재 확인 결과

- `https://www.saf2026.com/robots.txt`는 200 정상이며 쿼리 URL 차단 정책이 있습니다.
- `https://www.saf2026.com/sitemap.xml`은 200 정상, 약 807 URL, 쿼리 URL 없음, 용량 약 492KB입니다.
- `/en/artworks/*`, `/en/news/*`, 영어 thin-content 페이지의 `noindex, follow`는 의도된 제외로 확인됩니다.
- 한국어 법적 페이지는 sitemap 포함 + `index, follow`라 “제출된 URL에 noindex” 경고 대상이 아닙니다.
- 공개 작품 목록/작품 상세 쿼리 URL은 robots 차단 대상이지만 실제 요청 시 200 HTML을 반환합니다. 이 조합은 GSC에서 “robots.txt에 의해 차단됨”, “중복, Google에서 선택한 표준 URL이 사용자와 다름”, “크롤링됨 - 현재 색인 생성 안 됨”류의 노이즈를 만들 수 있습니다.

## 3) 변경 범위

### 수정 파일

- `proxy.ts`
  - 공개 작품 목록 URL의 검색/필터/정렬 쿼리를 정규 `/artworks` 또는 `/en/artworks`로 308 리다이렉트합니다.
  - 공개 작품 상세 URL의 `returnTo` 등 쿼리를 정규 `/artworks/:id` 또는 `/en/artworks/:id`로 308 리다이렉트합니다.
  - `/checkout`, `/admin`, `/dashboard`, `/exhibitor`, `/mypage` 등 사용자 상태나 결제에 필요한 쿼리는 건드리지 않습니다.

### 테스트 파일

- `__tests__/app/stories-indexing-guards.test.ts`
  - 기존 proxy 소스 가드에 artwork 쿼리 정규화 조건을 추가합니다.
  - 문자열 기반 회귀 테스트로 `ARTWORKS_LIST_PATH`, `ARTWORK_DETAIL_PATH`, `canonicalizeSearchlessUrl`, 308 리다이렉트 존재를 확인합니다.

## 4) 구현 절차

1. 실패 테스트 작성
   - `__tests__/app/stories-indexing-guards.test.ts`에 “proxy는 공개 작품 목록/상세 쿼리 URL을 searchless canonical URL로 308 리다이렉트한다” 테스트를 추가합니다.
   - 예상 실패: 아직 `ARTWORKS_LIST_PATH`, `ARTWORK_DETAIL_PATH`, `canonicalizeSearchlessUrl`가 없으므로 테스트 실패.

2. 실패 확인
   - 실행: `npm test -- __tests__/app/stories-indexing-guards.test.ts`
   - 기대: 새 테스트만 실패.

3. 최소 구현
   - `proxy.ts`에 아래 정책을 추가합니다.
     - `ARTWORKS_LIST_PATH = /^\/(en\/)?artworks\/?$/`
     - `ARTWORK_DETAIL_PATH = /^\/(?:(ko|en)\/)?artworks\/[^/?]+\/?$/`
     - `canonicalizeSearchlessUrl(pathname, request.url)` 헬퍼로 search 없는 URL 생성
     - legacy 숫자 ID 리다이렉트보다 먼저 또는 충돌 없는 위치에서 쿼리 제거 처리
   - 숫자 legacy ID(`/artworks/151?returnTo=...`)는 기존 UUID 리다이렉트가 우선되어야 하므로, 상세 쿼리 제거는 legacy 매칭 이후에 둡니다.

4. 통과 확인
   - 실행: `npm test -- __tests__/app/stories-indexing-guards.test.ts`
   - 기대: 통과.

5. 정적 검증
   - 실행: `npm run lint -- --quiet` 또는 `npm run lint`
   - 실행: `npm run type-check`
   - 프로젝트 시간이 길면 최소 `npx eslint proxy.ts __tests__/app/stories-indexing-guards.test.ts`를 먼저 실행합니다.

6. 운영 확인
   - 배포 후 아래 URL이 308로 정규 URL을 가리키는지 확인합니다.
     - `https://www.saf2026.com/artworks?sort=latest` → `https://www.saf2026.com/artworks`
     - `https://www.saf2026.com/artworks/45dac49b-e8f2-4aea-8b86-8452dba853c0?returnTo=%2Fspecial%2Foh-yoon` → `https://www.saf2026.com/artworks/45dac49b-e8f2-4aea-8b86-8452dba853c0`
   - GSC에서는 기존 발견 URL이 바로 사라지지 않으므로 1~3주 단위로 제외 항목 추이를 봅니다.

## 5) 리스크

- 작품 목록 필터/정렬 공유 URL이 검색엔진뿐 아니라 사용자에게도 정규 목록으로 이동할 수 있습니다.
  - 현재 robots에서 `/artworks?*` 전체를 차단하고 있어 SEO 정책상 이미 정규 URL만 유지하는 방향입니다.
  - 공유 가능한 필터 URL이 제품 요구사항이면, 308 대신 `noindex, follow` 헤더/메타 정책으로 바꿔야 합니다.
- 작품 상세의 `returnTo`는 UX용 뒤로가기 힌트입니다.
  - 검색/외부 유입에서 해당 파라미터가 없어져도 작품 상세 접근 자체에는 영향이 없습니다.

## 6) 완료 기준

- 공개 작품 목록/상세 쿼리 URL이 렌더 전 308로 정규 URL에 흡수됩니다.
- 기존 `/stories?category=` 정규화와 legacy 숫자 작품 ID 리다이렉트가 유지됩니다.
- 대상 Jest 테스트와 lint/type-check가 통과합니다.

---

# EN 목록 페이지 X-Robots-Tag 충돌 개선 실행 계획 (2026-06-04)

## 1) 목적

`/en/artworks`, `/en/news`는 `EN_INDEXABLE_PAGES`와 sitemap에서 색인 대상으로 관리되지만, `next.config.js`의 `X-Robots-Tag: noindex, follow` 헤더 패턴이 루트 목록 페이지까지 덮어 GSC의 “제출된 URL에 noindex 태그가 있음” 경고를 만들 수 있습니다. 헤더 패턴을 detail 하위 경로에만 적용해 sitemap·HTML meta·HTTP header 정책을 일치시킵니다.

## 2) 변경 범위

- `next.config.js`
  - `/en/artworks/:path*` → `/en/artworks/:path+`
  - `/en/news/:path*` → `/en/news/:path+`
  - 루트 `/en/artworks`, `/en/news`는 색인 허용.
  - 하위 detail/category/artist 경로는 기존처럼 noindex header 유지.
- `__tests__/app/en-indexable-headers.test.ts`
  - EN indexable 루트 목록이 catch-all noindex header에 걸리지 않는지 소스 가드 추가.

## 3) 검증

- RED: 새 테스트가 기존 `:path*` 패턴 때문에 실패해야 합니다.
- GREEN: 패턴 수정 후 새 테스트 통과.
- 정적 검증:
  - `npm test -- __tests__/app/en-indexable-headers.test.ts`
  - `npx eslint next.config.js __tests__/app/en-indexable-headers.test.ts`
  - `npm run type-check`

## 4) 완료 기준

- `/en/artworks`, `/en/news`가 sitemap 제출 + HTML `index, follow` + HTTP noindex 없음 상태로 정렬됩니다.
- `/en/artworks/<하위경로>`, `/en/news/<하위경로>`는 기존 noindex header 정책을 유지합니다.

---

# EN 하위 noindex URL robots 차단 충돌 개선 실행 계획 (2026-06-04)

## 1) 목적

`/en/artworks/*`, `/en/news/*` 하위 경로는 `X-Robots-Tag: noindex, follow`로 색인 제외 신호를 보내지만, `robots.txt`에서도 같은 경로를 차단하고 있어 Google이 noindex 헤더를 확인하지 못할 수 있습니다. GSC의 “robots.txt에 의해 차단됨” 또는 “차단되었지만 색인됨” 노이즈를 줄이기 위해 하위 URL은 크롤 허용 + noindex 헤더 정책으로 일원화합니다.

## 2) 변경 범위

- `app/robots.ts`
  - `COMMON_DISALLOW`에서 `/en/artworks/`, `/en/news/` 제거.
  - 주석을 `robots.txt 차단`이 아니라 `X-Robots-Tag noindex로 색인 제외` 정책에 맞게 정리.
- `next.config.js`
  - `/en/artworks/:path+`, `/en/news/:path+` noindex 헤더는 유지.
  - 관련 주석에서 robots.txt 병행 차단 표현 제거.
- `__tests__/app/en-indexable-headers.test.ts`
  - robots.txt가 `/en/artworks/`, `/en/news/`를 차단하지 않는지 회귀 테스트 추가.
  - 하위 경로 noindex 헤더는 계속 존재하는지 함께 확인.

## 3) 검증

- RED: 새 테스트가 현재 `COMMON_DISALLOW`의 `/en/artworks/`, `/en/news/` 때문에 실패해야 합니다.
- GREEN: robots 차단 제거 후 테스트 통과.
- 정적 검증:
  - `npm test -- __tests__/app/en-indexable-headers.test.ts`
  - `npx eslint app/robots.ts next.config.js __tests__/app/en-indexable-headers.test.ts`
  - `npm run type-check`

## 4) 완료 기준

- `/en/artworks`, `/en/news` 루트 목록은 sitemap 제출 + 색인 허용 상태를 유지합니다.
- `/en/artworks/*`, `/en/news/*` 하위 URL은 robots.txt로 막지 않고, HTTP `X-Robots-Tag: noindex, follow`를 Google이 확인할 수 있습니다.

---

# 공개 콘텐츠 쿼리 URL robots 차단/308 정규화 충돌 개선 실행 계획 (2026-06-04)

## 1) 목적

`/artworks?*`, `/stories?*`, `/news?*`, `/artworks/*?*`는 중복 URL이므로 정규 URL로 합쳐야 합니다. 현재 일부는 `proxy.ts`에서 308 리다이렉트하지만 `robots.txt`가 같은 패턴을 차단해 Google/Yeti가 리다이렉트를 확인하지 못할 수 있습니다. 공개 콘텐츠 쿼리 URL은 robots 차단 대신 308 정규화로 처리해 GSC의 “robots.txt에 의해 차단됨” 노이즈와 중복 URL 발견을 함께 줄입니다.

## 2) 변경 범위

- `proxy.ts`
  - 기존 `/stories?category=` → `/stories/category/:category` 308 유지.
  - 그 외 `/stories?*`는 `/stories`로 308.
  - `/news?*`는 `/news`로 308.
  - 기존 `/artworks?*`, `/artworks/:id?*` searchless 308 유지.
- `app/robots.ts`
  - `/artworks?*`, `/stories?*`, `/news?*`, `/artworks/*?*` 차단 제거.
  - 공개 콘텐츠 쿼리 URL은 proxy 308 정규화 정책이라는 주석으로 정리.
- `__tests__/app/stories-indexing-guards.test.ts`
  - `/stories?*`, `/news?*`, artwork 쿼리 URL이 `canonicalizeSearchlessUrl`로 308 처리되는지 회귀 테스트 추가.
- `__tests__/app/en-indexable-headers.test.ts`
  - robots.txt에 공개 콘텐츠 쿼리 차단 패턴이 남지 않는지 회귀 테스트 추가.

## 3) 검증

- RED: 새 테스트가 현재 `/news?*` 정규화 누락과 robots query disallow 잔존 때문에 실패해야 합니다.
- GREEN: proxy 정규화 및 robots 차단 제거 후 테스트 통과.
- 정적 검증:
  - `npm test -- __tests__/app/stories-indexing-guards.test.ts __tests__/app/en-indexable-headers.test.ts`
  - `npx eslint proxy.ts app/robots.ts __tests__/app/stories-indexing-guards.test.ts __tests__/app/en-indexable-headers.test.ts`
  - `npm run type-check`
  - `git diff --check`

## 4) 완료 기준

- 공개 콘텐츠 쿼리 변형은 크롤 차단이 아니라 308 정규화로 처리됩니다.
- `/stories?category=` 카테고리 정규화와 legacy 숫자 작품 ID 리다이렉트는 유지됩니다.

---

# 콘텐츠 CTR 개선 메타 문구 실행 계획 (2026-06-04)

## 1) 목적

GSC 최근 28일 기준 노출은 많지만 CTR이 낮은 콘텐츠의 SERP 문구를 검색 의도에 더 직접 매칭합니다. 본문 제목은 매거진 톤을 유지하고, 검색 결과용 `<title>`/description과 오윤 청원 메타 문구를 조정해 클릭률 개선을 노립니다.

## 2) 근거

- `/stories/reading-art-sizes-ho-vs-cm`
  - 336 impressions / 1 click / CTR 0.30% / 평균 5.4위
  - `10호 크기`, `10호 사이즈`, `30호 사이즈`, `30호 크기` 쿼리 CTR 0%
- `/stories/editions-explained`
  - 746 impressions / 4 clicks / CTR 0.54%
  - `에디션 뜻` 439 impressions / 2 clicks / CTR 0.46%
- `/petition/oh-yoon`
  - `오윤` 322 impressions / 2 clicks / CTR 0.62%
- `/stories/archival-pigment-print-photography`
  - `피그먼트 뜻` 70 impressions / 0 clicks
- `/stories/prints-vs-originals-and-edition-numbers`
  - `넘버링 뜻` 70 impressions / 0 clicks

## 3) 변경 범위

- `lib/stories-seo-overrides.ts`
  - `reading-art-sizes-ho-vs-cm`: title 첫머리에 `10호·30호 그림 크기`, description 첫머리에 즉답 배치
  - `editions-explained`: `에디션 뜻`, `5/10`, `넘버링`, `한정판` 중심으로 단순화
  - `archival-pigment-print-photography`: `피그먼트 뜻`을 title 첫머리로 이동
  - `prints-vs-originals-and-edition-numbers`: `넘버링 뜻`을 title 첫머리로 이동
- `messages/ko.json`, `messages/en.json`
  - 오윤 청원 meta title/description을 `오윤 작가`, `판화 작품`, `유족`, `권리 회복` 의도에 맞게 조정
  - hero subtitle에 `오윤 작가`와 `작품 보존` 맥락 보강
- `__tests__/seo/content-ctr-metadata.test.ts`
  - CTR 개선 대상 키워드가 title/description에 직접 포함되는지 회귀 테스트 추가

## 4) 검증

- RED: 새 테스트가 기존 오버라이드/메시지 문구에서 실패해야 합니다.
- GREEN: 메타 문구 변경 후 테스트 통과.
- 정적 검증:
  - `npm test -- __tests__/seo/content-ctr-metadata.test.ts`
  - `npx eslint lib/stories-seo-overrides.ts __tests__/seo/content-ctr-metadata.test.ts`
  - `npm run type-check`
  - `git diff --check`

## 5) 완료 기준

- 상위 CTR 개선 대상 5개 URL의 핵심 쿼리가 SERP title/description에 직접 노출됩니다.
- DB 원문 제목/본문은 변경하지 않고, 검색 결과용 메타만 조정합니다.

# GSC/GA4 실데이터 기반 유입·매출 개선 실행 계획 (2026-06-04)

## 목표

최근 GSC/GA4 실데이터에서 확인된 저CTR 검색어와 구매 퍼널 측정 누락을 우선 개선한다. 특히 Google organic의 `view_item → purchase_click → begin_checkout → add_payment_info → purchase` 전환 누락을 분석 가능하게 만들고, 청원 페이지 대량 유입을 작품/회원가입 행동으로 더 명확히 연결한다.

## 근거 데이터

- GSC 최근 28일(2026-05-05~2026-06-01): 4,288 노출 / 102 클릭 / CTR 2.38% / 평균순위 7.0
- GA4 최근 28일: 16,741 사용자 / 19,779 세션 / 31,055 PV / 구매 6건 / 매출 약 4,416,400원
- Google organic: 634 세션, `view_item` 201, `purchase_click` 35, `begin_checkout` 16, `add_payment_info` 5, `purchase` 0
- GA4 `Items purchased` 보고서가 비어 있음: `purchase` 이벤트에 ecommerce `items` 배열이 전달되지 않는 상태
- 청원 페이지 `/petition/oh-yoon`: 15,115 세션으로 트래픽 대부분을 차지하지만 구매 전환 기여가 낮음

## 실행 범위

1. GA4 구매 이벤트 보강
   - `lib/analytics/track.ts`에 GA4 전용 payload 옵션을 추가한다.
   - Vercel Analytics에는 primitive property만 보내고, GA4에는 ecommerce `items` 배열을 보낸다.
   - `/api/payments/toss/confirm` 응답에 작품 ID, 작품명, 작가명, 작품금액, 배송비를 포함한 `analyticsItem`을 추가한다.
   - `SuccessClient`가 `analyticsItem`을 사용해 `purchase` 이벤트에 item 정보를 포함한다.

2. SEO CTR 빠른 개선
   - GSC에서 노출 대비 CTR이 낮은 `에디션 뜻`, `edition 뜻`, `피그먼트 뜻`, `넘버링 뜻` 관련 story SEO override를 최신 28일 수치 기준으로 더 직접적인 SERP 문구로 조정한다.
   - 기존 `__tests__/seo/content-ctr-metadata.test.ts`에 회귀 조건을 추가한다.

3. 청원 페이지 전환 개선
   - `/petition/oh-yoon`의 retention 영역 문구를 “작품 구매/오윤 작품 보기” 중심으로 강화한다.
   - 기존 CTA를 유지하되 Google/GA4에서 다음 행동이 명확하게 보이도록 구매 CTA 추적을 추가한다.

## 테스트 계획

- 먼저 실패 테스트를 추가한다.
  - `trackEvent`가 GA4 전용 payload를 받으면 Vercel에는 primitive만, GA4에는 `items` 배열을 보내는지 검증한다.
  - checkout success client가 `analyticsItem`과 `items` payload를 사용해야 한다는 회귀 테스트를 추가한다.
  - SEO 메타 테스트에 최신 GSC 저CTR 키워드 조건을 추가한다.
- 실패 확인 후 최소 구현을 적용한다.
- 검증 명령:
  - `npm test -- __tests__/lib/analytics-track.test.ts`
  - `npm test -- __tests__/app/checkout-success-analytics.test.ts`
  - `npm test -- __tests__/seo/content-ctr-metadata.test.ts`
  - `npm run type-check`

## 승인

사용자 발화 `승인`에 따라 위 범위의 실행을 승인된 것으로 간주하고 진행한다.

## 추가 실행 범위 (2026-06-05)

사용자가 `4`(추가 개선 계속 진행)를 선택했다. 다음 개선은 Google organic 결제 퍼널을 작품 단위로 분석할 수 있도록 checkout 진입 이벤트를 보강하는 것이다.

- 국내 checkout의 `begin_checkout`, `add_payment_info`에 GA4 ecommerce `items` 배열을 추가한다.
- 해외 checkout에도 `begin_checkout`, `add_payment_info`를 추가하고 GA4 `items` 배열을 포함한다.
- Vercel Analytics에는 기존처럼 primitive property만 전달한다.
- 회귀 테스트:
  - 국내 checkout client가 `begin_checkout`과 `add_payment_info`에 `ga4Params.items`를 포함하는지 확인한다.
  - 해외 checkout client도 동일하게 확인한다.

---

# GSC/GA4 기반 작품판매 매출 개선 실행 계획 (2026-06-09)

## 목표

GSC·GA4·내부 commerce RPC에서 확인된 병목인 “검색/매거진/작가 페이지에서 구매 가능한 작품으로 이동하는 힘”을 개선한다. 1차 매출 레버는 오윤 작품군이며, 정보성 SEO 유입은 작품 상세 클릭으로 연결한다.

## 실행 범위

1. 오윤 구매 허브 강화
   - `/petition/oh-yoon`, `/special/oh-yoon`, `/artworks/artist/오윤` 흐름에 구매 가능한 오윤 판화 스포트라이트를 추가한다.
   - 매출/checkout 신호가 있는 `무호도`, `대지`, `지리산2`, `춤2`, `칼노래`를 우선 노출한다.

2. SEO 매거진 → 작품 구매 연결
   - `에디션 뜻`, `피그먼트 뜻`, `넘버링 뜻`, `10호/30호/100호 사이즈` 등 GSC 기회 글에 관련 작품 스포트라이트를 본문 진입부에 추가한다.
   - `story_to_artwork_click`과 별도로 스포트라이트 클릭을 측정한다.

3. 작가 페이지 전환 강화
   - 일반 작가 페이지 hero 직후 구매 가능 작품·가격대 스포트라이트를 배치한다.
   - 전체 gallery/filter는 유지하고, 구매 가능 작품을 먼저 보여준다.

4. checkout 이탈 측정 보강
   - 국내/해외 checkout의 `checkout_error`, `checkout_cancel` 이벤트를 추가한다.
   - payment provider, 작품, 금액, 오류 코드를 primitive property로 보낸다.

5. 매출 집계 기준 정리
   - commerce RPC에서 `cancelled`, `refunded`, `refund_requested`는 매출/결제완료 건수에서 제외한다.
   - `is_revenue_order(status, paid_at)` helper를 추가해 5개 commerce RPC가 같은 기준을 쓰게 한다.

## 검증

- `npm test -- __tests__/app/petition-oh-yoon-conversion.test.ts __tests__/app/checkout-funnel-analytics.test.ts __tests__/app/sales-funnel-content-links.test.ts`
- `npx eslint components/features/SalesArtworkSpotlight.tsx app/[locale]/petition/oh-yoon/page.tsx app/[locale]/special/oh-yoon/page.tsx app/[locale]/artworks/artist/[artist]/page.tsx app/[locale]/stories/[slug]/page.tsx app/[locale]/checkout/[artworkId]/CheckoutClient.tsx app/[locale]/checkout/[artworkId]/OverseasCheckoutClient.tsx __tests__/app/sales-funnel-content-links.test.ts`
- `npm run type-check`
- `git diff --check`
