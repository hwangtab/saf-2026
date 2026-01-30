# SAF 2026 Master Guide

> **Note**: This document serves as the comprehensive manual for the SAF (Seed Art Festival) 2026 project. It is intended for developers, project managers, and new team members.

## 1. Project Overview & Goals

### 1.1 Purpose
**SAF (Seed Art Festival)** is a social campaign and art festival aimed at resolving the financial crisis and discrimination faced by Korean artists. This website serves as the digital hub for the 2026 edition of the festival, providing:
- An online exhibition of participating artworks.
- Information about the festival, artists, and events.
- Tools for purchasing artworks (linking to Cafe24).
- Archives of previous events (2023).

### 1.2 Key Objectives
- **Accessibility**: Ensure diverse audiences can easily access artist information and artworks.
- **Maintainability**: Enable non-developers (content managers) to update artist and artwork data easily via structured data files.
- **Performance**: High-speed loading and SEO optimization using Static Site Generation (SSG).

---

## 2. Technology Stack

This project uses a modern web development stack focused on performance and developer experience.

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14+** | App Router architecture, Server Components by default. |
| **Language** | **TypeScript** | Static typing for reliability and developer safety. |
| **Styling** | **Tailwind CSS** | Utility-first CSS framework with a custom design system. |
| **Deployment** | **Vercel** | Static Site Generation (SSG) with `output: 'export'`. |
| **State** | **React Hooks** | Standard React state management + Context API where needed. |
| **Maps** | **Kakao Map API** | For displaying exhibition locations. |
| **Sharing** | **Kakao Link** | For social sharing functionality. |
| **Visuals** | **Recharts** | For statistical data visualization. |

---

## 3. Directory Structure & Architecture

The project follows the standard Next.js App Router structure, with a clear separation between code and content.

```bash
saf-2026/
├── app/                    # 🟢 Application Routing & Pages
│   ├── layout.tsx          # Root layout (Header, Footer, Fonts)
│   ├── page.tsx            # Homepage
│   ├── artworks/           # Artwork Browser & Detail Pages
│   │   └── [id]/           # Dynamic Route for individual artworks
│   ├── archive/            # Archive Page (2023 Media)
│   ├── exhibition/         # Exhibition Info (Maps)
│   ├── news/               # News Articles
│   └── our-reality/        # Statistics/Charts Page
│
├── components/             # 🧩 UI Components
│   ├── common/             # Global components (Header, Footer, SEO)
│   ├── features/           # Complex Logic (KakaoMap, Gallery, Charts)
│   └── ui/                 # Reusable Atoms (Button, Card, SectionTitle)
│
├── content/                # 📝 Data Layer (The "CMS")
│   ├── saf2026-artworks.ts # Main artwork data (Auto-validated)
│   ├── artists-data.ts     # Artist profiles
│   ├── news.ts             # News items
│   └── artworks-batches/   # Split data files for manageability
│
├── lib/                    # 🛠 Utilities & Helpers
│   ├── colors.ts           # Design system color tokens
│   ├── constants.ts        # Global constants (URLs, Meta info)
│   ├── seo-utils.ts        # Structured data (JSON-LD) generators
│   └── hooks/              # Custom React hooks (e.g. useDevice)
│
├── public/                 # 🖼 Static Assets
│   ├── images/             # Optimized images
│   └── scripts/            # Third-party scripts
│
└── scripts/                # ⚡️ Automation Scripts
    ├── format_artworks.js  # Text formatting for CSV imports
    └── validate_artworks.js# Data integrity checks
```

---

## 4. Key Features & Business Logic

### 4.1 Content Management System (File-Based)
Instead of a database, this project uses TypeScript files in the `content/` directory as a lightweight CMS.
- **Workflow**: Content editors update `.ts` files -> Developers commit & push -> Vercel auto-deploys.
- **Validation**: Strict validation ensures data integrity.
    - Run `npm run validate-artworks` to check for missing fields or duplicate IDs.

### 4.2 Artwork Data Pipeline
Artwork data is crucial and follows strict rules found in `GEMINI.md` / `CLAUDE.md`.
- **Batching**: Data may be split into multiple batch files in `content/artworks-batches/` to handle thousands of items.
- **Formatting**: The `npm run format-artworks` script automatically cleans up text (removes excessive newlines, trims whitespace) to ensure display consistency.

### 4.3 Image Optimization
Since the site is effectively static (SSG), we use `next-image-export-optimizer`.
- Images in `public/` are optimized at **build time**.
- Allows usage of `<Image />` component even with `output: 'export'`.

### 4.4 External Integrations
- **Kakao Maps**: Located in `components/features/KakaoMap`. Requires `NEXT_PUBLIC_KAKAO_MAP_KEY` in `.env.local`.
- **Cafe24**: Artworks link directly to Cafe24 product pages via the `shopUrl` field.

---

## 5. Development Conventions

### 5.1 Environment Setup
1.  **Node.js**: Version 18 or higher is required.
2.  **Dependencies**: Run `npm install`.
3.  **Environment Variables**:
    - Copy `.env.local.example` to `.env.local`.
    - Fill in `NEXT_PUBLIC_KAKAO_MAP_KEY` and `NEXT_PUBLIC_KAKAO_JS_KEY`.

### 5.2 Key Commands
| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start local development server (localhost:3000). |
| `npm run build` | Build for production (includes image optimization). |
| `npm run validate-artworks` | Check artwork data validity. **Run before commit.** |
| `npm run type-check` | Check for TypeScript errors. |

### 5.3 Coding Standards
- **Strict TypeScript**: No `any` types allowed. Defined in `tsconfig.json`.
- **Prettier & ESLint**: automatically run on commit via Husky.
- **Design Tokens**: Always use colors from `lib/colors.ts` (e.g., `primary`, `sun`, `charcoal`) via Tailwind classes.

---

## 6. Deployment

The project is hosted on **Vercel**.
- **Build Command**: `npm run build`
- **Output Directory**: `out` (Standard for Next.js Static Exports)
- **Updates**: Pushing to the `main` branch triggers a new deployment.

### Troubleshooting Deployment
- If a build fails, check the **Verification** logs. Common issues include:
    - **TypeScript Errors**: Run `npm run type-check` locally to reproduce.
    - **Data Errors**: Duplicate artwork IDs or missing required fields. Run `npm run validate-artworks`.
