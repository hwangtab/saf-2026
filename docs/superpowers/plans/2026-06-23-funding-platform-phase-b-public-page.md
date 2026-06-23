# 크라우드펀딩 Phase B — 공개 펀딩 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오윤 테라코타 모금의 공개 펀딩 페이지(`/funding/oh-yoon-terracotta`)에서 시민이 엽서·사후판화 리워드를 골라 카드로 후원하고, 실시간 진행률·후원자 명단을 보는 흐름을 완성한다.

**Architecture:** 공개 페이지는 정적(프로젝트·티어 메타·스토리) + client 폴링(진행률·티어 잔여) — petition 페이지 패턴 미러. 후원 플로우는 client(티어 선택·폼·약관 동의·Toss SDK) → Phase A `createPledge` → confirm route. backend는 reward_tiers 컬럼 보강 + 오윤 시드 + 공개 집계 view + status API.

**Tech Stack:** Next.js 16 App Router, next-intl, TypeScript strict, Tailwind(브랜드 토큰), Supabase, Toss Payments SDK v2, Jest.

## Global Constraints

- 공개 라우트(`app/[locale]/**`)는 **next-intl 메시지 필수** — 한국어 리터럴 직접 금지. `messages/ko.json`·`messages/en.json`에 `funding` 네임스페이스 추가 후 `useTranslations`/`getTranslations` 소비.
- i18n + force-static에서 `getMessages`/`getTranslations`에 `{locale}` 명시 전달(Next.js 16 전파 안 됨).
- 이미지는 **`SafeImage`** 사용(`import SafeImage from '@/components/common/SafeImage'`). `next/image` 직접 금지.
- 색상: 브랜드 토큰만(`primary`·`charcoal`·`gray`·`canvas`·`gallery`·`sun`). slate/indigo/blue 등 기본 팔레트 금지. CTA·필터·배지는 `<Button variant="primary">`. `bg-primary`+`text-white`+small text 금지(a11y).
- 표준 컴포넌트 재사용: [PageHero](../../../components/ui/PageHero.tsx), Section, Card. hero·카드 인라인 제작 금지.
- 결제 랜딩(success)은 `window.location.search`로 파라미터 읽기 — `server searchParams` 금지(Next.js 16 미들웨어 rewrite가 default-locale query 떨굼, 카드결제 중단 회귀).
- 후원자 명단 공개는 **집계 view만**(`paid`만, `is_anonymous`면 익명, email/phone/shipping/ip_hash 절대 비노출). petition PII 격리 모델.
- 마이그레이션은 `supabase/migrations/`에 작성, 로컬 `db reset` 검증. production 적용은 Phase A 방식(statement별 `db query --linked` 또는 대시보드) — 이 plan 범위 밖(사용자 컨펌).
- 신규 공개 페이지는 `e2e/a11y/`에 spec 추가 필수.
- TypeScript strict: `as any`/`@ts-ignore` 금지(Supabase `.rpc()` Json 캐스트 기존 패턴은 허용).

---

### Task B1: reward_tiers 컬럼 보강 + 오윤 프로젝트 시드

**Files:**

- Create: `supabase/migrations/20260623130000_funding_tier_media_and_seed.sql`
- Modify: `types/supabase.ts` (gen types --local)

**Interfaces:**

- Produces: `reward_tiers.image_url text NULL`, `reward_tiers.reward_kind text DEFAULT 'goods'`; 오윤 `funding_projects` 1행(slug `oh-yoon-terracotta`) + 엽서 7티어 + 판화 시드.

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- reward_tiers 미디어 컬럼 + 오윤 프로젝트/리워드 시드.
ALTER TABLE public.reward_tiers ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.reward_tiers ADD COLUMN IF NOT EXISTS reward_kind text NOT NULL DEFAULT 'goods';

-- 오윤 프로젝트 (목표 1억, 마감 2026-07-31, active)
INSERT INTO public.funding_projects (slug, title, summary, story, goal_amount, status, start_at, end_at)
VALUES (
  'oh-yoon-terracotta',
  '오윤 구의동 테라코타 부조를 시민의 힘으로 옮깁니다',
  '1974년 오윤이 새긴 양면 테라코타 부조가 2026년 8월 철거 위기에 있습니다. 시민 모금으로 안전한 해체·이전 비용을 마련합니다.',
  '## 50년 된 벽이 사라지기 전에\n\n1974년, 청년 오윤은 서울 구의동 상업은행 외벽에 양면 테라코타 부조를 새겼습니다. 건물 매매로 2026년 8월 철거가 예정되어 있습니다. 정책적 보존을 청원하는 한편, 시민이 직접 이전 비용을 모아 작품을 먼저 안전한 곳으로 옮기려 합니다.\n\n후원해 주시면 오윤 엽서를, 더 큰 후원에는 사후판화를 답례로 보내드립니다. 모인 금액은 작품 해체·운송·보존 처리에 사용되며, 집행 내역을 공개합니다.',
  100000000,
  'active',
  now(),
  '2026-07-31T23:59:59+09:00'
)
ON CONFLICT (slug) DO NOTHING;

-- 엽서 7티어 (무제한, 배송, 엽서 답례)
INSERT INTO public.reward_tiers (project_id, title, description, amount, requires_shipping, reward_kind, sort_order)
SELECT p.id, t.title, t.description, t.amount, true, 'postcard', t.sort_order
FROM public.funding_projects p,
  (VALUES
    ('오윤 엽서 — 1만원 후원', '오윤 작품 엽서 세트를 보내드립니다.', 10000, 1),
    ('오윤 엽서 — 3만원 후원', '오윤 작품 엽서 세트를 보내드립니다.', 30000, 2),
    ('오윤 엽서 — 5만원 후원', '오윤 작품 엽서 세트를 보내드립니다.', 50000, 3),
    ('오윤 엽서 — 10만원 후원', '오윤 작품 엽서 세트를 보내드립니다.', 100000, 4),
    ('오윤 엽서 — 30만원 후원', '오윤 작품 엽서 세트와 감사장을 보내드립니다.', 300000, 5),
    ('오윤 엽서 — 50만원 후원', '오윤 작품 엽서 세트와 감사장을 보내드립니다.', 500000, 6),
    ('오윤 엽서 — 100만원 후원', '오윤 작품 엽서 세트와 감사장을 보내드립니다.', 1000000, 7)
  ) AS t(title, description, amount, sort_order)
WHERE p.slug = 'oh-yoon-terracotta'
  AND NOT EXISTS (SELECT 1 FROM public.reward_tiers r WHERE r.project_id = p.id AND r.amount = t.amount AND r.reward_kind = 'postcard');

-- 사후판화 시드 1점 (예시 — 실제 판화 선별/이미지는 admin Phase C 또는 추후 보강)
INSERT INTO public.reward_tiers (project_id, title, description, amount, total_quantity, requires_shipping, reward_kind, sort_order)
SELECT p.id, '오윤 사후판화 — 〈칼노래〉', '오윤 사후판화 1점을 답례로 보내드립니다(한정).', 1200000, 10, true, 'print', 10
FROM public.funding_projects p
WHERE p.slug = 'oh-yoon-terracotta'
  AND NOT EXISTS (SELECT 1 FROM public.reward_tiers r WHERE r.project_id = p.id AND r.reward_kind = 'print' AND r.amount = 1200000);
```

- [ ] **Step 2: 로컬 적용·타입 생성**

Run: `supabase db reset --local` (마이그레이션 재적용 검증) → `supabase gen types typescript --local > types/supabase.ts` → `npm run type-check`
Expected: 마이그레이션 적용, `reward_tiers`에 image_url/reward_kind 타입 반영, 타입체크 통과.

- [ ] **Step 3: 시드 적재 확인**

Run: `supabase db query "SELECT count(*)::text AS n FROM reward_tiers WHERE reward_kind='postcard'"`
Expected: `n` = 7.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20260623130000_funding_tier_media_and_seed.sql types/supabase.ts
git commit -m "feat(funding): add reward_tiers media columns + oh-yoon project seed

요약: reward_tiers image_url·reward_kind 추가 + 오윤 프로젝트·엽서7·판화 시드"
```

---

### Task B2: 후원자 명단 공개 집계 view

**Files:**

- Create: `supabase/migrations/20260623130100_funding_public_views.sql`

**Interfaces:**

- Produces: `funding_public_backers(p_slug text) RETURNS TABLE(...)` SECURITY DEFINER — paid pledge만, 익명 마스킹, PII 비노출. + `funding_tier_remaining(p_slug text) RETURNS jsonb` 티어별 잔여(파생 SUM).

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- 공개 후원자 명단: paid만, 익명 마스킹, PII(email/phone/shipping/ip) 비노출.
CREATE OR REPLACE FUNCTION public.funding_public_backers(p_slug text, p_limit integer DEFAULT 100)
RETURNS TABLE(display_name text, amount integer, message text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    CASE WHEN fp.is_anonymous THEN '익명' ELSE fp.backer_name END,
    fp.total_amount,
    CASE WHEN fp.message_public THEN fp.supporter_message ELSE NULL END,
    fp.paid_at
  FROM public.funding_pledges fp
  JOIN public.funding_projects p ON p.id = fp.project_id
  WHERE p.slug = p_slug AND fp.status = 'paid'
  ORDER BY fp.paid_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
$$;

-- 티어별 잔여 수량(한정 티어만; 무제한은 null)
CREATE OR REPLACE FUNCTION public.funding_tier_remaining(p_slug text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT COALESCE(jsonb_object_agg(rt.id::text,
    CASE WHEN rt.total_quantity IS NULL THEN NULL
         ELSE GREATEST(rt.total_quantity - public.funding_tier_claimed(rt.id), 0) END), '{}'::jsonb)
  FROM public.reward_tiers rt
  JOIN public.funding_projects p ON p.id = rt.project_id
  WHERE p.slug = p_slug;
$$;

REVOKE ALL ON FUNCTION public.funding_public_backers(text, integer) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.funding_tier_remaining(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.funding_public_backers(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.funding_tier_remaining(text) TO service_role;
```

- [ ] **Step 2: 로컬 적용 + 커밋**

```bash
supabase db query -f supabase/migrations/20260623130100_funding_public_views.sql
git add supabase/migrations/20260623130100_funding_public_views.sql
git commit -m "feat(funding): add public backers list + tier remaining RPC

요약: 후원자 명단(paid·익명·PII제외) + 티어 잔여 파생집계 공개 RPC"
```

---

### Task B3: 진행률 status API route

**Files:**

- Create: `app/api/funding/[slug]/status/route.ts`
- Test: `__tests__/app/funding-status-api.test.ts`

**Interfaces:**

- Consumes: `funding_project_status`(Phase A), `funding_tier_remaining`(B2).
- Produces: `GET` → `{ goal_amount, raised_amount, backer_count, percent, is_open, end_at, tier_remaining }`. ISR 60s.

- [ ] **Step 1: 실패 테스트 작성**

```typescript
/** @jest-environment node */
import { GET } from '@/app/api/funding/[slug]/status/route';

jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));
const { createSupabaseAdminClient } = require('@/lib/auth/server');

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

it('returns 404 when project not found', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({ data: { found: false }, error: null }),
  });
  const res = await GET(new Request('http://t') as any, ctx('nope'));
  expect(res.status).toBe(404);
});

it('returns status payload with percent', async () => {
  const rpc = jest
    .fn()
    .mockResolvedValueOnce({
      data: {
        found: true,
        goal_amount: 100000000,
        raised_amount: 25000000,
        backer_count: 10,
        is_open: true,
        end_at: null,
      },
      error: null,
    })
    .mockResolvedValueOnce({ data: {}, error: null });
  createSupabaseAdminClient.mockReturnValue({ rpc });
  const res = await GET(new Request('http://t') as any, ctx('oh-yoon-terracotta'));
  const json = await res.json();
  expect(json.percent).toBe(25);
  expect(json.backer_count).toBe(10);
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/app/funding-status-api.test.ts` → FAIL(module not found)

- [ ] **Step 3: 구현**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';

export const revalidate = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: statusData, error } = await supabase.rpc('funding_project_status', {
    p_slug: slug,
  });
  const s = statusData as {
    found: boolean;
    goal_amount?: number;
    raised_amount?: number;
    backer_count?: number;
    is_open?: boolean;
    end_at?: string | null;
  } | null;
  if (error || !s || !s.found) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const { data: remaining } = await supabase.rpc('funding_tier_remaining', { p_slug: slug });
  const goal = s.goal_amount ?? 0;
  const raised = s.raised_amount ?? 0;
  const percent = goal > 0 ? Math.min(Math.floor((raised / goal) * 100), 100) : 0;
  return NextResponse.json({
    goal_amount: goal,
    raised_amount: raised,
    backer_count: s.backer_count ?? 0,
    percent,
    is_open: s.is_open ?? false,
    end_at: s.end_at ?? null,
    tier_remaining: (remaining as Record<string, number | null>) ?? {},
  });
}
```

- [ ] **Step 4: 통과 확인** — `npx jest __tests__/app/funding-status-api.test.ts` → PASS (2)

- [ ] **Step 5: 커밋**

```bash
git add app/api/funding/[slug]/status/route.ts __tests__/app/funding-status-api.test.ts
git commit -m "feat(funding): add funding status API (progress + tier remaining)

요약: 진행률·티어잔여 폴링 API (ISR 60s)"
```

---

### Task B4: 진행률 client 컴포넌트 (FundingProgressBar)

**Files:**

- Create: `app/[locale]/funding/[slug]/_components/FundingProgressBar.tsx`

**Interfaces:**

- Consumes: `GET /api/funding/[slug]/status`(B3).
- Produces: `<FundingProgressBar slug initialPercent initialRaised initialBackers endAt />` — 5분 폴링으로 달성률·모금액·후원자수·D-day 갱신.

- [ ] **Step 1: 미러 패턴 확인**

Read [petition ProgressBar](../../../app/[locale]/petition/oh-yoon/_components/ProgressBar.tsx) — `'use client'`, useEffect 폴링(interval), 초기값 SSR 전달, 브랜드 토큰 바. 이 구조를 그대로 복제하되 엔드포인트를 `/api/funding/${slug}/status`로, 표시값을 모금액(원)·후원자수·달성률·D-day로 바꾼다.

- [ ] **Step 2: 구현** (petition ProgressBar 미러; 핵심 골격)

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  slug: string;
  initialPercent: number;
  initialRaised: number;
  initialBackers: number;
  endAt: string | null;
}

export default function FundingProgressBar({
  slug,
  initialPercent,
  initialRaised,
  initialBackers,
  endAt,
}: Props) {
  const t = useTranslations('funding');
  const [percent, setPercent] = useState(initialPercent);
  const [raised, setRaised] = useState(initialRaised);
  const [backers, setBackers] = useState(initialBackers);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/funding/${slug}/status`, { cache: 'no-store' });
        if (!r.ok || !active) return;
        const d = await r.json();
        setPercent(d.percent);
        setRaised(d.raised_amount);
        setBackers(d.backer_count);
      } catch {
        /* 폴링 실패는 무시(다음 주기 재시도) */
      }
    };
    const id = setInterval(poll, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [slug]);

  const dday = endAt
    ? Math.max(0, Math.ceil((new Date(endAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="rounded-2xl bg-canvas-soft p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-bold text-sun-strong">
          {raised.toLocaleString('ko-KR')}원
        </span>
        <span className="text-charcoal-muted">{percent}%</span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-primary-strong transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between text-sm text-charcoal-muted">
        <span>{t('backers', { count: backers })}</span>
        {dday !== null && <span>{t('daysLeft', { days: dday })}</span>}
      </div>
    </div>
  );
}
```

> `Date.now()`/`new Date()`는 client 컴포넌트라 허용(워크플로 스크립트 제약과 무관). i18n 키 `funding.backers`/`funding.daysLeft`는 Task B5에서 메시지에 추가.

- [ ] **Step 3: 커밋**

```bash
git add app/[locale]/funding/[slug]/_components/FundingProgressBar.tsx
git commit -m "feat(funding): add FundingProgressBar client (polling progress)

요약: 진행률 바 — 모금액·후원자수·달성률·D-day 5분 폴링"
```

---

### Task B5: 공개 펀딩 페이지 (서버 컴포넌트) + i18n + hero-route

**Files:**

- Create: `app/[locale]/funding/[slug]/page.tsx`
- Modify: `lib/hero-routes.ts` (`/funding/` prefix 추가), `messages/ko.json`, `messages/en.json`
- Test: `__tests__/lib/hero-routes.test.ts` (펀딩 케이스 추가)

**Interfaces:**

- Consumes: `funding_project_status`(A), `funding_public_backers`(B2), reward_tiers 조회; `<FundingProgressBar/>`(B4); `<FundingPledgeFlow/>`(B6).
- Produces: `/funding/[slug]` 공개 페이지. 후원 플로우 client는 B6에서 마운트.

- [ ] **Step 1: hero-route 등록 + 테스트**

[lib/hero-routes.ts](../../../lib/hero-routes.ts)의 `HERO_PREFIXES`에 `'/funding/'` 추가(슬래시로 끝나야 함 — 타입 강제). [**tests**/lib/hero-routes.test.ts](../../../__tests__/lib/hero-routes.test.ts)에 `expect(isHeroRoute('/funding/oh-yoon-terracotta')).toBe(true)` 추가. Run `npx jest __tests__/lib/hero-routes.test.ts` → PASS.

- [ ] **Step 2: i18n 메시지 추가**

`messages/ko.json`·`messages/en.json`에 `funding` 네임스페이스 추가(키: `backers`(ICU `{count}명 후원`), `daysLeft`(`{days}일 남음`), `support`(후원하기), `rewardSoldOut`, `goalLabel`, `backerListTitle`, 약관 고지 문구 등). en은 영문 대응.

- [ ] **Step 3: 페이지 구현** (PageHero·Section 재사용; 정적 + ProgressBar 폴링)

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import PageHero from '@/components/ui/PageHero';
import SafeImage from '@/components/common/SafeImage';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import FundingProgressBar from './_components/FundingProgressBar';
import FundingPledgeFlow from './_components/FundingPledgeFlow';

export const dynamic = 'force-static';
export const revalidate = 60;

export default async function FundingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'funding' });
  const supabase = createSupabaseAdminClient();

  const { data: statusData } = await supabase.rpc('funding_project_status', { p_slug: slug });
  const s = statusData as {
    found: boolean;
    goal_amount?: number;
    raised_amount?: number;
    backer_count?: number;
    is_open?: boolean;
    end_at?: string | null;
  } | null;
  if (!s?.found) notFound();

  const { data: project } = await supabase
    .from('funding_projects')
    .select('id, title, summary, story, cover_image, end_at')
    .eq('slug', slug)
    .single();
  const { data: tiers } = await supabase
    .from('reward_tiers')
    .select(
      'id, title, description, amount, total_quantity, requires_shipping, reward_kind, image_url, sort_order'
    )
    .eq('project_id', project!.id)
    .order('sort_order');
  const { data: backers } = await supabase.rpc('funding_public_backers', {
    p_slug: slug,
    p_limit: 50,
  });
  const { data: remaining } = await supabase.rpc('funding_tier_remaining', { p_slug: slug });

  const goal = s.goal_amount ?? 0;
  const raised = s.raised_amount ?? 0;
  const percent = goal > 0 ? Math.min(Math.floor((raised / goal) * 100), 100) : 0;

  return (
    <div>
      <PageHero title={project!.title} subtitle={project!.summary ?? ''} />
      <section className="mx-auto max-w-3xl px-4 py-12">
        <FundingProgressBar
          slug={slug}
          initialPercent={percent}
          initialRaised={raised}
          initialBackers={s.backer_count ?? 0}
          endAt={s.end_at ?? null}
        />
        {/* 스토리 (마크다운 렌더 — 기존 마크다운 렌더러 재사용; 없으면 whitespace-pre-wrap) */}
        <article className="prose mt-10 whitespace-pre-wrap text-charcoal">
          {project!.story}
        </article>
        {/* 후원 플로우 (티어 선택 + 결제) */}
        <FundingPledgeFlow
          slug={slug}
          tiers={tiers ?? []}
          remaining={(remaining as Record<string, number | null>) ?? {}}
          isOpen={s.is_open ?? false}
        />
        {/* 후원자 명단 */}
        <h2 className="mt-12 text-xl font-bold text-charcoal-deep">{t('backerListTitle')}</h2>
        <ul className="mt-4 divide-y divide-gallery-divider">
          {(
            (backers as Array<{ display_name: string; amount: number; message: string | null }>) ??
            []
          ).map((b, i) => (
            <li key={i} className="flex items-center justify-between py-3">
              <div>
                <span className="font-medium text-charcoal">{b.display_name}</span>
                {b.message && <p className="text-sm text-charcoal-muted">{b.message}</p>}
              </div>
              <span className="text-sun-strong">{b.amount.toLocaleString('ko-KR')}원</span>
            </li>
          ))}
        </ul>
        {/* 청원 연결은 Task B8 */}
      </section>
    </div>
  );
}
```

> 마크다운 렌더: 기존 매거진/스토리 렌더러가 있으면 재사용(grep `react-markdown`/마크다운 컴포넌트). 없으면 1차는 `whitespace-pre-wrap`. PageHero props는 실제 시그니처를 [components/ui/PageHero.tsx](../../../components/ui/PageHero.tsx)에서 확인해 맞춘다.

- [ ] **Step 4: 빌드 검증** — `npm run build` (SSG/force-static 호환), `npm run type-check`. Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add "app/[locale]/funding/[slug]/page.tsx" lib/hero-routes.ts __tests__/lib/hero-routes.test.ts messages/ko.json messages/en.json
git commit -m "feat(funding): add public funding page (hero, progress, rewards, backers)

요약: 공개 펀딩 페이지 — PageHero·진행률·스토리·리워드·후원자명단 + hero-route·i18n"
```

---

### Task B6: 후원 플로우 client (티어 선택 → 폼 → 약관 → Toss)

**Files:**

- Create: `app/[locale]/funding/[slug]/_components/FundingPledgeFlow.tsx`

**Interfaces:**

- Consumes: `createPledge`(Phase A `app/actions/funding.ts`), Toss SDK(기존 결제 client 패턴), 티어 목록 props.
- Produces: `<FundingPledgeFlow slug tiers remaining isOpen />` — 티어 카드 선택 + 후원자 정보·배송지 폼 + 약관 동의 체크 → createPledge → Toss 결제창.

- [ ] **Step 1: 미러 패턴 확인**

Read [event RegistrationForm](../../../app/[locale]/event/oh-yoon-memorial/_components/RegistrationForm.tsx) (가장 가까운 미러 — 단일 신청 + Toss SDK 결제창 호출) + [checkout CheckoutClient](../../../app/[locale]/checkout/[artworkId]/CheckoutClient.tsx) (Toss SDK v2 init·requestPayment·successUrl/failUrl). 이 두 패턴으로 결제창 호출부를 복제. successUrl은 `/{locale}/funding/{slug}/success`.

- [ ] **Step 2: 구현** (핵심 골격 — 티어 선택·폼·동의·createPledge·Toss)

```tsx
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import SafeImage from '@/components/common/SafeImage';
import { createPledge } from '@/app/actions/funding';

interface Tier {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  total_quantity: number | null;
  requires_shipping: boolean;
  reward_kind: string;
  image_url: string | null;
}
interface Props {
  slug: string;
  tiers: Tier[];
  remaining: Record<string, number | null>;
  isOpen: boolean;
}

export default function FundingPledgeFlow({ slug, tiers, remaining, isOpen }: Props) {
  const t = useTranslations('funding');
  const [selected, setSelected] = useState<Tier | null>(null);
  const [form, setForm] = useState({
    backerName: '',
    backerEmail: '',
    backerPhone: '',
    shippingName: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingPostalCode: '',
    shippingMemo: '',
    isAnonymous: false,
    supporterMessage: '',
    messagePublic: false,
  });
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen)
    return (
      <p className="mt-8 rounded-xl bg-canvas-strong p-4 text-charcoal-muted">{t('closed')}</p>
    );

  async function onSubmit() {
    if (!selected || !agreedTerms || !agreedPrivacy) {
      setError(t('agreeRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await createPledge({
      projectSlug: slug,
      rewardTierId: selected.id,
      quantity: 1,
      backerName: form.backerName,
      backerEmail: form.backerEmail,
      backerPhone: form.backerPhone,
      shippingName: form.shippingName,
      shippingPhone: form.shippingPhone,
      shippingAddress: form.shippingAddress,
      shippingPostalCode: form.shippingPostalCode,
      shippingMemo: form.shippingMemo,
      isAnonymous: form.isAnonymous,
      supporterMessage: form.supporterMessage,
      messagePublic: form.messagePublic,
      agreedTerms,
      agreedPrivacy,
    });
    if (!res.ok) {
      setError(t(`error.${res.code}`));
      setSubmitting(false);
      return;
    }
    // Toss SDK 결제창 — CheckoutClient 패턴 복제. customerKey=orderNo, successUrl=/{locale}/funding/{slug}/success
    // (실제 SDK init/requestPayment 호출은 CheckoutClient.tsx에서 정확히 복제)
    await openTossPayment({
      orderNo: res.orderNo,
      amount: res.amount,
      orderName: selected.title,
      slug,
    });
  }

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-charcoal-deep">{t('rewardListTitle')}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {tiers.map((tier) => {
          const rem = remaining[tier.id];
          const soldOut = rem !== null && rem !== undefined && rem <= 0;
          return (
            <button
              key={tier.id}
              type="button"
              disabled={soldOut}
              onClick={() => setSelected(tier)}
              className={`rounded-xl border p-4 text-left transition-[transform,box-shadow] duration-300 ${selected?.id === tier.id ? 'border-primary-strong shadow-md' : 'border-gallery-hairline'} ${soldOut ? 'opacity-50' : 'hover:-translate-y-1 hover:shadow-lg'}`}
            >
              {tier.image_url && (
                <SafeImage
                  src={tier.image_url}
                  alt={tier.title}
                  width={320}
                  height={200}
                  className="mb-3 rounded-lg"
                />
              )}
              <div className="font-bold text-charcoal-deep">
                {tier.amount.toLocaleString('ko-KR')}원
              </div>
              <div className="text-sm text-charcoal">{tier.title}</div>
              {tier.description && (
                <p className="mt-1 text-xs text-charcoal-muted">{tier.description}</p>
              )}
              {soldOut && (
                <span className="mt-2 inline-block text-xs text-danger">{t('rewardSoldOut')}</span>
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {/* 후원자 정보 + 배송지 입력 필드 (이름/이메일/전화/주소). event RegistrationForm 입력 패턴 복제 */}
          {/* 약관 동의 체크박스: 청약철회·개인정보·Keep-it-All 고지 요약 */}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
            />
            <span>{t('termsConsent')}</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreedPrivacy}
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
            />
            <span>{t('privacyConsent')}</span>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" disabled={submitting}>
            {t('support')}
          </Button>
        </form>
      )}
    </div>
  );
}
```

> `openTossPayment` 헬퍼와 입력 필드 JSX는 [CheckoutClient](../../../app/[locale]/checkout/[artworkId]/CheckoutClient.tsx)·[RegistrationForm](../../../app/[locale]/event/oh-yoon-memorial/_components/RegistrationForm.tsx)에서 실제 SDK 호출(clientKey·customerKey·successUrl·failUrl)을 정확히 복제한다. `createPledge` result code(`INVALID_INPUT|RATE_LIMITED|PROJECT_CLOSED|TIER_SOLD_OUT|INTERNAL_ERROR`)를 i18n `funding.error.*`로 매핑.

- [ ] **Step 3: 빌드·타입 검증** — `npm run type-check` 통과.

- [ ] **Step 4: 커밋**

```bash
git add "app/[locale]/funding/[slug]/_components/FundingPledgeFlow.tsx"
git commit -m "feat(funding): add pledge flow client (tier select, form, consent, Toss)

요약: 후원 플로우 — 티어 선택·후원자정보·약관동의·createPledge·Toss 결제창"
```

---

### Task B7: success 페이지 (결제 확정)

**Files:**

- Create: `app/[locale]/funding/[slug]/success/page.tsx`, `app/[locale]/funding/[slug]/success/SuccessClient.tsx`

**Interfaces:**

- Consumes: `POST /api/payments/funding/toss/confirm`(Phase A).
- Produces: 결제 후 랜딩 — `window.location.search`로 paymentKey/orderId/amount 읽어 confirm 호출, 성공/실패 표시.

- [ ] **Step 1: 미러 패턴 확인**

Read [checkout SuccessClient](../../../app/[locale]/checkout/success/SuccessClient.tsx) — `'use client'`, `window.location.search`로 파라미터 읽기(server searchParams 금지), confirm POST, 성공/실패 UI. 이 구조를 복제하되 confirm 엔드포인트를 `/api/payments/funding/toss/confirm`로.

- [ ] **Step 2: 구현** (SuccessClient — checkout 미러)

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function SuccessClient() {
  const t = useTranslations('funding');
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const paymentKey = sp.get('paymentKey');
    const orderId = sp.get('orderId');
    const amount = sp.get('amount');
    if (!paymentKey || !orderId || !amount) {
      setState('fail');
      return;
    }
    (async () => {
      try {
        const r = await fetch('/api/payments/funding/toss/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
        });
        const j = await r.json();
        setState(r.ok && j.success ? 'ok' : 'fail');
      } catch {
        setState('fail');
      }
    })();
  }, []);

  if (state === 'loading')
    return <p className="py-20 text-center text-charcoal-muted">{t('confirming')}</p>;
  if (state === 'fail') return <p className="py-20 text-center text-danger">{t('confirmFail')}</p>;
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold text-charcoal-deep">{t('thankYou')}</h1>
      <p className="mt-2 text-charcoal-muted">{t('thankYouDesc')}</p>
    </div>
  );
}
```

`page.tsx`(서버, HEADER_SAFE_TOP_PADDING 적용 — PageHero 없는 터미널 페이지):

```tsx
import { setRequestLocale } from 'next-intl/server';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import SuccessClient from './SuccessClient';

export const dynamic = 'force-static';

export default async function FundingSuccessPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className={`min-h-screen ${HEADER_SAFE_TOP_PADDING}`}>
      <SuccessClient />
    </div>
  );
}
```

> success 페이지는 PageHero가 없는 터미널 페이지 → `HEADER_SAFE_TOP_PADDING` 적용([**tests**/lib/page-header-clearance.test.ts](../../../__tests__/lib/page-header-clearance.test.ts)가 정적 검사). i18n 키 `confirming/confirmFail/thankYou/thankYouDesc` 추가.

- [ ] **Step 3: 검증·커밋** — `npm run type-check` 통과 후:

```bash
git add "app/[locale]/funding/[slug]/success/"
git commit -m "feat(funding): add funding success landing (client confirm)

요약: 후원 결제 success — window.location.search confirm 호출"
```

---

### Task B8: 청원 페이지 → 펀딩 CTA 연결

**Files:**

- Modify: `app/[locale]/petition/oh-yoon/page.tsx` (retention slot에 펀딩 링크 추가), `messages/ko.json`·`messages/en.json`

**Interfaces:**

- Consumes: 없음(링크).
- Produces: 청원 페이지 "더 읽을거리"에 `/funding/oh-yoon-terracotta` CTA.

- [ ] **Step 1: 청원 페이지 retention slot 확인·추가**

[petition page](../../../app/[locale]/petition/oh-yoon/page.tsx)의 하단 retention 섹션(추도식·특별전 링크가 있는 곳, grep `event/oh-yoon-memorial`)에 펀딩 카드 링크 추가. 기존 카드 마크업 복제, `href="/funding/oh-yoon-terracotta"`, 문구는 i18n `funding.petitionCta`.

- [ ] **Step 2: 빌드 검증·커밋** — `npm run build` 통과 후:

```bash
git add "app/[locale]/petition/oh-yoon/page.tsx" messages/ko.json messages/en.json
git commit -m "feat(funding): link petition page to funding CTA

요약: 청원 페이지 retention에 펀딩 후원 CTA 연결"
```

---

### Task B9: e2e a11y spec + 통합 검증

**Files:**

- Create: `e2e/a11y/funding.spec.ts` (기존 a11y spec 패턴 복제)

- [ ] **Step 1: a11y spec 작성**

Read 기존 `e2e/a11y/` spec 하나(예 petition a11y가 있으면) 복제. `/funding/oh-yoon-terracotta` 페이지를 로드해 axe 위반 0 + bg-primary+small text 대비 위반 없음 검사. 기존 spec과 동일 구조.

- [ ] **Step 2: 통합 검증**

Run: `npm run type-check && npm run lint && npx jest __tests__/app/funding __tests__/lib/hero-routes.test.ts __tests__/lib/page-header-clearance.test.ts && npm run build`
Expected: 전부 통과(타입·린트·펀딩 테스트·클리어런스·빌드).

- [ ] **Step 3: i18n placeholder 검증**

Run: `npm run build` (verify:i18n-placeholders 포함) — ko/en `funding` 키 누락·불일치 없음.

- [ ] **Step 4: 커밋**

```bash
git add e2e/a11y/funding.spec.ts
git commit -m "test(funding): add a11y spec for public funding page

요약: 공개 펀딩 페이지 a11y e2e spec + 통합 검증"
```

---

## 후속 (별도 plan)

- **Phase C** admin 개설·티어 CRUD·후원자/배송 관리·환불 / **Phase D** 구매자 알림·약관 전문·법무 고지 / **Phase E** 운영 cron
- **production 적용**: Phase B 마이그레이션(B1·B2)은 Phase A 방식(statement별 `db query --linked` 또는 대시보드)으로 사용자 컨펌 후 적용. 시드는 production에 오윤 프로젝트가 실제로 보이게 함.
- **사후판화 큐레이션**: B1 시드는 판화 1점 예시. 실제 선별·이미지·수량은 admin(C) 또는 추가 시드로 보강.

## Self-Review 메모

- **Spec(§12) 커버리지**: 데이터 보강(B1)·집계 view(B2)·status API(B3)·진행률(B4)·페이지(B5)·후원 플로우(B6)·success(B7)·청원 연결(B8)·a11y(B9). 전 항목 매핑.
- **타입 일관성**: `createPledge` 인자/result code는 Phase A `app/actions/funding.ts`와 동일. status API 응답 키(`percent`/`raised_amount`/`backer_count`/`tier_remaining`)를 B3 정의 → B4/B5 소비 일치.
- **알려진 적응점(구현 중 확정)**: PageHero props 시그니처(B5), Toss SDK 호출부(B6 — CheckoutClient 복제), 마크다운 렌더러 유무(B5), 기존 a11y spec 구조(B9). 각 태스크에 "실제 파일 확인" 명시.
- **회귀 가드 반영**: hero-route 등록+테스트(B5), header clearance(B7), window.location.search(B7), i18n 필수(B5), a11y(B9).
