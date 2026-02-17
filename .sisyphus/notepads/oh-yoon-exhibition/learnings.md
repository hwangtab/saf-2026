# Learnings & Patterns

- **Tech Stack**: Next.js 14+, Tailwind CSS, TypeScript.
- **Data Source**: `content/saf2026-artworks.ts` (static data).
- **Styling**: `lib/colors.ts` defines brand colors.
- **Components**: `MasonryGallery` and `ArtworkCard` are key reusable components.
- **Route Structure**: Flat `app/` structure.

## 2026-02-17: Special Route Creation

- Created `app/special/oh-yoon/page.tsx` as the entry point for the 40th-anniversary exhibition.
- Used a broad container structure (`max-w-[1440px]`) to support an immersive layout.
- Integrated metadata following the project's SEO conventions.
