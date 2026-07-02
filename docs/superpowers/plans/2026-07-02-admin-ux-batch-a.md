# 관리자 UX 개선 묶음 A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 일상 마찰 3건 제거 — 주문 일괄 입금 확인, 반려 정중 안내 메일, 대시보드 처리 대기 카드.

**Architecture:** 전부 기존 패턴 복제. 일괄 입금은 기존 `confirmDeposit`를 순차 호출하는 얇은 배치 액션 + 작품 목록의 bulk 툴바 UI 복제. 반려 메일은 승인 메일(`sendArtistApprovalEmail`)을 미러하고 `rejectUser`에 `after()` 비차단 발송을 붙임. 대시보드는 기존 `admin-dashboard-overview.ts` fetch 배열에 head-count 2개를 추가하고 조건부 `StatCard`를 렌더.

**Tech Stack:** Next.js 16 (App Router, Server Actions, `after()`), TypeScript strict, next-intl, Supabase, Jest, Tailwind.

## Global Constraints

- `after()` 필수 — bare `void notify...`는 서버리스 함수 정지로 fetch abort → 발송 누락. 알림은 반드시 `next/server`의 `after()` 안에서.
- `'use server'` 파일에 async 함수 export만 추가 (re-export barrel 금지 — Turbopack build 실패).
- 색상 토큰만 사용: `primary-*`, `charcoal-*`, `gray-*`, `success-*`, `danger-*`. Tailwind 기본 팔레트(`blue/red/...`)·`slate-*` 금지.
- 리터럴 규칙은 **파일 관례**를 따른다: `order-list.tsx`·`admin-orders.ts`·반려 이메일 = 한국어 리터럴. `dashboard/page.tsx` = 이미 `getTranslations('admin.dashboard')` 전면 사용 → 메시지 키 추가(ko/en 둘 다).
- 커밋 컨벤션: `type(scope): subject` + 본문에 `요약:` 줄 필수.
- UI 시각 검증은 Playwright 금지 — build+type-check+코드검토, 시각 확인은 사용자에게 요청.

---

## Task 1: `confirmDepositBatch` 서버 액션 (A-1 서버)

**Files:**

- Modify: `app/actions/admin-orders.ts` (기존 `confirmDeposit` 바로 아래, 515행 이후 삽입)
- Test: `__tests__/actions/admin-orders.test.ts` (기존 `confirmDeposit` describe 아래 추가)

**Interfaces:**

- Consumes: 기존 `confirmDeposit(orderId: string): Promise<{ success: true }>` (에러 시 throw), `requireAdmin()`.
- Produces: `confirmDepositBatch(orderIds: string[]): Promise<{ succeeded: string[]; failed: { id: string; error: string }[] }>` — Task 2가 소비.

- [ ] **Step 1: 테스트에 배치 액션 핸들 추가**

`__tests__/actions/admin-orders.test.ts` 175행 부근 선언에 추가:

```typescript
let confirmDepositBatch: typeof import('@/app/actions/admin-orders').confirmDepositBatch;
```

`beforeEach`의 214행 부근(`confirmDeposit = mod.confirmDeposit;` 아래)에 추가:

```typescript
confirmDepositBatch = mod.confirmDepositBatch;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`describe('confirmDeposit', ...)` 블록이 끝난 직후(파일 내 `confirmDeposit` describe의 닫는 `});` 다음)에 추가:

```typescript
describe('confirmDepositBatch', () => {
  it('여러 주문을 순차 확인하고 성공 목록을 반환한다', async () => {
    await expect(confirmDepositBatch(['ord-1', 'ord-2'])).resolves.toEqual({
      succeeded: ['ord-1', 'ord-2'],
      failed: [],
    });
    expect(capturedRpcCalls).toHaveLength(2);
  });

  it('개별 실패를 수집하고 나머지 처리를 막지 않는다', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRpcResult = { data: null, error: { message: 'NO_LINE_ITEMS', code: 'P0001' } };
    try {
      const result = await confirmDepositBatch(['ord-1', 'ord-2']);
      expect(result.succeeded).toEqual([]);
      expect(result.failed).toHaveLength(2);
      expect(result.failed.map((f) => f.id)).toEqual(['ord-1', 'ord-2']);
      expect(result.failed[0].error).toContain('판매 기록');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- __tests__/actions/admin-orders.test.ts -t confirmDepositBatch`
Expected: FAIL — `confirmDepositBatch is not a function` (아직 미구현).

- [ ] **Step 4: 배치 액션 구현**

`app/actions/admin-orders.ts`의 `confirmDeposit` 함수가 끝나는 `}` (515행) 바로 다음에 삽입:

```typescript
/**
 * 여러 입금대기 주문을 순차로 입금 확인한다. 각 건은 기존 confirmDeposit를 그대로 호출하므로
 * 알림·감사 로그 로직이 완전히 재사용된다. 건별 성공/실패를 수집해 반환하며, 한 건이 실패해도
 * 나머지를 계속 처리한다(부분 실패 시 throw하지 않음). 입금 다건은 소량이라 순차로 충분하고,
 * 각 건이 after() 알림을 스케줄하므로 병렬 시 부하·로그 순서 혼선을 피한다.
 */
export async function confirmDepositBatch(
  orderIds: string[]
): Promise<{ succeeded: string[]; failed: { id: string; error: string }[] }> {
  await requireAdmin();

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const id of orderIds) {
    try {
      await confirmDeposit(id);
      succeeded.push(id);
    } catch (err) {
      failed.push({ id, error: err instanceof Error ? err.message : '입금 확인에 실패했습니다.' });
    }
  }

  return { succeeded, failed };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- __tests__/actions/admin-orders.test.ts -t confirmDepositBatch`
Expected: PASS (2 tests).

- [ ] **Step 6: 타입체크**

Run: `npm run type-check`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add app/actions/admin-orders.ts __tests__/actions/admin-orders.test.ts
git commit -m "feat(admin): 주문 일괄 입금 확인 서버 액션 confirmDepositBatch

요약: 여러 입금대기 주문을 순차 확인하는 배치 액션 추가(건별 성공/실패 수집)

- 기존 confirmDeposit 재사용(알림·감사 로그 로직 그대로)
- 부분 실패 시 throw 없이 { succeeded, failed } 반환
- 단위 테스트: 전건 성공 / 개별 실패 수집

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 주문 목록 체크박스 + bulk 툴바 (A-1 클라이언트)

**Files:**

- Modify: `app/(portal)/admin/orders/order-list.tsx`

**Interfaces:**

- Consumes: `confirmDepositBatch` (Task 1), 기존 `AdminConfirmModal`, `useToast`.
- Produces: (UI만 — 다른 태스크가 소비하지 않음)

- [ ] **Step 1: import·상태 추가**

`order-list.tsx` 3행 `import { useState, useMemo, useTransition } from 'react';`를 아래로 교체:

```typescript
import { useState, useMemo, useTransition, useEffect } from 'react';
```

16행 import를 아래로 교체(배치 액션 추가):

```typescript
import {
  confirmDeposit,
  confirmDepositBatch,
  type AdminOrderListItem,
} from '@/app/actions/admin-orders';
```

`OrderList` 컴포넌트 본문에서 기존 상태 선언부(100행 `const [isConfirming, startConfirm] = useTransition();` 다음)에 추가:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
const [isBulkConfirming, startBulkConfirm] = useTransition();
```

- [ ] **Step 2: 필터 변경 시 선택 초기화 + 파생값**

`filtered` useMemo(117-134행) 바로 아래에 추가:

```typescript
// 필터·검색이 바뀌면 화면에서 사라진 선택이 남지 않도록 초기화
useEffect(() => {
  setSelectedIds(new Set());
}, [statusFilter, query]);

const selectableRows = useMemo(
  () => filtered.filter((o) => o.status === 'awaiting_deposit'),
  [filtered]
);
const allSelected = selectableRows.length > 0 && selectableRows.every((o) => selectedIds.has(o.id));

function toggleOne(id: string) {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

function toggleAll() {
  setSelectedIds((prev) => {
    if (selectableRows.every((o) => prev.has(o.id))) return new Set();
    return new Set(selectableRows.map((o) => o.id));
  });
}

function handleBulkConfirm() {
  const ids = [...selectedIds];
  if (ids.length === 0) return;
  startBulkConfirm(async () => {
    try {
      const { succeeded, failed } = await confirmDepositBatch(ids);
      if (failed.length === 0) {
        toast.success(`${succeeded.length}건 입금 확인 완료`);
      } else {
        toast.error(`${succeeded.length}건 확인, ${failed.length}건 실패`);
      }
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '일괄 입금 확인에 실패했습니다.');
    }
  });
}
```

- [ ] **Step 3: bulk 툴바 추가**

`AdminCardHeader`가 닫히는 `</AdminCardHeader>`(167행) 바로 다음에 삽입:

```tsx
{
  selectedIds.size > 0 && (
    <div className="flex flex-wrap items-center gap-4 border-b border-primary-soft bg-primary-surface px-4 py-3">
      <span className="text-sm font-medium text-primary-strong">{selectedIds.size}건 선택</span>
      <div className="h-4 w-px bg-primary-soft" />
      <button
        type="button"
        onClick={() => setBulkConfirmOpen(true)}
        disabled={isBulkConfirming}
        className="rounded-md bg-primary-strong px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-strong/90 disabled:opacity-50"
      >
        일괄 입금 확인
      </button>
      <button
        type="button"
        onClick={() => setSelectedIds(new Set())}
        disabled={isBulkConfirming}
        className="text-xs text-charcoal-muted hover:underline disabled:opacity-50"
      >
        선택 해제
      </button>
      {isBulkConfirming && (
        <span className="animate-pulse text-xs text-primary-a11y">처리 중…</span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 체크박스 열 헤더 추가**

thead의 첫 `<th className="px-4 py-3">주문번호</th>`(176행) 바로 앞에 삽입:

```tsx
<th className="w-10 px-4 py-3">
  <input
    type="checkbox"
    aria-label="입금 대기 전체 선택"
    checked={allSelected}
    onChange={toggleAll}
    disabled={selectableRows.length === 0}
    className="h-4 w-4 cursor-pointer accent-primary-strong disabled:cursor-not-allowed"
  />
</th>
```

- [ ] **Step 5: 행 체크박스 셀 추가**

각 행 `<tr ...>` 직후, 첫 `<td className="px-4 py-3 font-mono ...">{order.order_no}</td>`(189행) 바로 앞에 삽입:

```tsx
<td className="px-4 py-3">
  {order.status === 'awaiting_deposit' && (
    <input
      type="checkbox"
      aria-label={`주문 ${order.order_no} 선택`}
      checked={selectedIds.has(order.id)}
      onChange={() => toggleOne(order.id)}
      className="h-4 w-4 cursor-pointer accent-primary-strong"
    />
  )}
</td>
```

- [ ] **Step 6: 일괄 확인 모달 추가**

기존 단건 `<AdminConfirmModal ... />`(249-264행) 닫힌 다음, `</AdminCard>` 앞에 삽입:

```tsx
<AdminConfirmModal
  isOpen={bulkConfirmOpen}
  onClose={() => setBulkConfirmOpen(false)}
  onConfirm={handleBulkConfirm}
  title="일괄 입금 확인"
  description={`선택한 ${selectedIds.size}건의 입금을 확인하고 결제 완료 처리합니다.`}
  confirmText="일괄 입금 확인"
  variant="info"
  isLoading={isBulkConfirming}
/>
```

- [ ] **Step 7: 타입체크 + 린트**

Run: `npm run type-check && npm run lint`
Expected: 에러 없음. (콘솔에 미사용 import/변수 경고 없어야 함 — `confirmDeposit`는 단건 버튼에서 계속 사용됨)

- [ ] **Step 8: 빌드 확인**

Run: `npm run build`
Expected: 성공(Turbopack SSG 컴파일 통과).

- [ ] **Step 9: 커밋**

```bash
git add "app/(portal)/admin/orders/order-list.tsx"
git commit -m "feat(admin): 주문 목록 다중선택 일괄 입금 확인 UI

요약: 입금대기 주문 체크박스 선택 후 한 번에 입금 확인하는 bulk 툴바 추가

- awaiting_deposit 행만 선택 가능, 전체 선택 지원
- 필터 변경 시 선택 초기화, 부분 실패는 토스트로 건수 표시
- confirmDepositBatch 호출, 기존 AdminConfirmModal 재사용

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> **검증 노트:** 이 태스크는 순수 UI 배선이라 jest 단위 테스트 대신 type-check/lint/build로 검증한다(리포지토리 관례 — 기존 단건 입금 확인 버튼도 동일). 실제 클릭 동작은 사용자 시각 확인에 위임.

---

## Task 3: 반려 정중 안내 메일 (A-2)

**Files:**

- Modify: `lib/notify.ts` (기존 `sendArtistApprovalEmail` 445행 다음)
- Modify: `app/actions/admin.ts` (`rejectUser` 698-756행)

**Interfaces:**

- Consumes: 기존 `escapeHtml`, `BRAND_COLORS`, `buildReplyToAddress`, `recordEmailLog`, `resendFetch`(모두 `notify.ts` 내부에 이미 존재), `normalizeEmail`·`after`(admin.ts에 이미 import됨).
- Produces: `sendArtistRejectionEmail(to: string, artistName: string): Promise<void>`.

- [ ] **Step 1: 반려 메일 함수 구현**

`lib/notify.ts`의 `sendArtistApprovalEmail`가 끝나는 `}`(445행) 바로 다음에 삽입:

```typescript
/**
 * 작가 신청 반려 안내 메일. 승인 메일 레이아웃을 미러하되 사유는 담지 않고 정중히 안내한다.
 * rejectUser의 after() 안에서 비차단 호출되므로 실패해도 throw하지 않는다(반려 DB는 이미 커밋).
 */
export async function sendArtistRejectionEmail(to: string, artistName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !to) return;

  const safeArtistName = escapeHtml(artistName);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND_COLORS.canvas.DEFAULT};font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI','Malgun Gothic','Noto Sans KR',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:${BRAND_COLORS.gallery.canvas};border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${BRAND_COLORS.primary.strong};padding:16px 24px;">
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">씨앗페 2026 작가 신청 안내</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;font-size:15px;color:${BRAND_COLORS.charcoal.deep};">${safeArtistName} 선생님, 안녕하세요.</p>
      <p style="margin:0 0 16px;font-size:14px;color:${BRAND_COLORS.charcoal.DEFAULT};line-height:1.6;">
        씨앗페 2026 작가 신청에 관심을 가져주셔서 진심으로 감사드립니다.<br>
        신중히 검토한 결과, 이번에는 함께하기 어렵게 되었음을 정중히 안내드립니다.<br>
        보내주신 관심에 다시 한 번 깊이 감사드리며, 다음 기회에 다시 뵙기를 바랍니다.
      </p>
      <p style="margin:0;font-size:14px;color:${BRAND_COLORS.charcoal.DEFAULT};line-height:1.6;">
        문의사항은 <a href="mailto:contact@kosmart.org" style="color:${BRAND_COLORS.primary.strong};">contact@kosmart.org</a> 로 연락 주시면 정성껏 답변드리겠습니다.
      </p>
    </div>
    <div style="padding:12px 24px;background:${BRAND_COLORS.canvas.DEFAULT};border-top:1px solid ${BRAND_COLORS.gallery.hairline};">
      <p style="margin:0;font-size:12px;color:${BRAND_COLORS.gray[400]};">씨앗페 2026 · 한국스마트협동조합 · 문의: contact@kosmart.org</p>
    </div>
  </div>
</body>
</html>`;

  const subject = '[씨앗페] 작가 신청 안내';
  const result = await resendFetch(
    {
      apiKey,
      from,
      to,
      subject,
      html,
      reply_to: buildReplyToAddress(),
    },
    '[artist-rejection]'
  );
  await recordEmailLog({ to, type: 'artist_rejection', subject, result });
  // after() 비차단 발송이므로 실패해도 throw하지 않고 로그만 남긴다.
  if (!result.ok) {
    console.error('[artist-rejection] 이메일 발송 실패:', result.error);
  }
}
```

- [ ] **Step 2: `rejectUser` select에 email 추가 + 발송 배선**

`app/actions/admin.ts` `rejectUser`의 select(703-707행)를 아래로 교체:

```typescript
const { data: beforeProfile, error: beforeProfileError } = await supabase
  .from('profiles')
  .select('id, name, email, role, status, updated_at')
  .eq('id', userId)
  .single();
```

`logAdminAction(...)` 호출이 끝난 다음, `return { message: '사용자가 거절(차단)되었습니다.', error: false };`(749행) 바로 앞에 삽입:

```typescript
// 반려 완료 후 신청자에게 정중한 안내 메일 발송(비차단). 반려 DB는 이미 커밋됐으므로
// 발송 실패가 반려 결과를 되돌리지 않도록 after()로 처리한다.
const rejectionEmail = normalizeEmail(beforeProfile?.email || null);
if (rejectionEmail) {
  const artistName = beforeProfile?.name || '작가님';
  after(async () => {
    try {
      const { sendArtistRejectionEmail } = await import('@/lib/notify');
      await sendArtistRejectionEmail(rejectionEmail, artistName);
    } catch (err) {
      console.error('[rejectUser] 반려 안내 이메일 발송 실패:', err);
    }
  });
}
```

- [ ] **Step 3: 타입체크 + 린트**

Run: `npm run type-check && npm run lint`
Expected: 에러 없음. (`normalizeEmail`·`after`는 admin.ts에 이미 import돼 있어야 함 — approveUser가 사용 중. 만약 누락 에러가 나면 상단 import에 추가)

- [ ] **Step 4: env 미설정 no-op 확인 (선택)**

`RESEND_API_KEY` 없이 로컬에서 반려를 실행하면 `sendArtistRejectionEmail` 첫 줄에서 조기 return → 예외·크래시 없음. 코드 검토로 확인(초기 가드 `if (!apiKey || !from || !to) return;`).

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 6: 커밋**

```bash
git add lib/notify.ts app/actions/admin.ts
git commit -m "feat(admin): 작가 신청 반려 시 정중 안내 메일 발송

요약: rejectUser가 신청자에게 사유 미포함 정중 안내 메일을 after()로 발송

- sendArtistRejectionEmail 신설(승인 메일 레이아웃 미러, 문의처 안내)
- rejectUser select에 email 추가, 비차단 after() 발송
- 발송 실패는 반려 결과에 영향 없이 로그만

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> **검증 노트:** 승인 메일(`sendArtistApprovalEmail`)도 리포지토리에 전용 jest 단위 테스트 없이 배포됐다(HTML 빌더 + Resend fetch). 반려 메일도 동일 관례를 따라 type-check/build/no-op 가드로 검증하고, 실제 발송은 사용자 스테이징 확인에 위임한다.

---

## Task 4: 대시보드 처리 대기 카드 + 신청 리스트 링크 (A-3)

**Files:**

- Modify: `app/actions/admin-dashboard-overview.ts`
- Modify: `app/(portal)/admin/dashboard/page.tsx`
- Modify: `messages/ko.admin.json`, `messages/en.admin.json`

**Interfaces:**

- Consumes: 기존 `StatCard`, `getTranslations('admin.dashboard')`.
- Produces: overview 반환 객체에 `newInboundMailCount: number`, `eventActionNeededCount: number` 필드.

- [ ] **Step 1: overview 반환 타입에 필드 추가**

`app/actions/admin-dashboard-overview.ts`의 반환 타입 인터페이스에서 `awaitingDepositCount: number;`(105행 부근) 다음에 추가:

```typescript
newInboundMailCount: number;
eventActionNeededCount: number;
```

- [ ] **Step 2: fetch 배열에 head-count 2개 추가**

`Promise.all` 구조분해 배열(275행 시작)의 마지막 항목 `refundRequestedCountResult,`(274행) 다음 줄에 추가:

```typescript
    newInboundMailCountResult,
    eventActionNeededCountResult,
```

그리고 `Promise.all([...])` 안의 마지막 쿼리(환불 요청, 337-340행) 다음, 배열 닫는 `]`(341행) 앞에 추가:

```typescript
    // 새 인바운드 메일 — 관리자 확인 필요
    supabase
      .from('email_inbound_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    // 추도식 신청 처리 대기 — 입금 확인 + 대기자 안내
    supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .in('status', ['awaiting_deposit', 'waitlist']),
```

- [ ] **Step 3: 반환 객체에 카운트 매핑 추가**

반환 객체에서 `awaitingDepositCount: awaitingDepositCountResult.count ?? 0,`(495행 부근) 다음에 추가:

```typescript
    newInboundMailCount: newInboundMailCountResult.count ?? 0,
    eventActionNeededCount: eventActionNeededCountResult.count ?? 0,
```

- [ ] **Step 4: i18n 키 추가 (ko/en)**

`messages/ko.admin.json`의 `admin.dashboard` 객체에서 `"refundRequested": "환불 요청 처리",`(61행) 다음에 추가:

```json
      "newInboundMail": "새 문의",
      "eventActionNeeded": "추도식 처리 대기",
```

`messages/en.admin.json`의 같은 위치(`"refundRequested": "Refund Requests",` 다음)에 추가:

```json
      "newInboundMail": "New Inquiries",
      "eventActionNeeded": "Memorial To-Do",
```

- [ ] **Step 5: 대시보드 카드 2개 추가**

`app/(portal)/admin/dashboard/page.tsx`에서 환불 요청 조건부 카드 블록(166-173행)의 닫는 `)}` 다음에 삽입:

```tsx
{
  stats.newInboundMailCount > 0 && (
    <StatCard
      title={t('newInboundMail')}
      valueText={numberFormatter.format(stats.newInboundMailCount)}
      subtitle={t('needsCheck')}
      href="/admin/email"
    />
  );
}
{
  stats.eventActionNeededCount > 0 && (
    <StatCard
      title={t('eventActionNeeded')}
      valueText={numberFormatter.format(stats.eventActionNeededCount)}
      subtitle={t('needsCheck')}
      href="/admin/event"
    />
  );
}
```

- [ ] **Step 6: 신청 리스트 항목 링크화**

`dashboard/page.tsx`의 신청 리스트 `<li>` 블록(457-469행)을 아래로 교체(각 항목을 `/admin/users?status=pending`로 이동 가능하게):

```tsx
{
  stats.recentApplications.map((app) => (
    <li key={app.id} className="hover:bg-gray-50 transition-colors">
      <Link href="/admin/users?status=pending" className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{app.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{app.email}</p>
          <p className="text-xs text-gray-500">{app.contact}</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
          {formatDate(app.created_at, locale)}
        </span>
      </Link>
    </li>
  ));
}
```

- [ ] **Step 7: 타입체크 + 린트 + i18n placeholder 검사**

Run: `npm run type-check && npm run lint`
Expected: 에러 없음. (`Link`는 page.tsx 상단에 이미 import됨)

- [ ] **Step 8: 빌드 확인 (i18n placeholder 검증 포함)**

Run: `npm run build`
Expected: 성공. build 파이프라인의 `verify:i18n-placeholders`가 ko/en 키 정합성까지 검증 — 한쪽만 추가했으면 여기서 실패하므로 Step 4에서 양쪽 모두 추가 확인.

- [ ] **Step 9: 커밋**

```bash
git add app/actions/admin-dashboard-overview.ts "app/(portal)/admin/dashboard/page.tsx" messages/ko.admin.json messages/en.admin.json
git commit -m "feat(admin): 대시보드 새 문의·추도식 처리 대기 카드 + 신청 리스트 링크

요약: 첫 화면 처리 대기 큐 완성 — 인바운드 메일·행사 처리 대기 카드 추가, 신청 리스트 개별 링크화

- overview에 newInboundMailCount·eventActionNeededCount head-count 추가
- count>0일 때만 조건부 StatCard(→ /admin/email, /admin/event)
- 최근 신청 항목을 /admin/users?status=pending 링크로

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 최종 검증 (전 태스크 완료 후)

- [ ] `npm test` 전체 그린
- [ ] `npm run type-check` 클린
- [ ] `npm run lint` 클린
- [ ] `npm run build` 성공 (SSG + i18n placeholder 통과)
- [ ] 사용자에게 시각 확인 요청: (1) 주문 목록 입금대기 다건 선택→일괄 확인, (2) 대시보드 새 카드 노출, (3) 반려 메일 스테이징 발송

## Self-Review 결과 (spec 대비)

- **A-1** 서버(Task 1)·클라이언트(Task 2) 모두 커버. bulk 툴바·순차 배치·부분 실패 처리 반영.
- **A-2** 반려 메일(Task 3) 커버. 사유 미포함 정중 톤·`after()` 비차단·env no-op 반영.
- **A-3** 카드 2개·신청 리스트 링크·i18n ko/en(Task 4) 커버. 데이터 출처(`email_inbound_messages` status=new, `event_registrations` awaiting_deposit/waitlist) 반영.
- Placeholder 없음 — 모든 코드 단계에 실제 코드 포함.
- 타입 일관성: `confirmDepositBatch` 시그니처가 Task 1 정의 ↔ Task 2 소비 일치. `newInboundMailCount`/`eventActionNeededCount` 명칭 Task 4 내부 일치.
