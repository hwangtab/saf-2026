# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SAF (Seed Art Festival) 2026** - A static website for a social campaign addressing financial discrimination against Korean artists. Built with Next.js 14+ App Router, TypeScript, and Tailwind CSS. Deployed as SSG on Vercel.

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

## Architecture

### Directory Structure

```
app/                    # Next.js App Router pages
├── layout.tsx          # Root layout (Header, Footer, fonts, analytics)
├── page.tsx            # Homepage
├── artworks/           # Artwork gallery and detail pages
│   └── [id]/page.tsx   # Dynamic artwork detail route
├── exhibition/         # Exhibition info with Kakao Map
├── our-reality/        # Statistics visualization (Recharts)
├── our-proof/          # Impact proof page
├── archive/            # 2023 archive (photos, videos)
└── news/[id]/page.tsx  # Dynamic news article route

components/
├── common/             # Layout: Header, Footer, ShareButtons
├── features/           # Complex: charts/, KakaoMap, DynamicCounter, galleries
└── ui/                 # Primitives: Button, SectionTitle, Card

content/                # Data files (TypeScript arrays)
├── artists-data.ts     # Artist profiles (~200KB)
├── saf2026-artworks.ts # Current exhibition artworks
├── saf2023-artworks.ts # 2023 archive artworks
├── news.ts             # News articles
└── artworks-batches/   # Batch artwork data files

lib/
├── constants.ts        # External links, site metadata
├── colors.ts           # BRAND_COLORS (used in tailwind.config.ts)
├── seo-utils.ts        # generateArtworkStructuredData, metadata helpers
├── hooks/              # Custom React hooks
└── motion-variants.ts  # Framer Motion animation presets
```

### Key Patterns

**Client vs Server Components**: Components using hooks, interactivity, or browser APIs need `'use client'` directive. Pages are server components by default with metadata exports.

**Data-Driven Content**: UI components render data from `/content` files. To update content (artists, artworks, news), edit the data files - not the components.

**Brand Colors**: Defined in `lib/colors.ts` as `BRAND_COLORS`, consumed by `tailwind.config.ts`. Use semantic names: `primary`, `accent`, `canvas`, `charcoal`, `sky`, `sun`.

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

## Artwork Data Rules

When adding/modifying artwork data in `content/saf2026-artworks.ts`:

| Field     | Required | Format                                |
| --------- | -------- | ------------------------------------- |
| `id`      | ✅       | Unique numeric string (`"35"`)        |
| `size`    | ✅       | `60x45cm` or `30호` or `"확인 중"`    |
| `price`   | ✅       | `₩5,000,000` format                   |
| `image`   | ✅       | Filename in `public/images/artworks/` |
| `shopUrl` | ✅       | Cafe24 product URL                    |
| `sold`    | -        | `true` when sold                      |

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
NEXT_PUBLIC_KAKAO_MAP_KEY=xxx   # Required: Kakao Map
NEXT_PUBLIC_KAKAO_JS_KEY=xxx    # Required: Kakao sharing
NEXT_PUBLIC_GA_ID=xxx           # Optional: Google Analytics
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
