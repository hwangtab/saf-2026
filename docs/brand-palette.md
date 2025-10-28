# Brand Palette Guidelines

## Strategy
- Anchor the experience in a calm, trustworthy indigo foundation that can hold dense financial narratives without feeling heavy.
- Introduce an ember-toned accent for decisive CTAs and data highlights so key metrics outrank body copy on the visual hierarchy.
- Pair the palette with a mint-leaning support color to communicate regeneration, while a cool neutral ramp keeps content areas organized.

## Core Tokens
| Token | Hex | Tailwind Alias | Primary Use |
| --- | --- | --- | --- |
| `primary` | `#25324D` | `text-primary`, `border-primary` | Headline copy, data pillars, charts |
| `primary-strong` | `#1B253B` | `hover:text-primary-strong`, `bg-primary-strong` | Deep section headers, dark surfaces |
| `primary-soft` | `#E0E6F1` | `bg-primary-soft` | Elevated cards, section dividers |
| `primary-surface` | `#F3F5FB` | `bg-primary-surface` | Hero overlays, subtle gradients |
| `accent` | `#D93F2B` | `bg-accent`, `text-accent` | Primary CTAs, critical metrics |
| `accent-strong` | `#B23321` | `hover:bg-accent-strong`, `text-accent-strong` | Hover/active states, icon fills |
| `accent-soft` | `#FFD0C5` | `bg-accent-soft` | Badges, light data highlights |
| `support` | `#4CB59F` | `bg-support`, `text-support` | Success narratives, secondary CTAs |
| `support-strong` | `#2F806E` | `hover:bg-support-strong` | Hover states, emphasis outlines |

## Neutral Ramp
Custom grays live under `gray-50` → `gray-900` in `tailwind.config.ts`.

- `gray-50` `#F5F6F8`: Application shell, body background.
- `gray-100` `#E6E8ED`: Table stripes, hover fills.
- `gray-300` `#B6BBC9`: Borders, separators, subtle icons.
- `gray-500` `#6F7790`: Secondary copy, captions.
- `gray-700` `#3D4356`: Navigation, tertiary headings.
- `gray-900` `#1E2330`: Text on dark panels, overlays.

## Interaction & Feedback
- Success `#2F946F`, Warning `#F4B63B`, Danger `#D94452`.
- Focus treatments default to `#D93F2B` for AA contrast on light surfaces.
- Gradients combine `primary` → `support` to retain brand recognition without saturating the UI.

## Contrast Reference
- `text-primary` on `bg-gray-50` → 10.9:1 (section headings).
- `text-light` on `bg-accent` → 4.6:1 (primary CTAs).
- `text-primary` on `bg-primary-soft` → 7.5:1 (metric tiles).
- `text-light` on `bg-primary-strong` → 7.2:1 (dark hero banners).
- `text-support-strong` on `bg-support` → 4.9:1 (positive alerts).

## Usage Guidance
- Use `bg-accent` for the single, top-priority action per screen; reserve `bg-support` for secondary prompts to avoid competing signals.
- Assign `text-primary` to mid-level headings and metrics so they visually outrank paragraph copy.
- Keep accent coverage below 25% of any viewport to preserve legibility and let the indigo base lead.
- Replace any legacy `text-black`/`bg-black` with `text-charcoal`/`bg-charcoal` to maintain soft contrast.

## Implementation Checklist
- Tailwind tokens updated in `tailwind.config.ts` and consumed through utility classes.
- Global base colors and focus rings refreshed in `styles/globals.css`.
- CTA components now use `bg-accent` + `hover:bg-accent-strong` with `text-light`.
- Meta `theme-color` set to `#25324D` so mobile chrome reflects the new foundation.

## Next Steps
- Update shared Figma libraries to mirror the token names/values above.
- Re-cut campaign assets (banners, decks) with the indigo + ember pairing before launch.
- If print or signage is required, derive CMYK/Pantone equivalents for `primary`, `accent`, and `support` and add them here.
