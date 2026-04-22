# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SAF (Seed Art Festival) 2026** - A web platform for a social campaign addressing financial discrimination against Korean artists. Built with Next.js 16, TypeScript, Tailwind CSS, and Supabase. Public pages use SSG; authenticated portals use SSR.

### 캠페인 구조 (콘텐츠 제작 시 필수 숙지)

- **출품 작가 ≠ 금융 피해 당사자**. 씨앗페 출품 작가 127명은 동료 예술인의 금융 차별 문제를 해결하기 위해 **자발적으로 참여한 연대자**들이다. 이들을 "대출 못 받는 불우한 작가"로 프레이밍하면 안 됨.
- **금융 차별 데이터**(84.9% 배제율, 48.6% 고금리, 증언 등)는 한국 예술인 전체의 구조적 문제를 다루는 것이지, 출품 작가 개인의 상황이 아님.
- **올바른 프레이밍**: "출품 작가들은 동료 예술인을 돕기 위해 작품을 내놓았고, 작품 판매 수익이 상호부조 기금이 되어 금융 차별을 겪는 예술인에게 저금리 대출로 이어진다."

## Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Development server (http://localhost:3000)
npm run build            # Production build (runs next-image-export-optimizer after)
npm run lint             # ESLint check
npm run type-check       # TypeScript strict mode check
npm run format           # Prettier format all files
```

### Testing

```bash
npm test                           # Run all tests
npm test -- --watch                # Watch mode
npm test -- DynamicCounter         # Run tests matching name pattern
npm test -- __tests__/components/DynamicCounter.test.tsx  # Run single file
```

### Artwork Data Scripts

```bash
npm run validate-artworks   # Validate artwork data integrity
npm run format-artworks     # Format artwork text (spacing, line breaks)
```

### Image & Data Management

```bash
npm run backup:artwork-images              # Backup artwork images
npm run backfill:artwork-images:dry        # Preview image variant backfill
npm run backfill:artwork-images:apply      # Apply image variant backfill
npm run trash:purge:expired:dry            # Preview expired trash purge
npm run trash:purge:expired                # Purge expired trash items
```

### CLI Tools (로컬에 설치됨)

| CLI        | 버전 (2026-04 기준) | 인증 상태          | 대표 용도                                                               |
| ---------- | ------------------- | ------------------ | ----------------------------------------------------------------------- |
| `vercel`   | 51.7.0              | 로그인 완료        | 배포, `vercel env pull/add`, 로그 확인, 프리뷰 URL 생성                 |
| `supabase` | 2.84.2              | 프로젝트 링크 완료 | 마이그레이션(`db push`, `migration new`), 타입 생성, 로컬 DB, 로그 조회 |

- 둘 다 `Bash` 툴로 바로 호출 가능. 별도 설치 명령 제안 불필요
- 프로덕션·공유 리소스에 영향을 주는 명령(`vercel deploy --prod`, `supabase db push`, 데이터 삭제 등)은 실행 전 사용자 확인 필수
- 읽기 전용/조회(`vercel ls`, `vercel env ls`, `supabase projects list`, `supabase migration list` 등)는 승인 없이 자유롭게 사용
- Supabase CLI 최신 버전은 2.90.0이지만 업그레이드는 사용자 판단. 현 버전으로 충분히 동작함
- MCP도 연결되어 있음(`mcp__claude_ai_Supabase__*`, `mcp__claude_ai_Vercel__*`) — 다건 조회·대시보드성 작업은 MCP가 더 빠를 수 있음

## Architecture

### Multi-Portal Structure

The app has three authenticated portals with role-based access:

| Portal           | Path           | Role        | Purpose                                      |
| ---------------- | -------------- | ----------- | -------------------------------------------- |
| Admin            | `/admin/*`     | `admin`     | User/artwork/content management, logs, trash |
| Artist Dashboard | `/dashboard/*` | `artist`    | Manage own artworks, profile                 |
| Exhibitor        | `/exhibitor/*` | `exhibitor` | Manage exhibition artists and artworks       |

Public pages (homepage, artworks, archive, news) are SSG. Authenticated portals use SSR with Supabase auth.

### Directory Structure

```
app/
├── layout.tsx              # Root layout (Header, Footer, fonts, analytics)
├── page.tsx                # Homepage
├── artworks/               # Public artwork gallery
├── our-reality/            # Statistics (Recharts)
├── archive/                # 2023/2026 archives
├── login/, signup/         # Auth pages
├── onboarding/             # Artist onboarding flow
├── admin/                  # Admin portal (requires admin role)
│   ├── layout.tsx          # Admin navigation, requireAdmin()
│   ├── dashboard/          # Admin dashboard
│   ├── users/              # User management
│   ├── artists/, artworks/ # CRUD management
│   ├── content/            # News, videos, FAQ, testimonials
│   └── trash/, logs/       # Soft delete recovery, audit logs
├── dashboard/              # Artist portal (requires artist role + active status)
│   ├── layout.tsx          # Artist navigation, requireArtistActive()
│   ├── (artist)/           # Route group for active artists
│   ├── pending/            # Pending approval state
│   └── suspended/          # Suspended state
└── exhibitor/              # Exhibitor portal (requires exhibitor role)
    └── layout.tsx          # Exhibitor navigation, requireExhibitor()

components/
├── common/             # Header, Footer, ShareButtons, PageTransition
├── features/           # Charts, KakaoMap, DynamicCounter, galleries
├── ui/                 # Button, SectionTitle, Card, form inputs
├── auth/               # SignOutButton, auth-related components
└── providers/          # AnimationProvider, ToastProvider

lib/
├── auth/
│   ├── guards.ts       # requireAuth, requireAdmin, requireArtistActive, requireExhibitor
│   ├── server.ts       # createSupabaseServerClient (SSR)
│   └── client.ts       # createSupabaseBrowserClient
├── supabase.ts         # Basic Supabase client
├── supabase-data.ts    # Data fetching helpers
├── constants.ts        # External links, site metadata
├── colors.ts           # BRAND_COLORS (used in tailwind.config.ts)
├── seo-utils.ts        # Structured data, metadata helpers
└── hooks/              # useDebounce, useIsMobile, useToast, etc.

types/
└── index.ts            # UserRole, EditionType, Artwork, ArtworkSale, etc.
```

### Key Patterns

**Authentication Flow**: Uses Supabase Auth with role-based guards in `lib/auth/guards.ts`. Each portal layout calls its guard (`requireAdmin()`, `requireArtistActive()`, `requireExhibitor()`) before rendering. Artist users have statuses: `pending` → `active` (after admin approval) or `suspended`.

**Client vs Server Components**: Components using hooks, interactivity, or browser APIs need `'use client'` directive. Pages are server components by default with metadata exports.

**Data Sources**: Public pages use static content files (`/content`). Authenticated portals fetch from Supabase. Both sources follow the same type definitions in `/types`.

**Brand Colors**: Defined in `lib/colors.ts` as `BRAND_COLORS`, consumed by `tailwind.config.ts`. Use semantic names: `primary`, `accent`, `canvas`, `charcoal`. Use `a11y` variants for text requiring WCAG AA contrast.

**Color Usage Rules**:

- **`slate-*` 사용 금지** — `tailwind.config.ts`에서 비활성화됨. 사용해도 CSS가 생성되지 않음
- **`indigo-*` / `blue-*` / `red-*` / `green-*` / `amber-*` / `sky-*` / `teal-*` / `orange-*` 등 Tailwind 기본 팔레트 사용 금지** — 포털·공개 페이지 모두 `primary-*`, `accent-*`, `sun-*`, `success-*`, `danger-*`, `charcoal-*`, `gray-*` 브랜드 토큰 사용
- 중성 색상은 반드시 `gray-*` 브랜드 토큰 사용 (`lib/colors.ts`의 `BRAND_COLORS.gray`)
- 텍스트 계층: `text-charcoal-deep` (제목) > `text-charcoal` / `text-gray-800` (본문) > `text-charcoal-muted` / `text-gray-600` (보조) > `text-gray-500` (뮤트)
- **차트·OG 이미지·Satori 렌더 등 런타임 hex가 필요한 곳은 반드시 `import { BRAND_COLORS } from '@/lib/colors'`로 참조.** `stroke="#D1D7E0"` 같은 리터럴 대신 `stroke={BRAND_COLORS.gray[200]}`, 템플릿 문자열(`` `1px solid ${BRAND_COLORS.gray[200]}` ``) 사용

**i18n 필수 규칙**: 사용자 노출 텍스트는 전부 next-intl 메시지로. 배지·상태·버튼 라벨에 `"예약중"`, `"SOLD"`, `"판매완료"` 같은 리터럴 직접 박으면 영어 locale에서도 그대로 노출됨. `messages/ko.json`·`messages/en.json`에 키 추가 후 `useTranslations` / `getTranslations`로 소비.

**Responsive Design**: Mobile-first with breakpoints at `sm` (640px), `md` (768px), `lg` (1024px - mobile/desktop nav switch), `xl` (1280px).

**Image Components**: This project uses `next-image-export-optimizer` for static export. **Never use `import Image from 'next/image'` directly** — it breaks the static export build.

- Local images (`public/` directory): `import ExportedImage from 'next-image-export-optimizer'`
- Remote artwork images (Supabase storage URLs): `import SafeImage from '@/components/common/SafeImage'`

**Sawtooth Divider 여백 규칙**: Footer와 FooterSlider 상단에는 `SawtoothDivider position="top"`이 있고, 이 톱니는 `-translate-y-full`로 **위 섹션의 마지막 24~40px를 덮어씁니다**. 따라서 Footer 위에 렌더되는 페이지 최상위 컨테이너(특히 `min-h-screen` 래퍼)는 반드시 충분한 하단 패딩을 가져야 함.

- 하드코딩 금지. `import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider'`로 표준 상수 사용
- 예시: `<div className={\`min-h-screen ${SAWTOOTH_TOP_SAFE_PADDING}\`}>`
- `pb-12` 등 짧은 값은 버튼·본문이 톱니에 묻히므로 사용 금지. 여백을 더 키우고 싶다면 상수 자체를 수정

**Header 투명화 규칙 (Hero 경로)**: 특정 경로에서는 헤더가 페이지 상단에서 투명하게 렌더됩니다. 판정 로직은 [lib/hero-routes.ts](lib/hero-routes.ts)가 **단일 출처**. 과거 `/stories`, `/transparency`, `/terms-consent` 세 건의 반복 버그가 있어 재발 방지 구조를 마련했습니다.

- **정확 매칭이 필요하면** `HERO_EXACT`에 경로 추가 (예: `/about`, `/our-reality`)
- **하위 경로까지 포함하려면** `HERO_PREFIXES`에 추가. **반드시 슬래시로 끝나야 함** — `Slashed = \`${string}/\`` 타입이 컴파일 타임에 이를 강제 (`'/terms'`입력 시 타입 에러,`'/terms/'`로 작성)
- 훅/컴포넌트에서 `pathname.startsWith('/foo')` 하드코딩 금지. 대신 `isHeroRoute(pathname)` / `isArtworkDetail(pathname)` 호출
- 새 hero 페이지 추가 후 [**tests**/lib/hero-routes.test.ts](__tests__/lib/hero-routes.test.ts)에 케이스 추가

## Code Style

### TypeScript (Strict)

- `strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`
- Avoid `as any`, `@ts-ignore`, `@ts-expect-error`

### Prettier

- 2 spaces, single quotes, semicolons required
- Print width: 100 characters

### Import Order

```typescript
// 1. React/Next.js
import { useState } from 'react';
// ⚠️ Do NOT use 'next/image' directly — use ExportedImage or SafeImage (see Key Patterns)

// 2. External packages
import { useInView } from 'react-intersection-observer';
import clsx from 'clsx';

// 3. Internal (@/)
import Button from '@/components/ui/Button';
import { EXTERNAL_LINKS } from '@/lib/constants';

// 4. Types
import type { Artist } from '@/types';
```

### Conditional Classes

Use `clsx()` for dynamic className composition:

```typescript
import clsx from 'clsx';
const styles = clsx('base-classes', isActive && 'active-classes');
```

## Key Types

Defined in `types/index.ts`:

| Type              | Purpose                                                |
| ----------------- | ------------------------------------------------------ |
| `UserRole`        | `'admin' \| 'artist' \| 'user' \| 'exhibitor'`         |
| `EditionType`     | `'unique' \| 'limited' \| 'open'` for artwork editions |
| `BaseArtwork`     | Core artwork fields from DB                            |
| `HydratedArtwork` | Artwork with artist profile/history for detail pages   |
| `ArtworkListItem` | Lightweight shape for gallery grids                    |
| `ArtworkSale`     | Sales record with price, date, quantity                |

## Artwork Data Rules

When adding/modifying artwork data in `content/saf2026-artworks.ts`:

| Field           | Required | Format                                          |
| --------------- | -------- | ----------------------------------------------- |
| `id`            | ✅       | Unique numeric string (`"35"`)                  |
| `size`          | ✅       | `60x45cm` or `30호` or `"확인 중"`              |
| `price`         | ✅       | `₩5,000,000` format                             |
| `images`        | ✅       | Array of filenames in `public/images/artworks/` |
| `shopUrl`       | ✅       | Cafe24 product URL                              |
| `edition_type`  | -        | `'unique'`, `'limited'`, or `'open'`            |
| `edition_limit` | -        | Number (only for `limited` edition)             |
| `sold`          | -        | `true` when sold                                |

- Use lowercase `x` in size (not `×`)
- Use `"확인 중"` for missing info (not empty string)
- Run `npm run validate-artworks` after changes

### CSV Import Rules

When extracting data from CSV:

1. **Never shorten** `profile`, `description`, `history` content - preserve full text
2. Only clean formatting: collapse 3+ newlines to 2, trim whitespace
3. Run `npm run format-artworks` to apply formatting rules automatically

## Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
# Required: Supabase (for auth and data)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Required: Kakao APIs
NEXT_PUBLIC_KAKAO_MAP_KEY=xxx   # Kakao Map JavaScript key
NEXT_PUBLIC_KAKAO_JS_KEY=xxx    # Kakao sharing JavaScript key

# Optional
NEXT_PUBLIC_GA_ID=xxx           # Google Analytics
NEXT_PUBLIC_SITE_URL=xxx        # OAuth redirect base URL
```

## External Links

All external links must have `target="_blank" rel="noopener noreferrer"`.

Key URLs (defined in `lib/constants.ts`):

- Donate: https://www.socialfunch.org/SAF
- Online Gallery: https://www.saf2026.com

## Video Pipeline (Remotion + edge-tts)

`video/` 디렉토리에 Remotion 기반 영상 생성 파이프라인이 있음. 사용자가 "ㅇㅇ 주제로 영상 만들어줘"라고 요청하면 이 파이프라인을 사용할 것.

### 구조

```
video/
├── video-config.json          # 영상 콘텐츠 정의 (씬, 나레이션, 데이터)
├── src/
│   ├── index.ts               # Remotion 진입점 (registerRoot)
│   ├── Root.tsx                # Composition 등록
│   ├── Video.tsx               # 메인 컴포지션 (씬 시퀀스 + 오디오 + 자막)
│   ├── scenes/                 # 씬 템플릿 컴포넌트
│   │   ├── IntroScene.tsx      # 로고 애니메이션 인트로
│   │   ├── HeroScene.tsx       # 타이틀/CTA (title, subtitle)
│   │   ├── StatScene.tsx       # 통계 카운트업 + SFX (value, label)
│   │   ├── ListScene.tsx       # 번호 글머리 목록 (title, items[])
│   │   ├── GridScene.tsx       # 카드 그리드 + 이미지/Ken Burns (title, cards[])
│   │   ├── FlowScene.tsx       # 흐름도 (title, steps[])
│   │   ├── ChatScene.tsx       # 대화/증언 (title, messages[])
│   │   ├── MontageScene.tsx    # 전체 화면 작품 이미지 전환 (images[], captions[])
│   │   └── OutroScene.tsx      # CTA + 구독 유도 아웃트로
│   ├── components/             # Subtitle, Background, Logo, Particles
│   ├── schemas/video-config.ts # Zod 스키마
│   └── utils/                  # 애니메이션, 브랜드 색상
├── scripts/
│   ├── generate-tts.py         # edge-tts 한국어 음성 생성 (SentenceBoundary 사용)
│   └── build-video.sh          # 전체 파이프라인 (TTS → 렌더링)
├── public/
│   ├── voices/                 # 생성된 MP3 + timings.json
│   ├── bgm/                    # 배경음악 (ambient-pad.mp3)
│   ├── sfx/                    # 효과음 (whoosh, tick, pop)
│   └── artworks/               # 영상용 작품 이미지
├── .venv/                      # Python venv (edge-tts)
└── out/                        # 렌더링된 MP4 출력
```

### 영상 생성 명령어

```bash
cd video && bash scripts/build-video.sh    # 전체 빌드 (TTS + 렌더링)
cd video && npm run studio                 # Remotion Studio 미리보기
cd video && npm run render                 # 영상만 렌더링
```

### 영상 생성 워크플로우

1. `video/video-config.json` 작성/수정 (씬 구성, 나레이션 텍스트)
2. `generate-tts.py` 실행 → MP3 + timings.json 생성
3. Remotion 렌더링 → MP4 출력

### 씬 템플릿 종류

| 타입      | 용도                         | 주요 props                                            |
| --------- | ---------------------------- | ----------------------------------------------------- |
| `intro`   | 로고 애니메이션 인트로       | `durationInSeconds`                                   |
| `hero`    | 타이틀/엔딩                  | `title`, `subtitle`, `backgroundGradient`             |
| `stat`    | 통계 수치 + 카운트업 + SFX   | `value`, `label`, `description`                       |
| `list`    | 번호 목록                    | `title`, `items[]`                                    |
| `grid`    | 카드 배열 + 이미지 Ken Burns | `title`, `cards[{label, value, description, image?}]` |
| `flow`    | 흐름도                       | `title`, `steps[{label, description}]`                |
| `chat`    | 증언/대화                    | `title`, `messages[{text, sender, role}]`             |
| `montage` | 전체 화면 작품 이미지 전환   | `images[]`, `captions?[]`                             |
| `outro`   | CTA + 구독 유도              | `durationInSeconds`                                   |

모든 씬 공통 props: `narration` (TTS 음성), `keywords?` (자막 하이라이트), `durationInSeconds?` (생략 시 TTS 길이 기준 자동 설정), `rate?` (TTS 속도 조절, 예: "-5%"), `pitch?` (TTS 음높이 조절, 예: "+2Hz").

### 프로 기능

- **씬 전환**: `@remotion/transitions` — fade/slide 교대 (Video.tsx)
- **BGM**: `video-config.json`의 `bgm` 필드, 보이스오버 시 자동 볼륨 다운
- **파티클/부유 도형**: `Particles.tsx`, `FloatingShapes` — 모든 씬 배경에 자동 적용
- **키워드 하이라이트**: `keywords[]` 배열의 단어가 자막에서 노란색 볼드로 강조
- **SFX**: StatScene에 tick, ListScene/GridScene에 pop, 전환 시 whoosh
- **작품 이미지**: GridScene의 `cards[].image`에 경로 지정 시 Ken Burns 효과 적용
- **작품 몽타주**: MontageScene으로 전체 화면 이미지 크로스페이드 + Ken Burns
- **비네팅/노이즈 텍스처**: Background 컴포넌트에서 자동 적용
- **한국어 줄바꿈**: 모든 씬 컴포넌트에 `KOREAN_TEXT` (wordBreak: 'keep-all') 적용됨

### TTS 참고

- 한국어 기본 음성: `ko-KR-InJoonNeural` (남성, 가장 자연스러움)
- 대안 음성: `ko-KR-SunHiNeural` (여성), `ko-KR-HyunsuMultilingualNeural` (남성 다국어)
- 한국어는 `SentenceBoundary`로 자막 타이밍 반환 (WordBoundary 아님)
- Python venv 위치: `video/.venv/`
- 씬별 `rate` (속도), `pitch` (음높이) 조절 가능 — video-config.json에서 씬 객체에 직접 지정
- **나레이션 작성 팁** (TTS 품질 최적화):
  - 짧은 문장으로 끊기 (15~20자). 긴 복합문 금지
  - 쉼표로 자연스러운 호흡 삽입
  - 숫자는 숫자 그대로 쓰기 (한글 변환하면 더 어색함)
  - 감정적 대목은 `rate: "-5%"` ~ `"-8%"`, 정보 전달은 기본 `"+0%"`
- **커스텀 SSML은 edge-tts v5+에서 지원 안 됨** — rate/pitch/volume 파라미터만 사용 가능

## Commit Convention

Semantic format: `type(scope): subject`

커밋 본문에 반드시 `요약:` 줄을 포함할 것. 개발 이력 페이지(`/admin/changelog`)에서 한국어로 표시됨.

```
feat(admin): add some new feature

요약: 어떤 새 기능 추가

- detail 1
- detail 2

Co-Authored-By: ...
```

`요약:` 줄이 없으면 영문 subject가 그대로 노출되어 비개발자 관리자가 이해할 수 없음.

## Pre-commit Hooks

Husky + lint-staged runs automatically on commit:

- `.ts/.tsx`: `eslint --fix` + `prettier --write`
- `.json/.md/.css`: `prettier --write`

Run `npm run build` locally before pushing to verify SSG compatibility.
