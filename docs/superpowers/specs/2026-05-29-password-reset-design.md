# 비밀번호 재설정 (Password Reset) 설계

- 작성일: 2026-05-29
- 상태: 설계 합의 완료, 구현 대기
- 범위: 공개 라우트 (ko/en) + 로그인 페이지 링크. admin 포털 별도 분기 없음 (같은 페이지 사용)

## 1. 배경

현재 SAF 사이트는 Supabase Auth 기반(이메일/비밀번호 + Google OAuth)으로 동작하나, 비밀번호 재설정 진입점이 없다. 사용자가 비밀번호를 잊으면 회원가입을 다시 시도하거나 운영팀에 문의해야 한다.

## 2. 의사결정 (회귀 위험 기반)

### 2.1 진입점·UX 정책

미등록 이메일 / 소셜 전용 계정 처리는 **UX 우선 — 명시적 안내**.

- 미등록 이메일: "등록되지 않은 이메일입니다" 명시
- Google 전용 계정(비번 가입 identity 없음): "Google로 가입한 계정입니다. Google로 로그인하세요" 명시
- Trade-off: 이메일 enumeration 가능성을 받아들임. 대신 `rateLimit()`으로 자동화 공격을 억제

### 2.2 Recovery callback 라우트 — **별도 분리**

`app/(auth)/auth/reset/route.ts`를 신설. 기존 `/auth/callback`은 손대지 않음.

**왜 분리인가:**

- 기존 callback은 첫 번째 가드에서 `isValidOAuthState(requestState, cookieState)` 검증을 강제한다. recovery 링크에는 OAuth state cookie가 없으므로 곧장 `error=oauth_state`로 redirect됨. 확장하려면 OAuth state 가드 자체를 우회해야 하고, 이는 OAuth 보안 회귀의 직접 원인.
- 기존 callback 이후 200줄 role-based redirect 분기에 recovery 케이스를 끼우면 admin/exhibitor/artist/user 분기 모두 영향 검토 필요.
- 별도 route는 기존 callback 코드를 0줄 수정. 회귀 표면 0.

### 2.3 자격 판정 호출 경로 — **Server action + service role**

`app/(auth)/forgot-password/actions.ts`에서 `createSupabaseAdminClient()`로 RPC 호출.

**왜 server action인가:**

- RPC `check_reset_eligibility`의 grant를 `service_role`에게만 부여 → 외부 anon 직접 호출 차단 (자동화 enumeration 공격 표면 제거)
- 기존 `rateLimit()` 헬퍼(`lib/rate-limit.ts`)를 한 줄로 호출 가능. DB 기반 분산 limiter + in-memory fallback이라 별도 인프라 불필요
- 향후 captcha 추가 시 server action 안에서 분기 가능 (DB 함수 직접 노출이면 middleware/captcha 끼울 자리 없음)
- 기존 `createSupabaseAdminClient()` 패턴은 `lib/auth/server.ts`에 정의되어 있고 다수 server action(`exhibitor-onboarding`, `petition-admin`, `checkout` 등)에서 이미 사용 중인 검증된 헬퍼

## 3. 흐름

```
[/forgot-password]
  └─ 이메일 입력 → server action requestPasswordReset(email)
       ├─ rateLimit("forgot-password:" + ip) 체크
       ├─ RPC check_reset_eligibility(email) 호출 (admin client)
       └─ 결과 분기:
            ├─ not_found     → { status: 'not_found' }
            ├─ social_only   → { status: 'social_only', provider: 'google' }
            └─ eligible      → supabase.auth.resetPasswordForEmail(
                                  email,
                                  { redirectTo: `${SITE_URL}/auth/reset` }
                                ) → { status: 'sent' }

[이메일 링크 클릭]
  └─ /auth/reset?code=...
       ├─ exchangeCodeForSession(code) → recovery 세션 활성
       ├─ 성공 → /reset-password
       └─ 실패 → /forgot-password?error=invalid_link

[/reset-password]
  └─ 새 비번 + 확인 입력
       ├─ getSession() 없으면 → /forgot-password?error=session_expired
       ├─ password-policy 검증 (lib/auth/password-policy.ts 재사용)
       ├─ supabase.auth.updateUser({ password })
       └─ 성공 → signOut() → /login?reset=success
```

**`/reset-password` 후 signOut 이유**: recovery 세션은 임시 세션이므로 명시적으로 종료 후 정식 로그인을 유도하는 게 안전. 사용자가 새 비번을 확실히 기억하게 만드는 효과도 있음.

## 4. 컴포넌트·파일

### 신규

| 파일                                                              | 역할                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `app/(auth)/forgot-password/page.tsx`                             | 이메일 입력 폼 (client, i18n, `'use client'`). 로그인 페이지와 동일한 chrome 톤 |
| `app/(auth)/forgot-password/actions.ts`                           | `'use server'`. `requestPasswordReset(email)` server action                     |
| `app/(auth)/reset-password/page.tsx`                              | 새 비번 입력 폼 (client). recovery 세션 가드 + password-policy 검증             |
| `app/(auth)/auth/reset/route.ts`                                  | recovery code → session 교환 후 `/reset-password`로 redirect                    |
| `supabase/migrations/<timestamp>_add_check_reset_eligibility.sql` | RPC 함수 + grant                                                                |

### 수정

| 파일                                   | 변경                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/(auth)/login/page.tsx`            | 비번 input 하단에 "비밀번호를 잊으셨나요?" 링크 추가 (ko/en `LOGIN_COPY`에 키 추가) |
| `messages/ko.json`, `messages/en.json` | `auth.forgotPassword.*`, `auth.resetPassword.*` 키 추가 (공개 라우트는 i18n 필수)   |

### 재사용 (수정 없음)

- `lib/auth/password-policy.ts` — `MIN_PASSWORD_LENGTH`, `hasValidPasswordLength`, `isWeakPasswordError`
- `lib/auth/server.ts` — `createSupabaseAdminClient`, `createSupabaseServerClient`
- `lib/auth/client.ts` — `createSupabaseBrowserClient`
- `lib/rate-limit.ts` — `rateLimit(key, { limit, windowMs })`

## 5. SQL 설계

```sql
-- supabase/migrations/<ts>_add_check_reset_eligibility.sql

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

**보안 노트:**

- `security definer` + 명시적 `search_path` 고정 → search_path injection 방어
- `grant execute to service_role` 전용 → anon/authenticated 직접 호출 차단
- `lower(email)` 정규화로 대소문자 차이 흡수

## 6. Server action 의사 코드

```typescript
// app/(auth)/forgot-password/actions.ts
'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/security/get-client-ip';

const SCHEMA = z.object({ email: z.string().email().toLowerCase() });

type Result =
  | { status: 'sent' }
  | { status: 'not_found' }
  | { status: 'social_only'; provider: string }
  | { status: 'rate_limited' }
  | { status: 'error' };

export async function requestPasswordReset(input: { email: string }): Promise<Result> {
  const parsed = SCHEMA.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  const ip = getClientIp(await headers());
  const rl = await rateLimit(`forgot-password:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) return { status: 'rate_limited' };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('check_reset_eligibility', {
    p_email: parsed.data.email,
  });
  if (error) return { status: 'error' };

  const payload = data as { status: string; provider?: string };

  if (payload.status === 'not_found') return { status: 'not_found' };
  if (payload.status === 'social_only') {
    return { status: 'social_only', provider: payload.provider ?? 'google' };
  }

  // eligible — 메일 발송 (browser/server client 어느 쪽이든 OK. 여기선 server)
  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error: mailError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/reset`,
  });
  if (mailError) return { status: 'error' };

  return { status: 'sent' };
}
```

## 7. Recovery route 의사 코드

```typescript
// app/(auth)/auth/reset/route.ts
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

**핵심: 기존 `/auth/callback`의 OAuth state 검증·role-based redirect 로직을 일절 거치지 않음**. recovery 전용 minimal 경로.

## 8. i18n 메시지 키

```json
// messages/ko.json (추가분)
{
  "auth": {
    "forgotPassword": {
      "title": "비밀번호 찾기",
      "subtitle": "가입하신 이메일로 재설정 링크를 보내드립니다",
      "emailLabel": "이메일 주소",
      "submit": "재설정 링크 보내기",
      "backToLogin": "로그인으로 돌아가기",
      "linkFromLogin": "비밀번호를 잊으셨나요?",
      "result": {
        "sent": "재설정 링크를 이메일로 보냈습니다. 메일함을 확인해주세요.",
        "notFound": "등록되지 않은 이메일입니다.",
        "socialOnlyGoogle": "Google로 가입한 계정입니다. 로그인 페이지에서 '구글로 계속하기'를 사용해주세요.",
        "rateLimited": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        "error": "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        "invalidLink": "재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.",
        "sessionExpired": "세션이 만료되었습니다. 다시 재설정 링크를 요청해주세요."
      }
    },
    "resetPassword": {
      "title": "새 비밀번호 설정",
      "newPasswordLabel": "새 비밀번호",
      "confirmPasswordLabel": "새 비밀번호 확인",
      "submit": "비밀번호 변경",
      "policy": "8자 이상 입력해주세요",
      "mismatch": "비밀번호가 일치하지 않습니다",
      "weak": "비밀번호가 너무 짧습니다 (8자 이상)",
      "success": "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.",
      "error": "오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    }
  }
}
```

`messages/en.json`은 동일 구조로 영문 번역.

`app/(auth)/login/page.tsx`의 `LOGIN_COPY`에는 `forgotPasswordLink` 키만 추가하면 됨 (현재 패턴 유지).

## 9. 운영 작업 (Supabase Dashboard)

**Supabase는 MCP 우선 정책이지만 다음 항목들은 dashboard 작업이 필요** (MCP 미지원 영역):

1. **Auth → URL Configuration → Redirect URLs**:
   - prod: `https://www.saf2026.com/auth/reset`
   - preview: Vercel preview 도메인 패턴이 이미 등록되어 있다면 `*/auth/reset`도 포함되는지 확인

2. **Auth → Emails → SMTP Settings (Custom SMTP — Resend)**:
   - SAF는 이미 `RESEND_API_KEY` + `RESEND_FROM_EMAIL=씨앗페 <noreply@saf2026.com>`로 결제·청원·구매자 알림 메일 발송 중 (`lib/notify.ts`, `lib/email/resend-batch.ts`). 동일 인프라를 Supabase Auth 메일에도 확장
   - Host: `smtp.resend.com` / Port: `465` (SSL) 또는 `587` (STARTTLS)
   - Username: `resend` / Password: `RESEND_API_KEY` 값
   - Sender email: `noreply@saf2026.com` / Sender name: `씨앗페`
   - ⚠️ Custom SMTP 활성화 시 Supabase 기본 auth 메일 rate limit(시간당 2회/사용자, 30회/IP)이 해제됨 → server action의 `rateLimit('forgot-password:' + ip, limit:5, windowMs:60_000)`이 **유일한 안전망**. 이미 구현되어 있음
   - Resend Dashboard에서 `saf2026.com` 도메인 SPF/DKIM verify 상태 + 일일 quota(결제/청원/auth 메일 합산) 확인

3. **Auth → Email Templates → Reset Password**:
   - **Subject**: `[씨앗페] 비밀번호 재설정 안내 / Password reset for SAF 2026`
   - **HTML 본문**: 아래 §9.1 참조. `emails/_components/saf-email-layout.tsx` 디자인 토큰(Gallery Pearl 배경 #FAFAFC, 흰 컨테이너, charcoal-deep #1F2428 헤더, primary-strong #0E4ECF CTA, 시스템 폰트 fallback)을 inline style로 옮긴 형태. 이중 언어(ko + en) 본문 권장 (Supabase는 단일 템플릿).
   - **변수**: `{{ .ConfirmationURL }}`이 `/auth/reset?code=...` URL로 치환됨
   - React Email 컴포넌트(`emails/*`)는 우리 코드가 Resend API 직접 호출할 때만 적용 — Supabase Auth 메일은 별도 system이라 동일 톤을 위해 HTML을 손으로 박아야 함

체크리스트는 PR description에 포함.

### 9.1 Reset Password 이메일 HTML 본문

Supabase Dashboard → Auth → Email Templates → Reset Password의 Message (Source) 입력란에 그대로 paste. 모든 CSS는 inline (이메일 클라이언트의 `<style>` 차단 대응). table 기반 레이아웃 (Outlook 호환).

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>비밀번호 재설정</title>
  </head>
  <body
    style="margin:0;padding:0;background:#FAFAFC;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI','Malgun Gothic','Noto Sans KR',sans-serif;"
  >
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="background:#FAFAFC;padding:32px 0;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="560"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="max-width:560px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);"
          >
            <tr>
              <td style="background:#1F2428;padding:20px 28px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;">
                  [씨앗페] 비밀번호 재설정 / Password reset
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#1F2428;font-size:15px;line-height:1.6;">
                <p style="margin:0 0 12px 0;">안녕하세요,</p>
                <p style="margin:0 0 16px 0;">
                  씨앗페(Seed Art Festival) 계정의 비밀번호 재설정을 요청하셨습니다. 아래 버튼을
                  눌러 새 비밀번호를 설정해주세요.
                </p>
                <table
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="margin:20px 0 24px 0;"
                >
                  <tr>
                    <td style="border-radius:6px;background:#0E4ECF;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;"
                        >비밀번호 재설정하기 / Reset password</a
                      >
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;font-size:13px;color:#6B7280;">
                  버튼이 작동하지 않으면 아래 URL을 복사해 브라우저에 붙여넣어주세요:
                </p>
                <p style="margin:0 0 24px 0;font-size:12px;word-break:break-all;">
                  <a href="{{ .ConfirmationURL }}" style="color:#0E4ECF;text-decoration:underline;"
                    >{{ .ConfirmationURL }}</a
                  >
                </p>
                <hr style="border:none;border-top:1px solid #E0E0E0;margin:24px 0;" />
                <p style="margin:0 0 12px 0;font-size:14px;color:#1F2428;">Hello,</p>
                <p style="margin:0;font-size:14px;color:#1F2428;line-height:1.6;">
                  You requested to reset your password for Seed Art Festival. Click the button above
                  to set a new password.
                </p>
                <hr style="border:none;border-top:1px solid #E0E0E0;margin:24px 0;" />
                <p style="margin:0 0 6px 0;font-size:13px;color:#6B7280;line-height:1.5;">
                  이 요청을 직접 하지 않으셨다면 이 이메일을 무시해주세요. 비밀번호는 변경되지
                  않습니다.
                </p>
                <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.5;">
                  If you didn't request this, please ignore this email. Your password will not be
                  changed.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#FAFAFC;border-top:1px solid #E0E0E0;padding:16px 28px;">
                <p style="margin:0;font-size:12px;color:#8F98A5;">
                  씨앗페 2026 (Seed Art Festival)
                </p>
                <p style="margin:4px 0 0 0;font-size:12px;color:#8F98A5;">
                  문의 / Contact: contact@kosmart.org
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**디자인 토큰 매핑 (`emails/_components/saf-email-layout.tsx` 일관):**

| 요소               | 값                                                              | 출처                             |
| ------------------ | --------------------------------------------------------------- | -------------------------------- |
| Body 배경          | `#FAFAFC`                                                       | `canvas.DEFAULT` (Gallery Pearl) |
| 컨테이너 배경      | `#FFFFFF`                                                       | `canvas.soft`                    |
| 컨테이너 max-width | `560px`                                                         | layout 일관                      |
| 컨테이너 radius    | `8px`                                                           | layout 일관                      |
| Header 배경        | `#1F2428`                                                       | `gallery.tile` / `charcoal.deep` |
| Header 텍스트      | `#FFFFFF` `20px` `700`                                          | layout 일관                      |
| Body 텍스트        | `#1F2428` `15px` `line-height:1.6`                              | `charcoal.deep` 본문             |
| CTA 배경           | `#0E4ECF`                                                       | `primary.strong` (6.98:1 AA)     |
| CTA 텍스트         | `#FFFFFF` `15px` `600`                                          | brand CTA 규약                   |
| 보조 텍스트        | `#6B7280`                                                       | `gray.500`                       |
| 푸터 배경          | `#FAFAFC`                                                       | layout 일관                      |
| 푸터 border-top    | `1px solid #E0E0E0`                                             | `gallery.hairline`               |
| 푸터 텍스트        | `#8F98A5` `12px`                                                | layout 일관                      |
| 폰트 fallback      | `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', ...` | layout 일관                      |

## 10. 보안 모델

| 위협                      | 대응                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 이메일 enumeration 자동화 | `getClientIp()` 기반 IP + `rateLimit("forgot-password:" + ip, {limit: 5, windowMs: 60_000})` — IP-rotation spoofing 차단 |
| RPC 외부 직접 호출        | `grant execute to service_role` 전용                                                                                     |
| search_path injection     | `set search_path = public, auth` 고정                                                                                    |
| recovery 링크 재사용      | Supabase 자체 OTP 만료 (기본 1시간)                                                                                      |
| OAuth callback 우회 시도  | recovery route 분리로 OAuth state 검증 영향 없음                                                                         |
| 약한 비밀번호             | `lib/auth/password-policy.ts` 재사용, `isWeakPasswordError` 분기                                                         |

**IP 추출**: `lib/security/get-client-ip.ts` 사용 (Vercel x-forwarded-for의 **마지막** segment가 Edge-detected 신뢰값. 첫 segment는 클라이언트 위조 가능). 기존 server actions(petition, checkout, order-lookup) 일관 패턴.

## 11. 테스트

| 파일                                        | 케이스                                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `__tests__/app/forgot-password.test.tsx`    | 폼 렌더, submit 후 각 status별 메시지 (sent/not_found/social_only/rate_limited/error), 로그인 페이지 링크 |
| `__tests__/app/reset-password.test.tsx`     | recovery 세션 없을 때 redirect, password mismatch, weak password 에러, 성공 시 signOut + redirect         |
| `__tests__/actions/forgot-password.test.ts` | server action 단위 테스트 (zod 검증, rateLimit mocking, RPC mocking, 각 status 반환)                      |

기존 패턴: SAF는 Jest + React Testing Library 사용 중 (`npm test`).

## 12. YAGNI 제외

- Captcha (hCaptcha/reCAPTCHA) — `rateLimit`으로 시작, 자동화 공격 관측되면 별도 cycle
- 비밀번호 강도 미터 UI — `MIN_PASSWORD_LENGTH`만
- admin 포털 전용 분기 — 같은 공개 페이지 사용 (admin도 일반 로그인 페이지 거침)
- 이메일 재전송 쿨다운 UI — Supabase 자체 OTP rate limit (1분 1회)에 의존
- 비밀번호 변경 이력 로그 — 추후 audit log 통합 시점에 추가

## 13. 구현 순서 (writing-plans에서 상세화 예정)

1. SQL migration 작성 + MCP `apply_migration` (단건)
2. Server action + recovery route + reset 페이지 + forgot 페이지 (병렬 안전)
3. 로그인 페이지 링크 + i18n 메시지 (병렬 안전)
4. 테스트 작성
5. `npm test` + `npm run type-check` + `npm run build`
6. Supabase dashboard 작업 (Redirect URLs, Email Template) — PR 머지 전 체크리스트
7. 커밋 + push

## 14. Out of scope

- exhibitor 포털 전용 비밀번호 재설정 흐름 (정책 미결정 상태)
- 비밀번호 변경 페이지 (`/dashboard/password` 등 — 별도 cycle)
- 2FA — 별도 cycle
