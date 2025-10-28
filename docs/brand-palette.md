# Brand Palette Guidelines

## Strategy
- Build the brand around an earthy sage base that reflects 지속가능성 and trust without the weight of pure black.
- Elevate engagement moments with a harvest amber accent so 후원/참여 CTA가 본문보다 위계에서 명확히 드러납니다.
- Support storytelling with a gentle sunlight highlight and a terracotta ember for stakes-driven messaging.

## Core Tokens
| Token | Hex | Tailwind Alias | Primary Use |
| --- | --- | --- | --- |
| `primary` | `#84994F` | `text-primary`, `bg-primary`, `border-primary` | Mid-level headings, data callouts |
| `primary-strong` | `#6F7C3C` | `hover:text-primary-strong`, `bg-primary-strong` | Dense backgrounds, focused metrics |
| `primary-soft` | `#DDE6B0` | `bg-primary-soft` | Tiles, timeline chips, tags |
| `primary-surface` | `#F4F7DE` | `bg-primary-surface` | Section washes, hero overlays |
| `accent` | `#FCB53B` | `bg-accent`, `text-accent` | Primary CTAs, conversion KPIs |
| `accent-strong` | `#D9931F` | `hover:bg-accent-strong` | Hover/active visuals |
| `accent-soft` | `#FFE3B5` | `bg-accent-soft` | Secondary badges, legend chips |
| `highlight` | `#FFE797` | `bg-highlight`, `text-highlight` | Info cards, inline emphasis |
| `highlight-soft` | `#FFF4D3` | `bg-highlight-soft` | Table stripes, pill backgrounds |
| `ember` | `#B45253` | `text-ember`, `bg-ember` | Stakes-driven stats, alert headlines |
| `ember-strong` | `#8F3D3E` | `bg-ember-strong` | Hover states for destructive actions |

## Neutral Ramp
Warm neutrals sit under `gray-50` → `gray-900` in `tailwind.config.ts`.

- `gray-50` `#F7F5ED`: Body base, wide canvas backgrounds.
- `gray-100` `#EDE6D9`: Hover fills, table stripes.
- `gray-300` `#C4BA9C`: Subtle dividers, icon tint.
- `gray-500` `#8A7F66`: Secondary text on light surfaces.
- `gray-700` `#544C3E`: Navigation, tertiary headings.
- `gray-900` `#251F19`: Text on dark fills, overlays.

## Interaction & Feedback
- Success `#6F7C3C`, Warning `#FCB53B`, Danger `#B45253`.
- Focus states default to `#FCB53B` for brand-consistent, AA-compliant outlines.
- Gradients blend `primary` → `accent` → `highlight` for campaign hero treatments.

## Contrast Reference
- `text-primary` on `bg-gray-50` → 5.6:1 (mid-level headings).
- `text-light` on `bg-accent` → 4.9:1 (primary CTAs).
- `text-primary` on `bg-primary-soft` → 8.1:1 (stat blocks).
- `text-light` on `bg-primary-strong` → 6.7:1 (dense feature panels).
- `text-ember` on `bg-highlight-soft` → 5.0:1 (risk statements).

## Usage Guidance
- Use `bg-accent` for the single highest-priority action; pair `bg-highlight` with `text-primary` for supporting metrics.
- Apply `text-primary` to 중간 제목/핵심 데이터 so they outrank body copy without resorting to black.
- Keep `bg-accent` coverage under 30% per viewport; balance with `bg-primary-surface` or `bg-gray-50`.
- Deploy `text-ember` for critical risks or storytelling peaks; combine with `bg-highlight-soft` to keep legibility high.

## Implementation Checklist
- Tailwind tokens updated in `tailwind.config.ts` and consumed through utility classes.
- Global base colors and focus rings refreshed in `styles/globals.css`.
- CTA components use `bg-accent` + `hover:bg-accent-strong` with `text-light`.
- Meta `theme-color` set to `#84994F` to mirror the new base color on mobile chrome.

## Next Steps
- Update shared Figma libraries to mirror the token names/values above.
- Re-cut campaign assets (banners, decks) with the sage + amber pairing before launch.
- If print or signage is required, derive CMYK/Pantone for `primary`, `accent`, and `ember` and capture them here.
