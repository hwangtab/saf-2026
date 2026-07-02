# 월간 아트 뉴스레터 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** admin이 블록 조립식 에디터로 월간 뉴스레터를 만들어 기존 브로드캐스트 파이프라인으로 발송하고, 발송된 호를 공개 웹 아카이브(`/newsletter/[slug]`)로 노출한다.

**Architecture:** 뉴스레터는 `newsletters` 테이블(블록 JSONB·호수·상태)로 1급 관리. 발송 시 채널별 `email_broadcasts` 행(`newsletter_id` FK)을 생성해 기존 1분 cron 디스패처가 처리하되, 렌더만 `NewsletterEmail` 템플릿으로 분기. 같은 블록 데이터를 웹 아카이브가 병렬 렌더.

**Tech Stack:** Next.js 16 App Router, Supabase(RLS·service role), React Email(@react-email/components), Resend batch API, TipTap(기존 RichEmailEditor), next-intl(공개 페이지), Jest.

**Spec:** `docs/superpowers/specs/2026-07-02-monthly-newsletter-design.md`

## Global Constraints

- **admin 포털(`app/(portal)/admin/**`, `app/actions/admin-\*.ts`)은 한국어 리터럴 직접 작성\*\* — next-intl 키 추가 금지 (CLAUDE.md i18n 비-스코프).
- **공개 라우트(`app/[locale]/**`)는 next-intl 필수.** `setRequestLocale(locale)`호출 후`getTranslations({ locale, namespace })`에 **locale 명시 전달** (force-static 전파 버그 회피 — 프로젝트 메모리).
- **색상**: Tailwind 클래스는 브랜드 토큰만(`primary-*`, `charcoal-*`, `gray-*`, `canvas-*`, `gallery-*`, `sun-*`). 런타임 hex(이메일 인라인 스타일)는 반드시 `import { BRAND_COLORS } from '@/lib/colors'` 참조 — hex 리터럴 금지.
- **`bg-primary` + 흰 작은 텍스트 금지** — 버튼은 `<Button variant="primary">` 또는 `bg-primary-strong`(`BRAND_COLORS.primary.strong = '#0E4ECF'`).
- **이미지**: 웹 컴포넌트는 `SafeImage`(`@/components/common/SafeImage`)만. `next/image` 직접 import 금지. 이메일은 `<Img>`(@react-email) + 절대 URL.
- **TypeScript strict** — `as any`/`@ts-ignore` 금지.
- **Migration**: `supabase/migrations/`에 작성. **production 적용은 사용자 컨펌 후** `supabase db query --linked -f <파일>` 단건 실행 (`db push` 금지 — pending 다건 위험). 적용 후 `supabase gen types typescript --linked > types/supabase.ts`로 타입 재생성.
- **커밋**: `type(scope): subject` + 본문에 `요약:` 줄 필수 + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **비-hero 공개 페이지**: 루트에 `HEADER_SAFE_TOP_PADDING`(`lib/header-safe-padding.ts`) + 푸터 위 `SAWTOOTH_TOP_SAFE_PADDING`(`components/ui/SawtoothDivider.tsx`). `__tests__/lib/page-header-clearance.test.ts`가 자동 스캔하므로 누락 시 테스트 실패.
- **작업 브랜치**: `feat/monthly-newsletter` (main에서 분기).

## 스펙 대비 확정 편차 (구현 중 발견한 사실 기반, 이미 설계 의도와 합치)

1. **Zod 미사용**: 메인 앱에 zod 의존성이 없음(video/ 전용). `lib/newsletter/blocks.ts`에 손수 작성한 런타임 파서로 동일 보장 제공 — 새 의존성 추가하지 않음.
2. **`newsletters.broadcast_id` 컬럼 제거**: 채널 다중 선택(customer+member) 시 broadcast가 1:N이므로 역방향 FK(`email_broadcasts.newsletter_id`)만 사용. 대신 `newsletters.audience_channels text[]` 컬럼 추가.
3. **웹 아카이브 revalidate**: 명시적 `revalidatePath` 대신 funding 페이지와 동일한 `force-static + revalidate = 60` ISR — 발송 후 최대 60초 내 자동 반영.
4. **블록 optional 필드는 전부 `string` 필수 + `''` = 없음** — JSONB 왕복·파서 단순화. 렌더러는 truthy 검사.
5. **디스패처 분기 자동 테스트 없음**: route handler 단위 테스트 인프라가 코드베이스에 없어(기존 broadcast-dispatch도 무테스트) 스펙의 "디스패처 분기 테스트"는 type-check + 기존 이메일 렌더 테스트 + Task 11 수동 스모크로 대체.
6. **이미지 URL 검증 시점**: 즉시 발송·예약 시점(admin 개시 순간)에 HEAD 검증. 예약 후 발송 도래(cron) 시점은 블록 파싱 검증만 — scheduled 상태는 편집 잠금이라 이미지 URL이 변할 수 없음.

## File Structure

| 파일                                                                  | 역할                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `supabase/migrations/20260702160000_newsletters.sql`                  | newsletters 테이블 + email_broadcasts.newsletter_id (신규)                      |
| `lib/newsletter/blocks.ts`                                            | 블록 타입 + 런타임 파서 + blocksToText (단일 출처, 신규)                        |
| `lib/newsletter/channels.ts`                                          | 발송 채널 타입·라벨 — 클라이언트 안전 (서버 import 없음, 신규)                  |
| `lib/newsletter/enqueue.ts`                                           | 채널별 수신자 resolve + 교차 dedup + broadcasts 생성 (신규)                     |
| `emails/_components/legal-footer.tsx`                                 | (광고) 발송자 정보 + 수신거부 링크 공용 컴포넌트 (broadcast.tsx에서 추출, 신규) |
| `emails/broadcast.tsx`                                                | legal-footer 사용으로 리팩터 (수정)                                             |
| `emails/newsletter.tsx`                                               | NewsletterEmail 템플릿 (신규)                                                   |
| `app/actions/admin-newsletter.ts`                                     | CRUD·스냅샷·미리보기·테스트·발송·예약 server actions (신규)                     |
| `app/api/internal/broadcast-dispatch/route.ts`                        | 예약 claim + 렌더 분기 + finalize 훅 (수정)                                     |
| `app/(portal)/admin/_components/admin-nav-items.ts`                   | 도구 그룹에 뉴스레터 항목 (수정)                                                |
| `app/(portal)/admin/newsletter/page.tsx`                              | 목록 페이지 (신규)                                                              |
| `app/(portal)/admin/newsletter/_components/NewsletterListActions.tsx` | 생성·복제 버튼 (신규)                                                           |
| `app/(portal)/admin/newsletter/[id]/page.tsx`                         | 편집기 페이지 셸 (신규)                                                         |
| `app/(portal)/admin/newsletter/[id]/_components/NewsletterEditor.tsx` | 편집기 본체(메타+블록 리스트+저장) (신규)                                       |
| `app/(portal)/admin/newsletter/[id]/_components/block-editors.tsx`    | 블록 유형별 편집 폼 (신규)                                                      |
| `app/(portal)/admin/newsletter/[id]/_components/PreviewPane.tsx`      | 디바운스 서버 렌더 iframe 미리보기 (신규)                                       |
| `app/(portal)/admin/newsletter/[id]/_components/SendPanel.tsx`        | 채널·수신자수·테스트·즉시/예약 발송 (신규)                                      |
| `app/[locale]/newsletter/page.tsx`                                    | 공개 발행호 목록 (신규)                                                         |
| `app/[locale]/newsletter/[slug]/page.tsx`                             | 공개 개별 호 (신규)                                                             |
| `app/[locale]/newsletter/_components/NewsletterBlocksView.tsx`        | 블록 → 웹 렌더러 (신규)                                                         |
| `messages/ko.json`, `messages/en.json`                                | `newsletter` 네임스페이스 (수정)                                                |
| `__tests__/lib/newsletter-blocks.test.ts`                             | 파서·텍스트 변환 테스트 (신규)                                                  |
| `__tests__/lib/newsletter-enqueue.test.ts`                            | 교차 채널 dedup 테스트 (신규)                                                   |
| `__tests__/emails/newsletter.test.tsx`                                | 이메일 렌더 테스트 (신규)                                                       |

---

### Task 0: 브랜치 생성

- [ ] **Step 1: main 최신화 후 브랜치 분기**

```bash
git checkout main && git pull && git checkout -b feat/monthly-newsletter
```

---

### Task 1: DB 마이그레이션 — newsletters 테이블

**Files:**

- Create: `supabase/migrations/20260702160000_newsletters.sql`
- Regenerate: `types/supabase.ts`

**Interfaces:**

- Produces: `public.newsletters` 테이블 (status: `draft|scheduled|sending|sent`), `email_broadcasts.newsletter_id uuid NULL`. 이후 모든 태스크가 이 스키마를 전제.

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- supabase/migrations/20260702160000_newsletters.sql
-- 월간 뉴스레터: 블록 JSONB 콘텐츠 + 발송 수명주기. 발송 자체는 email_broadcasts 파이프라인 재사용
-- (email_broadcasts.newsletter_id 역참조 1:N — 채널별 1 broadcast).
CREATE TABLE IF NOT EXISTS public.newsletters (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_no          int         NOT NULL UNIQUE,
  slug              text        NOT NULL UNIQUE,
  title             text        NOT NULL DEFAULT '',
  preheader         text        NOT NULL DEFAULT '',
  blocks            jsonb       NOT NULL DEFAULT '[]',
  status            text        NOT NULL DEFAULT 'draft',
  audience_channels text[]      NOT NULL DEFAULT '{customer}',
  scheduled_at      timestamptz,
  sent_at           timestamptz,
  is_advertisement  boolean     NOT NULL DEFAULT true,
  created_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletters_status_check
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent')),
  CONSTRAINT newsletters_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$')
);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

-- 공개 웹 아카이브는 service role(SSG/ISR)로 조회하므로 anon 정책 불필요 — admin/service만.
CREATE POLICY "Admin full access on newsletters"
  ON public.newsletters FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on newsletters"
  ON public.newsletters FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 예약 도래분 스캔용 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_newsletters_scheduled
  ON public.newsletters (scheduled_at)
  WHERE status = 'scheduled';

-- 발송 연결: 뉴스레터 1 : 채널별 broadcast N
ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS newsletter_id uuid REFERENCES public.newsletters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_newsletter
  ON public.email_broadcasts (newsletter_id)
  WHERE newsletter_id IS NOT NULL;
```

- [ ] **Step 2: 🛑 체크포인트 — 사용자 컨펌 후 production 적용**

사용자에게 적용 승인을 받은 뒤 (DDL은 위험 작업 — CLAUDE.md 정책):

```bash
supabase db query --linked -f supabase/migrations/20260702160000_newsletters.sql
```

Expected: 에러 없이 완료. 검증:

```bash
supabase db query --linked "select column_name from information_schema.columns where table_name='newsletters' order by 1"
```

Expected: `audience_channels, blocks, created_at, created_by, id, is_advertisement, issue_no, preheader, scheduled_at, sent_at, slug, status, title, updated_at`

- [ ] **Step 3: 타입 재생성 + type-check**

```bash
supabase gen types typescript --linked > types/supabase.ts && npm run type-check
```

Expected: type-check 통과 (newsletters Row/Insert/Update 타입 생성됨, email_broadcasts에 newsletter_id 추가됨).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260702160000_newsletters.sql types/supabase.ts
git commit -m "feat(newsletter): newsletters 테이블·email_broadcasts.newsletter_id 마이그레이션

요약: 월간 뉴스레터 콘텐츠 테이블과 발송 연결 컬럼 추가

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 블록 스키마 단일 출처 — lib/newsletter/blocks.ts

**Files:**

- Create: `lib/newsletter/blocks.ts`
- Test: `__tests__/lib/newsletter-blocks.test.ts`

**Interfaces:**

- Consumes: `htmlToEmailText(html: string): string` (`lib/email/rich-content.ts`)
- Produces:
  - `type NewsletterBlock = CoverBlock | TextBlock | ArtworkCardBlock | EventBannerBlock | ButtonBlock | DividerBlock` (각 블록 `id: string`, `type` 판별자, optional 없음 — 빈 값은 `''`)
  - `interface ArtworkSnapshot { title: string; artistName: string; imageUrl: string; description: string; price: string; url: string }`
  - `parseNewsletterBlocks(raw: unknown): NewsletterBlock[]` — 실패 시 `Error` throw
  - `blocksToText(blocks: NewsletterBlock[]): string`
  - `NEWSLETTER_BLOCK_LABELS: Record<NewsletterBlock['type'], string>` (편집기 한국어 라벨)

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// __tests__/lib/newsletter-blocks.test.ts
import { parseNewsletterBlocks, blocksToText } from '@/lib/newsletter/blocks';

const validBlocks = [
  { id: 'b1', type: 'cover', title: '7월의 씨앗페', subtitle: '이달의 작품과 소식', imageUrl: '' },
  { id: 'b2', type: 'text', html: '<p>안녕하세요, 씨앗페입니다.</p>' },
  {
    id: 'b3',
    type: 'artworkCard',
    artworkId: 'aw-1',
    showPrice: true,
    snapshot: {
      title: '가족',
      artistName: '오윤',
      imageUrl: 'https://example.supabase.co/storage/v1/object/public/artworks/a__card.webp',
      description: '따뜻한 시선의 판화',
      price: '₩5,000,000',
      url: 'https://www.saf2026.com/artworks/aw-1',
    },
  },
  {
    id: 'b4',
    type: 'eventBanner',
    title: '오윤 테라코타 기금마련전',
    dateText: '2026. 7. 15 — 7. 30',
    imageUrl: '',
    ctaLabel: '자세히 보기',
    ctaUrl: 'https://www.saf2026.com/funding/oh-yoon',
  },
  { id: 'b5', type: 'button', label: '전시 보러가기', url: 'https://www.saf2026.com/artworks' },
  { id: 'b6', type: 'divider' },
];

describe('parseNewsletterBlocks', () => {
  it('유효한 블록 배열을 그대로 파싱한다', () => {
    const blocks = parseNewsletterBlocks(validBlocks);
    expect(blocks).toHaveLength(6);
    expect(blocks[2]).toMatchObject({ type: 'artworkCard', showPrice: true });
  });

  it('배열이 아니면 throw', () => {
    expect(() => parseNewsletterBlocks({})).toThrow('배열');
  });

  it('id 누락 블록은 throw', () => {
    expect(() => parseNewsletterBlocks([{ type: 'divider' }])).toThrow('id');
  });

  it('알 수 없는 type은 throw', () => {
    expect(() => parseNewsletterBlocks([{ id: 'x', type: 'video' }])).toThrow('type');
  });

  it('button의 javascript: URL은 throw', () => {
    expect(() =>
      parseNewsletterBlocks([{ id: 'x', type: 'button', label: 'go', url: 'javascript:alert(1)' }])
    ).toThrow('http');
  });

  it('eventBanner의 ctaUrl 누락은 throw', () => {
    expect(() =>
      parseNewsletterBlocks([
        {
          id: 'x',
          type: 'eventBanner',
          title: 't',
          dateText: '',
          imageUrl: '',
          ctaLabel: 'go',
          ctaUrl: '',
        },
      ])
    ).toThrow('http');
  });

  it('artworkCard snapshot 필드 누락은 throw', () => {
    expect(() =>
      parseNewsletterBlocks([
        {
          id: 'x',
          type: 'artworkCard',
          artworkId: 'a',
          showPrice: false,
          snapshot: { title: 't' },
        },
      ])
    ).toThrow('snapshot');
  });
});

describe('blocksToText', () => {
  it('작품·이벤트·버튼 정보를 텍스트로 직렬화한다', () => {
    const text = blocksToText(parseNewsletterBlocks(validBlocks));
    expect(text).toContain('가족 — 오윤');
    expect(text).toContain('₩5,000,000');
    expect(text).toContain('https://www.saf2026.com/artworks/aw-1');
    expect(text).toContain('오윤 테라코타 기금마련전');
    expect(text).toContain('전시 보러가기: https://www.saf2026.com/artworks');
    expect(text).toContain('안녕하세요');
  });

  it('showPrice=false면 가격을 넣지 않는다', () => {
    const blocks = parseNewsletterBlocks([{ ...validBlocks[2], showPrice: false }]);
    expect(blocksToText(blocks)).not.toContain('₩5,000,000');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- __tests__/lib/newsletter-blocks.test.ts`
Expected: FAIL — `Cannot find module '@/lib/newsletter/blocks'`

- [ ] **Step 3: 구현**

```typescript
// lib/newsletter/blocks.ts
// 뉴스레터 블록 스키마 — 단일 출처.
// 편집기(admin)·이메일 템플릿(emails/newsletter.tsx)·웹 아카이브가 모두 이 타입을 소비한다.
// 메인 앱에 zod 의존성이 없어 손수 작성한 파서로 런타임 검증 (발송 직전 방어).
// optional 필드 없음 — 빈 값은 ''(JSONB 왕복·strict 타입 단순화). 렌더러는 truthy 검사.

import { htmlToEmailText } from '@/lib/email/rich-content';

export interface ArtworkSnapshot {
  title: string;
  artistName: string;
  imageUrl: string;
  description: string;
  price: string; // '' = 가격 정보 없음
  url: string; // 작품 상세 절대 URL
}

export interface CoverBlock {
  id: string;
  type: 'cover';
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface TextBlock {
  id: string;
  type: 'text';
  html: string; // TipTap 산출 — 저장 시 sanitizeRichEmailHtml 통과(액션 레이어 책임)
}

export interface ArtworkCardBlock {
  id: string;
  type: 'artworkCard';
  artworkId: string;
  showPrice: boolean;
  snapshot: ArtworkSnapshot; // 삽입 시점 복사 — 발송물 불변 원칙
}

export interface EventBannerBlock {
  id: string;
  type: 'eventBanner';
  title: string;
  dateText: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface ButtonBlock {
  id: string;
  type: 'button';
  label: string;
  url: string;
}

export interface DividerBlock {
  id: string;
  type: 'divider';
}

export type NewsletterBlock =
  | CoverBlock
  | TextBlock
  | ArtworkCardBlock
  | EventBannerBlock
  | ButtonBlock
  | DividerBlock;

export const NEWSLETTER_BLOCK_LABELS: Record<NewsletterBlock['type'], string> = {
  cover: '커버',
  text: '텍스트',
  artworkCard: '작품 카드',
  eventBanner: '이벤트 배너',
  button: 'CTA 버튼',
  divider: '구분선',
};

const isStr = (v: unknown): v is string => typeof v === 'string';
const isHttpUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);
// 빈 값 허용 이미지 URL — 값이 있으면 http(s)여야 한다
const isOptionalHttpUrl = (v: unknown): v is string => v === '' || isHttpUrl(v);

function fail(index: number, reason: string): never {
  throw new Error(`블록 ${index}: ${reason}`);
}

function parseBlock(raw: unknown, index: number): NewsletterBlock {
  if (typeof raw !== 'object' || raw === null) fail(index, '객체가 아닙니다.');
  const o = raw as Record<string, unknown>;
  if (!isStr(o.id) || !o.id) fail(index, 'id가 없습니다.');
  const id = o.id;

  switch (o.type) {
    case 'cover': {
      if (!isStr(o.title) || !isStr(o.subtitle)) fail(index, 'cover 필드가 잘못됐습니다.');
      if (!isOptionalHttpUrl(o.imageUrl)) fail(index, 'cover imageUrl은 http(s)여야 합니다.');
      return { id, type: 'cover', title: o.title, subtitle: o.subtitle, imageUrl: o.imageUrl };
    }
    case 'text': {
      if (!isStr(o.html)) fail(index, 'text html이 없습니다.');
      return { id, type: 'text', html: o.html };
    }
    case 'artworkCard': {
      if (!isStr(o.artworkId) || !o.artworkId) fail(index, 'artworkId가 없습니다.');
      if (typeof o.showPrice !== 'boolean') fail(index, 'showPrice가 없습니다.');
      const s = o.snapshot as Record<string, unknown> | null | undefined;
      if (
        typeof s !== 'object' ||
        s === null ||
        !isStr(s.title) ||
        !isStr(s.artistName) ||
        !isStr(s.description) ||
        !isStr(s.price) ||
        !isHttpUrl(s.imageUrl) ||
        !isHttpUrl(s.url)
      ) {
        fail(index, 'artworkCard snapshot 필드가 잘못됐습니다.');
      }
      return {
        id,
        type: 'artworkCard',
        artworkId: o.artworkId,
        showPrice: o.showPrice,
        snapshot: {
          title: s.title,
          artistName: s.artistName,
          imageUrl: s.imageUrl,
          description: s.description,
          price: s.price,
          url: s.url,
        },
      };
    }
    case 'eventBanner': {
      if (!isStr(o.title) || !isStr(o.dateText) || !isStr(o.ctaLabel)) {
        fail(index, 'eventBanner 필드가 잘못됐습니다.');
      }
      if (!isOptionalHttpUrl(o.imageUrl)) fail(index, 'eventBanner imageUrl은 http(s)여야 합니다.');
      if (!isHttpUrl(o.ctaUrl)) fail(index, 'eventBanner ctaUrl은 http(s)여야 합니다.');
      return {
        id,
        type: 'eventBanner',
        title: o.title,
        dateText: o.dateText,
        imageUrl: o.imageUrl,
        ctaLabel: o.ctaLabel,
        ctaUrl: o.ctaUrl,
      };
    }
    case 'button': {
      if (!isStr(o.label)) fail(index, 'button label이 없습니다.');
      if (!isHttpUrl(o.url)) fail(index, 'button url은 http(s)여야 합니다.');
      return { id, type: 'button', label: o.label, url: o.url };
    }
    case 'divider':
      return { id, type: 'divider' };
    default:
      fail(index, `알 수 없는 type '${String(o.type)}'`);
  }
}

// 실패 시 throw — 발송 직전 검증이 목적이므로 조용한 drop(콘텐츠 누락) 대신 전체 거부.
export function parseNewsletterBlocks(raw: unknown): NewsletterBlock[] {
  if (!Array.isArray(raw)) throw new Error('blocks는 배열이어야 합니다.');
  return raw.map((b, i) => parseBlock(b, i));
}

// 이메일 text/plain 버전 — email_broadcasts.body_text로 저장돼 기존 디스패처가 그대로 사용.
export function blocksToText(blocks: NewsletterBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'cover':
        parts.push([b.title, b.subtitle].filter(Boolean).join('\n'));
        break;
      case 'text':
        parts.push(htmlToEmailText(b.html));
        break;
      case 'artworkCard':
        parts.push(
          [
            `${b.snapshot.title} — ${b.snapshot.artistName}`,
            b.snapshot.description,
            b.showPrice && b.snapshot.price ? b.snapshot.price : '',
            b.snapshot.url,
          ]
            .filter(Boolean)
            .join('\n')
        );
        break;
      case 'eventBanner':
        parts.push([b.title, b.dateText, `${b.ctaLabel}: ${b.ctaUrl}`].filter(Boolean).join('\n'));
        break;
      case 'button':
        parts.push(`${b.label}: ${b.url}`);
        break;
      case 'divider':
        break;
    }
  }
  return parts.filter(Boolean).join('\n\n');
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- __tests__/lib/newsletter-blocks.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/newsletter/blocks.ts __tests__/lib/newsletter-blocks.test.ts
git commit -m "feat(newsletter): 블록 스키마 단일 출처 + 런타임 파서

요약: 뉴스레터 블록 6종 타입 정의와 발송 전 검증 파서 추가

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 이메일 템플릿 — legal footer 추출 + NewsletterEmail

**Files:**

- Create: `emails/_components/legal-footer.tsx`
- Modify: `emails/broadcast.tsx` (인라인 발송자 정보·수신거부 섹션을 추출 컴포넌트로 교체)
- Create: `emails/newsletter.tsx`
- Test: `__tests__/emails/newsletter.test.tsx` (+ 기존 `__tests__/emails/broadcast.test.tsx` 회귀 가드)

**Interfaces:**

- Consumes: `NewsletterBlock` (Task 2), `CONTACT` (`@/lib/constants`), `BRAND_COLORS` (`@/lib/colors`), `EmailLocale` (`emails/_components/i18n`)
- Produces:
  - `AdSenderInfo({ locale }: { locale?: EmailLocale })` — 정통망법 발송자 정보 박스
  - `UnsubscribeLink({ href, locale }: { href: string; locale?: EmailLocale })` — 수신거부 링크 섹션
  - `NewsletterEmail(props: NewsletterEmailProps)` default export, `NewsletterEmailProps { issueNo: number; title: string; preheader: string; blocks: NewsletterBlock[]; isAdvertisement: boolean; unsubscribeUrl: string; webUrl: string; locale?: EmailLocale }`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// __tests__/emails/newsletter.test.tsx
/**
 * @jest-environment node
 *
 * @react-email/render 의 내부 dynamic import("react-dom/server")가
 * Jest 기본 변환 환경에서 실패하므로 renderToStaticMarkup 동기 구현으로 모킹.
 * (__tests__/emails/broadcast.test.tsx와 동일 패턴)
 */
import * as ReactDOMServer from 'react-dom/server';
import * as React from 'react';

import { render } from '@react-email/render';
import NewsletterEmail from '@/emails/newsletter';
import type { NewsletterBlock } from '@/lib/newsletter/blocks';

jest.mock('@react-email/render', () => ({
  render: (element: React.ReactElement) =>
    Promise.resolve(ReactDOMServer.renderToStaticMarkup(element)),
}));

const blocks: NewsletterBlock[] = [
  { id: 'b1', type: 'cover', title: '7월의 씨앗페', subtitle: '이달의 작품', imageUrl: '' },
  { id: 'b2', type: 'text', html: '<p>안녕하세요, 씨앗페입니다.</p>' },
  {
    id: 'b3',
    type: 'artworkCard',
    artworkId: 'aw-1',
    showPrice: true,
    snapshot: {
      title: '가족',
      artistName: '오윤',
      imageUrl: 'https://example.supabase.co/storage/v1/object/public/artworks/a__card.webp',
      description: '따뜻한 시선의 판화',
      price: '₩5,000,000',
      url: 'https://www.saf2026.com/artworks/aw-1',
    },
  },
  { id: 'b4', type: 'button', label: '전시 보러가기', url: 'https://www.saf2026.com/artworks' },
];

const base = {
  issueNo: 7,
  title: '7월의 씨앗페',
  preheader: '이달의 작품과 소식을 전합니다',
  blocks,
  unsubscribeUrl: 'https://www.saf2026.com/api/email/unsubscribe?t=x',
  webUrl: 'https://www.saf2026.com/newsletter/2026-07',
};

describe('NewsletterEmail', () => {
  it('블록 콘텐츠(작품 카드·텍스트·버튼)를 렌더한다', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, { ...base, isAdvertisement: true })
    );
    expect(html).toContain('가족');
    expect(html).toContain('오윤');
    expect(html).toContain('₩5,000,000');
    expect(html).toContain('안녕하세요, 씨앗페입니다.');
    expect(html).toContain('전시 보러가기');
    expect(html).toContain('https://www.saf2026.com/artworks/aw-1');
  });

  it('제N호·웹에서 보기·수신거부 링크를 포함한다', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, { ...base, isAdvertisement: true })
    );
    expect(html).toContain('제7호');
    expect(html).toContain('https://www.saf2026.com/newsletter/2026-07');
    expect(html).toContain('https://www.saf2026.com/api/email/unsubscribe?t=x');
  });

  it('isAdvertisement=true면 발송사 정보를 포함한다', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, { ...base, isAdvertisement: true })
    );
    expect(html).toContain('발송사 정보');
  });

  it('isAdvertisement=false면 발송사 정보가 없다', async () => {
    const html = await render(
      React.createElement(NewsletterEmail, { ...base, isAdvertisement: false })
    );
    expect(html).not.toContain('발송사 정보');
  });

  it('showPrice=false면 가격을 렌더하지 않는다', async () => {
    const noPriceBlocks = blocks.map((b) =>
      b.type === 'artworkCard' ? { ...b, showPrice: false } : b
    );
    const html = await render(
      React.createElement(NewsletterEmail, {
        ...base,
        blocks: noPriceBlocks,
        isAdvertisement: false,
      })
    );
    expect(html).not.toContain('₩5,000,000');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- __tests__/emails/newsletter.test.tsx`
Expected: FAIL — `Cannot find module '@/emails/newsletter'`

- [ ] **Step 3: legal-footer 컴포넌트 추출**

`emails/broadcast.tsx`의 광고 발송자 정보 Section(82~124행)과 수신거부 Section(126~131행) + 관련 스타일(`adFooterBoxStyle`, `adFooterLabelText`, `adFooterTextStyle`, `unsubscribeSectionStyle`, `unsubscribeLinkStyle`)을 새 파일로 이동:

```tsx
// emails/_components/legal-footer.tsx
// 정통망법 §50 발송자 정보 + 수신거부 링크 — broadcast/newsletter 등 광고성 메일 공용.
// 법적 문구·조직 정보가 바뀔 때 한 곳만 수정하도록 추출.
import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';

import type { EmailLocale } from './i18n';
import { CONTACT } from '@/lib/constants';
import { BRAND_COLORS } from '@/lib/colors';

export function AdSenderInfo({ locale = 'ko' }: { locale?: EmailLocale }) {
  return (
    <Section style={adFooterBoxStyle}>
      <Text style={adFooterLabelText}>
        {locale === 'en' ? 'Advertiser Information' : '[광고] 발송사 정보'}
      </Text>
      <Text style={adFooterTextStyle}>
        {locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME}
      </Text>
      <Text style={adFooterTextStyle}>
        {locale === 'en' ? 'CEO: ' : '대표자: '}
        {locale === 'en' ? CONTACT.REPRESENTATIVE_NAME_EN : CONTACT.REPRESENTATIVE_NAME}
      </Text>
      <Text style={adFooterTextStyle}>
        {locale === 'en' ? 'Business Registration: ' : '사업자등록번호: '}
        {CONTACT.BUSINESS_REGISTRATION_NUMBER}
      </Text>
      {locale === 'en' ? (
        <>
          <Text style={adFooterTextStyle}>{CONTACT.MAIL_ORDER_REPORT_NUMBER_EN}</Text>
          <Text style={adFooterTextStyle}>{CONTACT.ADDRESS_EN}</Text>
        </>
      ) : (
        <>
          <Text style={adFooterTextStyle}>통신판매신고: {CONTACT.MAIL_ORDER_REPORT_NUMBER}</Text>
          <Text style={adFooterTextStyle}>
            {CONTACT.ADDRESS} ({CONTACT.POSTAL_CODE})
          </Text>
        </>
      )}
      <Text style={adFooterTextStyle}>
        {locale === 'en' ? 'Phone: ' : '전화: '}
        {CONTACT.PHONE} | {locale === 'en' ? 'Email: ' : '이메일: '}
        {CONTACT.EMAIL}
      </Text>
      <Text style={adFooterTextStyle}>
        {locale === 'en'
          ? 'You may unsubscribe from these advertising emails for free at any time using the link below.'
          : '본 광고 메일은 아래 링크를 통해 언제든지 무료로 수신거부할 수 있습니다.'}
      </Text>
    </Section>
  );
}

export function UnsubscribeLink({ href, locale = 'ko' }: { href: string; locale?: EmailLocale }) {
  return (
    <Section style={unsubscribeSectionStyle}>
      <Link href={href} style={unsubscribeLinkStyle}>
        {locale === 'en' ? 'Unsubscribe from this mailing list' : '이메일 수신거부 및 구독취소'}
      </Link>
    </Section>
  );
}

const adFooterBoxStyle: React.CSSProperties = {
  marginTop: '24px',
  marginBottom: '16px',
  padding: '12px 16px',
  background: BRAND_COLORS.canvas.DEFAULT,
  border: `1px solid ${BRAND_COLORS.gallery.hairline}`,
  borderRadius: '6px',
};

const adFooterLabelText: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '12px',
  fontWeight: 700,
  color: BRAND_COLORS.charcoal.deep,
};

const adFooterTextStyle: React.CSSProperties = {
  margin: '2px 0',
  fontSize: '11px',
  color: BRAND_COLORS.charcoal.soft,
  lineHeight: '1.5',
};

const unsubscribeSectionStyle: React.CSSProperties = {
  marginTop: '16px',
  textAlign: 'center',
};

const unsubscribeLinkStyle: React.CSSProperties = {
  fontSize: '12px',
  color: BRAND_COLORS.charcoal.muted,
  textDecoration: 'underline',
};
```

`emails/broadcast.tsx` 수정 — 인라인 두 섹션을 다음으로 교체하고, 이동한 5개 스타일 상수와 `unsubscribeText` 변수, 이제 안 쓰는 `Link`/`Text` import(다른 사용처가 없다면)를 제거:

```tsx
import { AdSenderInfo, UnsubscribeLink } from './_components/legal-footer';
// ... (컴포넌트 본문 내)
{
  /* 광고(isAdvertisement=true) 시 정통망법 발송자 정보 */
}
{
  isAd && <AdSenderInfo locale={locale} />;
}

{
  /* 수신거부 링크 */
}
<UnsubscribeLink href={unsubscribeUrl} locale={locale} />;
```

- [ ] **Step 4: broadcast 회귀 확인**

Run: `npm test -- __tests__/emails/broadcast.test.tsx`
Expected: PASS (기존 테스트 전부 — 추출이 동작 동일함을 보장)

- [ ] **Step 5: NewsletterEmail 구현**

```tsx
// emails/newsletter.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

import { AdSenderInfo, UnsubscribeLink } from './_components/legal-footer';
import type { EmailLocale } from './_components/i18n';
import { BRAND_COLORS } from '@/lib/colors';
import type { NewsletterBlock } from '@/lib/newsletter/blocks';

export interface NewsletterEmailProps {
  issueNo: number;
  title: string;
  preheader: string;
  blocks: NewsletterBlock[];
  isAdvertisement: boolean;
  unsubscribeUrl: string;
  webUrl: string;
  locale?: EmailLocale;
}

/**
 * 월간 뉴스레터 템플릿 — 갤러리 화이트 큐브 톤의 600px 단일 컬럼 매거진.
 * 블록 배열(lib/newsletter/blocks.ts)을 순서대로 렌더. (광고) 제목 접두어는
 * 디스패처(broadcast-dispatch)가 subject에 부여 — 본문은 AdSenderInfo로 충족.
 */
export default function NewsletterEmail({
  issueNo,
  title,
  preheader,
  blocks,
  isAdvertisement,
  unsubscribeUrl,
  webUrl,
  locale = 'ko',
}: NewsletterEmailProps) {
  return (
    <Html lang={locale}>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preheader || title}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={{ padding: '10px 28px 0', textAlign: 'center' }}>
            <Link href={webUrl} style={viewOnWebStyle}>
              {locale === 'en'
                ? 'View this issue on the web'
                : '메일이 잘 안 보이나요? 웹에서 보기'}
            </Link>
          </Section>

          <Section style={{ padding: '20px 28px 0', textAlign: 'center' }}>
            <Text style={mastheadEyebrowStyle}>
              SEED ART FESTIVAL · {locale === 'en' ? `Issue ${issueNo}` : `제${issueNo}호`}
            </Text>
            <Text style={mastheadTitleStyle}>{title}</Text>
          </Section>
          <Hr style={hairlineStyle} />

          {blocks.map((block) => (
            <NewsletterBlockSection key={block.id} block={block} />
          ))}

          {isAdvertisement && (
            <Section style={{ padding: '0 28px' }}>
              <AdSenderInfo locale={locale} />
            </Section>
          )}
          <UnsubscribeLink href={unsubscribeUrl} locale={locale} />
          <Section style={{ padding: '4px 28px 24px', textAlign: 'center' }}>
            <Text style={footerBrandStyle}>
              {locale === 'en' ? 'SAF 2026' : '씨앗페 SAF 2026'} · contact@kosmart.org
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function NewsletterBlockSection({ block }: { block: NewsletterBlock }) {
  switch (block.type) {
    case 'cover':
      return (
        <Section style={{ padding: '20px 0 4px' }}>
          {block.imageUrl && (
            <Img src={block.imageUrl} alt={block.title} width={600} style={fullImageStyle} />
          )}
          <Section style={{ padding: '16px 28px 0', textAlign: 'center' }}>
            <Text style={coverTitleStyle}>{block.title}</Text>
            {block.subtitle && <Text style={coverSubtitleStyle}>{block.subtitle}</Text>}
          </Section>
        </Section>
      );
    case 'text':
      return (
        <Section style={{ padding: '12px 28px' }}>
          <div style={richTextStyle} dangerouslySetInnerHTML={{ __html: block.html }} />
        </Section>
      );
    case 'artworkCard':
      return (
        <Section style={{ padding: '16px 28px' }}>
          <Section style={artworkCardStyle}>
            <Img
              src={block.snapshot.imageUrl}
              alt={block.snapshot.title}
              width={542}
              style={artworkImageStyle}
            />
            <Section style={{ padding: '16px 20px 20px' }}>
              <Text style={artworkArtistStyle}>{block.snapshot.artistName}</Text>
              <Text style={artworkTitleStyle}>{block.snapshot.title}</Text>
              {block.snapshot.description && (
                <Text style={artworkDescStyle}>{block.snapshot.description}</Text>
              )}
              {block.showPrice && block.snapshot.price && (
                <Text style={artworkPriceStyle}>{block.snapshot.price}</Text>
              )}
              <Link href={block.snapshot.url} style={artworkLinkStyle}>
                작품 보러가기 →
              </Link>
            </Section>
          </Section>
        </Section>
      );
    case 'eventBanner':
      return (
        <Section style={{ padding: '16px 28px' }}>
          <Section style={eventBannerStyle}>
            {block.imageUrl && (
              <Img src={block.imageUrl} alt={block.title} width={542} style={eventImageStyle} />
            )}
            <Section style={{ padding: '20px 20px 24px', textAlign: 'center' }}>
              <Text style={eventTitleStyle}>{block.title}</Text>
              {block.dateText && <Text style={eventDateStyle}>{block.dateText}</Text>}
              <Button href={block.ctaUrl} style={ctaButtonStyle}>
                {block.ctaLabel}
              </Button>
            </Section>
          </Section>
        </Section>
      );
    case 'button':
      return (
        <Section style={{ padding: '16px 28px', textAlign: 'center' }}>
          <Button href={block.url} style={ctaButtonStyle}>
            {block.label}
          </Button>
        </Section>
      );
    case 'divider':
      return <Hr style={hairlineStyle} />;
  }
}

const bodyStyle: React.CSSProperties = {
  margin: '0',
  padding: '0',
  background: BRAND_COLORS.canvas.DEFAULT,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '24px auto',
  background: BRAND_COLORS.canvas.soft,
  border: `1px solid ${BRAND_COLORS.gallery.hairline}`,
};

const viewOnWebStyle: React.CSSProperties = {
  fontSize: '12px',
  color: BRAND_COLORS.charcoal.soft,
  textDecoration: 'underline',
};

const mastheadEyebrowStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: BRAND_COLORS.charcoal.muted,
};

const mastheadTitleStyle: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: '24px',
  fontWeight: 700,
  lineHeight: '1.3',
  color: BRAND_COLORS.charcoal.deep,
};

const hairlineStyle: React.CSSProperties = {
  margin: '8px 28px',
  borderTop: `1px solid ${BRAND_COLORS.gallery.divider}`,
};

const fullImageStyle: React.CSSProperties = { width: '100%', height: 'auto', display: 'block' };

const coverTitleStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: '26px',
  fontWeight: 700,
  lineHeight: '1.3',
  color: BRAND_COLORS.charcoal.deep,
};

const coverSubtitleStyle: React.CSSProperties = {
  margin: '0',
  fontSize: '15px',
  color: BRAND_COLORS.charcoal.muted,
  lineHeight: '1.6',
};

const richTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.8',
  color: BRAND_COLORS.charcoal.DEFAULT,
};

const artworkCardStyle: React.CSSProperties = {
  border: `1px solid ${BRAND_COLORS.gallery.hairline}`,
  background: BRAND_COLORS.canvas.soft,
};

const artworkImageStyle: React.CSSProperties = { width: '100%', height: 'auto', display: 'block' };

const artworkArtistStyle: React.CSSProperties = {
  margin: '0 0 2px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: BRAND_COLORS.charcoal.muted,
};

const artworkTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '18px',
  fontWeight: 700,
  color: BRAND_COLORS.charcoal.deep,
};

const artworkDescStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '14px',
  lineHeight: '1.7',
  color: BRAND_COLORS.charcoal.DEFAULT,
};

const artworkPriceStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '14px',
  fontWeight: 700,
  color: BRAND_COLORS.sun.strong,
};

const artworkLinkStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: BRAND_COLORS.primary.strong,
  textDecoration: 'none',
};

const eventBannerStyle: React.CSSProperties = {
  background: BRAND_COLORS.gallery.tile,
};

const eventImageStyle: React.CSSProperties = { width: '100%', height: 'auto', display: 'block' };

const eventTitleStyle: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '20px',
  fontWeight: 700,
  color: BRAND_COLORS.light,
};

const eventDateStyle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '13px',
  color: BRAND_COLORS.gray[300],
};

const ctaButtonStyle: React.CSSProperties = {
  background: BRAND_COLORS.primary.strong,
  color: BRAND_COLORS.light,
  padding: '12px 28px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
};

const footerBrandStyle: React.CSSProperties = {
  margin: '0',
  fontSize: '12px',
  color: BRAND_COLORS.gray[400],
};
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test -- __tests__/emails/`
Expected: PASS (newsletter 5 + broadcast 기존 전부)

- [ ] **Step 7: Commit**

```bash
git add emails/_components/legal-footer.tsx emails/broadcast.tsx emails/newsletter.tsx __tests__/emails/newsletter.test.tsx
git commit -m "feat(newsletter): NewsletterEmail 템플릿 + 법적 푸터 공용화

요약: 뉴스레터 이메일 템플릿 추가, 발송자 정보·수신거부를 공용 컴포넌트로 추출

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 발송 enqueue — lib/newsletter/enqueue.ts

**Files:**

- Create: `lib/newsletter/channels.ts`
- Create: `lib/newsletter/enqueue.ts`
- Test: `__tests__/lib/newsletter-enqueue.test.ts`

**Interfaces:**

- Consumes: `CustomerAudienceResolver`/`MemberAudienceResolver` (`lib/email/audiences/*` — `resolve(): Promise<Recipient[]>`, `Recipient { email; name; locale; emailHash }`), `parseNewsletterBlocks`/`blocksToText` (Task 2), `createSupabaseAdminClient` (`@/lib/auth/server`)
- Produces:
  - `lib/newsletter/channels.ts` (클라이언트 안전 — 서버 전용 import 없음. SendPanel 등 client 컴포넌트가 라벨을 여기서 가져온다): `type NewsletterChannel = 'customer' | 'member'`, `NEWSLETTER_CHANNELS: NewsletterChannel[]`, `NEWSLETTER_CHANNEL_LABELS: Record<NewsletterChannel, string>`
  - `lib/newsletter/enqueue.ts` (서버 전용 — audiences가 admin client를 쓰므로 client에서 import 금지):
    - `dedupeAcrossChannels(lists: Array<{ channel: NewsletterChannel; recipients: Recipient[] }>): 동일 형태` — 앞 채널 우선 중복 제거 (순수 함수)
    - `enqueueNewsletterBroadcasts(supabase: ReturnType<typeof createSupabaseAdminClient>, newsletter: NewsletterSendRow): Promise<{ broadcastIds: string[]; totalRecipients: number; error?: string }>`
    - `interface NewsletterSendRow { id: string; issue_no: number; slug: string; title: string; preheader: string; blocks: unknown; is_advertisement: boolean; audience_channels: string[]; created_by: string | null }`
    - `export type { NewsletterChannel }` 재수출 — 서버 코드(Task 5·6)는 enqueue에서 타입을 가져와도 된다.
- server action(Task 5)과 cron(Task 6)이 공용 — cron은 server action을 부를 수 없으므로 lib 함수로 분리.

- [ ] **Step 1: 실패하는 테스트 작성 (순수 함수)**

```typescript
// __tests__/lib/newsletter-enqueue.test.ts
import { dedupeAcrossChannels } from '@/lib/newsletter/enqueue';
import type { Recipient } from '@/lib/email/audiences/types';

const r = (email: string, hash: string): Recipient => ({
  email,
  name: null,
  locale: 'ko',
  emailHash: hash,
});

describe('dedupeAcrossChannels', () => {
  it('뒤 채널에서 앞 채널과 중복된 수신자를 제거한다', () => {
    const result = dedupeAcrossChannels([
      { channel: 'customer', recipients: [r('a@x.com', 'h-a'), r('b@x.com', 'h-b')] },
      { channel: 'member', recipients: [r('b@x.com', 'h-b'), r('c@x.com', 'h-c')] },
    ]);
    expect(result[0].recipients.map((x) => x.email)).toEqual(['a@x.com', 'b@x.com']);
    expect(result[1].recipients.map((x) => x.email)).toEqual(['c@x.com']);
  });

  it('같은 채널 내 중복도 제거한다', () => {
    const result = dedupeAcrossChannels([
      { channel: 'customer', recipients: [r('a@x.com', 'h-a'), r('a@x.com', 'h-a')] },
    ]);
    expect(result[0].recipients).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- __tests__/lib/newsletter-enqueue.test.ts`
Expected: FAIL — `Cannot find module '@/lib/newsletter/enqueue'`

- [ ] **Step 3: 구현**

먼저 클라이언트 안전 채널 상수 모듈:

```typescript
// lib/newsletter/channels.ts
// 뉴스레터 발송 채널 — 클라이언트 안전(서버 전용 import 없음).
// 발송 로직은 enqueue.ts(서버 전용)에 있고, client 컴포넌트(SendPanel)는 여기서 타입·라벨만 소비한다.
export type NewsletterChannel = 'customer' | 'member';

export const NEWSLETTER_CHANNELS: NewsletterChannel[] = ['customer', 'member'];

export const NEWSLETTER_CHANNEL_LABELS: Record<NewsletterChannel, string> = {
  customer: '고객 (수신동의·거래고객)',
  member: '작가·출품자',
};
```

다음 발송 등록 로직:

```typescript
// lib/newsletter/enqueue.ts
// 뉴스레터 발송 등록 — 채널별 수신자 resolve → 교차 중복 제거 → 채널당 email_broadcasts 1행 생성.
// server action(즉시 발송)과 broadcast-dispatch cron(예약 도래)이 공용하므로 lib에 위치.
// ⚠ 서버 전용 — audiences가 admin client를 사용. client 컴포넌트는 channels.ts만 import할 것.
import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';
import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import type { Recipient } from '@/lib/email/audiences/types';
import type { createSupabaseAdminClient } from '@/lib/auth/server';
import { blocksToText, parseNewsletterBlocks } from '@/lib/newsletter/blocks';
import type { NewsletterChannel } from '@/lib/newsletter/channels';
import type { Json } from '@/types/supabase';

export type { NewsletterChannel };

export interface NewsletterSendRow {
  id: string;
  issue_no: number;
  slug: string;
  title: string;
  preheader: string;
  blocks: unknown;
  is_advertisement: boolean;
  audience_channels: string[];
  created_by: string | null;
}

// 채널 간 중복 수신 제거 — 앞 채널 우선. 작가이면서 구매자인 사람은 1통만 받는다.
export function dedupeAcrossChannels(
  lists: Array<{ channel: NewsletterChannel; recipients: Recipient[] }>
): Array<{ channel: NewsletterChannel; recipients: Recipient[] }> {
  const seen = new Set<string>();
  return lists.map(({ channel, recipients }) => ({
    channel,
    recipients: recipients.filter((r) => {
      if (seen.has(r.emailHash)) return false;
      seen.add(r.emailHash);
      return true;
    }),
  }));
}

export async function enqueueNewsletterBroadcasts(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  newsletter: NewsletterSendRow
): Promise<{ broadcastIds: string[]; totalRecipients: number; error?: string }> {
  const empty = { broadcastIds: [] as string[], totalRecipients: 0 };

  if (!newsletter.title.trim()) return { ...empty, error: '제목이 비어 있습니다.' };

  let blocks;
  try {
    blocks = parseNewsletterBlocks(newsletter.blocks);
  } catch (err) {
    return { ...empty, error: err instanceof Error ? err.message : '블록 검증 실패' };
  }
  if (blocks.length === 0) return { ...empty, error: '블록이 비어 있습니다.' };

  const channels = newsletter.audience_channels.filter(
    (c): c is NewsletterChannel => c === 'customer' || c === 'member'
  );
  if (channels.length === 0) return { ...empty, error: '발송 채널이 선택되지 않았습니다.' };

  const resolved: Array<{ channel: NewsletterChannel; recipients: Recipient[] }> = [];
  for (const channel of channels) {
    const resolver =
      channel === 'customer' ? new CustomerAudienceResolver() : new MemberAudienceResolver();
    try {
      resolved.push({ channel, recipients: await resolver.resolve() });
    } catch (err) {
      console.error(`[newsletter-enqueue] ${channel} resolver error:`, err);
      return { ...empty, error: `수신자 추출 실패 (${channel})` };
    }
  }

  const deduped = dedupeAcrossChannels(resolved).filter((l) => l.recipients.length > 0);
  const totalRecipients = deduped.reduce((sum, l) => sum + l.recipients.length, 0);
  if (totalRecipients === 0) {
    return { ...empty, error: '발송 대상 수신자가 없습니다. (전원 수신거부 또는 이메일 없음)' };
  }

  const bodyText = blocksToText(blocks);
  const broadcastIds: string[] = [];

  for (const { channel, recipients } of deduped) {
    const { data: broadcast, error: bErr } = await supabase
      .from('email_broadcasts')
      .insert({
        channel,
        subject: newsletter.title,
        body_html: '', // 뉴스레터는 blocks로 렌더 — body_html 미사용(디스패처가 newsletter_id로 분기)
        body_text: bodyText,
        audience_filter: { newsletterSlug: newsletter.slug } as Json,
        is_advertisement: newsletter.is_advertisement,
        newsletter_id: newsletter.id,
        status: 'queued',
        recipient_count: recipients.length,
        created_by: newsletter.created_by,
        queued_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (bErr || !broadcast) {
      console.error('[newsletter-enqueue] insert broadcast error:', bErr);
      return { broadcastIds, totalRecipients, error: '캠페인 생성에 실패했습니다.' };
    }

    const { error: rErr } = await supabase.from('email_broadcast_recipients').insert(
      recipients.map((r) => ({
        broadcast_id: broadcast.id,
        email: r.email,
        name: r.name,
        locale: r.locale,
        status: 'pending',
      }))
    );

    if (rErr) {
      await supabase.from('email_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
      console.error('[newsletter-enqueue] insert recipients error:', rErr);
      return { broadcastIds, totalRecipients, error: '수신자 큐 등록에 실패했습니다.' };
    }

    broadcastIds.push(broadcast.id);
  }

  return { broadcastIds, totalRecipients };
}
```

- [ ] **Step 4: 테스트 통과 + type-check**

Run: `npm test -- __tests__/lib/newsletter-enqueue.test.ts && npm run type-check`
Expected: PASS / 통과

- [ ] **Step 5: Commit**

```bash
git add lib/newsletter/channels.ts lib/newsletter/enqueue.ts __tests__/lib/newsletter-enqueue.test.ts
git commit -m "feat(newsletter): 채널별 발송 등록 enqueue 라이브러리

요약: 뉴스레터 수신자 추출·교차 채널 중복 제거·브로드캐스트 큐 등록 로직

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 서버 액션 — app/actions/admin-newsletter.ts

**Files:**

- Create: `app/actions/admin-newsletter.ts`

**Interfaces:**

- Consumes: `requireAdmin`/`requireAdminClient` (`@/lib/auth/guards`), `parseNewsletterBlocks`·`NewsletterBlock`·`ArtworkSnapshot` (Task 2), `enqueueNewsletterBroadcasts`·`NewsletterChannel`·`NewsletterSendRow` (Task 4), `NewsletterEmail` (Task 3), `sanitizeRichEmailHtml` (`@/lib/email/rich-content`), `resolveArtworkVariantUrl` (`@/lib/utils/artwork-image`), `sendBatch` (`@/lib/email/resend-batch`), `generateUnsubscribeToken`(`@/lib/email/unsubscribe-token`), `hashEmail`(`@/lib/email/email-hash`), `buildReplyFromAddress`·`buildReplyToAddress`(`@/lib/email/inbound`), `logAdminAction`(`@/app/actions/activity-log-writer`), `SITE_URL`(`@/lib/constants`)
- Produces (클라이언트 컴포넌트가 소비할 정확한 시그니처):
  - `getNewsletters(): Promise<NewsletterListRow[]>`
  - `getNewsletter(id: string): Promise<NewsletterDetail | null>`
  - `createNewsletter(): Promise<ActionState & { id?: string }>`
  - `updateNewsletter(id: string, input: UpdateNewsletterInput): Promise<ActionState>`
  - `deleteNewsletter(id: string): Promise<ActionState>`
  - `duplicateNewsletter(id: string): Promise<ActionState & { id?: string }>`
  - `getNewsletterArtworkSnapshot(artworkId: string): Promise<ActionState & { snapshot?: ArtworkSnapshot }>`
  - `renderNewsletterPreview(input: PreviewInput): Promise<ActionState & { html?: string }>`
  - `sendNewsletterTest(id: string): Promise<ActionState>`
  - `sendNewsletterNow(id: string, channels: NewsletterChannel[]): Promise<ActionState>`
  - `scheduleNewsletter(id: string, channels: NewsletterChannel[], scheduledAtIso: string): Promise<ActionState>`
  - `cancelNewsletterSchedule(id: string): Promise<ActionState>`

- [ ] **Step 1: 구현** (admin 한국어 리터럴 — i18n 금지)

```typescript
// app/actions/admin-newsletter.ts
'use server';

import * as React from 'react';

import { render } from '@react-email/render';

import { logAdminAction } from '@/app/actions/activity-log-writer';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { hashEmail } from '@/lib/email/email-hash';
import { buildReplyFromAddress, buildReplyToAddress } from '@/lib/email/inbound';
import { sendBatch } from '@/lib/email/resend-batch';
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { sanitizeRichEmailHtml } from '@/lib/email/rich-content';
import {
  parseNewsletterBlocks,
  type ArtworkSnapshot,
  type NewsletterBlock,
} from '@/lib/newsletter/blocks';
import {
  enqueueNewsletterBroadcasts,
  type NewsletterChannel,
  type NewsletterSendRow,
} from '@/lib/newsletter/enqueue';
import { resolveArtworkVariantUrl } from '@/lib/utils/artwork-image';
import { SITE_URL } from '@/lib/constants';
import NewsletterEmail from '@/emails/newsletter';
import type { ActionState } from '@/types';
import type { Json } from '@/types/supabase';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? buildReplyFromAddress();

export interface NewsletterListRow {
  id: string;
  issue_no: number;
  slug: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  updated_at: string;
}

export interface NewsletterDetail extends NewsletterListRow {
  preheader: string;
  blocks: unknown; // 클라이언트가 parseNewsletterBlocks로 파싱
  is_advertisement: boolean;
  audience_channels: string[];
}

export interface UpdateNewsletterInput {
  title: string;
  preheader: string;
  slug: string;
  isAdvertisement: boolean;
  blocks: unknown;
}

export interface PreviewInput {
  issueNo: number;
  title: string;
  preheader: string;
  isAdvertisement: boolean;
  blocks: unknown;
}

const NEWSLETTER_DETAIL_COLUMNS =
  'id, issue_no, slug, title, preheader, blocks, status, audience_channels, scheduled_at, sent_at, is_advertisement, updated_at';

// text 블록 html은 저장·미리보기 공통으로 기존 이메일 sanitize 파이프라인 통과.
function sanitizeBlocks(blocks: NewsletterBlock[]): NewsletterBlock[] {
  return blocks.map((b) => (b.type === 'text' ? { ...b, html: sanitizeRichEmailHtml(b.html) } : b));
}

// 발송 전 블록 이미지 URL 존재 검증(HEAD) — 깨진 이미지가 실린 채 발송되는 것 차단 (스펙 §6).
// 첫 번째 응답하지 않는 URL을 반환, 전부 정상이면 null.
async function findBrokenImageUrl(blocks: NewsletterBlock[]): Promise<string | null> {
  const urls: string[] = [];
  for (const b of blocks) {
    if (b.type === 'cover' && b.imageUrl) urls.push(b.imageUrl);
    else if (b.type === 'artworkCard') urls.push(b.snapshot.imageUrl);
    else if (b.type === 'eventBanner' && b.imageUrl) urls.push(b.imageUrl);
  }
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (!res.ok) return url;
    } catch {
      return url;
    }
  }
  return null;
}

export async function getNewsletters(): Promise<NewsletterListRow[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('newsletters')
    .select('id, issue_no, slug, title, status, scheduled_at, sent_at, updated_at')
    .order('issue_no', { ascending: false });
  if (error) {
    console.error('[get-newsletters] error:', error);
    return [];
  }
  return (data ?? []) as NewsletterListRow[];
}

export async function getNewsletter(id: string): Promise<NewsletterDetail | null> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('newsletters')
    .select(NEWSLETTER_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[get-newsletter] error:', error);
    return null;
  }
  return (data as NewsletterDetail | null) ?? null;
}

// 다음 호수(max+1)와 KST 기준 'YYYY-MM' slug(충돌 시 -2, -3 접미) 생성.
async function nextIssueNoAndSlug(supabase: Awaited<ReturnType<typeof requireAdminClient>>) {
  const { data: maxRow } = await supabase
    .from('newsletters')
    .select('issue_no')
    .order('issue_no', { ascending: false })
    .limit(1)
    .maybeSingle();
  const issueNo = ((maxRow?.issue_no as number | undefined) ?? 0) + 1;

  const kst = new Date(Date.now() + 9 * 3600_000);
  const base = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
  let slug = base;
  for (let n = 2; n <= 20; n++) {
    const { data: existing } = await supabase
      .from('newsletters')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${n}`;
  }
  return { issueNo, slug };
}

export async function createNewsletter(): Promise<ActionState & { id?: string }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { issueNo, slug } = await nextIssueNoAndSlug(supabase);

  const defaultBlocks: NewsletterBlock[] = [
    { id: crypto.randomUUID(), type: 'cover', title: '', subtitle: '', imageUrl: '' },
    { id: crypto.randomUUID(), type: 'text', html: '<p></p>' },
  ];

  const { data, error } = await supabase
    .from('newsletters')
    .insert({
      issue_no: issueNo,
      slug,
      title: '',
      preheader: '',
      blocks: defaultBlocks as unknown as Json,
      status: 'draft',
      created_by: admin.id,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[create-newsletter] error:', error);
    return { message: '뉴스레터 생성에 실패했습니다.', error: true };
  }
  await logAdminAction('newsletter_created', 'newsletter', data.id, { issue_no: issueNo, slug });
  return { message: `제${issueNo}호 초안을 만들었습니다.`, id: data.id };
}

export async function updateNewsletter(
  id: string,
  input: UpdateNewsletterInput
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  let blocks: NewsletterBlock[];
  try {
    blocks = sanitizeBlocks(parseNewsletterBlocks(input.blocks));
  } catch (err) {
    return { message: err instanceof Error ? err.message : '블록 검증 실패', error: true };
  }

  const slug = input.slug.trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return { message: 'slug는 영소문자·숫자·하이픈만 사용할 수 있습니다.', error: true };
  }
  const title = input.title.trim();
  if (title.length > 200) return { message: '제목은 200자 이하여야 합니다.', error: true };
  const preheader = input.preheader.trim();
  if (preheader.length > 200)
    return { message: '미리보기 문구는 200자 이하여야 합니다.', error: true };

  const { data, error } = await supabase
    .from('newsletters')
    .update({
      title,
      preheader,
      slug,
      is_advertisement: input.isAdvertisement,
      blocks: blocks as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft') // 초안만 수정 가능 — scheduled/sending/sent 잠금
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[update-newsletter] error:', error);
    const isUnique = error.code === '23505';
    return {
      message: isUnique ? '이미 사용 중인 slug입니다.' : '저장에 실패했습니다.',
      error: true,
    };
  }
  if (!data) return { message: '초안 상태에서만 수정할 수 있습니다.', error: true };
  return { message: '저장했습니다.' };
}

export async function deleteNewsletter(id: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('newsletters')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[delete-newsletter] error:', error);
    return { message: '삭제에 실패했습니다.', error: true };
  }
  if (!data) return { message: '초안 상태에서만 삭제할 수 있습니다.', error: true };
  await logAdminAction('newsletter_deleted', 'newsletter', id, {});
  return { message: '초안을 삭제했습니다.' };
}

export async function duplicateNewsletter(id: string): Promise<ActionState & { id?: string }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const source = await getNewsletter(id);
  if (!source) return { message: '원본 뉴스레터를 찾을 수 없습니다.', error: true };

  const { issueNo, slug } = await nextIssueNoAndSlug(supabase);
  const { data, error } = await supabase
    .from('newsletters')
    .insert({
      issue_no: issueNo,
      slug,
      title: source.title,
      preheader: source.preheader,
      blocks: source.blocks as Json,
      status: 'draft',
      is_advertisement: source.is_advertisement,
      audience_channels: source.audience_channels,
      created_by: admin.id,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[duplicate-newsletter] error:', error);
    return { message: '복제에 실패했습니다.', error: true };
  }
  return { message: `제${issueNo}호 초안으로 복제했습니다.`, id: data.id };
}

export async function getNewsletterArtworkSnapshot(
  artworkId: string
): Promise<ActionState & { snapshot?: ArtworkSnapshot }> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('artworks')
    .select('id, title, description, price, images, artists(name_ko, name_en)')
    .eq('id', artworkId)
    .maybeSingle();
  if (error || !data) return { message: '작품을 찾을 수 없습니다.', error: true };

  const artist = Array.isArray(data.artists) ? data.artists[0] : data.artists;
  const images = Array.isArray(data.images) ? data.images : [];
  const first = typeof images[0] === 'string' ? images[0] : '';
  const imageUrl = first ? resolveArtworkVariantUrl(first, 'card') : '';
  if (!/^https?:\/\//i.test(imageUrl)) {
    return { message: '이 작품은 이메일에 쓸 수 있는 이미지 URL이 없습니다.', error: true };
  }

  return {
    message: 'ok',
    snapshot: {
      title: data.title,
      artistName: (artist?.name_ko as string | null) ?? (artist?.name_en as string | null) ?? '',
      imageUrl,
      description: ((data.description as string | null) ?? '').trim(),
      price: ((data.price as string | null) ?? '').trim(),
      url: `${SITE_URL}/artworks/${data.id}`,
    },
  };
}

export async function renderNewsletterPreview(
  input: PreviewInput
): Promise<ActionState & { html?: string }> {
  await requireAdmin();
  let blocks: NewsletterBlock[];
  try {
    blocks = sanitizeBlocks(parseNewsletterBlocks(input.blocks));
  } catch (err) {
    return { message: err instanceof Error ? err.message : '블록 검증 실패', error: true };
  }
  const html = await render(
    React.createElement(NewsletterEmail, {
      issueNo: input.issueNo,
      title: input.title.trim() || '(제목 없음)',
      preheader: input.preheader,
      blocks,
      isAdvertisement: input.isAdvertisement,
      unsubscribeUrl: `${SITE_URL}/api/email/unsubscribe?invalid=1`,
      webUrl: `${SITE_URL}/newsletter`,
      locale: 'ko',
    })
  );
  return { message: 'ok', html };
}

// 관리자 본인에게 테스트 1통 즉시 발송 (sendTestEmail 패턴).
export async function sendNewsletterTest(id: string): Promise<ActionState> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const newsletter = await getNewsletter(id);
  if (!newsletter) return { message: '뉴스레터를 찾을 수 없습니다.', error: true };

  let blocks: NewsletterBlock[];
  try {
    blocks = parseNewsletterBlocks(newsletter.blocks);
  } catch (err) {
    return { message: err instanceof Error ? err.message : '블록 검증 실패', error: true };
  }
  if (!newsletter.title.trim() || blocks.length === 0) {
    return { message: '제목과 블록을 먼저 저장하세요.', error: true };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', admin.id)
    .single();
  const to = profile?.email as string | undefined;
  if (!to) return { message: '관리자 이메일을 찾을 수 없습니다.', error: true };

  const unsubToken = generateUnsubscribeToken(hashEmail(to.toLowerCase().trim()), 'individual');
  const unsubscribeUrl = unsubToken
    ? `${SITE_URL}/api/email/unsubscribe?t=${unsubToken}`
    : `${SITE_URL}/api/email/unsubscribe?invalid=1`;

  const html = await render(
    React.createElement(NewsletterEmail, {
      issueNo: newsletter.issue_no,
      title: newsletter.title,
      preheader: newsletter.preheader,
      blocks,
      isAdvertisement: newsletter.is_advertisement,
      unsubscribeUrl,
      webUrl: `${SITE_URL}/newsletter/${newsletter.slug}`,
      locale: 'ko',
    })
  );
  const subject = newsletter.is_advertisement
    ? `(광고) [테스트] ${newsletter.title}`
    : `[테스트] ${newsletter.title}`;
  const result = await sendBatch([
    { from: FROM_EMAIL, to, subject, html, reply_to: buildReplyToAddress() },
  ]);
  if (result.error || result.ids.length === 0) {
    return { message: `테스트 발송 실패: ${result.error ?? '알 수 없는 오류'}`, error: true };
  }
  return { message: `테스트 이메일을 ${to}로 보냈습니다.` };
}

export async function sendNewsletterNow(
  id: string,
  channels: NewsletterChannel[]
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  if (channels.length === 0) return { message: '발송 채널을 선택하세요.', error: true };

  // 원자적 claim: draft → sending. status 가드 UPDATE라 더블클릭·동시 요청에도 1회만 성공.
  const { data: claimed, error: claimError } = await supabase
    .from('newsletters')
    .update({
      status: 'sending',
      audience_channels: channels,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft')
    .select(
      'id, issue_no, slug, title, preheader, blocks, is_advertisement, audience_channels, created_by'
    )
    .maybeSingle();
  if (claimError || !claimed) {
    return {
      message: '발송을 시작할 수 없습니다. (초안 상태가 아니거나 이미 발송 중)',
      error: true,
    };
  }

  // 이미지 URL 검증 — 깨진 URL이면 draft로 복원 후 차단 (파싱 실패는 enqueue가 동일 검증으로 처리)
  try {
    const broken = await findBrokenImageUrl(parseNewsletterBlocks(claimed.blocks));
    if (broken) {
      await supabase
        .from('newsletters')
        .update({ status: 'draft' })
        .eq('id', id)
        .eq('status', 'sending');
      return { message: `이미지 URL이 응답하지 않습니다: ${broken}`, error: true };
    }
  } catch {
    // parseNewsletterBlocks 실패 — 아래 enqueue가 같은 검증으로 에러 메시지를 만들고 draft 복원 경로를 탄다
  }

  const result = await enqueueNewsletterBroadcasts(supabase, claimed as NewsletterSendRow);
  if (result.error) {
    if (result.broadcastIds.length === 0) {
      // 아무 채널도 등록 못 함 — draft로 복원해 재시도 가능하게
      await supabase
        .from('newsletters')
        .update({ status: 'draft' })
        .eq('id', id)
        .eq('status', 'sending');
      return { message: result.error, error: true };
    }
    // 일부 채널은 이미 큐에 올라가 발송된다 — sending 유지, 관리자에게 부분 실패 알림
    return { message: `일부 채널만 등록되었습니다: ${result.error}`, error: true };
  }

  await logAdminAction('newsletter_send', 'newsletter', id, {
    channels,
    recipient_count: result.totalRecipients,
  });
  return {
    message: `${result.totalRecipients.toLocaleString('ko-KR')}명에게 발송을 시작했습니다.`,
  };
}

export async function scheduleNewsletter(
  id: string,
  channels: NewsletterChannel[],
  scheduledAtIso: string
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  if (channels.length === 0) return { message: '발송 채널을 선택하세요.', error: true };

  const at = new Date(scheduledAtIso);
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000) {
    return { message: '예약 시각은 최소 1분 이후여야 합니다.', error: true };
  }

  // 예약 시점에 블록·이미지 검증 — scheduled는 편집 잠금이라 이후 변하지 않는다 (편차 §6)
  const current = await getNewsletter(id);
  if (!current) return { message: '뉴스레터를 찾을 수 없습니다.', error: true };
  try {
    const broken = await findBrokenImageUrl(parseNewsletterBlocks(current.blocks));
    if (broken) return { message: `이미지 URL이 응답하지 않습니다: ${broken}`, error: true };
  } catch (err) {
    return { message: err instanceof Error ? err.message : '블록 검증 실패', error: true };
  }

  const { data, error } = await supabase
    .from('newsletters')
    .update({
      status: 'scheduled',
      scheduled_at: at.toISOString(),
      audience_channels: channels,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (error || !data) return { message: '초안 상태에서만 예약할 수 있습니다.', error: true };

  await logAdminAction('newsletter_schedule', 'newsletter', id, {
    channels,
    scheduled_at: at.toISOString(),
  });
  return {
    message: `${at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 발송으로 예약했습니다.`,
  };
}

export async function cancelNewsletterSchedule(id: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('newsletters')
    .update({ status: 'draft', scheduled_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select('id')
    .maybeSingle();
  if (error || !data) return { message: '예약 상태가 아닙니다.', error: true };
  return { message: '예약을 취소했습니다. 초안으로 되돌렸습니다.' };
}
```

- [ ] **Step 2: type-check + 전체 테스트**

Run: `npm run type-check && npm test`
Expected: 통과 (신규 액션은 순수 검증 로직이 blocks 테스트로 커버, 나머지는 DB 경유라 수동/통합 검증)

- [ ] **Step 3: Commit**

```bash
git add app/actions/admin-newsletter.ts
git commit -m "feat(newsletter): 뉴스레터 CRUD·미리보기·발송 서버 액션

요약: 초안 관리, 작품 스냅샷, 미리보기 렌더, 테스트/즉시/예약 발송 액션 추가

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 디스패처 통합 — broadcast-dispatch 수정

**Files:**

- Modify: `app/api/internal/broadcast-dispatch/route.ts`

**Interfaces:**

- Consumes: `NewsletterEmail`(Task 3), `parseNewsletterBlocks`·`NewsletterBlock`(Task 2), `enqueueNewsletterBroadcasts`·`NewsletterSendRow`(Task 4)
- Produces: (1) 예약 도래 뉴스레터 자동 enqueue, (2) `newsletter_id` 있는 broadcast는 NewsletterEmail로 렌더, (3) 전 채널 완료 시 `newsletters.status='sent'` finalize. 기존 브로드캐스트 경로는 무변경.

- [ ] **Step 1: import 추가**

파일 상단 import 블록에 추가:

```typescript
import NewsletterEmail from '@/emails/newsletter';
import { parseNewsletterBlocks, type NewsletterBlock } from '@/lib/newsletter/blocks';
import { enqueueNewsletterBroadcasts, type NewsletterSendRow } from '@/lib/newsletter/enqueue';
```

- [ ] **Step 2: 예약 뉴스레터 claim + enqueue**

`cronHandler` 내 supabase 초기화 직후(기존 `email_broadcasts` 조회 직전, 현재 39행 주석 앞)에 삽입:

```typescript
// 예약 뉴스레터 도래분 발송 등록. status 가드 UPDATE(scheduled → sending)가 원자적 claim이라
// 매분 중복 실행·동시 run에도 1회만 성공한다. 등록 실패 시 draft로 복원해 무한 재시도 대신
// 관리자가 확인하게 한다 (스케줄은 해제됨 — 로그로 관찰).
const { data: dueNewsletters } = await supabase
  .from('newsletters')
  .select('id')
  .eq('status', 'scheduled')
  .lte('scheduled_at', new Date().toISOString())
  .limit(3);

for (const due of dueNewsletters ?? []) {
  const { data: claimed } = await supabase
    .from('newsletters')
    .update({ status: 'sending' })
    .eq('id', due.id)
    .eq('status', 'scheduled')
    .select(
      'id, issue_no, slug, title, preheader, blocks, is_advertisement, audience_channels, created_by'
    )
    .maybeSingle();
  if (!claimed) continue;

  const result = await enqueueNewsletterBroadcasts(supabase, claimed as NewsletterSendRow);
  if (result.error && result.broadcastIds.length === 0) {
    console.error(`[broadcast-dispatch] newsletter ${due.id} enqueue failed: ${result.error}`);
    await supabase
      .from('newsletters')
      .update({ status: 'draft', scheduled_at: null })
      .eq('id', due.id)
      .eq('status', 'sending');
  }
}
```

- [ ] **Step 3: broadcasts 조회에 newsletter_id 추가**

기존 select 문자열을 수정:

```typescript
    .select(
      'id, channel, subject, body_html, body_text, cta_label, cta_url, status, is_advertisement, newsletter_id'
    )
```

- [ ] **Step 4: 뉴스레터 블록 1회 로드·검증**

리스 락 획득·sanity 토큰 검사 통과 후, `let hasMore = true;` 직전에 삽입:

```typescript
// 뉴스레터 브로드캐스트면 블록을 1회 로드·검증 — 수신자별 렌더에서 재사용.
// 로드/검증 실패 시 failed 마킹 (silent skip은 queued 고착 → 매분 재시도 낭비).
let newsletterRender: {
  issueNo: number;
  title: string;
  preheader: string;
  blocks: NewsletterBlock[];
  webUrl: string;
} | null = null;
if (broadcast.newsletter_id) {
  const { data: nl } = await supabase
    .from('newsletters')
    .select('issue_no, title, preheader, slug, blocks')
    .eq('id', broadcast.newsletter_id)
    .maybeSingle();
  let parsedBlocks: NewsletterBlock[] | null = null;
  if (nl) {
    try {
      parsedBlocks = parseNewsletterBlocks(nl.blocks);
    } catch (err) {
      console.error(`[broadcast-dispatch] newsletter blocks invalid for ${broadcast.id}:`, err);
    }
  }
  if (!nl || !parsedBlocks) {
    await supabase
      .from('email_broadcasts')
      .update({ status: 'failed', dispatch_locked_until: null, dispatch_lock_token: null })
      .eq('id', broadcast.id)
      .eq('dispatch_lock_token', lockToken);
    continue;
  }
  newsletterRender = {
    issueNo: nl.issue_no as number,
    title: nl.title as string,
    preheader: (nl.preheader as string) ?? '',
    blocks: parsedBlocks,
    webUrl: `${SITE_URL}/newsletter/${nl.slug as string}`,
  };
}
```

- [ ] **Step 5: 렌더 분기**

기존 `const emailEl = React.createElement(BroadcastEmail, {...});` (178~188행)를 다음으로 교체:

```typescript
const emailEl = newsletterRender
  ? React.createElement(NewsletterEmail, {
      issueNo: newsletterRender.issueNo,
      title: newsletterRender.title,
      preheader: newsletterRender.preheader,
      // {{name}} 개인화는 text 블록에만 적용 (스냅샷·CTA는 불변)
      blocks: newsletterRender.blocks.map((b) =>
        b.type === 'text' ? { ...b, html: personalizeRichEmailHtml(b.html, r.name) } : b
      ),
      isAdvertisement: (broadcast.is_advertisement ?? false) as boolean,
      unsubscribeUrl,
      webUrl: newsletterRender.webUrl,
      locale: r.locale === 'en' ? ('en' as const) : ('ko' as const),
    })
  : React.createElement(BroadcastEmail, {
      channel: broadcast.channel as 'customer' | 'member' | 'petition' | 'individual',
      isAdvertisement: (broadcast.is_advertisement ?? false) as boolean,
      recipientName: r.name,
      subject: broadcast.subject as string,
      bodyHtml,
      ctaLabel: broadcast.cta_label as string | null,
      ctaUrl: broadcast.cta_url as string | null,
      unsubscribeUrl,
      locale: r.locale === 'en' ? 'en' : 'ko',
    });
```

(제목의 `(광고)` 접두, text 버전(body_text), List-Unsubscribe 헤더, 멱등 키는 기존 코드가 그대로 처리 — enqueue가 subject=제목, body_text=blocksToText로 저장했기 때문.)

- [ ] **Step 6: finalize 훅**

`remainingPending.length === 0` 블록의 `status: 'sent'` UPDATE 직후에 삽입:

```typescript
// 뉴스레터: 연결된 모든 채널 broadcast가 종결되면 뉴스레터도 sent로 마감.
if (broadcast.newsletter_id) {
  const { data: activeSiblings } = await supabase
    .from('email_broadcasts')
    .select('id')
    .eq('newsletter_id', broadcast.newsletter_id)
    .in('status', ['queued', 'sending'])
    .limit(1);
  if (activeSiblings && activeSiblings.length === 0) {
    await supabase
      .from('newsletters')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', broadcast.newsletter_id)
      .eq('status', 'sending');
  }
}
```

- [ ] **Step 7: 검증**

Run: `npm run type-check && npm test`
Expected: 통과. 기존 broadcast 경로 무변경(분기만 추가) — `__tests__/emails/broadcast.test.tsx` 포함 전체 green.

- [ ] **Step 8: Commit**

```bash
git add app/api/internal/broadcast-dispatch/route.ts
git commit -m "feat(newsletter): 디스패처에 뉴스레터 렌더 분기·예약 발송·finalize 통합

요약: 기존 1분 발송 cron이 뉴스레터 예약 등록과 템플릿 렌더까지 처리

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: admin 목록 페이지 + 네비게이션

**Files:**

- Modify: `app/(portal)/admin/_components/admin-nav-items.ts`
- Create: `app/(portal)/admin/newsletter/page.tsx`
- Create: `app/(portal)/admin/newsletter/_components/NewsletterListActions.tsx`

**Interfaces:**

- Consumes: `getNewsletters`·`createNewsletter`(Task 5), `AdminPageHeader`/`AdminPageTitle`/`AdminPageDescription`(`@/app/(portal)/admin/_components/admin-ui`)
- Produces: `/admin/newsletter` 목록 화면, `NEWSLETTER_STATUS_LABELS`(이 파일 로컬)

- [ ] **Step 1: 네비 항목 추가**

`admin-nav-items.ts`의 ko '도구' 그룹에서 `{ href: '/admin/email', label: '이메일 발송' }` 다음 줄에, en 'Tools' 그룹에서 `{ href: '/admin/email', label: 'Email Broadcast' }` 다음 줄에 각각 추가:

```typescript
        { href: '/admin/newsletter', label: '뉴스레터' },
```

```typescript
        { href: '/admin/newsletter', label: 'Newsletter' },
```

- [ ] **Step 2: 목록 페이지 구현**

```tsx
// app/(portal)/admin/newsletter/page.tsx
import Link from 'next/link';
import clsx from 'clsx';

import { requireAdmin } from '@/lib/auth/guards';
import { getNewsletters } from '@/app/actions/admin-newsletter';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { NewsletterCreateButton } from './_components/NewsletterListActions';

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  scheduled: '예약됨',
  sending: '발송 중',
  sent: '발송 완료',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-canvas-strong text-charcoal-muted',
  scheduled: 'bg-primary-surface text-primary-strong',
  sending: 'bg-gray-100 text-charcoal-deep',
  sent: 'bg-success-tint text-success-a11y',
};

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default async function AdminNewsletterListPage() {
  await requireAdmin();
  const newsletters = await getNewsletters();

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>뉴스레터</AdminPageTitle>
        <AdminPageDescription>
          월간 뉴스레터를 블록으로 조립해 고객·작가에게 발송합니다. 발송 완료된 호는 공개 웹
          아카이브(/newsletter)에 게시됩니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <NewsletterCreateButton />

      {newsletters.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-charcoal-muted">
          아직 뉴스레터가 없습니다. 새 뉴스레터를 만들어 보세요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs text-charcoal-muted">
              <tr>
                <th className="px-4 py-3 font-medium">호수</th>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">예약 시각</th>
                <th className="px-4 py-3 font-medium">발송 시각</th>
                <th className="px-4 py-3 font-medium">수정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {newsletters.map((n) => (
                <tr key={n.id} className="hover:bg-canvas-soft">
                  <td className="px-4 py-3 font-medium text-charcoal-deep">제{n.issue_no}호</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/newsletter/${n.id}`}
                      className="font-medium text-primary-strong hover:underline"
                    >
                      {n.title || '(제목 없음)'}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-charcoal-soft">{n.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_STYLES[n.status] ?? STATUS_STYLES.draft
                      )}
                    >
                      {STATUS_LABELS[n.status] ?? n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">
                    {formatDateTime(n.scheduled_at)}
                  </td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDateTime(n.sent_at)}</td>
                  <td className="px-4 py-3 text-charcoal-muted">{formatDateTime(n.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 생성 버튼 (client)**

```tsx
// app/(portal)/admin/newsletter/_components/NewsletterListActions.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { createNewsletter } from '@/app/actions/admin-newsletter';

export function NewsletterCreateButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await createNewsletter();
            if (result.error || !result.id) {
              setError(result.message);
              return;
            }
            router.push(`/admin/newsletter/${result.id}`);
          })
        }
        className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {isPending ? '만드는 중…' : '+ 새 뉴스레터'}
      </button>
      {error && <p className="text-sm text-danger-a11y">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: 검증 + Commit**

Run: `npm run type-check && npm run lint`
Expected: 통과

```bash
git add app/(portal)/admin/_components/admin-nav-items.ts app/(portal)/admin/newsletter/
git commit -m "feat(newsletter): admin 뉴스레터 목록 페이지·네비 항목

요약: 뉴스레터 목록/생성 화면과 관리자 메뉴 추가

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: admin 블록 편집기 + 실시간 미리보기

**Files:**

- Create: `app/(portal)/admin/newsletter/[id]/page.tsx`
- Create: `app/(portal)/admin/newsletter/[id]/_components/NewsletterEditor.tsx`
- Create: `app/(portal)/admin/newsletter/[id]/_components/block-editors.tsx`
- Create: `app/(portal)/admin/newsletter/[id]/_components/PreviewPane.tsx`

**Interfaces:**

- Consumes: `getNewsletter`/`updateNewsletter`/`deleteNewsletter`/`renderNewsletterPreview`/`getNewsletterArtworkSnapshot`(Task 5), `uploadEmailBroadcastImage`(`@/app/actions/admin-broadcast`), `RichEmailEditor`(named export, `{ value: string; onChange: (next: { html: string; text: string }) => void; onDirty: () => void }` — `@/app/(portal)/admin/email/_components/RichEmailEditor`), `ArtworkSearchSelect`(named export, `{ value: string; onChange: (artworkId: string) => void }` — 같은 디렉터리), `useDebounce`(`@/lib/hooks/useDebounce`), `parseNewsletterBlocks`/`NEWSLETTER_BLOCK_LABELS`/`NewsletterBlock`(Task 2)
- Produces: `BlockEditor({ block, onChange, readOnly })`, `createBlock(type): NewsletterBlock`, `PreviewPane({ issueNo, title, preheader, isAdvertisement, blocks })`. SendPanel(Task 9)은 NewsletterEditor가 렌더 — Task 8 시점에는 placeholder 주석으로 두고 Task 9에서 연결.

- [ ] **Step 1: 편집기 페이지 셸**

```tsx
// app/(portal)/admin/newsletter/[id]/page.tsx
import { notFound } from 'next/navigation';

import { requireAdmin } from '@/lib/auth/guards';
import { getNewsletter } from '@/app/actions/admin-newsletter';
import { NewsletterEditor } from './_components/NewsletterEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminNewsletterEditPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const newsletter = await getNewsletter(id);
  if (!newsletter) notFound();
  return <NewsletterEditor initial={newsletter} />;
}
```

- [ ] **Step 2: 블록 편집 폼 모음 (block-editors.tsx)**

```tsx
// app/(portal)/admin/newsletter/[id]/_components/block-editors.tsx
'use client';

import { useState, useTransition } from 'react';

import { ArtworkSearchSelect } from '@/app/(portal)/admin/email/_components/ArtworkSearchSelect';
import { RichEmailEditor } from '@/app/(portal)/admin/email/_components/RichEmailEditor';
import { uploadEmailBroadcastImage } from '@/app/actions/admin-broadcast';
import { getNewsletterArtworkSnapshot } from '@/app/actions/admin-newsletter';
import SafeImage from '@/components/common/SafeImage';
import type {
  ArtworkCardBlock,
  ButtonBlock,
  CoverBlock,
  EventBannerBlock,
  NewsletterBlock,
  TextBlock,
} from '@/lib/newsletter/blocks';

export function createBlock(type: NewsletterBlock['type']): NewsletterBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case 'cover':
      return { id, type: 'cover', title: '', subtitle: '', imageUrl: '' };
    case 'text':
      return { id, type: 'text', html: '<p></p>' };
    case 'artworkCard':
      return {
        id,
        type: 'artworkCard',
        artworkId: '',
        showPrice: true,
        snapshot: { title: '', artistName: '', imageUrl: '', description: '', price: '', url: '' },
      };
    case 'eventBanner':
      return {
        id,
        type: 'eventBanner',
        title: '',
        dateText: '',
        imageUrl: '',
        ctaLabel: '자세히 보기',
        ctaUrl: '',
      };
    case 'button':
      return { id, type: 'button', label: '', url: '' };
    case 'divider':
      return { id, type: 'divider' };
  }
}

const INPUT_CLASS =
  'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-canvas-strong disabled:text-charcoal-muted';

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-charcoal-muted">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
    </label>
  );
}

// 이미지 URL 필드 — 직접 붙여넣기 + 파일 업로드(기존 email-broadcasts 스토리지 경로 재사용)
function ImageField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [isUploading, startUpload] = useTransition();
  const [error, setError] = useState('');

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-charcoal-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder="https:// 이미지 URL 또는 파일 업로드"
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        />
        <label className="shrink-0 cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-charcoal hover:bg-canvas-soft">
          업로드
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            disabled={disabled || isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append('file', file);
              startUpload(async () => {
                const result = await uploadEmailBroadcastImage(formData);
                if (result.error || !result.url) {
                  setError(result.message);
                  return;
                }
                setError('');
                onChange(result.url);
              });
            }}
          />
        </label>
      </div>
      {isUploading && <p className="text-xs text-charcoal-muted">업로드 중…</p>}
      {error && <p className="text-xs text-danger-a11y">{error}</p>}
      {value && (
        <SafeImage
          src={value}
          alt=""
          width={240}
          height={140}
          className="h-auto w-40 rounded border border-gray-200 object-cover"
        />
      )}
    </div>
  );
}

function CoverEditor({
  block,
  onChange,
  readOnly,
}: {
  block: CoverBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="커버 제목"
        value={block.title}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, title: v })}
      />
      <Field
        label="부제 (선택)"
        value={block.subtitle}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, subtitle: v })}
      />
      <ImageField
        label="커버 이미지 (선택)"
        value={block.imageUrl}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, imageUrl: v })}
      />
    </div>
  );
}

function TextEditor({
  block,
  onChange,
  readOnly,
}: {
  block: TextBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  if (readOnly) {
    return (
      <div
        className="rounded-lg border border-gray-200 bg-canvas-soft p-3 text-sm text-charcoal"
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }
  return (
    <RichEmailEditor
      value={block.html}
      onChange={({ html }) => onChange({ ...block, html })}
      onDirty={() => {}}
    />
  );
}

function ArtworkCardEditor({
  block,
  onChange,
  readOnly,
}: {
  block: ArtworkCardBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  const [isLoading, startLoading] = useTransition();
  const [error, setError] = useState('');

  const loadSnapshot = (artworkId: string) => {
    if (!artworkId) return;
    startLoading(async () => {
      const result = await getNewsletterArtworkSnapshot(artworkId);
      if (result.error || !result.snapshot) {
        setError(result.message);
        return;
      }
      setError('');
      onChange({ ...block, artworkId, snapshot: result.snapshot });
    });
  };

  if (!block.snapshot.title) {
    return (
      <div className="space-y-2">
        <ArtworkSearchSelect value={block.artworkId} onChange={loadSnapshot} />
        {isLoading && <p className="text-xs text-charcoal-muted">작품 정보 불러오는 중…</p>}
        {error && <p className="text-xs text-danger-a11y">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-canvas-soft p-3">
        {block.snapshot.imageUrl && (
          <SafeImage
            src={block.snapshot.imageUrl}
            alt={block.snapshot.title}
            width={96}
            height={96}
            className="h-16 w-16 shrink-0 rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-charcoal-deep">
            {block.snapshot.title}
          </p>
          <p className="truncate text-xs text-charcoal-muted">{block.snapshot.artistName}</p>
          {block.snapshot.price && (
            <p className="text-xs font-medium text-sun-strong">{block.snapshot.price}</p>
          )}
        </div>
        {!readOnly && (
          <div className="flex shrink-0 flex-col gap-1 text-xs">
            <button
              type="button"
              onClick={() => loadSnapshot(block.artworkId)}
              className="text-primary-strong underline underline-offset-2"
            >
              {isLoading ? '갱신 중…' : '정보 새로고침'}
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...block,
                  artworkId: '',
                  snapshot: {
                    title: '',
                    artistName: '',
                    imageUrl: '',
                    description: '',
                    price: '',
                    url: '',
                  },
                })
              }
              className="text-charcoal-muted underline underline-offset-2"
            >
              다른 작품 선택
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger-a11y">{error}</p>}
      <label className="block space-y-1">
        <span className="text-xs font-medium text-charcoal-muted">
          소개글 (이 호에 맞게 수정 가능)
        </span>
        <textarea
          value={block.snapshot.description}
          disabled={readOnly}
          rows={4}
          onChange={(e) =>
            onChange({ ...block, snapshot: { ...block.snapshot, description: e.target.value } })
          }
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={block.showPrice}
          disabled={readOnly}
          onChange={(e) => onChange({ ...block, showPrice: e.target.checked })}
        />
        가격 표시
      </label>
    </div>
  );
}

function EventBannerEditor({
  block,
  onChange,
  readOnly,
}: {
  block: EventBannerBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="이벤트 제목"
        value={block.title}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, title: v })}
      />
      <Field
        label="일시 문구 (선택)"
        value={block.dateText}
        disabled={readOnly}
        placeholder="예: 2026. 7. 15 — 7. 30"
        onChange={(v) => onChange({ ...block, dateText: v })}
      />
      <ImageField
        label="배너 이미지 (선택)"
        value={block.imageUrl}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, imageUrl: v })}
      />
      <Field
        label="버튼 문구"
        value={block.ctaLabel}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, ctaLabel: v })}
      />
      <Field
        label="버튼 링크 (https://)"
        value={block.ctaUrl}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, ctaUrl: v })}
      />
    </div>
  );
}

function ButtonEditor({
  block,
  onChange,
  readOnly,
}: {
  block: ButtonBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="버튼 문구"
        value={block.label}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, label: v })}
      />
      <Field
        label="버튼 링크 (https://)"
        value={block.url}
        disabled={readOnly}
        onChange={(v) => onChange({ ...block, url: v })}
      />
    </div>
  );
}

export function BlockEditor({
  block,
  onChange,
  readOnly,
}: {
  block: NewsletterBlock;
  onChange: (b: NewsletterBlock) => void;
  readOnly: boolean;
}) {
  switch (block.type) {
    case 'cover':
      return <CoverEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'text':
      return <TextEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'artworkCard':
      return <ArtworkCardEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'eventBanner':
      return <EventBannerEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'button':
      return <ButtonEditor block={block} onChange={onChange} readOnly={readOnly} />;
    case 'divider':
      return <p className="text-xs text-charcoal-soft">구분선 — 설정할 내용이 없습니다.</p>;
  }
}
```

- [ ] **Step 3: 실시간 미리보기 (PreviewPane.tsx)**

```tsx
// app/(portal)/admin/newsletter/[id]/_components/PreviewPane.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

import { renderNewsletterPreview } from '@/app/actions/admin-newsletter';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { NewsletterBlock } from '@/lib/newsletter/blocks';

interface Props {
  issueNo: number;
  title: string;
  preheader: string;
  isAdvertisement: boolean;
  blocks: NewsletterBlock[];
}

// 실제 발송 렌더러(NewsletterEmail)를 서버 액션으로 호출해 iframe에 표시 — WYSIWYG 보장.
export function PreviewPane(props: Props) {
  const payload = JSON.stringify(props);
  const debounced = useDebounce(payload, 800);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    const input = JSON.parse(debounced) as Props;
    renderNewsletterPreview(input).then((result) => {
      if (reqId !== reqIdRef.current) return; // 최신 요청만 반영
      if (result.error || !result.html) {
        setError(result.message);
        return;
      }
      setError('');
      setHtml(result.html);
    });
  }, [debounced]);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-charcoal-deep">
        실시간 미리보기 <span className="font-normal text-charcoal-muted">(실제 발송 렌더러)</span>
      </h2>
      {error && (
        <p className="rounded-lg border border-danger-a11y/40 bg-white px-3 py-2 text-sm text-danger-a11y">
          {error}
        </p>
      )}
      <iframe
        title="뉴스레터 미리보기"
        srcDoc={html}
        sandbox=""
        className="h-[720px] w-full rounded-lg border border-gray-200 bg-white"
      />
    </section>
  );
}
```

- [ ] **Step 4: 편집기 본체 (NewsletterEditor.tsx)**

```tsx
// app/(portal)/admin/newsletter/[id]/_components/NewsletterEditor.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

import {
  deleteNewsletter,
  updateNewsletter,
  type NewsletterDetail,
} from '@/app/actions/admin-newsletter';
import {
  NEWSLETTER_BLOCK_LABELS,
  parseNewsletterBlocks,
  type NewsletterBlock,
} from '@/lib/newsletter/blocks';
import { BlockEditor, createBlock } from './block-editors';
import { PreviewPane } from './PreviewPane';
import { SendPanel } from './SendPanel';

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  scheduled: '예약됨',
  sending: '발송 중',
  sent: '발송 완료',
};

function safeParseBlocks(raw: unknown): NewsletterBlock[] {
  try {
    return parseNewsletterBlocks(raw);
  } catch {
    return [];
  }
}

const INPUT_CLASS =
  'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-canvas-strong disabled:text-charcoal-muted';

export function NewsletterEditor({ initial }: { initial: NewsletterDetail }) {
  const router = useRouter();
  const readOnly = initial.status !== 'draft';

  const [title, setTitle] = useState(initial.title);
  const [preheader, setPreheader] = useState(initial.preheader);
  const [slug, setSlug] = useState(initial.slug);
  const [isAdvertisement, setIsAdvertisement] = useState(initial.is_advertisement);
  const [blocks, setBlocks] = useState<NewsletterBlock[]>(() => safeParseBlocks(initial.blocks));
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    JSON.stringify({
      title: initial.title,
      preheader: initial.preheader,
      slug: initial.slug,
      isAdvertisement: initial.is_advertisement,
      blocks: safeParseBlocks(initial.blocks),
    })
  );
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const fingerprint = JSON.stringify({ title, preheader, slug, isAdvertisement, blocks });
  const dirty = fingerprint !== savedFingerprint;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const save = () =>
    startSaving(async () => {
      const result = await updateNewsletter(initial.id, {
        title,
        preheader,
        slug,
        isAdvertisement,
        blocks,
      });
      setFeedback({ text: result.message, isError: Boolean(result.error) });
      if (!result.error) setSavedFingerprint(fingerprint);
    });

  const remove = () => {
    if (!window.confirm('이 초안을 삭제할까요? 되돌릴 수 없습니다.')) return;
    startDeleting(async () => {
      const result = await deleteNewsletter(initial.id);
      if (result.error) {
        setFeedback({ text: result.message, isError: true });
        return;
      }
      router.push('/admin/newsletter');
    });
  };

  const updateBlock = (index: number, block: NewsletterBlock) =>
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));
  const removeBlock = (index: number) => setBlocks((prev) => prev.filter((_, i) => i !== index));
  const moveBlock = (index: number, dir: -1 | 1) =>
    setBlocks((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const addBlock = (type: NewsletterBlock['type']) =>
    setBlocks((prev) => [...prev, createBlock(type)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/newsletter" className="text-sm text-charcoal-muted hover:underline">
          ← 뉴스레터 목록
        </Link>
        <h1 className="text-lg font-bold text-charcoal-deep">제{initial.issue_no}호</h1>
        <span className="rounded-full bg-canvas-strong px-2 py-0.5 text-xs font-medium text-charcoal-muted">
          {STATUS_LABELS[initial.status] ?? initial.status}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {feedback && (
            <p
              className={clsx(
                'text-sm',
                feedback.isError ? 'text-danger-a11y' : 'text-success-a11y'
              )}
            >
              {feedback.text}
            </p>
          )}
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={remove}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal-muted hover:bg-canvas-soft disabled:opacity-50"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isSaving || !dirty}
                className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving ? '저장 중…' : dirty ? '저장' : '저장됨'}
              </button>
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <p className="rounded-lg border border-gray-200 bg-canvas-strong px-4 py-3 text-sm text-charcoal-muted">
          {initial.status === 'scheduled'
            ? '예약된 뉴스레터는 편집할 수 없습니다. 수정하려면 아래에서 예약을 취소하세요.'
            : '발송이 시작된 뉴스레터는 편집할 수 없습니다. 복제해서 다음 호를 만드세요.'}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-charcoal-deep">기본 정보</h2>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-charcoal-muted">
                이메일 제목 겸 웹 제목
              </span>
              <input
                type="text"
                value={title}
                disabled={readOnly}
                onChange={(e) => setTitle(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-charcoal-muted">
                받은편지함 미리보기 문구 (preheader)
              </span>
              <input
                type="text"
                value={preheader}
                disabled={readOnly}
                onChange={(e) => setPreheader(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-charcoal-muted">
                웹 아카이브 주소 (/newsletter/…)
              </span>
              <input
                type="text"
                value={slug}
                disabled={readOnly}
                onChange={(e) => setSlug(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={isAdvertisement}
                disabled={readOnly}
                onChange={(e) => setIsAdvertisement(e.target.checked)}
              />
              광고성 정보 포함 — 제목 (광고) 표기·발송자 정보 푸터 (작품 판매·이벤트 홍보 포함 시
              필수)
            </label>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-charcoal-deep">블록</h2>
            {blocks.map((block, index) => (
              <div key={block.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-charcoal-muted">
                    {NEWSLETTER_BLOCK_LABELS[block.type]}
                  </span>
                  {!readOnly && (
                    <div className="ml-auto flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        aria-label="위로"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                        className="rounded border border-gray-200 px-2 py-1 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="아래로"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === blocks.length - 1}
                        className="rounded border border-gray-200 px-2 py-1 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label="블록 삭제"
                        onClick={() => removeBlock(index)}
                        className="rounded border border-gray-200 px-2 py-1 text-danger-a11y"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <BlockEditor
                  block={block}
                  onChange={(b) => updateBlock(index, b)}
                  readOnly={readOnly}
                />
              </div>
            ))}

            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                {(Object.keys(NEWSLETTER_BLOCK_LABELS) as Array<NewsletterBlock['type']>).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                      className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-charcoal-muted hover:border-primary hover:text-primary-strong"
                    >
                      + {NEWSLETTER_BLOCK_LABELS[type]}
                    </button>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <PreviewPane
            issueNo={initial.issue_no}
            title={title}
            preheader={preheader}
            isAdvertisement={isAdvertisement}
            blocks={blocks}
          />
          <SendPanel
            newsletterId={initial.id}
            status={initial.status}
            scheduledAt={initial.scheduled_at}
            slug={initial.slug}
            initialChannels={initial.audience_channels}
            dirty={dirty}
          />
        </div>
      </div>
    </div>
  );
}
```

(Task 8 시점에는 `SendPanel` import·사용 두 곳을 주석 처리하고 커밋 — Task 9에서 주석 해제.)

- [ ] **Step 5: 검증 + Commit**

Run: `npm run type-check && npm run lint`
Expected: 통과

```bash
git add app/(portal)/admin/newsletter/
git commit -m "feat(newsletter): 블록 조립식 편집기 + 실시간 미리보기

요약: 블록 6종 편집 폼, 작품 검색 스냅샷 삽입, 발송 렌더러 기반 미리보기

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 발송 패널 (SendPanel)

**Files:**

- Create: `app/(portal)/admin/newsletter/[id]/_components/SendPanel.tsx`
- Modify: `app/(portal)/admin/newsletter/[id]/_components/NewsletterEditor.tsx` (SendPanel 주석 해제)

**Interfaces:**

- Consumes: `previewAudience`(`@/app/actions/admin-broadcast` — `(channel, filter?) => Promise<{ total: number; breakdown: Record<string, number> }>`), `sendNewsletterNow`/`scheduleNewsletter`/`cancelNewsletterSchedule`/`sendNewsletterTest`/`duplicateNewsletter`(Task 5), `NewsletterChannel`/`NEWSLETTER_CHANNEL_LABELS`(`@/lib/newsletter/channels` — Task 4에서 분리한 클라이언트 안전 모듈)
- Produces: `SendPanel({ newsletterId, status, scheduledAt, slug, initialChannels, dirty })`

- [ ] **Step 1: 구현**

```tsx
// app/(portal)/admin/newsletter/[id]/_components/SendPanel.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

import { previewAudience } from '@/app/actions/admin-broadcast';
import {
  cancelNewsletterSchedule,
  duplicateNewsletter,
  scheduleNewsletter,
  sendNewsletterNow,
  sendNewsletterTest,
} from '@/app/actions/admin-newsletter';
import {
  NEWSLETTER_CHANNELS,
  NEWSLETTER_CHANNEL_LABELS,
  type NewsletterChannel,
} from '@/lib/newsletter/channels';

interface Props {
  newsletterId: string;
  status: string;
  scheduledAt: string | null;
  slug: string;
  initialChannels: string[];
  dirty: boolean;
}

export function SendPanel({
  newsletterId,
  status,
  scheduledAt,
  slug,
  initialChannels,
  dirty,
}: Props) {
  const router = useRouter();
  const [channels, setChannels] = useState<NewsletterChannel[]>(() => {
    const initial = initialChannels.filter((c): c is NewsletterChannel =>
      NEWSLETTER_CHANNELS.includes(c as NewsletterChannel)
    );
    return initial.length > 0 ? initial : ['customer'];
  });
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [confirmMode, setConfirmMode] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isActing, startActing] = useTransition();

  // 채널 선택 변경 시 수신자 수 갱신 (기존 count RPC 재사용)
  useEffect(() => {
    let cancelled = false;
    setCounts(null);
    Promise.all(channels.map((c) => previewAudience(c).then((r) => [c, r.total] as const))).then(
      (entries) => {
        if (!cancelled) setCounts(Object.fromEntries(entries));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [channels]);

  const totalCount = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;

  const run = (fn: () => Promise<{ message: string; error?: boolean }>, refresh = true) =>
    startActing(async () => {
      const result = await fn();
      setFeedback({ text: result.message, isError: Boolean(result.error) });
      setConfirmMode(false);
      if (!result.error && refresh) router.refresh();
    });

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-charcoal-deep">발송</h2>

      {feedback && (
        <p className={clsx('text-sm', feedback.isError ? 'text-danger-a11y' : 'text-success-a11y')}>
          {feedback.text}
        </p>
      )}

      {status === 'sending' && (
        <p className="text-sm text-charcoal-muted">
          발송 중입니다. 진행률은{' '}
          <a href="/admin/email" className="text-primary-strong underline">
            이메일 발송 이력
          </a>
          에서 확인하세요.
        </p>
      )}

      {status === 'sent' && (
        <div className="space-y-2 text-sm text-charcoal">
          <p>발송이 완료됐습니다.</p>
          <a
            href={`/newsletter/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-strong underline"
          >
            웹 아카이브에서 보기
          </a>
          <div>
            <button
              type="button"
              disabled={isActing}
              onClick={() =>
                startActing(async () => {
                  const result = await duplicateNewsletter(newsletterId);
                  if (result.error || !result.id) {
                    setFeedback({ text: result.message, isError: true });
                    return;
                  }
                  router.push(`/admin/newsletter/${result.id}`);
                })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal hover:bg-canvas-soft disabled:opacity-50"
            >
              복제해서 다음 호 만들기
            </button>
          </div>
        </div>
      )}

      {status === 'scheduled' && (
        <div className="space-y-2 text-sm text-charcoal">
          <p>
            예약됨:{' '}
            <strong>
              {scheduledAt
                ? new Date(scheduledAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
                : '—'}
            </strong>
          </p>
          <button
            type="button"
            disabled={isActing}
            onClick={() => run(() => cancelNewsletterSchedule(newsletterId))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal hover:bg-canvas-soft disabled:opacity-50"
          >
            예약 취소 (초안으로 되돌리기)
          </button>
        </div>
      )}

      {status === 'draft' && (
        <div className="space-y-4">
          {dirty && (
            <p className="rounded-lg border border-gray-200 bg-canvas-strong px-3 py-2 text-sm text-charcoal-muted">
              저장하지 않은 변경이 있습니다. 저장한 내용으로만 발송됩니다.
            </p>
          )}

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-charcoal-muted">받는 사람</legend>
            {NEWSLETTER_CHANNELS.map((channel) => (
              <label key={channel} className="flex items-center gap-2 text-sm text-charcoal">
                <input
                  type="checkbox"
                  checked={channels.includes(channel)}
                  onChange={(e) =>
                    setChannels((prev) =>
                      e.target.checked ? [...prev, channel] : prev.filter((c) => c !== channel)
                    )
                  }
                />
                {NEWSLETTER_CHANNEL_LABELS[channel]}
                <span className="text-xs text-charcoal-muted">
                  {counts ? `${(counts[channel] ?? 0).toLocaleString('ko-KR')}명` : '집계 중…'}
                </span>
              </label>
            ))}
            <p className="text-xs text-charcoal-soft">
              두 채널 모두 선택해도 중복 수신자는 1통만 받습니다. (합계{' '}
              {totalCount === null ? '집계 중…' : `최대 ${totalCount.toLocaleString('ko-KR')}명`})
            </p>
          </fieldset>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isActing}
              onClick={() => run(() => sendNewsletterTest(newsletterId), false)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal hover:bg-canvas-soft disabled:opacity-50"
            >
              내게 테스트 발송
            </button>

            {!confirmMode ? (
              <button
                type="button"
                disabled={isActing || channels.length === 0}
                onClick={() => setConfirmMode(true)}
                className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                지금 발송…
              </button>
            ) : (
              <span className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary-surface px-3 py-2 text-sm">
                <span className="text-charcoal">
                  {totalCount === null ? '' : `최대 ${totalCount.toLocaleString('ko-KR')}명에게 `}
                  즉시 발송할까요?
                </span>
                <button
                  type="button"
                  disabled={isActing}
                  onClick={() => run(() => sendNewsletterNow(newsletterId, channels))}
                  className="rounded bg-primary-strong px-3 py-1 font-semibold text-white disabled:opacity-50"
                >
                  발송 확정
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode(false)}
                  className="text-charcoal-muted underline"
                >
                  취소
                </button>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-charcoal-muted">예약 발송 시각 (KST)</span>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="block rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={isActing || !scheduleAt || channels.length === 0}
              onClick={() =>
                run(() =>
                  scheduleNewsletter(newsletterId, channels, new Date(scheduleAt).toISOString())
                )
              }
              className="rounded-lg border border-primary-strong px-3 py-2 text-sm font-semibold text-primary-strong hover:bg-primary-surface disabled:opacity-50"
            >
              예약하기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: NewsletterEditor의 SendPanel 주석 해제 + 검증**

Run: `npm run type-check && npm run lint && npm test`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add app/(portal)/admin/newsletter/
git commit -m "feat(newsletter): 발송 패널 — 채널 선택·수신자 수·테스트·즉시/예약 발송

요약: 뉴스레터 발송 UI(2단계 확인, 예약, 예약 취소, 발송 후 복제) 추가

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: 공개 웹 아카이브 + i18n + a11y 스펙

**Files:**

- Modify: `messages/ko.json`, `messages/en.json` (`newsletter` 네임스페이스 추가)
- Create: `app/[locale]/newsletter/page.tsx`
- Create: `app/[locale]/newsletter/[slug]/page.tsx`
- Create: `app/[locale]/newsletter/_components/NewsletterBlocksView.tsx`
- Create: `e2e/a11y/newsletter.spec.ts`

**Interfaces:**

- Consumes: `parseNewsletterBlocks`/`NewsletterBlock`(Task 2), `createSupabaseAdminClient`(`@/lib/auth/server`), `HEADER_SAFE_TOP_PADDING`(`@/lib/header-safe-padding`), `SAWTOOTH_TOP_SAFE_PADDING`(`@/components/ui/SawtoothDivider`), `SafeImage`, `Link`(`@/i18n/navigation`), `routing`(`@/i18n/routing`), `SITE_URL`(`@/lib/constants`)
- Produces: `/[locale]/newsletter`(발행호 목록), `/[locale]/newsletter/[slug]`(개별 호), `NewsletterBlocksView({ blocks, viewArtworkLabel })`

- [ ] **Step 1: i18n 메시지 추가**

`messages/ko.json` 최상위에 (기존 네임스페이스와 알파벳 정렬 무관하게 형제로) 추가:

```json
"newsletter": {
  "title": "뉴스레터",
  "description": "씨앗페가 매달 전하는 작품과 소식",
  "issueLabel": "제{issueNo}호",
  "empty": "아직 발행된 뉴스레터가 없습니다.",
  "backToList": "뉴스레터 목록",
  "publishedOn": "{date} 발행",
  "viewArtwork": "작품 보러가기"
}
```

`messages/en.json`:

```json
"newsletter": {
  "title": "Newsletter",
  "description": "Monthly artworks and stories from Seed Art Festival",
  "issueLabel": "Issue {issueNo}",
  "empty": "No issues published yet.",
  "backToList": "All issues",
  "publishedOn": "Published {date}",
  "viewArtwork": "View artwork"
}
```

- [ ] **Step 2: 블록 웹 렌더러**

```tsx
// app/[locale]/newsletter/_components/NewsletterBlocksView.tsx
import SafeImage from '@/components/common/SafeImage';
import type { NewsletterBlock } from '@/lib/newsletter/blocks';

interface Props {
  blocks: NewsletterBlock[];
  viewArtworkLabel: string; // i18n 라벨은 페이지에서 주입 (이 컴포넌트는 순수 렌더)
}

export function NewsletterBlocksView({ blocks, viewArtworkLabel }: Props) {
  return (
    <div className="space-y-10">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} viewArtworkLabel={viewArtworkLabel} />
      ))}
    </div>
  );
}

function BlockView({
  block,
  viewArtworkLabel,
}: {
  block: NewsletterBlock;
  viewArtworkLabel: string;
}) {
  switch (block.type) {
    case 'cover':
      return (
        <header className="space-y-4 text-center">
          {block.imageUrl && (
            <SafeImage
              src={block.imageUrl}
              alt={block.title}
              width={1200}
              height={800}
              className="h-auto w-full rounded-lg border border-gallery-hairline"
            />
          )}
          <h2 className="text-2xl font-bold text-charcoal-deep md:text-3xl">{block.title}</h2>
          {block.subtitle && <p className="text-charcoal-muted">{block.subtitle}</p>}
        </header>
      );
    case 'text':
      // 저장 시 sanitizeRichEmailHtml 통과한 HTML
      return (
        <div
          className="text-base leading-loose text-charcoal [&_a]:text-primary-strong [&_a]:underline [&_p]:my-4"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case 'artworkCard':
      return (
        <article className="overflow-hidden rounded-lg border border-gallery-hairline bg-white">
          <SafeImage
            src={block.snapshot.imageUrl}
            alt={block.snapshot.title}
            width={960}
            height={720}
            className="h-auto w-full"
          />
          <div className="space-y-2 p-6">
            <p className="text-eyebrow">{block.snapshot.artistName}</p>
            <h3 className="text-artwork-title text-xl">{block.snapshot.title}</h3>
            {block.snapshot.description && (
              <p className="leading-relaxed text-charcoal">{block.snapshot.description}</p>
            )}
            {block.showPrice && block.snapshot.price && (
              <p className="font-semibold text-sun-strong">{block.snapshot.price}</p>
            )}
            <a
              href={block.snapshot.url}
              className="inline-block font-medium text-primary-strong hover:underline"
            >
              {viewArtworkLabel} →
            </a>
          </div>
        </article>
      );
    case 'eventBanner':
      return (
        <div className="space-y-4 rounded-lg bg-gallery-tile p-8 text-center">
          {block.imageUrl && (
            <SafeImage
              src={block.imageUrl}
              alt={block.title}
              width={960}
              height={540}
              className="mx-auto h-auto w-full rounded"
            />
          )}
          <h3 className="text-xl font-bold text-white">{block.title}</h3>
          {block.dateText && <p className="text-sm text-gray-300">{block.dateText}</p>}
          <a
            href={block.ctaUrl}
            className="inline-block rounded-lg bg-primary-strong px-6 py-3 text-sm font-semibold text-white"
          >
            {block.ctaLabel}
          </a>
        </div>
      );
    case 'button':
      return (
        <p className="text-center">
          <a
            href={block.url}
            className="inline-block rounded-lg bg-primary-strong px-6 py-3 text-sm font-semibold text-white"
          >
            {block.label}
          </a>
        </p>
      );
    case 'divider':
      return <hr className="border-gallery-divider" />;
  }
}
```

- [ ] **Step 3: 발행호 목록 페이지**

```tsx
// app/[locale]/newsletter/page.tsx
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';

export const dynamic = 'force-static';
export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

interface NewsletterListItem {
  slug: string;
  issue_no: number;
  title: string;
  preheader: string;
  sent_at: string | null;
}

async function fetchSentNewsletters(): Promise<NewsletterListItem[]> {
  // CI/placeholder 빌드에는 service role key가 없어 throw — graceful 빈 목록 (funding 패턴)
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('newsletters')
      .select('slug, issue_no, title, preheader, sent_at')
      .eq('status', 'sent')
      .order('issue_no', { ascending: false });
    return (data ?? []) as NewsletterListItem[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'newsletter' });
  return { title: t('title'), description: t('description') };
}

export default async function NewsletterListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'newsletter' });
  const newsletters = await fetchSentNewsletters();
  const dateLocale = locale === 'en' ? 'en-US' : 'ko-KR';

  return (
    <div
      className={`min-h-screen bg-canvas-soft ${HEADER_SAFE_TOP_PADDING} ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-bold text-charcoal-deep">{t('title')}</h1>
        <p className="mt-2 text-charcoal-muted">{t('description')}</p>

        {newsletters.length === 0 ? (
          <p className="mt-12 rounded-lg border border-gallery-hairline bg-white px-4 py-10 text-center text-charcoal-muted">
            {t('empty')}
          </p>
        ) : (
          <ul className="mt-10 space-y-4">
            {newsletters.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/newsletter/${n.slug}`}
                  className="block rounded-lg border border-gallery-hairline bg-white p-6 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
                >
                  <p className="text-eyebrow">
                    {t('issueLabel', { issueNo: n.issue_no })}
                    {n.sent_at && (
                      <>
                        {' · '}
                        {t('publishedOn', {
                          date: new Date(n.sent_at).toLocaleDateString(dateLocale, {
                            timeZone: 'Asia/Seoul',
                            dateStyle: 'long',
                          }),
                        })}
                      </>
                    )}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-charcoal-deep">{n.title}</h2>
                  {n.preheader && <p className="mt-1 text-sm text-charcoal-muted">{n.preheader}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 개별 호 페이지**

```tsx
// app/[locale]/newsletter/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { SITE_URL } from '@/lib/constants';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { parseNewsletterBlocks, type NewsletterBlock } from '@/lib/newsletter/blocks';
import { NewsletterBlocksView } from '../_components/NewsletterBlocksView';

export const dynamic = 'force-static';
export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

interface NewsletterRow {
  slug: string;
  issue_no: number;
  title: string;
  preheader: string;
  blocks: unknown;
  sent_at: string | null;
}

async function fetchSentNewsletter(slug: string): Promise<NewsletterRow | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('newsletters')
      .select('slug, issue_no, title, preheader, blocks, sent_at')
      .eq('slug', slug)
      .eq('status', 'sent') // sent만 공개 — draft/scheduled는 404
      .maybeSingle();
    return (data as NewsletterRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.from('newsletters').select('slug').eq('status', 'sent');
    if (!data) return [];
    return data.flatMap((row) => routing.locales.map((locale) => ({ locale, slug: row.slug })));
  } catch {
    return [];
  }
}

function firstImageUrl(blocks: NewsletterBlock[]): string | null {
  for (const b of blocks) {
    if (b.type === 'cover' && b.imageUrl) return b.imageUrl;
    if (b.type === 'artworkCard' && b.snapshot.imageUrl) return b.snapshot.imageUrl;
    if (b.type === 'eventBanner' && b.imageUrl) return b.imageUrl;
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const newsletter = await fetchSentNewsletter(slug);
  if (!newsletter) return { title: 'Not Found' };

  let ogImage: string | undefined;
  try {
    ogImage = firstImageUrl(parseNewsletterBlocks(newsletter.blocks)) ?? undefined;
  } catch {
    ogImage = undefined;
  }
  if (ogImage && !ogImage.startsWith('http')) ogImage = `${SITE_URL}${ogImage}`;

  return {
    title: newsletter.title,
    description: newsletter.preheader || undefined,
    openGraph: ogImage ? { images: [{ url: ogImage }] } : undefined,
  };
}

export default async function NewsletterIssuePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'newsletter' });

  const newsletter = await fetchSentNewsletter(slug);
  if (!newsletter) notFound();

  let blocks: NewsletterBlock[];
  try {
    blocks = parseNewsletterBlocks(newsletter.blocks);
  } catch (err) {
    console.error(`[newsletter/${slug}] invalid blocks:`, err);
    notFound();
  }

  const dateLocale = locale === 'en' ? 'en-US' : 'ko-KR';

  return (
    <div
      className={`min-h-screen bg-canvas-soft ${HEADER_SAFE_TOP_PADDING} ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <article className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <header className="mb-10 text-center">
          <p className="text-eyebrow">
            {t('issueLabel', { issueNo: newsletter.issue_no })}
            {newsletter.sent_at && (
              <>
                {' · '}
                {t('publishedOn', {
                  date: new Date(newsletter.sent_at).toLocaleDateString(dateLocale, {
                    timeZone: 'Asia/Seoul',
                    dateStyle: 'long',
                  }),
                })}
              </>
            )}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-charcoal-deep md:text-4xl">
            {newsletter.title}
          </h1>
        </header>

        <NewsletterBlocksView blocks={blocks} viewArtworkLabel={t('viewArtwork')} />

        <p className="mt-14 text-center">
          <Link href="/newsletter" className="font-medium text-primary-strong hover:underline">
            ← {t('backToList')}
          </Link>
        </p>
      </article>
    </div>
  );
}
```

- [ ] **Step 5: a11y 스펙 추가** (신규 공개 페이지 머지 요건)

```typescript
// e2e/a11y/newsletter.spec.ts
import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test('/ko/newsletter 뉴스레터 아카이브 — WCAG AA a11y 위반 없음', async ({ page }) => {
  await page.goto('/ko/newsletter');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

- [ ] **Step 6: 검증**

Run: `npm run type-check && npm test -- page-header-clearance && npm test`
Expected: 통과 — 특히 `page-header-clearance`가 `/newsletter`, `/newsletter/[slug]`를 자동 스캔해 `HEADER_SAFE_TOP_PADDING`을 인식.

- [ ] **Step 7: Commit**

```bash
git add messages/ko.json messages/en.json app/[locale]/newsletter/ e2e/a11y/newsletter.spec.ts
git commit -m "feat(newsletter): 공개 웹 아카이브 /newsletter 페이지

요약: 발행된 뉴스레터의 웹 보기·목록 페이지와 i18n 메시지, a11y 스펙 추가

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: 최종 검증 + 머지 준비

- [ ] **Step 1: 전체 게이트 실행**

```bash
npm run lint && npm run type-check && npm test && npm run build
```

Expected: 모두 통과. `npm run build`는 generate-changelog → sync-site-stats → next build → verify:i18n-placeholders까지 수행 — **build 통과 없이는 착지 금지** (프로젝트 메모리: 'use server' 파일 회귀는 tsc/jest 통과·build 실패 사례 있음).

- [ ] **Step 2: 수동 스모크 (dev 서버, 사용자 시각 확인 요청)**

```bash
npm run dev
```

체크리스트 (Playwright 금지 — 코드 검토 + 사용자 시각 확인 정책):

1. `/admin/newsletter` → 새 뉴스레터 → 편집기 진입
2. 커버 제목 입력 → 미리보기 800ms 후 갱신 확인
3. 작품 카드 블록 추가 → 작품 검색 → 선택 → 스냅샷(이미지·작가·가격) 카드 확인 → 소개글 수정
4. 저장 → 새로고침 후 유지 확인
5. 내게 테스트 발송 → 수신 메일 렌더 확인 (Gmail 기준)
6. 지금 발송(소규모 채널) 또는 예약 → `/admin/email` 이력에서 진행 확인
7. 발송 완료 후 `/newsletter/[slug]` 공개 페이지 확인

- [ ] **Step 3: push + PR 생성·머지**

```bash
git push -u origin feat/monthly-newsletter
gh pr create --title "feat: 월간 아트 뉴스레터 시스템" --body "$(cat <<'EOF'
## 요약
- 블록 조립식 뉴스레터 편집기 (/admin/newsletter) — 작품 카드 검색 삽입, 실시간 발송 렌더러 미리보기
- 기존 브로드캐스트 파이프라인 재사용 발송 (즉시/예약, 채널 중복 제거, (광고)·수신거부 준수)
- 공개 웹 아카이브 /newsletter/[slug]

스펙: docs/superpowers/specs/2026-07-02-monthly-newsletter-design.md
계획: docs/superpowers/plans/2026-07-02-monthly-newsletter.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --merge
```

(사용자 정책: 커밋 후 push, PR은 열어두지 않고 머지까지 — 단 Step 2의 시각 확인을 먼저 받은 뒤.)
