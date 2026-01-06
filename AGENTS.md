# Repository Guidelines

> SAF (Seed Art Festival) 2026 - Next.js 14 App Router with TypeScript and Tailwind CSS

## Project Structure

```
saf/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (Header, Footer)
│   ├── page.tsx            # Homepage
│   ├── error.tsx           # Error boundary
│   └── [route]/page.tsx    # Route pages
├── components/
│   ├── common/             # Layout components (Header, Footer, ShareButtons)
│   ├── features/           # Feature components (Charts, Counters, Maps)
│   └── ui/                 # Reusable primitives (Button, SectionTitle)
├── content/                # Typed data objects (artists, news, artworks)
├── lib/                    # Utilities, constants, types
├── public/images/          # Static assets (artworks/, hero/, logo/)
├── scripts/                # Node.js utility scripts
├── styles/globals.css      # Global styles + Tailwind
└── docs/                   # Documentation and specs
```

## Commands

### Development

```bash
npm install              # Install dependencies (run first)
npm run dev              # Development server at http://localhost:3000
npm run build            # Production build (verifies SSG)
npm run start            # Start production server
```

### Quality Checks

```bash
npm run lint             # ESLint check
npm run type-check       # TypeScript strict mode check
npm run format           # Prettier format all files
npm run format -- --check  # Check formatting without writing
```

### Testing

```bash
npm test                           # Run all tests
npm test -- --watch                # Watch mode
npm test -- DynamicCounter         # Run tests matching name pattern
npm test -- __tests__/components/DynamicCounter.test.tsx  # Run single file
npm test -- --coverage             # Coverage report
```

### Pre-commit (Husky + lint-staged)

Automatically runs on commit: `eslint --fix` and `prettier --write` on staged `.ts/.tsx` files.

## Code Style

### Formatting (Prettier)

- **Indent**: 2 spaces (no tabs)
- **Quotes**: Single quotes (`'`)
- **Semicolons**: Required
- **Trailing commas**: ES5 style
- **Print width**: 100 characters
- **Line endings**: LF

### Linting (ESLint)

- Extends: `next/core-web-vitals`
- `console.log` triggers warning (use `console.error` or `console.warn`)
- `react/no-unescaped-entities`: error
- Use `<Link>` instead of `<a>` for internal navigation

### TypeScript (Strict Mode)

```typescript
// tsconfig.json enforces:
"strict": true,
"noImplicitAny": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"noImplicitReturns": true
```

**Forbidden patterns:**

- `as any`, `@ts-ignore`, `@ts-expect-error`
- Empty catch blocks `catch(e) {}`
- Implicit `any` types

## Naming Conventions

| Type             | Convention             | Example                                |
| ---------------- | ---------------------- | -------------------------------------- |
| Components       | PascalCase             | `DynamicCounter.tsx`, `Button.tsx`     |
| Utilities        | camelCase              | `parsePrice.ts`, `scroll.ts`           |
| Types/Interfaces | PascalCase             | `interface Artist`, `type NewsArticle` |
| Constants        | SCREAMING_SNAKE_CASE   | `EXTERNAL_LINKS`, `SITE_URL`           |
| CSS classes      | Tailwind utilities     | `bg-primary text-white`                |
| Test files       | `<Component>.test.tsx` | `DynamicCounter.test.tsx`              |

## Import Order

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';

// 2. External packages
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import clsx from 'clsx';

// 3. Internal aliases (@/)
import Button from '@/components/ui/Button';
import { EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';

// 4. Types (when importing type only)
import type { Artist } from '@/lib/types';
```

## Component Patterns

### Client Components

```typescript
'use client';  // First line for client components

import { useState } from 'react';

interface ComponentProps {
  items: Item[];
  onSelect?: (item: Item) => void;
}

export default function Component({ items, onSelect }: ComponentProps) {
  // Hooks at top
  const [selected, setSelected] = useState<Item | null>(null);

  // Handlers
  const handleClick = (item: Item) => {
    setSelected(item);
    onSelect?.(item);
  };

  return (
    <div className="container-max py-12">
      {items.map((item) => (
        <div key={item.id} onClick={() => handleClick(item)}>
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

### Server Components (default)

```typescript
import type { Metadata } from 'next';
import { SITE_URL, OG_IMAGE } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Page Title - 씨앗페 2026',
  description: 'Page description',
  openGraph: { /* ... */ },
};

export default function Page() {
  return <main>{/* content */}</main>;
}
```

## Styling

- **Framework**: Tailwind CSS with custom theme in `tailwind.config.ts`
- **Conditional classes**: Use `clsx()` for dynamic className
- **Brand colors**: `primary`, `accent`, `canvas`, `charcoal`, `sky`, `sun`
- **Responsive**: Mobile-first (`md:`, `lg:`, `xl:` breakpoints)

```typescript
import clsx from 'clsx';

const styles = clsx(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' ? 'primary-styles' : 'secondary-styles'
);
```

## Error Handling

```typescript
// Use try-catch with specific error handling
try {
  await asyncOperation();
} catch (error) {
  console.error('Operation failed:', error);
  // Re-throw or handle appropriately
}
```

## Testing Guidelines

- **Location**: `__tests__/` directory or co-located with components
- **Framework**: Jest + React Testing Library
- **Pattern**: Arrange-Act-Assert

```typescript
import { render, screen } from '@testing-library/react';
import Component from '@/components/features/Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component items={mockItems} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Commit Message Format

Use Korean scope prefix or Conventional Commits:

```
UI 개선: 에러 경계 페이지 UX 강화
스타일 개선: 모바일 반응형 레이아웃 수정
feat(content): add new artwork data
fix: resolve hydration mismatch in slider
refactor: cleanup unused CSS
```

- Keep subjects under 72 characters
- Include screenshots for UI changes in PR body

## Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
NEXT_PUBLIC_KAKAO_MAP_KEY=your_key  # Required for map
NEXT_PUBLIC_KAKAO_JS_KEY=your_key   # Required for sharing
NEXT_PUBLIC_GA_ID=your_id           # Optional: Google Analytics
```

**Never commit secrets. All client-exposed vars must use `NEXT_PUBLIC_` prefix.**

## Deployment

- **Platform**: Vercel (auto-deploys on push to `main`)
- **Build**: Static Site Generation (SSG)
- **Preview**: PR creates preview URL automatically

Run `npm run build` locally before pushing to verify SSG compatibility.
