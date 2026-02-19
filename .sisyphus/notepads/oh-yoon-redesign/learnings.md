# Learnings & Patterns

- **Font System**: `tailwind.config.ts` defines `sans` (GMarketSans), `display` (PartialSans), `section` (SchoolSafetyPoster).
- **Colors**: Use `lib/colors.ts` `BRAND_COLORS` via Tailwind classes (e.g. `bg-canvas-soft`, `text-charcoal`).
- **Responsive**: Mobile-first approach (`md:`, `lg:` prefixes).
- **Navigation**: Controlled by `lib/menus.ts`.

### 2026-02-17

- Added '오윤 특별전' menu entry to lib/menus.ts under the '전시 작품' section.
- Centralized navigation structure in lib/menus.ts makes it easy to update menus project-wide.

### 2026-02-17 (OhYoonGallery)

- **Grid Strategy**: Used `grid-flow-dense` with mixed column spans (6, 4, 8) to create a dynamic gallery layout without large gaps.
- **Visual Interest**: Added subtle rotation (`rotate-1`, `-rotate-1`) to select items using `index % 4` to break the grid uniformity.
- **Component Composition**: Wrapped `ArtworkCard` in a positioned `div` to handle layout/rotation independently of the card logic.

### 2026-02-17 (Page Typography Refactor)

- **Font Display**: Applied `font-display` to high-impact headers (H1, H2, H3) for stronger visual hierarchy.
- **Font Sans**: Switched body text to `font-sans` (system default) for better readability, removing `font-serif`.
- **Component Replacement**: Successfully swapped generic `MasonryGallery` for specialized `OhYoonGallery` to match the artist's visual theme.

## Final QA & Build Verification (2026-02-17)

- **Type Check**: Passed successfully.
- **Lint Check**: Passed with 12 warnings (mostly missing dependency in useEffect and <img> tag usage), but no errors.
- **Font Search**: Confirmed 'font-serif' is absent from the codebase.
- **Build**: Successfully completed production build after clearing a stale build lock.
