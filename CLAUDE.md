# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SAF (Seed Art Festival) 2026** is a static website for a social campaign addressing financial discrimination against Korean artists. The site serves as the digital hub for the campaign, combining data visualization, storytelling, and fundraising participation channels.

**Key Characteristics:**

- Static site (Next.js with SSG)
- No backend/database required
- Mobile-first design (Tailwind CSS)
- Multiple interactive features (charts, maps, animations)
- SEO and accessibility focused

## Architecture

### Technology Stack

- **Framework**: Next.js (React) with Static Site Generation (SSG)
- **Styling**: Tailwind CSS (Mobile-First approach)
- **Charts**: Recharts (for statistics visualization)
- **Maps**: react-kakao-maps-sdk (Kakao Map API)
- **Animations**: framer-motion, react-countup, react-intersection-observer
- **Video**: LiteYouTubeEmbed (lazy loading)
- **Sharing**: react-share
- **Code Quality**: ESLint, Prettier, husky, lint-staged
- **Hosting**: Vercel (with automatic preview deployments)

### Project Structure (Expected)

```
saf/
├── app/                          # Next.js 13+ App Router
│   ├── page.tsx                 # Home page
│   ├── layout.tsx               # Root layout with GNB/Footer
│   ├── (pages)/
│   │   ├── our-reality/         # 우리의 현실 (statistics page)
│   │   ├── our-proof/           # 우리의 증명 (proof of impact)
│   │   ├── artists/             # 참여 예술가 (participating artists)
│   │   ├── archive/             # 아카이브 (archive/videos/news)
│   │   ├── exhibition/          # 전시 안내 (exhibition info with map)
│   │   └── ...
│   └── api/                     # (Not used - static site)
├── components/
│   ├── common/
│   │   ├── Header.tsx           # GNB with navigation
│   │   ├── Footer.tsx
│   │   └── ...
│   ├── features/
│   │   ├── StatisticsCharts.tsx  # 6 interactive charts (Recharts)
│   │   ├── DynamicCounter.tsx    # Animated statistics numbers
│   │   ├── KakaoMap.tsx          # Exhibition map
│   │   ├── ShareButtons.tsx      # SNS sharing
│   │   └── ...
│   └── ui/                      # Reusable UI components
├── content/
│   ├── artists.ts               # Array of Artist objects
│   ├── news.ts                  # Array of News objects
│   └── ...
├── lib/
│   ├── metadata.ts              # Page-specific metadata/OG tags
│   └── constants.ts
├── public/
│   ├── images/                  # Static images
│   └── ...
├── styles/
│   └── globals.css              # Global Tailwind styles
├── .env.local.example           # Example env file (Kakao Map API key)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── eslintrc.json
├── .prettierrc
└── README.md
```

## Key Features & Implementation Details

### 1. Data-Driven Content

- **Artist List** (`/content/artists.ts`): Dynamically rendered on the Artists page using `.map()`
- **News/Articles** (`/content/news.ts`): Dynamically rendered on Archive page
- Update content without changing UI components - edit data files only

### 2. Statistics Visualization (우리의 현실 page)

- **6 Interactive Charts** using Recharts with tooltips on hover
- Graph types: Pie charts, horizontal/vertical bar charts
- All data hardcoded in component; can be refactored to use data files later
- Must be responsive on mobile (may scroll horizontally if needed)

### 3. Dynamic Counter Animation (Home page)

- Use `react-intersection-observer` to detect when section enters viewport
- Trigger `react-countup` animation only once per page visit
- Numbers should animate from 0 to target value over 1.5-2 seconds

### 4. Interactive Map (전시 안내 page)

- Kakao Map API via `react-kakao-maps-sdk`
- API key stored in `.env.local` as `NEXT_PUBLIC_KAKAO_MAP_KEY`
- Display marker at Insa Art Center with info window on click
- Allow user interaction (zoom, pan)

### 5. Video Lazy Loading (아카이브 page)

- Use `LiteYouTubeEmbed` for YouTube videos
- Load only thumbnail + play button initially
- Load iframe only when user clicks play
- Critical for page load performance

### 6. SNS Sharing

- Use `react-share` library
- Support: Facebook, KakaoTalk, X(Twitter), Link Copy
- Open Graph meta tags drive shared preview appearance
- Each page should have unique OG tags (title, description, image)

### 7. Navigation & Mobile Menu

- **Desktop** (`lg` breakpoint+): Horizontal menu bar with all items
- **Mobile** (`lg` below): Hamburger menu → full-screen overlay menu
- Use `framer-motion` for smooth open/close animation
- Highlight current page using Next.js `usePathname()`
- "❤️ 후원하기" (Donate) button always prominent/highlighted

### 8. External Links

- **All external links must have**: `target="_blank" rel="noopener noreferrer"`
- **Key external links**:
  - Donate: https://www.socialfunch.org/SAF
  - Online Gallery: https://auto-graph.co.kr
  - Loan Info: https://www.kosmart.co.kr/loan
  - News articles (various)

## Development Commands

```bash
# Install dependencies
npm install

# Development server (with hot reload)
npm run dev

# Build for production (static export)
npm run build

# Preview production build locally
npm run start

# Run linting
npm run lint

# Format code with Prettier
npm run format

# Run tests (if configured)
npm run test

# Type checking
npm run type-check
```

## Important Breakpoints (Tailwind CSS)

- **sm**: 640px
- **md**: 768px
- **lg**: 1024px (key breakpoint for mobile → desktop menu)
- **xl**: 1280px

## Performance & Quality Standards

### Performance Targets (from NFR-01)

- **Google PageSpeed Insights**: Mobile score ≥80
- **Largest Contentful Paint (LCP)**: <2.5s
- **Image Format**: Serve WebP via Next.js `<Image>` component
- **Code Splitting**: Use dynamic imports for heavy components

### Accessibility (NFR-03)

- Semantic HTML required
- All images must have meaningful `alt` text
- Keyboard navigation must work (Tab, Enter)
- Lighthouse Accessibility score ≥85

### SEO (NFR-02)

- Each page must have unique `<title>` and `<meta name="description">`
- Implement Open Graph tags (`og:title`, `og:description`, `og:image`)
- Use semantic HTML headings (h1, h2, h3)
- Schema markup for structured data (if applicable)

### Code Quality (FR-11)

- **Formatter**: Prettier (auto-format on save)
- **Linter**: ESLint with Next.js config
- **Pre-commit hooks**: husky + lint-staged to enforce rules before commit
- **GitHub Actions**: CI pipeline for automated linting/testing

## Content Management

### Update Process

1. **Non-developer updates**: Edit files in `/content` folder (artists.ts, news.ts)
2. **Developer updates**: Edit component code or add assets to `/public/images`
3. **Workflow**: Create PR → Preview on Vercel → Review → Merge to main

### Data File Format (TypeScript)

```typescript
// content/artists.ts
export interface Artist {
  id: string;
  name: string;
  description: string;
  image: string;
  // ... other fields
}

export const artists: Artist[] = [
  { id: '1', name: '...', ... },
  // ...
];

// Usage in component:
import { artists } from '@/content/artists';
artists.map(artist => <ArtistCard key={artist.id} artist={artist} />)
```

## Deployment & Environment

### Hosting

- **Platform**: Vercel (connected to GitHub)
- **Auto-deploy**: Merge to main → auto-build & deploy
- **Preview**: Every PR gets preview URL via Vercel bot
- **Environment**: Static site (no server-side logic needed)

### Environment Variables

```
# .env.local (never commit)
NEXT_PUBLIC_KAKAO_MAP_KEY=your_kakao_api_key_here
```

## Reference Documentation

See `/docs` folder for complete specifications:

- **PRD.md**: Product Requirements & design system
- **MRD.md**: Market requirements & user personas
- **FRD.md**: Detailed functional specifications
- **TRD.md**: Test scenarios & QA requirements

## Key Implementation Notes

1. **Mobile-First**: Design for 360px mobile first, then enhance for larger screens
2. **Responsive Images**: Always use Next.js `<Image>` component (never `<img>`)
3. **Metadata**: Use Next.js `Metadata` API (app router) for SEO tags
4. **Fonts**: Use Pretendard or SUIT fonts (already common in Korean web)
5. **Colors**: Design system uses dark/white tones + warm yellow accent (hope/solidarity)
6. **Animation**: Prefer framer-motion for complex animations; Tailwind for simple transitions
7. **Testing**: Write tests for core interactive features (charts, map, animations)
8. **Accessibility**: Test keyboard navigation before PR; run Lighthouse audit

## Common Gotchas

- **Kakao Map API**: Requires API key; test with preview deployments early
- **YouTube Embedding**: Must use LiteYouTubeEmbed, not standard iframe (performance)
- **Export Static**: Configure `next.config.js` for static export if needed
- **Browser Support**: Test Safari thoroughly (differences in CSS grid/flexbox)
- **Mobile Menu**: Ensure overlay menu doesn't break on notched devices (safe area insets)
