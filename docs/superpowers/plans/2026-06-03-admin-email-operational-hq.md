# 관리자 이메일 운영 발송 HQ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/email`의 개별 발송(`individual` 채널)을 "운영 발송" HQ로 확장 — 임의 이메일 주소 직접 입력 + 명단 브라우즈·멀티셀렉트로 수신자를 만들어 비광고 운영 메일을 ≤200명에게 보낸다.

**Architecture:** 세 수신자 빌더(검색/목록/직접입력)가 모두 동일한 `selectedContacts: {email,name}[]`를 만들고 기존 `enqueueIndividualBroadcast`(channel=`individual`)로 종착한다. 운영 모드는 비광고 강제(`is_advertisement=false`), 200명 하드 캡, 서버측 이메일 형식 검증 + 멱등 수신자-해시 가드로 보강한다. 스키마 변경 없음.

**Tech Stack:** Next.js 16(App Router, Server Actions), TypeScript strict, Supabase(service-role 클라이언트, RLS), Resend, Jest + React Testing Library.

**선행 스펙:** [docs/superpowers/specs/2026-06-03-admin-email-operational-hq-design.md](../specs/2026-06-03-admin-email-operational-hq-design.md)

---

## 공유 계약 (태스크 간 일치 필수)

```ts
// lib/utils/input-validation.ts (Task 1)
export const EMAIL_REGEX: RegExp; // /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidEmail(value: string): boolean;
// (기존 validateEmail은 EMAIL_REGEX를 재사용하도록 변경, 동작 동일)

// lib/email/parse-email-list.ts (Task 2)
export interface ParsedEmail {
  email: string;
  name: string | null;
}
export function parseEmailList(raw: string): { valid: ParsedEmail[]; invalid: string[] };

// app/actions/admin-broadcast.ts — enqueueIndividualBroadcast (Task 3) 추가 동작
//   - 200명 캡(서버), 무효 이메일 제외, suppression+무효 dropped 수를 메시지에 포함,
//     멱등 가드 키에 정규화 수신자 셋 해시 포함. 시그니처는 동일.
export const MAX_INDIVIDUAL_RECIPIENTS = 200;

// lib/email/audiences/resolver-for.ts (Task 4)
export type AudienceSource = 'member' | 'customer' | 'petition' | 'artwork-buyer';
export function resolverFor(
  source: AudienceSource,
  filter: { subset?: 'all' | 'artist' | 'exhibitor'; petitionSlug?: string; artworkId?: string }
): import('./types').AudienceResolver; // 잘못된 입력 시 throw(Error)

// app/actions/admin-broadcast.ts — listAudienceRecipients (Task 4)
export async function listAudienceRecipients(
  source: AudienceSource,
  filter?: { subset?: 'all' | 'artist' | 'exhibitor'; petitionSlug?: string; artworkId?: string },
  opts?: { query?: string; page?: number; pageSize?: number }
): Promise<{ recipients: { email: string; name: string | null }[]; total: number }>;

// app/(portal)/admin/email/_components/SelectedRecipients.tsx (Task 5)
//   props: { selected: SelectedContact[]; onRemove: (email: string) => void }
// app/(portal)/admin/email/_components/ContactList.tsx (Task 6)
//   props: { selected: SelectedContact[]; onChange: (next: SelectedContact[]) => void }
// SelectedContact = { email: string; name: string | null }  (ContactSearch.tsx에 이미 정의)
```

---

## 파일 구조

**신규**

- `lib/email/parse-email-list.ts` — 직접 입력 파서 (순수 함수)
- `lib/email/audiences/resolver-for.ts` — source→resolver 매핑 헬퍼
- `app/(portal)/admin/email/_components/SelectedRecipients.tsx` — 담긴 수신자 칩 (공통)
- `app/(portal)/admin/email/_components/ContactList.tsx` — 그룹 목록 브라우즈 + 체크박스
- 테스트: `__tests__/lib/email/parse-email-list.test.ts`, `__tests__/lib/email/audiences/resolver-for.test.ts`, `__tests__/app/admin/email/ContactList.test.tsx`, `__tests__/app/admin/email/OperationalSend.test.tsx`

**수정**

- `lib/utils/input-validation.ts` — `EMAIL_REGEX` export + `isValidEmail` 추가 (validateEmail 내부 재사용)
- `app/actions/admin-broadcast.ts` — `enqueueIndividualBroadcast` 보강 + `listAudienceRecipients` 추가
- `app/(portal)/admin/email/_components/ContactSearch.tsx` — 칩 블록 제거(칩은 부모가 1회 렌더)
- `app/(portal)/admin/email/_components/BroadcastForm.tsx` — 운영 모드 3탭·비광고 강제·200캡·칩 통합

---

## Task 1: `isValidEmail` 비-throw 헬퍼 + 정규식 단일화

**Files:**

- Modify: `lib/utils/input-validation.ts`
- Test: `__tests__/lib/utils/input-validation-email.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — create `__tests__/lib/utils/input-validation-email.test.ts`:

```ts
import { isValidEmail, validateEmail, EMAIL_REGEX } from '@/lib/utils/input-validation';

describe('isValidEmail', () => {
  it('유효한 이메일은 true', () => {
    expect(isValidEmail('a@x.com')).toBe(true);
    expect(isValidEmail('Hong.Gildong@sub.example.co.kr')).toBe(true);
  });
  it('무효한 이메일은 false (throw 안 함)', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a @x.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
  it('EMAIL_REGEX가 export되어 재사용 가능', () => {
    expect(EMAIL_REGEX.test('a@x.com')).toBe(true);
  });
  it('기존 validateEmail 동작 유지 (무효 시 throw)', () => {
    expect(validateEmail('a@x.com')).toBe('a@x.com');
    expect(() => validateEmail('bad')).toThrow();
    expect(validateEmail('')).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/lib/utils/input-validation-email.test.ts` → FAIL (`isValidEmail`/`EMAIL_REGEX` 미export).

- [ ] **Step 3: 구현** — `lib/utils/input-validation.ts`의 `validateEmail`을 다음으로 교체하고 위에 export 추가:

```ts
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function validateEmail(value: string | null): string | null {
  if (!value?.trim()) return null;
  if (!EMAIL_REGEX.test(value.trim())) {
    throw new Error('유효하지 않은 이메일 형식입니다.');
  }
  return value.trim();
}
```

- [ ] **Step 4: 통과 확인** — `npx jest __tests__/lib/utils/input-validation-email.test.ts && npm run type-check` → PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/utils/input-validation.ts __tests__/lib/utils/input-validation-email.test.ts
git commit -m "feat(email): isValidEmail 비-throw 헬퍼 + EMAIL_REGEX 단일화

요약: 이메일 정규식을 export하고 throw하지 않는 검사 함수 추가(파서·서버 검증 공유용)"
```

---

## Task 2: `parseEmailList` 직접 입력 파서

**Files:**

- Create: `lib/email/parse-email-list.ts`
- Test: `__tests__/lib/email/parse-email-list.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — create `__tests__/lib/email/parse-email-list.test.ts`:

```ts
import { parseEmailList } from '@/lib/email/parse-email-list';

describe('parseEmailList', () => {
  it('쉼표·줄바꿈·세미콜론으로 분리하고 정규화한다', () => {
    const r = parseEmailList('A@X.com, b@y.com\n c@z.com ; d@w.com');
    expect(r.valid.map((v) => v.email)).toEqual(['a@x.com', 'b@y.com', 'c@z.com', 'd@w.com']);
    expect(r.invalid).toEqual([]);
  });
  it('"이름 <메일>" 형식에서 이름과 주소를 분리한다', () => {
    const r = parseEmailList('홍길동 <Hong@x.com>');
    expect(r.valid).toEqual([{ email: 'hong@x.com', name: '홍길동' }]);
  });
  it('무효 주소는 invalid로 분리하고 유효는 통과시킨다 (전체 실패 금지)', () => {
    const r = parseEmailList('good@x.com, not-an-email, also@y.com');
    expect(r.valid.map((v) => v.email)).toEqual(['good@x.com', 'also@y.com']);
    expect(r.invalid).toEqual(['not-an-email']);
  });
  it('중복 이메일을 제거한다(첫 이름 유지)', () => {
    const r = parseEmailList('홍 <a@x.com>, a@x.com');
    expect(r.valid).toEqual([{ email: 'a@x.com', name: '홍' }]);
  });
  it('빈 입력은 빈 결과', () => {
    expect(parseEmailList('   ')).toEqual({ valid: [], invalid: [] });
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/lib/email/parse-email-list.test.ts` → FAIL (모듈 없음).

- [ ] **Step 3: 구현** — create `lib/email/parse-email-list.ts`:

```ts
import { isValidEmail } from '@/lib/utils/input-validation';

export interface ParsedEmail {
  email: string;
  name: string | null;
}

// 관리자가 붙여넣은/타이핑한 주소 목록을 파싱.
// 구분자: 쉼표·세미콜론·줄바꿈. "이름 <메일>" 형식 지원. 무효는 invalid로 분리(전체 실패 방지).
export function parseEmailList(raw: string): { valid: ParsedEmail[]; invalid: string[] } {
  const tokens = raw
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const valid: ParsedEmail[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    // "이름 <email>" 또는 "email"
    const angle = token.match(/^(.*?)<([^>]+)>$/);
    const rawEmail = (angle ? angle[2] : token).trim();
    const name = angle ? angle[1].trim() || null : null;
    const email = rawEmail.toLowerCase();

    if (!isValidEmail(email)) {
      invalid.push(token);
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    valid.push({ email, name });
  }

  return { valid, invalid };
}
```

- [ ] **Step 4: 통과 확인** — `npx jest __tests__/lib/email/parse-email-list.test.ts && npm run type-check` → PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add lib/email/parse-email-list.ts __tests__/lib/email/parse-email-list.test.ts
git commit -m "feat(email): 직접 입력 주소 파서 parseEmailList

요약: 붙여넣은 이메일 목록을 구분자·이름<메일>·무효분리·dedup로 파싱"
```

---

## Task 3: `enqueueIndividualBroadcast` 안전장치 (200캡·서버검증·멱등해시·dropped 표기)

**Files:**

- Modify: `app/actions/admin-broadcast.ts` (`enqueueIndividualBroadcast`, ~277-371)
- Test: `__tests__/app/actions/admin-broadcast-enqueue.test.ts` (기존 파일에 케이스 추가)

> 기존 테스트는 suppression 제외를 검증한다. 여기에 200캡·무효제외·멱등해시 케이스를 추가하고 본문을 보강한다.

- [ ] **Step 1: 실패 테스트 추가** — `__tests__/app/actions/admin-broadcast-enqueue.test.ts`의 `describe('enqueueIndividualBroadcast', ...)`에 추가:

```ts
it('200명을 초과하면 거부한다', async () => {
  const many = Array.from({ length: 201 }, (_, i) => ({ email: `u${i}@x.com`, name: null }));
  const result = await enqueueIndividualBroadcast({
    recipients: many,
    subject: '안내',
    bodyMd: '본문',
    isAdvertisement: false,
  });
  expect(result.error).toBe(true);
  expect(result.message).toContain('200');
});

it('형식이 잘못된 주소는 제외하고 dropped 수를 메시지에 포함한다', async () => {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'email_suppressions') return createSupabaseQueryMock({ data: [], error: null });
    if (table === 'email_broadcasts') {
      emailBroadcastsCalls += 1;
      return createSupabaseQueryMock({
        data: emailBroadcastsCalls === 1 ? null : { id: 'bc-1' },
        error: null,
      }) as never;
    }
    if (table === 'email_broadcast_recipients') {
      return {
        insert: (rows: unknown[]) => {
          insertedRecipients.push(...rows);
          return Promise.resolve({ error: null });
        },
      } as never;
    }
    return createSupabaseQueryMock({ data: [], error: null });
  });

  const result = await enqueueIndividualBroadcast({
    recipients: [
      { email: 'ok@x.com', name: null },
      { email: 'not-an-email', name: null },
    ],
    subject: '안내',
    bodyMd: '본문',
    isAdvertisement: false,
  });
  expect(result.error).toBeFalsy();
  expect(insertedRecipients).toHaveLength(1);
  expect((insertedRecipients[0] as { email: string }).email).toBe('ok@x.com');
  expect(result.message).toContain('1명'); // 무효 1명 제외
});
```

(기존 파일 상단에 이미 `let emailBroadcastsCalls = 0; const insertedRecipients: unknown[] = [];` 와 `beforeEach` 리셋이 있다 — 없으면 추가. `mockFrom`/`jest.mock('@/lib/auth/guards', ...)`/`jest.mock('@/app/actions/activity-log-writer', ...)`도 기존 파일에 존재.)

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/app/actions/admin-broadcast-enqueue.test.ts` → 새 케이스 FAIL.

- [ ] **Step 3: import + 상수 추가** — `app/actions/admin-broadcast.ts` 상단 import에 `isValidEmail` 추가:

```ts
import { validateUrl, validateTextLength, isValidEmail } from '@/lib/utils/input-validation';
```

그리고 `enqueueIndividualBroadcast` 함수 위에 상수 추가:

```ts
export const MAX_INDIVIDUAL_RECIPIENTS = 200;
```

- [ ] **Step 4: 본문 보강** — `enqueueIndividualBroadcast` 내부를 다음과 같이 수정:

(a) `if (recipients.length === 0) ...` 다음 줄에 200캡(입력 기준 빠른 차단) 추가:

```ts
if (recipients.length > MAX_INDIVIDUAL_RECIPIENTS)
  return { message: `운영 발송은 한 번에 ${MAX_INDIVIDUAL_RECIPIENTS}명까지입니다.`, error: true };
```

(b) suppression+dedup 루프(`for (const r of recipients) {...}`)를 무효 형식 제외 + dropped 카운트로 교체:

```ts
let droppedSuppressed = 0;
let droppedInvalid = 0;
const seen = new Set<string>();
const rows: Array<{ email: string; name: string | null; locale: string; status: string }> = [];
for (const r of recipients) {
  const email = r.email.toLowerCase().trim();
  if (!email || seen.has(email)) continue;
  if (!isValidEmail(email)) {
    droppedInvalid += 1;
    continue;
  }
  seen.add(email);
  if (suppressed.has(hashEmail(email))) {
    droppedSuppressed += 1;
    continue;
  }
  rows.push({ email, name: r.name, locale: 'ko', status: 'pending' });
}
if (rows.length === 0)
  return { message: '발송 가능한 수신자가 없습니다. (전원 수신거부 또는 무효 주소)', error: true };
```

(c) 멱등 가드에 수신자 셋 해시 추가 — `const fiveMinAgo = ...` 바로 위에:

```ts
const recipientHash = hashEmail([...rows.map((r) => r.email)].sort().join(','));
```

그리고 멱등 쿼리에 `.eq('audience_filter->>recipient_hash', recipientHash)`를 `.eq('subject', subject)` 다음에 추가:

```ts
    .eq('subject', subject)
    .eq('audience_filter->>recipient_hash', recipientHash)
```

(d) INSERT의 `audience_filter`에 해시 저장:

```ts
      audience_filter: { mode: 'individual', recipient_hash: recipientHash } as Json,
```

(e) 성공 반환 메시지에 dropped 표기 — 함수 끝의 `return { message: \`${rows.length}명에게 발송 예약되었습니다.\`, ... }`를:

```ts
const dropped = droppedSuppressed + droppedInvalid;
const droppedNote = dropped > 0 ? ` (수신거부·무효 ${dropped}명 제외)` : '';
return {
  message: `${rows.length}명에게 발송 예약되었습니다.${droppedNote}`,
  broadcastId: broadcast.id,
};
```

(기존 logAdminAction 호출은 그대로 두되, details에 `dropped`를 추가해도 됨.)

- [ ] **Step 5: 통과 + 회귀** — `npx jest __tests__/app/actions/admin-broadcast-enqueue.test.ts && npm run type-check` → PASS(기존 suppression 케이스 포함). 무효 케이스 메시지에 "1명" 포함, 200캡 케이스 거부 확인.

- [ ] **Step 6: 커밋**

```bash
git add app/actions/admin-broadcast.ts __tests__/app/actions/admin-broadcast-enqueue.test.ts
git commit -m "feat(email): 개별발송 200캡·서버 이메일검증·멱등 수신자해시·제외 표기

요약: enqueueIndividualBroadcast에 200명 캡, 무효주소 제외, 멱등 가드 수신자셋 해시, 수신거부·무효 제외 수 메시지 추가"
```

---

## Task 4: `resolverFor` 헬퍼 + `listAudienceRecipients` 액션

**Files:**

- Create: `lib/email/audiences/resolver-for.ts`
- Modify: `app/actions/admin-broadcast.ts` (`listAudienceRecipients` 추가)
- Test: `__tests__/lib/email/audiences/resolver-for.test.ts`

- [ ] **Step 1: 실패 테스트 작성** — create `__tests__/lib/email/audiences/resolver-for.test.ts`:

```ts
import { resolverFor } from '@/lib/email/audiences/resolver-for';
import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import { PetitionAudienceResolver } from '@/lib/email/audiences/petition';
import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';
import { ArtworkBuyerAudienceResolver } from '@/lib/email/audiences/artwork-buyer';

describe('resolverFor', () => {
  it('source별 올바른 resolver 인스턴스를 반환한다', () => {
    expect(resolverFor('member', {})).toBeInstanceOf(MemberAudienceResolver);
    expect(resolverFor('customer', {})).toBeInstanceOf(CustomerAudienceResolver);
    expect(resolverFor('petition', { petitionSlug: 'oh-yoon' })).toBeInstanceOf(
      PetitionAudienceResolver
    );
    expect(resolverFor('artwork-buyer', { artworkId: 'a-1' })).toBeInstanceOf(
      ArtworkBuyerAudienceResolver
    );
  });
  it('petition인데 slug 없으면 throw', () => {
    expect(() => resolverFor('petition', {})).toThrow();
  });
  it('artwork-buyer인데 artworkId 없으면 throw', () => {
    expect(() => resolverFor('artwork-buyer', {})).toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/lib/email/audiences/resolver-for.test.ts` → FAIL (모듈 없음).

- [ ] **Step 3: 구현** — create `lib/email/audiences/resolver-for.ts`:

```ts
import { MemberAudienceResolver } from './member';
import { CustomerAudienceResolver } from './customer';
import { PetitionAudienceResolver } from './petition';
import { ArtworkBuyerAudienceResolver } from './artwork-buyer';
import type { AudienceResolver } from './types';

export type AudienceSource = 'member' | 'customer' | 'petition' | 'artwork-buyer';

// 발송 대상 source → resolver 인스턴스. 잘못된 입력 시 throw.
export function resolverFor(
  source: AudienceSource,
  filter: { subset?: 'all' | 'artist' | 'exhibitor'; petitionSlug?: string; artworkId?: string }
): AudienceResolver {
  switch (source) {
    case 'member':
      return new MemberAudienceResolver();
    case 'customer':
      return new CustomerAudienceResolver();
    case 'petition':
      if (!filter.petitionSlug) throw new Error('청원 발송은 청원 선택이 필요합니다.');
      return new PetitionAudienceResolver(filter.petitionSlug);
    case 'artwork-buyer':
      if (!filter.artworkId) throw new Error('작품 구매자 발송은 작품 ID가 필요합니다.');
      return new ArtworkBuyerAudienceResolver(filter.artworkId);
    default:
      throw new Error(`지원하지 않는 발송 대상: ${source}`);
  }
}
```

- [ ] **Step 4: `listAudienceRecipients` 추가** — `app/actions/admin-broadcast.ts` 끝에 추가(상단 import에 `resolverFor, type AudienceSource` 추가):

```ts
import { resolverFor, type AudienceSource } from '@/lib/email/audiences/resolver-for';
```

```ts
// 운영 발송 '목록 브라우즈'용 — 그룹의 수신자 행 목록을 페이지네이션해 반환.
// resolver가 이미 suppression·dedup·정규화를 처리하므로 그 결과를 {email,name}로 매핑.
export async function listAudienceRecipients(
  source: AudienceSource,
  filter: {
    subset?: 'all' | 'artist' | 'exhibitor';
    petitionSlug?: string;
    artworkId?: string;
  } = {},
  opts: { query?: string; page?: number; pageSize?: number } = {}
): Promise<{ recipients: { email: string; name: string | null }[]; total: number }> {
  await requireAdmin();

  let all;
  try {
    all = await resolverFor(source, filter).resolve(filter);
  } catch (err) {
    console.error('[list-audience-recipients] error:', err);
    return { recipients: [], total: 0 };
  }

  const q = (opts.query ?? '').trim().toLowerCase();
  const filtered = q
    ? all.filter((r) => r.email.includes(q) || (r.name ?? '').toLowerCase().includes(q))
    : all;

  const pageSize = opts.pageSize ?? 50;
  const page = Math.max(0, opts.page ?? 0);
  const start = page * pageSize;
  const recipients = filtered
    .slice(start, start + pageSize)
    .map((r) => ({ email: r.email, name: r.name }));

  return { recipients, total: filtered.length };
}
```

- [ ] **Step 5: 통과 + 타입체크** — `npx jest __tests__/lib/email/audiences/resolver-for.test.ts && npm run type-check` → PASS.

- [ ] **Step 6: 커밋**

```bash
git add lib/email/audiences/resolver-for.ts app/actions/admin-broadcast.ts __tests__/lib/email/audiences/resolver-for.test.ts
git commit -m "feat(email): resolverFor 헬퍼 + listAudienceRecipients (목록 브라우즈)

요약: source→resolver 매핑 헬퍼와, 그룹 수신자 목록을 페이지네이션·이름검색해 반환하는 액션"
```

---

## Task 5: `SelectedRecipients` 칩 컴포넌트 추출 + ContactSearch 칩 제거

**Files:**

- Create: `app/(portal)/admin/email/_components/SelectedRecipients.tsx`
- Modify: `app/(portal)/admin/email/_components/ContactSearch.tsx` (칩 블록 제거)
- Test: `__tests__/app/admin/email/SelectedRecipients.test.tsx`

> 세 빌더(검색/목록/직접)가 같은 selectedContacts를 공유하므로 칩은 부모에서 1회만 렌더한다. 칩을 ContactSearch 밖으로 추출한다.

- [ ] **Step 1: 실패 테스트 작성** — create `__tests__/app/admin/email/SelectedRecipients.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectedRecipients } from '@/app/(portal)/admin/email/_components/SelectedRecipients';

describe('SelectedRecipients', () => {
  it('담긴 수신자 수와 칩을 보여주고 제거를 호출한다', () => {
    const onRemove = jest.fn();
    render(
      <SelectedRecipients
        selected={[
          { email: 'a@x.com', name: '홍길동' },
          { email: 'b@y.com', name: null },
        ]}
        onRemove={onRemove}
      />
    );
    expect(screen.getByText(/담긴 수신자 2명/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'a@x.com 제거' }));
    expect(onRemove).toHaveBeenCalledWith('a@x.com');
  });
  it('비어 있으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(<SelectedRecipients selected={[]} onRemove={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/app/admin/email/SelectedRecipients.test.tsx` → FAIL (모듈 없음).

- [ ] **Step 3: 구현** — create `app/(portal)/admin/email/_components/SelectedRecipients.tsx`:

```tsx
'use client';

import type { SelectedContact } from './ContactSearch';

interface Props {
  selected: SelectedContact[];
  onRemove: (email: string) => void;
}

export function SelectedRecipients({ selected, onRemove }: Props) {
  if (selected.length === 0) return null;
  return (
    <div className="rounded-lg bg-canvas-strong p-3">
      <p className="mb-2 text-sm font-medium text-charcoal">담긴 수신자 {selected.length}명</p>
      <ul className="flex flex-wrap gap-2">
        {selected.map((s) => (
          <li
            key={s.email}
            className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs"
          >
            {s.name ?? s.email}
            <button
              type="button"
              onClick={() => onRemove(s.email)}
              aria-label={`${s.email} 제거`}
              className="text-danger-a11y"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: ContactSearch 칩 블록 제거** — `ContactSearch.tsx`에서 `{selected.length > 0 && ( <div className="rounded-lg bg-canvas-strong p-3"> ... </div> )}` 블록(담긴 수신자 칩 부분, 약 94-116행)을 **삭제**한다. `selected`/`onChange` props와 검색결과 "담김" disabled 로직(`selected.some(...)`)은 그대로 둔다. 파일 끝의 `</div>` 균형 확인.

- [ ] **Step 5: 통과 + 기존 ContactSearch 회귀** — `npx jest __tests__/app/admin/email/SelectedRecipients.test.tsx __tests__/app/admin/email/ContactSearch.test.tsx && npm run type-check` → PASS (ContactSearch 기존 2테스트 무손상 — 칩이 아닌 onChange/disabled를 검증하므로).

- [ ] **Step 6: 커밋**

```bash
git add "app/(portal)/admin/email/_components/SelectedRecipients.tsx" "app/(portal)/admin/email/_components/ContactSearch.tsx" __tests__/app/admin/email/SelectedRecipients.test.tsx
git commit -m "refactor(email): 담긴 수신자 칩을 SelectedRecipients로 추출

요약: 칩을 부모가 1회 렌더하도록 ContactSearch에서 분리(검색/목록/직접 빌더 공유)"
```

---

## Task 6: `ContactList` — 그룹 목록 브라우즈 + 체크박스

**Files:**

- Create: `app/(portal)/admin/email/_components/ContactList.tsx`
- Test: `__tests__/app/admin/email/ContactList.test.tsx`

- [ ] **Step 1: 실패 테스트 작성** — create `__tests__/app/admin/email/ContactList.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ContactList } from '@/app/(portal)/admin/email/_components/ContactList';
import { listAudienceRecipients, getPetitionOptions } from '@/app/actions/admin-broadcast';

jest.mock('@/app/actions/admin-broadcast', () => ({
  listAudienceRecipients: jest.fn(),
  getPetitionOptions: jest.fn(async () => [{ slug: 'oh-yoon', title: '오윤 청원' }]),
}));

describe('ContactList', () => {
  beforeEach(() => jest.clearAllMocks());

  it('그룹 행을 불러오고 체크하면 selected에 담는다', async () => {
    (listAudienceRecipients as jest.Mock).mockResolvedValue({
      recipients: [{ email: 'a@x.com', name: '작가A' }],
      total: 1,
    });
    const onChange = jest.fn();
    await act(async () => {
      render(<ContactList selected={[]} onChange={onChange} />);
    });
    fireEvent.click(screen.getByText('불러오기'));
    await waitFor(() => screen.getByText(/a@x.com/));
    fireEvent.click(screen.getByRole('checkbox', { name: /a@x.com/ }));
    expect(onChange).toHaveBeenCalledWith([{ email: 'a@x.com', name: '작가A' }]);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/app/admin/email/ContactList.test.tsx` → FAIL (모듈 없음).

- [ ] **Step 3: 구현** — create `app/(portal)/admin/email/_components/ContactList.tsx`:

```tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { listAudienceRecipients, getPetitionOptions } from '@/app/actions/admin-broadcast';
import type { AudienceSource } from '@/lib/email/audiences/resolver-for';
import type { SelectedContact } from './ContactSearch';

interface Props {
  selected: SelectedContact[];
  onChange: (next: SelectedContact[]) => void;
}

const SOURCES: { value: AudienceSource; label: string }[] = [
  { value: 'member', label: '작가·출품자' },
  { value: 'petition', label: '청원 서명자' },
  { value: 'customer', label: '고객(거래·동의)' },
];

const PAGE_SIZE = 50;

export function ContactList({ selected, onChange }: Props) {
  const [source, setSource] = useState<AudienceSource>('member');
  const [petitionSlug, setPetitionSlug] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<{ email: string; name: string | null }[]>([]);
  const [total, setTotal] = useState(0);
  const [petitions, setPetitions] = useState<{ slug: string; title: string }[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPetitionOptions().then(setPetitions);
  }, []);

  const load = (nextPage = page) => {
    startTransition(async () => {
      const r = await listAudienceRecipients(
        source,
        { petitionSlug: petitionSlug || undefined },
        { query, page: nextPage, pageSize: PAGE_SIZE }
      );
      setRows(r.recipients);
      setTotal(r.total);
      setPage(nextPage);
    });
  };

  const isSelected = (email: string) => selected.some((s) => s.email === email);
  const toggle = (row: { email: string; name: string | null }) => {
    if (isSelected(row.email)) onChange(selected.filter((s) => s.email !== row.email));
    else onChange([...selected, { email: row.email, name: row.name }]);
  };
  const addPage = () => {
    const merged = [...selected];
    for (const row of rows) if (!merged.some((s) => s.email === row.email)) merged.push(row);
    onChange(merged);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="그룹 선택"
          value={source}
          onChange={(e) => setSource(e.target.value as AudienceSource)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {source === 'petition' && (
          <select
            aria-label="청원 선택"
            value={petitionSlug}
            onChange={(e) => setPetitionSlug(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">청원을 선택하세요</option>
            {petitions.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
        )}
        <input
          aria-label="이름·이메일 필터"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름·이메일 필터"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => load(0)}
          disabled={isPending}
          className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? '불러오는 중…' : '불러오기'}
        </button>
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-charcoal-muted">
            <span>
              총 {total.toLocaleString('ko-KR')}명 중 {page * PAGE_SIZE + 1}–
              {page * PAGE_SIZE + rows.length}
            </span>
            <button
              type="button"
              onClick={addPage}
              className="text-primary underline underline-offset-2"
            >
              이 페이지 전체 담기
            </button>
          </div>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {rows.map((row) => (
              <li key={row.email} className="flex items-center gap-2 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  aria-label={`${row.name ?? '(이름없음)'} ${row.email}`}
                  checked={isSelected(row.email)}
                  onChange={() => toggle(row)}
                  className="rounded border-gray-300"
                />
                <span className="truncate">
                  <strong className="text-charcoal-deep">{row.name ?? '(이름없음)'}</strong>{' '}
                  <span className="text-charcoal-muted">{row.email}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={page === 0 || isPending}
              onClick={() => load(page - 1)}
              className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
            >
              ◀ 이전
            </button>
            <button
              type="button"
              disabled={(page + 1) * PAGE_SIZE >= total || isPending}
              onClick={() => load(page + 1)}
              className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
            >
              다음 ▶
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 통과 + 타입체크** — `npx jest __tests__/app/admin/email/ContactList.test.tsx && npm run type-check` → PASS.

- [ ] **Step 5: 커밋**

```bash
git add "app/(portal)/admin/email/_components/ContactList.tsx" __tests__/app/admin/email/ContactList.test.tsx
git commit -m "feat(email): 그룹 목록 브라우즈 ContactList (체크박스·페이지네이션)

요약: 작가/청원/고객 그룹 수신자를 페이지네이션·필터로 보고 체크해 담는 컴포넌트"
```

---

## Task 7: BroadcastForm — 운영 발송 모드 (3탭·비광고 강제·200캡·칩 통합)

**Files:**

- Modify: `app/(portal)/admin/email/_components/BroadcastForm.tsx`
- Test: `__tests__/app/admin/email/OperationalSend.test.tsx`

> 가장 통합적인 UI 태스크. 기존 `mode==='search'`(검색 발송)를 "운영 발송"으로 바꾸고, 그 안에 빌더 3탭(검색/목록/직접입력)을 넣고, **광고 토글을 제거(비광고 강제)**, 칩은 `SelectedRecipients`로 1회 렌더, 200캡 차단을 추가한다. 세그먼트 모드는 무변경.

- [ ] **Step 1: 실패 RTL 테스트 작성** — create `__tests__/app/admin/email/OperationalSend.test.tsx`:

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BroadcastForm } from '@/app/(portal)/admin/email/_components/BroadcastForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/app/actions/admin-broadcast', () => ({
  enqueueBroadcast: jest.fn(),
  enqueueIndividualBroadcast: jest.fn(async () => ({ message: '1명에게 발송 예약되었습니다.' })),
  sendTestEmail: jest.fn(),
  previewAudience: jest.fn(async () => ({ total: 0, breakdown: {} })),
  getPetitionOptions: jest.fn(async () => []),
  listAudienceRecipients: jest.fn(async () => ({ recipients: [], total: 0 })),
}));
jest.mock('@/app/actions/admin-contact-search', () => ({
  searchContacts: jest.fn(async () => ({ results: [], truncated: false })),
}));

describe('BroadcastForm 운영 발송', () => {
  it('운영 발송 모드에 광고 토글이 없고 직접 입력 탭이 주소를 담는다', async () => {
    await act(async () => {
      render(<BroadcastForm />);
    });
    fireEvent.click(screen.getByRole('button', { name: '운영 발송' }));
    // 광고 토글 부재
    expect(screen.queryByText(/광고성 메일/)).not.toBeInTheDocument();
    // 직접 입력 탭
    fireEvent.click(screen.getByRole('button', { name: '직접 입력' }));
    fireEvent.change(screen.getByLabelText('이메일 직접 입력'), {
      target: { value: 'a@x.com, bad-addr, b@y.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '주소 추가' }));
    expect(screen.getByText(/담긴 수신자 2명/)).toBeInTheDocument();
    expect(screen.getByText(/무효 1건/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx jest __tests__/app/admin/email/OperationalSend.test.tsx` → FAIL.

- [ ] **Step 3: BroadcastForm 수정** — 다음을 적용:

(a) import 추가:

```ts
import { ContactList } from './ContactList';
import { SelectedRecipients } from './SelectedRecipients';
import { parseEmailList } from '@/lib/email/parse-email-list';
```

(b) `searchAdvertising` 상태 제거(`const [searchAdvertising, setSearchAdvertising] = useState(false);` 삭제). 빌더 탭 + 직접입력 상태 추가:

```ts
const [builder, setBuilder] = useState<'search' | 'list' | 'paste'>('search');
const [pasteRaw, setPasteRaw] = useState('');
const [pasteInvalid, setPasteInvalid] = useState(0);
```

(c) `applyTemplate`의 individual 분기에서 `setSearchAdvertising(t.isAdvertisement);`를 제거(개별 템플릿은 모두 비광고):

```ts
    if (t.channel === 'individual') {
      setMode('search');
    } else {
```

(d) `handleSubmit`의 `mode === 'search'` 분기에서 `isAdvertisement: searchAdvertising`을 `isAdvertisement: false`로 바꾸고, 200캡 차단을 분기 처음에 추가:

```ts
if (mode === 'search') {
  if (selectedContacts.length > 200) {
    setError('운영 발송은 한 번에 200명까지입니다. 대량 발송은 추후 마케팅 발송으로 지원됩니다.');
    return;
  }
  const result = await enqueueIndividualBroadcast({
    recipients: selectedContacts,
    subject,
    bodyMd,
    ctaLabel: ctaLabel || undefined,
    ctaUrl: ctaUrl || undefined,
    isAdvertisement: false,
  });
  // ...(기존 성공/실패 처리 동일, setSelectedContacts([]) 포함)
  // 성공 시 추가로: setPasteRaw(''); setPasteInvalid(0);
  return;
}
```

(e) 모드 토글 버튼 라벨 "검색 발송" → "운영 발송":

```tsx
          운영 발송
```

(f) `mode === 'search'` 렌더 블록 전체를 교체(광고 토글 제거 + 빌더 3탭 + 칩):

```tsx
{
  /* 운영 발송 (mode === 'search') */
}
{
  mode === 'search' && (
    <div className="space-y-3">
      <fieldset className="flex gap-2 rounded-lg border border-gray-200 p-1">
        <legend className="sr-only">수신자 만들기 방법</legend>
        {(
          [
            ['search', '검색'],
            ['list', '목록 브라우즈'],
            ['paste', '직접 입력'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setBuilder(key)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              builder === key
                ? 'bg-primary-strong text-white'
                : 'text-charcoal hover:bg-canvas-strong'
            }`}
          >
            {label}
          </button>
        ))}
      </fieldset>

      {builder === 'search' && (
        <ContactSearch selected={selectedContacts} onChange={setSelectedContacts} />
      )}
      {builder === 'list' && (
        <ContactList selected={selectedContacts} onChange={setSelectedContacts} />
      )}
      {builder === 'paste' && (
        <div className="space-y-2">
          <textarea
            aria-label="이메일 직접 입력"
            value={pasteRaw}
            onChange={(e) => setPasteRaw(e.target.value)}
            rows={4}
            placeholder="이메일을 쉼표·줄바꿈으로 구분 (예: a@x.com, 홍길동 <b@y.com>)"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const { valid, invalid } = parseEmailList(pasteRaw);
                const merged = [...selectedContacts];
                for (const v of valid) if (!merged.some((s) => s.email === v.email)) merged.push(v);
                setSelectedContacts(merged);
                setPasteInvalid(invalid.length);
                setPasteRaw('');
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-charcoal hover:bg-canvas-strong"
            >
              주소 추가
            </button>
            {pasteInvalid > 0 && (
              <span className="text-xs text-danger-a11y">무효 {pasteInvalid}건은 제외됨</span>
            )}
          </div>
        </div>
      )}

      <SelectedRecipients
        selected={selectedContacts}
        onRemove={(email) => setSelectedContacts(selectedContacts.filter((s) => s.email !== email))}
      />
      {selectedContacts.length > 200 && (
        <p className="text-sm text-danger-a11y">
          운영 발송은 한 번에 200명까지입니다. (현재 {selectedContacts.length}명) 대량은 추후 마케팅
          발송으로.
        </p>
      )}
    </div>
  );
}
```

(g) 제목 라벨의 광고 힌트에서 search 분기 제거 — `{(segment.channel === 'customer' || (mode === 'search' && searchAdvertising)) && (` 를 `{segment.channel === 'customer' && mode === 'segment' && (` 로 변경.

(h) 제출 버튼 disabled에 200캡 추가:

```tsx
          disabled={isPending || (mode === 'search' && (selectedContacts.length === 0 || selectedContacts.length > 200))}
```

(i) `sendTestEmail`의 `isAdvertisement`에서 search 분기를 false로: `isAdvertisement: mode === 'segment' ? segment.advertising : false`.

- [ ] **Step 4: 통과 + 회귀** — `npx jest __tests__/app/admin/email && npm run type-check` → PASS (OperationalSend + 기존 BroadcastForm/ContactSearch/ContactList/SelectedRecipients). 기존 `BroadcastForm.test.tsx`(템플릿 채움, customer 템플릿)는 segment 모드라 무손상.

- [ ] **Step 5: 커밋**

```bash
git add "app/(portal)/admin/email/_components/BroadcastForm.tsx" __tests__/app/admin/email/OperationalSend.test.tsx
git commit -m "feat(email): 운영 발송 모드 — 빌더 3탭·비광고 강제·200캡

요약: 검색/목록/직접입력으로 수신자 구성, 광고 토글 제거(비광고 강제), 200명 캡, 칩 1회 렌더"
```

---

## Task 8: 통합 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 검증**

```bash
npm test -- --watchAll=false && npm run type-check && npm run lint && npm run build
```

Expected: 전부 통과(0 errors). 신규 테스트 포함.

- [ ] **Step 2: 수동 확인 (dev)** — `npm run dev` → admin → `/admin/email` → "운영 발송":
  - 검색/목록/직접입력 탭 전환, 각 방식으로 수신자 담기, 칩 제거.
  - 직접 입력 무효 주소 표시, 200명 초과 시 발송 차단.
  - 광고 토글이 없는지(비광고 전제), 세그먼트 모드는 그대로인지.
  - "나에게 테스트 발송"으로 본인 수신 확인(RESEND env 있는 환경).

- [ ] **Step 3: 필요 시 마무리 커밋** (없으면 생략).

---

## Self-Review (작성자 체크)

- **스펙 커버리지**: 임의 주소 입력(Task 2·7) ✓ / 목록 브라우즈·멀티셀렉트(Task 4·6·7) ✓ / 비광고 강제(Task 7) ✓ / 200캡(Task 3 서버 + Task 7 클라) ✓ / 서버 이메일 검증(Task 1·3) ✓ / 멱등 수신자해시(Task 3) ✓ / suppression 자동제외·표기(Task 3) ✓ / 칩 공통화(Task 5) ✓ / resolverFor 단일화(Task 4) ✓.
- **타입 일관성**: `SelectedContact`(ContactSearch), `AudienceSource`(resolver-for), `parseEmailList`/`isValidEmail`/`EMAIL_REGEX`, `MAX_INDIVIDUAL_RECIPIENTS`, `listAudienceRecipients` 시그니처가 공유 계약과 태스크 전반 일치.
- **비범위 확인**: 마케팅(광고·서브도메인·동의수집·워밍업·RFC8058·대량·자동중단)은 본 플랜에 없음 — 2차 스펙.
- **리스크**: 멱등 가드 jsonb 필터(`audience_filter->>recipient_hash`)는 proxy mock이 무시하므로 기존 테스트 무영향; 실DB에서 동작 확인은 Task 8 수동 단계. resolverFor는 신규 코드에서만 사용(기존 enqueueBroadcast/previewAudience 미변경 — 회귀 위험 최소).
