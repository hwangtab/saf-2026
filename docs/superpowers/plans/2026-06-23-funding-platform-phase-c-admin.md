# 크라우드펀딩 Phase C — admin 펀딩 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영자가 admin에서 펀딩 프로젝트를 개설·수정하고, 리워드 티어를 CRUD하고, 후원자 명단을 보며 환불·발송 처리를 할 수 있게 한다(범용 — 다른 작가 펀딩 대비).

**Architecture:** event admin 패턴 미러 — `requireAdmin()` + `createSupabaseAdminClient()`(service_role, RLS 우회)로 `funding_projects`/`reward_tiers`/`funding_pledges`를 직접 CRUD. 환불만 Toss `cancelPayment` + status update. admin은 한국어(i18n 비스코프). 발송 추적용 컬럼을 funding_pledges에 추가.

**Tech Stack:** Next.js 16 App Router(SSR admin), TS strict, Supabase(service_role 직접 쿼리), Toss Payments(cancel), Jest.

## Global Constraints

- admin 포털(`app/(portal)/admin/**`, `app/actions/admin-*.ts`)은 **영구 한국어**(i18n 비-스코프) — next-intl 메시지 불필요, 한국어 리터럴 직접 작성.
- 모든 admin server action 첫 줄 `await requireAdmin()` (from `@/lib/auth/guards`). DB는 `createSupabaseAdminClient()` (from `@/lib/auth/server`).
- 색상: 브랜드 토큰만(`primary`·`charcoal`·`gray`·`canvas`·`danger`·`success`). slate/blue/indigo 금지. CTA는 `<Button variant="primary">`. 이미지는 SafeImage.
- 환불은 `status='paid'`에서만, **전액 환불만**(1차 단일 티어). Toss `cancelPayment` 성공과 내부 DB sync 실패를 분리해 실패 시 operator alert(notifyEmail).
- 프로젝트 status 전이 `draft→active→closed→settled`만 허용, 역행 금지(action에서 검증).
- paid 후원이 묶인 reward_tier 삭제 차단.
- 티어 금액·수량 수정은 이미 paid된 후원에 소급 안 됨(`pledge_items.unit_amount` 시점가 보존 — 이미 보장됨, admin은 reward_tiers만 수정).
- TS strict: `as any`/`@ts-ignore` 금지(Supabase 쿼리 결과 캐스트 기존 패턴 허용).
- 마이그레이션은 로컬 `db reset` 검증. production 적용은 후속(사용자 컨펌, Phase A 방식).
- ⚠️ GIT: 커밋 후 controller가 push. subagent는 git reset/checkout/stash/rebase 금지.

---

### Task C1: funding_pledges 발송 컬럼 마이그레이션

**Files:**

- Create: `supabase/migrations/20260623140000_funding_fulfillment.sql`
- Modify: `types/supabase.ts`

**Interfaces:**

- Produces: `funding_pledges.fulfillment_status` (`none`|`preparing`|`shipped`|`delivered`, 기본 `none`), `tracking_company text NULL`, `tracking_number text NULL`.

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- 리워드 발송 추적 컬럼 (admin 발송 관리).
ALTER TABLE public.funding_pledges
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'none'
    CHECK (fulfillment_status IN ('none','preparing','shipped','delivered'));
ALTER TABLE public.funding_pledges ADD COLUMN IF NOT EXISTS tracking_company text;
ALTER TABLE public.funding_pledges ADD COLUMN IF NOT EXISTS tracking_number text;
```

- [ ] **Step 2: 로컬 적용·타입**

Run: `supabase db reset --local` → `supabase gen types typescript --local > types/supabase.ts` → `npm run type-check`
Expected: 적용, `fulfillment_status` 타입 반영, 타입체크 통과.

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260623140000_funding_fulfillment.sql types/supabase.ts
git commit -m "feat(funding): add fulfillment tracking columns to funding_pledges

요약: 리워드 발송상태·송장 컬럼 추가 (admin 발송 관리)"
```

---

### Task C2: admin 펀딩 server actions

**Files:**

- Create: `app/actions/admin-funding.ts`
- Test: `__tests__/actions/admin-funding.test.ts`

**Interfaces:**

- Consumes: `requireAdmin`(`@/lib/auth/guards`), `createSupabaseAdminClient`(`@/lib/auth/server`), `cancelPayment`(`@/lib/integrations/toss/cancel`), `notifyEmail`(`@/lib/notify`).
- Produces:
  - `createFundingProject(input)` / `updateFundingProject(id, input)` → `{ ok, id?, error? }`
  - `createRewardTier(input)` / `updateRewardTier(id, input)` / `deleteRewardTier(id)` → `{ ok, error? }` (deleteRewardTier: paid pledge 묶이면 `{ ok:false, error:'TIER_HAS_PLEDGES' }`)
  - `listFundingBackers(projectId)` → `{ pledges: Array<{...}> }` (PII 포함)
  - `refundFundingPledge(pledgeId)` → `{ ok, error? }`
  - `updateFulfillment(pledgeId, status, company?, number?)` → `{ ok, error? }`

- [ ] **Step 1: 실패 테스트 작성** (event-admin.test.ts 패턴 미러 — mock requireAdmin/admin client/cancelPayment)

```typescript
import {
  deleteRewardTier,
  refundFundingPledge,
  updateFulfillment,
} from '@/app/actions/admin-funding';

jest.mock('@/lib/auth/guards', () => ({ requireAdmin: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));
jest.mock('@/lib/integrations/toss/cancel', () => ({ cancelPayment: jest.fn() }));
jest.mock('@/lib/notify', () => ({ notifyEmail: jest.fn() }));

const { createSupabaseAdminClient } = require('@/lib/auth/server');
const { cancelPayment } = require('@/lib/integrations/toss/cancel');

beforeEach(() => jest.clearAllMocks());

it('deleteRewardTier blocks when paid pledges exist', async () => {
  createSupabaseAdminClient.mockReturnValue({
    from: (t: string) => ({
      select: () => ({
        eq: () => ({ eq: () => ({ limit: () => ({ data: [{ id: 'x' }], error: null }) }) }),
      }),
    }),
  });
  const res = await deleteRewardTier('tier1');
  expect(res).toEqual({ ok: false, error: 'TIER_HAS_PLEDGES' });
});

it('refundFundingPledge refunds paid pledge via Toss cancel', async () => {
  const update = jest.fn().mockReturnValue({ eq: () => ({ error: null }) });
  createSupabaseAdminClient.mockReturnValue({
    from: (t: string) =>
      t === 'funding_pledges'
        ? {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: { id: 'p1', status: 'paid', order_no: 'FND-1' },
                  error: null,
                }),
              }),
            }),
            update,
          }
        : {
            select: () => ({
              eq: () => ({ single: () => ({ data: { payment_key: 'pk1' }, error: null }) }),
            }),
            update,
          },
  });
  cancelPayment.mockResolvedValue({ success: true });
  const res = await refundFundingPledge('p1');
  expect(res.ok).toBe(true);
  expect(cancelPayment).toHaveBeenCalled();
});

it('refundFundingPledge rejects non-paid pledge', async () => {
  createSupabaseAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: { id: 'p1', status: 'pending_payment' }, error: null }),
        }),
      }),
    }),
  });
  const res = await refundFundingPledge('p1');
  expect(res).toEqual({ ok: false, error: 'NOT_REFUNDABLE' });
});

it('updateFulfillment writes status + tracking', async () => {
  const eq = jest.fn().mockReturnValue({ error: null });
  const update = jest.fn().mockReturnValue({ eq });
  createSupabaseAdminClient.mockReturnValue({ from: () => ({ update }) });
  const res = await updateFulfillment('p1', 'shipped', 'CJ', '123');
  expect(res.ok).toBe(true);
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      fulfillment_status: 'shipped',
      tracking_company: 'CJ',
      tracking_number: '123',
    })
  );
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/actions/admin-funding.test.ts` → FAIL(module not found)

- [ ] **Step 3: 구현** (event-admin.ts 패턴 미러 — 각 함수 첫 줄 requireAdmin, admin client 직접 쿼리)

핵심 구현 지침(완전한 코드는 event-admin.ts 구조를 따라 작성):

```typescript
'use server';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { notifyEmail } from '@/lib/notify';
import { after } from 'next/server';

const VALID_STATUS = ['draft', 'active', 'closed', 'settled'] as const;
const STATUS_ORDER: Record<string, number> = { draft: 0, active: 1, closed: 2, settled: 3 };

export interface FundingProjectInput {
  slug: string;
  title: string;
  summary?: string;
  story?: string;
  cover_image?: string;
  goal_amount: number;
  start_at?: string;
  end_at?: string;
}

export async function createFundingProject(input: FundingProjectInput) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  if (!input.slug?.trim() || !input.title?.trim() || !(input.goal_amount > 0))
    return { ok: false, error: 'INVALID_INPUT' };
  const { data, error } = await db
    .from('funding_projects')
    .insert({
      slug: input.slug,
      title: input.title,
      summary: input.summary ?? null,
      story: input.story ?? null,
      cover_image: input.cover_image ?? null,
      goal_amount: input.goal_amount,
      status: 'draft',
      start_at: input.start_at ?? null,
      end_at: input.end_at ?? null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updateFundingProject(
  id: string,
  input: Partial<FundingProjectInput> & { status?: string }
) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  // status 전이 가드: 현재 status 조회 → 역행 금지
  if (input.status) {
    if (!VALID_STATUS.includes(input.status as (typeof VALID_STATUS)[number]))
      return { ok: false, error: 'INVALID_STATUS' };
    const { data: cur } = await db.from('funding_projects').select('status').eq('id', id).single();
    if (cur && STATUS_ORDER[input.status] < STATUS_ORDER[cur.status])
      return { ok: false, error: 'STATUS_REGRESSION' };
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of [
    'title',
    'summary',
    'story',
    'cover_image',
    'goal_amount',
    'start_at',
    'end_at',
    'status',
  ] as const) {
    if (input[k as keyof typeof input] !== undefined) patch[k] = input[k as keyof typeof input];
  }
  const { error } = await db.from('funding_projects').update(patch).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function createRewardTier(input: {
  project_id: string;
  title: string;
  description?: string;
  amount: number;
  total_quantity?: number | null;
  requires_shipping?: boolean;
  reward_kind?: string;
  image_url?: string;
  estimated_delivery?: string;
  sort_order?: number;
}) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  if (!input.title?.trim() || !(input.amount > 0)) return { ok: false, error: 'INVALID_INPUT' };
  const { error } = await db.from('reward_tiers').insert({
    project_id: input.project_id,
    title: input.title,
    description: input.description ?? null,
    amount: input.amount,
    total_quantity: input.total_quantity ?? null,
    requires_shipping: input.requires_shipping ?? false,
    reward_kind: input.reward_kind ?? 'goods',
    image_url: input.image_url ?? null,
    estimated_delivery: input.estimated_delivery ?? null,
    sort_order: input.sort_order ?? 0,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateRewardTier(id: string, input: Record<string, unknown>) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const allowed = [
    'title',
    'description',
    'amount',
    'total_quantity',
    'requires_shipping',
    'reward_kind',
    'image_url',
    'estimated_delivery',
    'sort_order',
  ];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (input[k] !== undefined) patch[k] = input[k];
  const { error } = await db.from('reward_tiers').update(patch).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteRewardTier(id: string) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  // paid 후원이 묶인 티어 삭제 차단
  const { data: pledged } = await db
    .from('pledge_items')
    .select('id')
    .eq('reward_tier_id', id)
    .limit(1); // pledge_items는 paid 여부 확인 위해 join 필요 — 아래 주의
  // 정확히는: 이 티어를 가진 pledge 중 status='paid' 존재 검사
  const { data: paid } = await db
    .from('pledge_items')
    .select('pledge_id, funding_pledges!inner(status)')
    .eq('reward_tier_id', id)
    .eq('funding_pledges.status', 'paid')
    .limit(1);
  if (paid && paid.length > 0) return { ok: false, error: 'TIER_HAS_PLEDGES' };
  const { error } = await db.from('reward_tiers').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function listFundingBackers(projectId: string) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('funding_pledges')
    .select(
      'id, order_no, backer_name, backer_email, backer_phone, total_amount, status, fulfillment_status, tracking_company, tracking_number, shipping_name, shipping_phone, shipping_address, shipping_postal_code, shipping_memo, is_anonymous, supporter_message, paid_at, created_at'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  return { pledges: data ?? [], error: error?.message };
}

export async function refundFundingPledge(pledgeId: string) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data: pledge, error: pErr } = await db
    .from('funding_pledges')
    .select('id, status, order_no')
    .eq('id', pledgeId)
    .single();
  if (pErr || !pledge) return { ok: false, error: 'NOT_FOUND' };
  if (pledge.status !== 'paid') return { ok: false, error: 'NOT_REFUNDABLE' };
  const { data: pay } = await db
    .from('funding_payments')
    .select('payment_key')
    .eq('pledge_id', pledgeId)
    .single();
  if (!pay?.payment_key) return { ok: false, error: 'NO_PAYMENT' };
  const cancelResult = await cancelPayment(
    pay.payment_key,
    { cancelReason: '관리자 환불' },
    `fnd-admin-refund-${pledge.order_no}`,
    'domestic'
  );
  if (!cancelResult.success) {
    after(() =>
      notifyEmail('error', '펀딩 환불 실패(수동확인)', {
        주문번호: pledge.order_no,
        에러: cancelResult.error.message || cancelResult.error.code,
      })
    );
    return { ok: false, error: 'TOSS_CANCEL_FAILED' };
  }
  const { error: uErr } = await db
    .from('funding_pledges')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pledgeId);
  if (uErr) {
    after(() =>
      notifyEmail('error', '펀딩 환불 후 상태변경 실패(Toss는 취소됨)', {
        주문번호: pledge.order_no,
      })
    );
    return { ok: false, error: 'SYNC_FAILED' };
  }
  await db
    .from('funding_payments')
    .update({ status: 'CANCELED', cancelled_at: new Date().toISOString() })
    .eq('pledge_id', pledgeId);
  return { ok: true };
}

export async function updateFulfillment(
  pledgeId: string,
  status: string,
  company?: string,
  number?: string
) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  if (!['none', 'preparing', 'shipped', 'delivered'].includes(status))
    return { ok: false, error: 'INVALID_STATUS' };
  const { error } = await db
    .from('funding_pledges')
    .update({
      fulfillment_status: status,
      tracking_company: company ?? null,
      tracking_number: number ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pledgeId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
```

> 주의: deleteRewardTier의 paid-pledge 검사는 `pledge_items` ↔ `funding_pledges` join 필터. Supabase embed 문법(`funding_pledges!inner(status)`)이 admin client에서 동작하는지 확인하고, 안 되면 2-step(pledge_items에서 pledge_id 모아 funding_pledges status 조회)으로. 테스트 mock은 단순화돼 있으니 실제 쿼리 형태에 맞춰 mock 조정.

- [ ] **Step 4: 통과 확인** — `npx jest __tests__/actions/admin-funding.test.ts` → PASS, `npm run type-check`(tail)

- [ ] **Step 5: 커밋**

```bash
git add app/actions/admin-funding.ts __tests__/actions/admin-funding.test.ts
git commit -m "feat(funding): add admin funding actions (project/tier CRUD, refund, fulfillment)

요약: admin 펀딩 액션 — 프로젝트·티어 CRUD·후원자조회·환불·발송 (requireAdmin+service_role)"
```

---

### Task C3: /admin/funding 목록 페이지 + nav

**Files:**

- Create: `app/(portal)/admin/funding/page.tsx`
- Modify: admin nav 컴포넌트 (펀딩 메뉴 추가 — 기존 admin nav 위치는 grep `admin/event` 로 확인)

**Interfaces:**

- Consumes: `requireAdmin`, `createSupabaseAdminClient`, `funding_project_status` RPC(달성률).
- Produces: 프로젝트 목록 SSR 페이지.

- [ ] **Step 1: 페이지 구현** (event admin page 패턴 미러; 서버 컴포넌트)

```tsx
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function AdminFundingListPage() {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data: projects } = await db
    .from('funding_projects')
    .select('id, slug, title, goal_amount, status, end_at, created_at')
    .order('created_at', { ascending: false });
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-charcoal-deep">펀딩 프로젝트</h1>
        <Link href="/admin/funding/new">
          <Button variant="primary">새 프로젝트</Button>
        </Link>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-charcoal-muted">
            <th className="py-2">제목</th>
            <th>목표</th>
            <th>상태</th>
            <th>마감</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(projects ?? []).map((p) => (
            <tr key={p.id} className="border-b border-gallery-divider">
              <td className="py-3 font-medium text-charcoal">{p.title}</td>
              <td>{p.goal_amount.toLocaleString('ko-KR')}원</td>
              <td>{p.status}</td>
              <td>{p.end_at ? new Date(p.end_at).toLocaleDateString('ko-KR') : '-'}</td>
              <td>
                <Link href={`/admin/funding/${p.id}`} className="text-primary-strong">
                  관리
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: admin nav에 펀딩 메뉴 추가**

기존 admin nav(grep `'/admin/event'` 또는 admin layout의 nav 배열)에 `{ href: '/admin/funding', label: '펀딩' }` 추가. 실제 nav 구조는 해당 파일 읽어 맞춘다.

- [ ] **Step 3: 검증·커밋** — `npm run type-check` 후:

```bash
git add "app/(portal)/admin/funding/page.tsx" <nav file>
git commit -m "feat(funding): add admin funding list page + nav

요약: admin 펀딩 프로젝트 목록 + 네비 메뉴"
```

---

### Task C4: /admin/funding/new 개설 폼

**Files:**

- Create: `app/(portal)/admin/funding/new/page.tsx`, `app/(portal)/admin/funding/new/NewProjectForm.tsx`

**Interfaces:**

- Consumes: `createFundingProject`(C2).
- Produces: 개설 폼 → 성공 시 `/admin/funding/[id]`로 이동.

- [ ] **Step 1: 폼 구현** (client; createFundingProject 호출)

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { createFundingProject } from '@/app/actions/admin-funding';

export default function NewProjectForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: '',
    title: '',
    summary: '',
    story: '',
    goal_amount: '',
    end_at: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createFundingProject({
      slug: form.slug,
      title: form.title,
      summary: form.summary,
      story: form.story,
      goal_amount: Number(form.goal_amount),
      end_at: form.end_at || undefined,
    });
    if (!res.ok) {
      setError(res.error ?? '오류');
      setSaving(false);
      return;
    }
    router.push(`/admin/funding/${res.id}`);
  }
  // 입력 필드: slug, title, summary, story(textarea), goal_amount(number), end_at(date) + 저장 버튼
  // (event admin 폼 입력 마크업 패턴 복제)
  return /* form JSX with brand tokens */ null as never;
}
```

page.tsx(서버): `await requireAdmin()` 후 `<NewProjectForm />` 렌더.

> 폼 입력 필드 JSX는 event admin의 폼 마크업을 복제해 채운다(label + input, 브랜드 토큰).

- [ ] **Step 2: 검증·커밋** — `npm run type-check` 후 커밋 `feat(funding): add admin project creation form` + 요약.

---

### Task C5: /admin/funding/[id] 상세 (수정·티어·후원자·환불·발송)

**Files:**

- Create: `app/(portal)/admin/funding/[id]/page.tsx`, `app/(portal)/admin/funding/[id]/FundingDetailClient.tsx`

**Interfaces:**

- Consumes: `updateFundingProject`, `createRewardTier`, `updateRewardTier`, `deleteRewardTier`, `listFundingBackers`, `refundFundingPledge`, `updateFulfillment` (C2).
- Produces: 상세 관리 화면.

- [ ] **Step 1: 서버 페이지 — 데이터 로드**

```tsx
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { listFundingBackers } from '@/app/actions/admin-funding';
import FundingDetailClient from './FundingDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminFundingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const { data: project } = await db.from('funding_projects').select('*').eq('id', id).single();
  if (!project) notFound();
  const { data: tiers } = await db
    .from('reward_tiers')
    .select('*')
    .eq('project_id', id)
    .order('sort_order');
  const { pledges } = await listFundingBackers(id);
  return <FundingDetailClient project={project} tiers={tiers ?? []} pledges={pledges} />;
}
```

- [ ] **Step 2: client — 수정·티어·후원자 섹션**

`FundingDetailClient.tsx` (`'use client'`): 3개 섹션

1. **프로젝트 수정**: 필드 + status 셀렉트(draft/active/closed/settled) → `updateFundingProject(id, patch)`
2. **리워드 티어**: 목록(수정 인라인 + 삭제 버튼 → `deleteRewardTier`, TIER_HAS_PLEDGES 시 알림) + 새 티어 추가 폼 → `createRewardTier`/`updateRewardTier`
3. **후원자 명단**: 테이블(이름·금액·상태·배송지·발송상태) + 행별 [환불] 버튼(`refundFundingPledge`, paid만 활성) + 발송상태 셀렉트+송장 입력 → `updateFulfillment`. CSV 내보내기 버튼(클라 생성).

각 action 호출 후 `router.refresh()`로 갱신. 에러는 인라인 표시. event admin EventAdminClient의 테이블·버튼·확인 다이얼로그 패턴 복제. 브랜드 토큰, `<Button variant="primary">`(저장)·`variant="primary"`+위험은 danger 스타일.

> 완전한 JSX는 EventAdminClient.tsx 구조(테이블 + 행 액션 + useTransition + router.refresh)를 복제해 작성. 환불 버튼은 confirm 다이얼로그 후 호출.

- [ ] **Step 3: 검증·커밋** — `npm run type-check` + `npm run build`(tail) 후 커밋 `feat(funding): add admin funding detail (edit, tiers, backers, refund, fulfillment)` + 요약.

---

### Task C6: 통합 검증

**Files:** 없음

- [ ] **Step 1: 펀딩 admin 테스트 + 회귀**

Run: `npx jest __tests__/actions/admin-funding.test.ts __tests__/actions/funding.test.ts __tests__/app/funding`
Expected: 전부 PASS.

- [ ] **Step 2: 타입·린트·빌드**

Run: `npm run type-check && npm run lint && npm run build`
Expected: 통과(admin 페이지 SSR, force-dynamic).

- [ ] **Step 3: 마이그레이션 로컬 적용 확인**

Run: `supabase db query "SELECT column_name FROM information_schema.columns WHERE table_name='funding_pledges' AND column_name LIKE 'fulfillment%' OR column_name LIKE 'tracking%'"`
Expected: fulfillment_status, tracking_company, tracking_number.

---

## 후속 (별도 plan)

- **Phase D** 구매자 알림(결제완료 이메일/SMS)·약관 전문 페이지·법무 고지 / **Phase E** 운영 cron(만료 pledge·end_at close·reconcile)
- **production 적용**: C1 마이그레이션 + Phase B 시드는 약관 법무검토 완료 후 Phase A 방식으로 일괄 적용(사용자 컨펌).

## Self-Review 메모

- **Spec(§13) 커버리지**: 발송 컬럼(C1)·admin actions 8종(C2)·목록(C3)·개설(C4)·상세(C5)·검증(C6). 전 항목 매핑.
- **타입 일관성**: C2 action 시그니처(createFundingProject/updateFundingProject/createRewardTier/updateRewardTier/deleteRewardTier/listFundingBackers/refundFundingPledge/updateFulfillment)를 C4/C5가 소비 — 동일 명칭.
- **무결성 가드**: status 전이(updateFundingProject), paid 티어 삭제 차단(deleteRewardTier), 환불 paid-only + Toss/sync 분리(refundFundingPledge) — Global Constraints + C2에 반영.
- **알려진 적응점(구현 중 확정)**: admin nav 구조(C3), event admin 폼/테이블 JSX(C4·C5), deleteRewardTier join 쿼리 형태(C2 주의), cancelPayment 시그니처(C2 — event-admin.ts에서 확인).
- **admin i18n 비스코프**: 전 페이지 한국어 리터럴(메시지 키 불필요) — Global Constraints.
