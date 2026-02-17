# Learnings & Patterns

- **Font System**: `tailwind.config.ts` defines `sans` (GMarketSans), `display` (PartialSans), `section` (SchoolSafetyPoster).
- **Colors**: Use `lib/colors.ts` `BRAND_COLORS` via Tailwind classes (e.g. `bg-canvas-soft`, `text-charcoal`).
- **Responsive**: Mobile-first approach (`md:`, `lg:` prefixes).
- **Navigation**: Controlled by `lib/menus.ts`.

### 2026-02-17

- Added '오윤 특별전' menu entry to lib/menus.ts under the '전시 작품' section.
- Centralized navigation structure in lib/menus.ts makes it easy to update menus project-wide.
