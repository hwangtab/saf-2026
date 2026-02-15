# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SAF (Seed Art Festival) 2026** - A web platform for a social campaign addressing financial discrimination against Korean artists. Built with Next.js 16, TypeScript, Tailwind CSS, and Supabase. Public pages use SSG; authenticated portals use SSR.

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

**Responsive Design**: Mobile-first with breakpoints at `sm` (640px), `md` (768px), `lg` (1024px - mobile/desktop nav switch), `xl` (1280px).

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
import Image from 'next/image';

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
- Online Gallery: https://auto-graph.co.kr
- Shop: https://koreasmartcoop.cafe24.com

## Pre-commit Hooks

Husky + lint-staged runs automatically on commit:

- `.ts/.tsx`: `eslint --fix` + `prettier --write`
- `.json/.md/.css`: `prettier --write`

Run `npm run build` locally before pushing to verify SSG compatibility.
