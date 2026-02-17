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
