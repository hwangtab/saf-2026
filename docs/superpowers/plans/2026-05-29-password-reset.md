# 비밀번호 재설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 라우트에서 비밀번호 찾기·재설정 기능을 추가하여, 사용자가 운영팀 문의 없이 스스로 비번을 복구할 수 있도록 한다.

**Architecture:** 신규 `/forgot-password` 페이지 → server action(`requestPasswordReset`) → service-role admin client로 RPC `check_reset_eligibility` 호출 → 자격 판정 후 `supabase.auth.resetPasswordForEmail` 호출. 이메일 링크는 **OAuth callback과 분리된 `/auth/reset` route**에서 처리하여 기존 OAuth state 검증을 0줄 건드림. `/reset-password`에서 새 비번 입력 후 `updateUser` + `signOut` → `/login?reset=success`.

**Tech Stack:** Next.js 16 App Router, Supabase Auth/Postgres, Zod, Jest + React Testing Library, 기존 `lib/rate-limit.ts` + `lib/auth/password-policy.ts` 재사용. UI는 기존 로그인 페이지와 동일한 inline `COPY = { ko, en }` 패턴(`useLocale()`)으로 ko/en 동시 지원 — `(auth)` route group이 `[locale]` 밖이라 next-intl 메시지가 아닌 inline 카피 사용.

**Spec:** [docs/superpowers/specs/2026-05-29-password-reset-design.md](../specs/2026-05-29-password-reset-design.md)

---

## Task 1: SQL migration — `check_reset_eligibility` RPC

**Files:**

- Create: `supabase/migrations/20260529200000_add_check_reset_eligibility.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260529200000_add_check_reset_eligibility.sql`:

```sql
-- 비밀번호 재설정 자격 판정 RPC
-- server action requestPasswordReset에서 service_role로만 호출됨

create or replace function public.check_reset_eligibility(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_has_password boolean;
  v_has_google boolean;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  select exists(
    select 1 from auth.identities
    where user_id = v_user_id and provider = 'email'
  ) into v_has_password;

  select exists(
    select 1 from auth.identities
    where user_id = v_user_id and provider = 'google'
  ) into v_has_google;

  if not v_has_password and v_has_google then
    return jsonb_build_object('status', 'social_only', 'provider', 'google');
  end if;

  return jsonb_build_object('status', 'eligible');
end;
$$;

revoke all on function public.check_reset_eligibility(text) from public;
revoke all on function public.check_reset_eligibility(text) from anon, authenticated;
grant execute on function public.check_reset_eligibility(text) to service_role;

comment on function public.check_reset_eligibility(text) is
  '비밀번호 재설정 자격 판정. service_role 전용. server action(requestPasswordReset)에서만 호출.';
```

- [ ] **Step 2: Apply migration via MCP (단건)**

```
mcp__claude_ai_Supabase__apply_migration
  project_id: khtunrybrzntlnowlahb
  name: add_check_reset_eligibility
  query: <Step 1의 SQL 본문>
```

⚠ 사용자 컨펌 필요 (CLAUDE.md 정책 — `apply_migration`은 위험 작업).

- [ ] **Step 3: Verify function via execute_sql**

```sql
-- 함수 존재 + grant 확인
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as is_security_definer,
  array(
    select rolname from pg_roles r
    join pg_proc_acl a on a.oid = p.oid
    where r.oid = any(p.proacl::aclitem[]::oid[])
  ) as grants
from pg_proc p
where p.proname = 'check_reset_eligibility';
```

또는 간단히:

```sql
select proname, prosecdef from pg_proc where proname = 'check_reset_eligibility';
```

Expected: 1 row, `prosecdef = true`

- [ ] **Step 4: Smoke test via execute_sql (3 cases)**

```sql
-- not_found
select public.check_reset_eligibility('definitely-not-a-real-email@example.invalid');
-- expected: {"status": "not_found"}

-- eligible (existing email/password user — admin이 본인 이메일로 테스트, 또는 알려진 활성 사용자)
-- 이 단계는 실제 user 이메일이 필요하므로 운영 환경에서 조심스럽게 1건만
select public.check_reset_eligibility('<운영자 이메일>');
-- expected: {"status": "eligible"} or {"status": "social_only", ...}
```

Expected: JSON 결과가 명세대로 반환

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260529200000_add_check_reset_eligibility.sql
git commit -m "$(cat <<'EOF'
feat(auth): check_reset_eligibility RPC 추가 — 비번 재설정 자격 판정

요약: 이메일이 미등록/소셜 전용/일반 가입인지 판정하는 SECURITY DEFINER RPC. service_role 전용 grant로 enumeration 공격 표면 차단

배경:
- 비밀번호 찾기 기능 구현의 첫 단계 (spec: docs/superpowers/specs/2026-05-29-password-reset-design.md)
- auth.users + auth.identities 조회로 not_found/social_only/eligible 3분기
- search_path 고정 + service_role 전용 grant로 안전한 표면적

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Server action `requestPasswordReset` — 실패 테스트

**Files:**

- Test: `__tests__/actions/forgot-password.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/actions/forgot-password.test.ts`:

```typescript
/**
 * forgot-password.ts Server Action 단위 테스트
 *
 * requestPasswordReset의 각 분기를 Supabase mock 기반으로 검증
 *
 * @jest-environment node
 */

// --- Mock: next/headers ---
const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({ get: mockHeadersGet })),
}));

// --- Mock: rate-limit ---
let mockRateLimitResult = { success: true, remaining: 4 };
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(async () => mockRateLimitResult),
}));

// --- Mock: Supabase clients ---
const mockAdminRpc = jest.fn();
const mockResetPasswordForEmail = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    rpc: mockAdminRpc,
  })),
  createSupabaseServerClient: jest.fn(async () => ({
    auth: { resetPasswordForEmail: mockResetPasswordForEmail },
  })),
}));

// env 보장
process.env.NEXT_PUBLIC_SITE_URL = 'https://test.example.com';

import { requestPasswordReset } from '@/app/(auth)/forgot-password/actions';

describe('requestPasswordReset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeadersGet.mockReturnValue('203.0.113.42');
    mockRateLimitResult = { success: true, remaining: 4 };
  });

  it('returns "error" for invalid email', async () => {
    const result = await requestPasswordReset({ email: 'not-an-email' });
    expect(result).toEqual({ status: 'error' });
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it('returns "rate_limited" when rateLimit fails', async () => {
    mockRateLimitResult = { success: false, remaining: 0 };
    const result = await requestPasswordReset({ email: 'a@b.com' });
    expect(result).toEqual({ status: 'rate_limited' });
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it('returns "not_found" when RPC says not_found', async () => {
    mockAdminRpc.mockResolvedValue({ data: { status: 'not_found' }, error: null });
    const result = await requestPasswordReset({ email: 'unknown@example.com' });
    expect(result).toEqual({ status: 'not_found' });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('returns "social_only" with provider when RPC says social_only', async () => {
    mockAdminRpc.mockResolvedValue({
      data: { status: 'social_only', provider: 'google' },
      error: null,
    });
    const result = await requestPasswordReset({ email: 'g@example.com' });
    expect(result).toEqual({ status: 'social_only', provider: 'google' });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('sends email and returns "sent" when eligible', async () => {
    mockAdminRpc.mockResolvedValue({ data: { status: 'eligible' }, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await requestPasswordReset({ email: 'user@example.com' });
    expect(result).toEqual({ status: 'sent' });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'https://test.example.com/auth/reset',
    });
  });

  it('returns "error" when RPC throws', async () => {
    mockAdminRpc.mockResolvedValue({ data: null, error: { message: 'rpc down' } });
    const result = await requestPasswordReset({ email: 'a@b.com' });
    expect(result).toEqual({ status: 'error' });
  });

  it('returns "error" when resetPasswordForEmail fails', async () => {
    mockAdminRpc.mockResolvedValue({ data: { status: 'eligible' }, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'smtp down' } });
    const result = await requestPasswordReset({ email: 'a@b.com' });
    expect(result).toEqual({ status: 'error' });
  });

  it('lowercases email before RPC call', async () => {
    mockAdminRpc.mockResolvedValue({ data: { status: 'eligible' }, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    await requestPasswordReset({ email: 'MiXeD@Example.com' });
    expect(mockAdminRpc).toHaveBeenCalledWith('check_reset_eligibility', {
      p_email: 'mixed@example.com',
    });
  });

  it('uses first ip from x-forwarded-for for rateLimit key', async () => {
    mockHeadersGet.mockReturnValue('1.2.3.4, 5.6.7.8');
    mockAdminRpc.mockResolvedValue({ data: { status: 'eligible' }, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const { rateLimit } = await import('@/lib/rate-limit');
    await requestPasswordReset({ email: 'a@b.com' });
    expect(rateLimit).toHaveBeenCalledWith('forgot-password:1.2.3.4', {
      limit: 5,
      windowMs: 60_000,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- forgot-password.test.ts
```

Expected: FAIL — `Cannot find module '@/app/(auth)/forgot-password/actions'`

---

## Task 3: Server action `requestPasswordReset` — 구현

**Files:**

- Create: `app/(auth)/forgot-password/actions.ts`

- [ ] **Step 1: Write minimal implementation**

Create `app/(auth)/forgot-password/actions.ts`:

```typescript
'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';

const SCHEMA = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
});

export type RequestPasswordResetResult =
  | { status: 'sent' }
  | { status: 'not_found' }
  | { status: 'social_only'; provider: string }
  | { status: 'rate_limited' }
  | { status: 'error' };

export async function requestPasswordReset(input: {
  email: string;
}): Promise<RequestPasswordResetResult> {
  const parsed = SCHEMA.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  const headerStore = await headers();
  const xff = headerStore.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0]?.trim() || 'unknown';

  const rl = await rateLimit(`forgot-password:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) return { status: 'rate_limited' };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('check_reset_eligibility', {
    p_email: parsed.data.email,
  });
  if (error) return { status: 'error' };

  const payload = data as { status: string; provider?: string } | null;
  if (!payload || typeof payload.status !== 'string') return { status: 'error' };

  if (payload.status === 'not_found') return { status: 'not_found' };
  if (payload.status === 'social_only') {
    return { status: 'social_only', provider: payload.provider ?? 'google' };
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error: mailError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/reset`,
  });
  if (mailError) return { status: 'error' };

  return { status: 'sent' };
}
```

**Note on Supabase RPC typing**: `check_reset_eligibility`는 새 함수라 `@/types/supabase`의 Database 타입에 아직 없음. `admin.rpc` 호출 시 TS가 unknown 함수명 오류를 낼 수 있음. 대응:

- Option A (간단, 권장): `(admin.rpc as unknown as (fn: string, args: { p_email: string }) => Promise<{ data: unknown; error: { message?: string } | null }>)('check_reset_eligibility', { p_email: parsed.data.email })`로 호출 한 줄을 캐스팅.
- Option B (이상적): `mcp__claude_ai_Supabase__generate_typescript_types` 호출로 Database 타입을 regen해서 `types/supabase.ts` 갱신 — 다른 변경분과 같이 갱신될 수 있으니 신중하게.

이번 plan은 Option A로 진행 (회귀 표면 최소). 따라서 `admin.rpc(...)` 줄을 다음으로 교체:

```typescript
const rpc = admin.rpc as unknown as (
  fn: string,
  args: { p_email: string }
) => Promise<{ data: unknown; error: { message?: string } | null }>;
const { data, error } = await rpc('check_reset_eligibility', { p_email: parsed.data.email });
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npm test -- forgot-password.test.ts
```

Expected: PASS (모든 9 케이스)

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/forgot-password/actions.ts __tests__/actions/forgot-password.test.ts
git commit -m "$(cat <<'EOF'
feat(auth): requestPasswordReset server action + 단위 테스트

요약: 이메일 자격 판정(not_found/social_only/eligible) + rate limit + 메일 발송 로직. 9 케이스 jest 커버

배경:
- spec docs/superpowers/specs/2026-05-29-password-reset-design.md §6 구현
- createSupabaseAdminClient + check_reset_eligibility RPC + supabase.auth.resetPasswordForEmail 조합
- IP별 1분 5회 rate limit (기존 lib/rate-limit.ts 재사용)

회귀 방지:
- check_reset_eligibility는 service_role 전용 grant — admin client에서만 호출 가능
- 이메일 lower-case 정규화로 대소문자 차이 흡수
- x-forwarded-for 첫 IP만 사용 (proxy chain 첫 클라이언트)
- TS rpc 타입 캐스팅으로 generate_typescript_types 의존성 회피

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `/forgot-password` 페이지

**Files:**

- Create: `app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Write page implementation**

Create `app/(auth)/forgot-password/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import SafeImage from '@/components/common/SafeImage';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { requestPasswordReset } from './actions';

const COPY = {
  ko: {
    subtitle: '비밀번호 찾기',
    description: '가입하신 이메일로 재설정 링크를 보내드립니다',
    emailLabel: '이메일 주소',
    submit: '재설정 링크 보내기',
    backToLogin: '로그인으로 돌아가기',
    sent: '재설정 링크를 이메일로 보냈습니다. 메일함을 확인해주세요.',
    notFound: '등록되지 않은 이메일입니다.',
    socialOnlyGoogle:
      'Google로 가입한 계정입니다. 로그인 페이지에서 “구글로 계속하기”를 사용해주세요.',
    rateLimited: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    error: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    invalidLink: '재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.',
    sessionExpired: '세션이 만료되었습니다. 다시 재설정 링크를 요청해주세요.',
  },
  en: {
    subtitle: 'Forgot password',
    description: "We'll email you a link to reset your password",
    emailLabel: 'Email address',
    submit: 'Send reset link',
    backToLogin: 'Back to sign in',
    sent: 'We sent a reset link to your email. Please check your inbox.',
    notFound: 'This email is not registered.',
    socialOnlyGoogle:
      'This account was created with Google. Please use “Continue with Google” on the sign-in page.',
    rateLimited: 'Too many requests. Please try again later.',
    error: 'An error occurred. Please try again later.',
    invalidLink: 'The reset link is invalid or expired. Please request a new one.',
    sessionExpired: 'Your session expired. Please request a new reset link.',
  },
} as const;

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const copy = COPY[locale as 'ko' | 'en'] ?? COPY.ko;
  const searchParams = useSearchParams();
  const initialError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    initialError === 'invalid_link'
      ? { type: 'error', text: copy.invalidLink }
      : initialError === 'session_expired'
        ? { type: 'error', text: copy.sessionExpired }
        : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await requestPasswordReset({ email });

    switch (result.status) {
      case 'sent':
        setMessage({ type: 'success', text: copy.sent });
        setEmail('');
        break;
      case 'not_found':
        setMessage({ type: 'error', text: copy.notFound });
        break;
      case 'social_only':
        setMessage({ type: 'error', text: copy.socialOnlyGoogle });
        break;
      case 'rate_limited':
        setMessage({ type: 'error', text: copy.rateLimited });
        break;
      case 'error':
      default:
        setMessage({ type: 'error', text: copy.error });
        break;
    }
    setLoading(false);
  };

  return (
    <div
      className={`min-h-screen bg-canvas-soft flex flex-col justify-center pt-20 ${SAWTOOTH_TOP_SAFE_PADDING} sm:px-6 lg:px-8`}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mt-6 flex flex-col items-center gap-3">
          <SafeImage
            src="/images/logo/320pxX90px.webp"
            alt="씨앗페"
            width={160}
            height={45}
            className="h-10 w-auto object-contain"
            priority
          />
          <p className="text-xl font-medium text-gray-600">{copy.subtitle}</p>
          <p className="text-sm text-charcoal-soft text-center">{copy.description}</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal">
                {copy.emailLabel}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  spellCheck={false}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
            </div>

            {message && (
              <div
                role={message.type === 'error' ? 'alert' : 'status'}
                className={
                  message.type === 'success'
                    ? 'text-sm text-success-a11y'
                    : 'text-sm text-danger-a11y'
                }
              >
                {message.text}
              </div>
            )}

            <div>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                className="w-full flex justify-center"
              >
                {copy.submit}
              </Button>
            </div>

            <div className="mt-6 text-center text-sm">
              <Link href="/login" className="font-medium text-primary-a11y hover:text-primary">
                {copy.backToLogin}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

**Notes:**

- `text-success-a11y`, `text-danger-a11y`: 기존 로그인 페이지 패턴 그대로. tailwind config에 정의되어 있다고 가정 (로그인 페이지에서 `text-danger-a11y` 사용 중인 것 확인됨).
- 로그인 페이지와 chrome 일관 (logo + subtitle + card + sawtooth padding).
- `?error=invalid_link` / `?error=session_expired` 쿼리는 `/auth/reset` route 실패 시 redirect되어 진입.

- [ ] **Step 2: Type-check + build smoke test**

```bash
npm run type-check
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/forgot-password/page.tsx
git commit -m "$(cat <<'EOF'
feat(auth): /forgot-password 페이지 — 이메일 입력 + 자격 결과 표시

요약: 비밀번호 찾기 진입 페이지. ko/en inline COPY, 로그인 페이지와 동일 chrome. 5가지 status별 메시지 분기

배경:
- spec docs/superpowers/specs/2026-05-29-password-reset-design.md
- (auth) route group은 [locale] 밖이라 inline COPY 패턴 사용 (login/signup 일관)
- ?error=invalid_link / session_expired 쿼리로 /auth/reset 실패 케이스 표시

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Recovery callback route `/auth/reset`

**Files:**

- Create: `app/(auth)/auth/reset/route.ts`

- [ ] **Step 1: Write route implementation**

Create `app/(auth)/auth/reset/route.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/forgot-password?error=invalid_link`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/forgot-password?error=invalid_link`);
  }

  return NextResponse.redirect(`${origin}/reset-password`);
}
```

**핵심:** 기존 `/auth/callback`의 OAuth state cookie 검증·role-based redirect 로직을 일절 거치지 않음. recovery 전용 최소 경로.

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/auth/reset/route.ts
git commit -m "$(cat <<'EOF'
feat(auth): /auth/reset recovery 콜백 route — OAuth callback과 분리

요약: 비번 재설정 이메일 링크 콜백 전용 minimal route. exchangeCodeForSession 후 /reset-password로 redirect, 실패 시 invalid_link 에러로 forgot-password 리턴

배경:
- 기존 /auth/callback은 OAuth state cookie 검증을 강제 — recovery 링크에 state cookie 없어 무조건 실패
- 별도 route 분리로 기존 OAuth state/role-based redirect 로직 0줄 수정

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `/reset-password` 페이지

**Files:**

- Create: `app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Write page implementation**

Create `app/(auth)/reset-password/page.tsx`:

```typescript
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import SafeImage from '@/components/common/SafeImage';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import {
  MIN_PASSWORD_LENGTH,
  hasValidPasswordLength,
  isWeakPasswordError,
} from '@/lib/auth/password-policy';

const COPY = {
  ko: {
    subtitle: '새 비밀번호 설정',
    newPasswordLabel: '새 비밀번호',
    confirmPasswordLabel: '새 비밀번호 확인',
    submit: '비밀번호 변경',
    policy: `${MIN_PASSWORD_LENGTH}자 이상 입력해주세요`,
    mismatch: '비밀번호가 일치하지 않습니다',
    weak: `비밀번호가 너무 짧습니다 (${MIN_PASSWORD_LENGTH}자 이상)`,
    error: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    sessionMissing: '세션이 만료되었습니다. 비밀번호 찾기를 다시 시도해주세요.',
    backToLogin: '로그인으로 돌아가기',
  },
  en: {
    subtitle: 'Set new password',
    newPasswordLabel: 'New password',
    confirmPasswordLabel: 'Confirm new password',
    submit: 'Change password',
    policy: `Use at least ${MIN_PASSWORD_LENGTH} characters`,
    mismatch: 'Passwords do not match',
    weak: `Password is too short (at least ${MIN_PASSWORD_LENGTH} characters)`,
    error: 'An error occurred. Please try again later.',
    sessionMissing: 'Your session expired. Please request a new reset link.',
    backToLogin: 'Back to sign in',
  },
} as const;

export default function ResetPasswordPage() {
  const locale = useLocale();
  const copy = COPY[locale as 'ko' | 'en'] ?? COPY.ko;
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        router.replace('/forgot-password?error=session_expired');
        return;
      }
      setSessionChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasValidPasswordLength(password)) {
      setError(copy.weak);
      return;
    }
    if (password !== confirm) {
      setError(copy.mismatch);
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(isWeakPasswordError(updateError) ? copy.weak : copy.error);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace('/login?reset=success');
  };

  if (!sessionChecked) {
    return null;
  }

  return (
    <div
      className={`min-h-screen bg-canvas-soft flex flex-col justify-center pt-20 ${SAWTOOTH_TOP_SAFE_PADDING} sm:px-6 lg:px-8`}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mt-6 flex flex-col items-center gap-3">
          <SafeImage
            src="/images/logo/320pxX90px.webp"
            alt="씨앗페"
            width={160}
            height={45}
            className="h-10 w-auto object-contain"
            priority
          />
          <p className="text-xl font-medium text-gray-600">{copy.subtitle}</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                {copy.newPasswordLabel}
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
              <p className="mt-1 text-xs text-charcoal-soft">{copy.policy}</p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-charcoal">
                {copy.confirmPasswordLabel}
              </label>
              <div className="mt-1">
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="text-danger-a11y text-sm">
                {error}
              </div>
            )}

            <div>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                className="w-full flex justify-center"
              >
                {copy.submit}
              </Button>
            </div>

            <div className="mt-6 text-center text-sm">
              <Link href="/login" className="font-medium text-primary-a11y hover:text-primary">
                {copy.backToLogin}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/reset-password/page.tsx
git commit -m "$(cat <<'EOF'
feat(auth): /reset-password 페이지 — 새 비번 입력 + recovery 세션 가드

요약: recovery 세션 확인 후 새 비번 입력 폼 노출. password-policy(8자 이상) + 일치 검증. 성공 시 signOut → /login?reset=success

배경:
- spec §3 흐름의 마지막 단계
- session 없으면 /forgot-password?error=session_expired로 redirect
- updateUser 후 signOut으로 recovery 임시 세션 정리, 정식 로그인 유도

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 로그인 페이지 — forgot 링크 + reset success 메시지

**Files:**

- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Edit LOGIN_COPY 객체**

`app/(auth)/login/page.tsx`의 `LOGIN_COPY` ko/en 양쪽에 두 키 추가:

```typescript
const LOGIN_COPY = {
  ko: {
    // ... 기존 키들 ...
    forgotPassword: '비밀번호를 잊으셨나요?',
    resetSuccess: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.',
  },
  en: {
    // ... 기존 키들 ...
    forgotPassword: 'Forgot your password?',
    resetSuccess: 'Password changed. Please sign in with your new password.',
  },
} as const;
```

- [ ] **Step 2: Read `reset` searchParam + initial message**

기존 `LoginPage` 함수 안에서 `searchParams` 사용처 근처에 추가:

```typescript
const resetParam = searchParams.get('reset');
const initialSuccess = resetParam === 'success' ? copy.resetSuccess : null;
const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccess);
```

그리고 form submit 시 successMessage clear:

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  setSuccessMessage(null);
  // ... 기존 로직 ...
};
```

- [ ] **Step 3: Render success message + forgot link**

폼 안 `{error && ...}` 블록 위에 success 메시지 추가:

```typescript
{successMessage && (
  <div role="status" className="text-sm text-success-a11y">
    {successMessage}
  </div>
)}
{error && (
  <div role="alert" className="text-danger-a11y text-sm">
    {error}
  </div>
)}
```

비번 input 블록 바로 아래 (label `{copy.passwordLabel}` 블록 닫는 `</div>` 직후) "비밀번호를 잊으셨나요?" 링크 추가:

```typescript
<div className="mt-2 text-right">
  <Link
    href="/forgot-password"
    className="text-xs font-medium text-primary-a11y hover:text-primary"
  >
    {copy.forgotPassword}
  </Link>
</div>
```

- [ ] **Step 4: Run existing login tests**

```bash
npm test -- login-oauth.test.tsx
```

Expected: PASS (변경된 LOGIN_COPY 키 추가만으론 기존 테스트 영향 없음). 깨지면 mock LOGIN_COPY 형태나 새 element 셀렉터 영향 확인.

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "$(cat <<'EOF'
feat(auth): 로그인 페이지에 비밀번호 찾기 링크 + reset=success 메시지 추가

요약: 비번 input 아래 "비밀번호를 잊으셨나요?" 링크와 /reset-password 완료 시 success 메시지 표시

배경:
- spec §3 reset-password 완료 후 /login?reset=success로 redirect
- 사용자가 비번 변경 완료 시각 인지 가능
- ko/en LOGIN_COPY 양쪽에 forgotPassword·resetSuccess 키 추가

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 페이지 통합 테스트 — forgot-password

**Files:**

- Test: `__tests__/app/forgot-password.test.tsx`

- [ ] **Step 1: Write page test**

Create `__tests__/app/forgot-password.test.tsx`:

```typescript
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockRequestPasswordReset = jest.fn();
jest.mock('@/app/(auth)/forgot-password/actions', () => ({
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
}));

const mockSearchParamsGet = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockSearchParamsGet }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('next-intl', () => ({
  useLocale: () => 'ko',
}));

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: React.PropsWithChildren<{ href: string }>) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('@/components/ui/Button', () => {
  return function MockButton({
    children,
    type = 'button',
    disabled,
  }: React.PropsWithChildren<{
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>) {
    return (
      <button type={type} disabled={disabled}>
        {children}
      </button>
    );
  };
});

jest.mock('@/components/common/SafeImage', () => {
  return function MockImage({ alt }: { alt: string }) {
    return <img alt={alt} />;
  };
});

jest.mock('@/components/ui/SawtoothDivider', () => ({
  SAWTOOTH_TOP_SAFE_PADDING: 'pb-24',
}));

import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsGet.mockReturnValue(null);
  });

  it('renders email input and submit button', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText('이메일 주소')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재설정 링크 보내기' })).toBeInTheDocument();
  });

  it('shows success message on sent', async () => {
    mockRequestPasswordReset.mockResolvedValue({ status: 'sent' });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '재설정 링크 보내기' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/재설정 링크를 이메일로 보냈습니다/);
    });
  });

  it('shows not_found message', async () => {
    mockRequestPasswordReset.mockResolvedValue({ status: 'not_found' });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'u@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '재설정 링크 보내기' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/등록되지 않은 이메일입니다/);
    });
  });

  it('shows social_only message', async () => {
    mockRequestPasswordReset.mockResolvedValue({ status: 'social_only', provider: 'google' });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'u@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '재설정 링크 보내기' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Google로 가입한 계정/);
    });
  });

  it('shows rate_limited message', async () => {
    mockRequestPasswordReset.mockResolvedValue({ status: 'rate_limited' });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'u@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '재설정 링크 보내기' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/요청이 너무 많습니다/);
    });
  });

  it('shows invalid_link error from query param', () => {
    mockSearchParamsGet.mockImplementation((k: string) => (k === 'error' ? 'invalid_link' : null));
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/만료되었거나 유효하지 않습니다/);
  });

  it('shows session_expired error from query param', () => {
    mockSearchParamsGet.mockImplementation((k: string) =>
      k === 'error' ? 'session_expired' : null
    );
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/세션이 만료되었습니다/);
  });
});
```

- [ ] **Step 2: Run test**

```bash
npm test -- forgot-password.test.tsx
```

Expected: PASS (7 케이스)

- [ ] **Step 3: Commit**

```bash
git add __tests__/app/forgot-password.test.tsx
git commit -m "$(cat <<'EOF'
test(auth): /forgot-password 페이지 jest 통합 테스트 7 케이스

요약: 각 status별 메시지 렌더 + ?error 쿼리 진입 케이스 커버

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 페이지 통합 테스트 — reset-password

**Files:**

- Test: `__tests__/app/reset-password.test.tsx`

- [ ] **Step 1: Write page test**

Create `__tests__/app/reset-password.test.tsx`:

```typescript
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/lib/auth/client', () => ({
  createSupabaseBrowserClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
    },
  })),
}));

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('next-intl', () => ({
  useLocale: () => 'ko',
}));

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: React.PropsWithChildren<{ href: string }>) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('@/components/ui/Button', () => {
  return function MockButton({
    children,
    type = 'button',
    disabled,
  }: React.PropsWithChildren<{
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>) {
    return (
      <button type={type} disabled={disabled}>
        {children}
      </button>
    );
  };
});

jest.mock('@/components/common/SafeImage', () => {
  return function MockImage({ alt }: { alt: string }) {
    return <img alt={alt} />;
  };
});

jest.mock('@/components/ui/SawtoothDivider', () => ({
  SAWTOOTH_TOP_SAFE_PADDING: 'pb-24',
}));

import ResetPasswordPage from '@/app/(auth)/reset-password/page';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to forgot-password when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/forgot-password?error=session_expired');
    });
  });

  it('renders form when session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument();
      expect(screen.getByLabelText('새 비밀번호 확인')).toBeInTheDocument();
    });
  });

  it('shows weak password error for <8 chars', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    render(<ResetPasswordPage />);
    await waitFor(() => screen.getByLabelText('새 비밀번호'));

    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'short' } });
    fireEvent.submit(screen.getByRole('button', { name: '비밀번호 변경' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/너무 짧습니다/);
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows mismatch error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    render(<ResetPasswordPage />);
    await waitFor(() => screen.getByLabelText('새 비밀번호'));

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'password1234' },
    });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
      target: { value: 'different5678' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '비밀번호 변경' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/일치하지 않습니다/);
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('updates password + signs out + redirects on success', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    mockUpdateUser.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
    render(<ResetPasswordPage />);
    await waitFor(() => screen.getByLabelText('새 비밀번호'));

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '비밀번호 변경' }).closest('form')!);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
    });
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/login?reset=success');
    });
  });

  it('shows error when updateUser fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    mockUpdateUser.mockResolvedValue({ error: { message: 'server error' } });
    render(<ResetPasswordPage />);
    await waitFor(() => screen.getByLabelText('새 비밀번호'));

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '비밀번호 변경' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/오류가 발생했습니다/);
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test**

```bash
npm test -- reset-password.test.tsx
```

Expected: PASS (6 케이스)

- [ ] **Step 3: Commit**

```bash
git add __tests__/app/reset-password.test.tsx
git commit -m "$(cat <<'EOF'
test(auth): /reset-password 페이지 jest 통합 테스트 6 케이스

요약: 세션 가드, weak/mismatch 검증, 성공 시 updateUser+signOut+redirect, 실패 시 에러 표시

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 전체 검증 + push

- [ ] **Step 1: 전체 test suite**

```bash
npm test
```

Expected: 신규 3 파일(forgot-password actions/page, reset-password page) 모두 PASS. 기존 회귀 0.

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: 0 errors

- [ ] **Step 3: Build (SSG 호환성 확인)**

```bash
npm run build
```

Expected: 성공. `/forgot-password`, `/reset-password`, `/auth/reset` 모두 빌드 산출물에 포함.

- [ ] **Step 4: Lint**

```bash
npm run lint
```

Expected: 0 errors

- [ ] **Step 5: Push**

```bash
git push origin main
```

---

## Task 11: 운영 작업 체크리스트 (사용자 직접 수행)

**push 후 사용자가 Supabase Dashboard에서 수행 필요. PR 머지 전/직후 1회.**

- [ ] **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

다음 URL 추가:

- `https://www.saf2026.com/auth/reset` (prod)
- preview 도메인 패턴이 `*.vercel.app/**` 형태로 와일드카드 등록되어 있다면 자동 포함. 아니면 preview용 패턴도 추가

- [ ] **Supabase Dashboard → Authentication → Email Templates → Reset Password**

한국어 본문 확인. 기본은 영문이므로 한국어로 변경 권장. 이중 언어 본문 권장 패턴:

```
안녕하세요,

씨앗페(Seed Art Festival) 계정 비밀번호 재설정 요청이 접수되었습니다. 아래 링크를 클릭하여 새 비밀번호를 설정해주세요.

Hello,

You requested to reset your password for Seed Art Festival. Click the link below to set a new password.

<a href="{{ .ConfirmationURL }}">비밀번호 재설정 / Reset password</a>

이 요청을 하지 않으셨다면 이 이메일을 무시해주세요. / If you didn't request this, please ignore this email.
```

- [ ] **체크 후 보고**

- 운영자가 prod에서 본인 이메일로 비번 찾기 1회 smoke test 권장 (`/forgot-password` → 이메일 수신 → 링크 클릭 → 새 비번 설정 → 로그인 확인)

---

## Self-review

**Spec coverage:**

- §2.1 UX 정책 — Task 4 (not_found / social_only 메시지 분기) + Task 8 (테스트)
- §2.2 callback 분리 — Task 5
- §2.3 server action + service role — Task 3
- §3 흐름 — Task 2~7 전체
- §4 파일 — 신규 4 파일 + 수정 1 파일 모두 Task 매핑됨. messages/\*.json 추가는 inline COPY 패턴으로 대체(plan 도입부 명기)
- §5 SQL — Task 1
- §6 server action 의사 코드 — Task 3
- §7 recovery route 의사 코드 — Task 5
- §8 i18n — inline COPY로 대체 (login 페이지 일관)
- §9 운영 작업 — Task 11
- §10 보안 모델 — Task 1·3 + 자체 검증
- §11 테스트 — Task 2·8·9

**Placeholder scan:** 없음.

**Type consistency:**

- `RequestPasswordResetResult` (Task 3) ↔ page에서 status 분기(Task 4) ↔ test mock(Task 2·8) 일관
- `MIN_PASSWORD_LENGTH`, `hasValidPasswordLength`, `isWeakPasswordError` — 기존 `lib/auth/password-policy.ts` export 명 그대로
- `SAWTOOTH_TOP_SAFE_PADDING` — 기존 export 명 그대로
- `createSupabaseAdminClient` / `createSupabaseServerClient` / `createSupabaseBrowserClient` — 기존 export 명 그대로
- `rateLimit(key, { limit, windowMs })` — 기존 시그니처 그대로
