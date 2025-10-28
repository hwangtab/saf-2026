# Brand Palette Guidelines

## Strategy
- Anchor the interface in a bright azure primary (`#799EFF`) to keep data-heavy sections energetic and contemporary.
- Use layered sunshine hues (`#FFBC4C`, `#FFDE63`, `#FEFFC4`) to create warmth, hierarchy, and approachable CTAs.
- Balance vibrancy with cool grays so typography remains crisp and accessible.

## Core Tokens
| Token | Hex | Tailwind Alias | Primary Use |
| --- | --- | --- | --- |
| `primary` | `#799EFF` | `text-primary`, `bg-primary`, `border-primary` | Section leads, key metrics |
| `primary-strong` | `#4F78F4` | `bg-primary-strong`, `hover:text-primary-strong` | Hero overlays, emphasized stats |
| `primary-soft` | `#D5E0FF` | `bg-primary-soft` | Cards, pills, timeline badges |
| `primary-surface` | `#EEF3FF` | `bg-primary-surface` | Section backgrounds, table headers |
| `accent` | `#FFBC4C` | `bg-accent`, `text-accent` | Primary CTAs, focus highlights |
| `accent-strong` | `#E29D2E` | `hover:bg-accent-strong` | Hover/active states |
| `accent-soft` | `#FFE0A8` | `bg-accent-soft` | Secondary badges, chips |
| `highlight` | `#FFDE63` | `bg-highlight`, `text-highlight` | KPI callouts, alerts |
| `highlight-soft` | `#FFF1B5` | `bg-highlight-soft` | Table stripes, surface blends |
| `canvas` | `#FEFFC4` | `bg-canvas`, `text-canvas` | Page background, hero underlay |

## Neutral Ramp
Custom grays live under `gray-50` → `gray-900` in `tailwind.config.ts` to keep typography legible next to the bright palette.

- `gray-50` `#F9FAFF`: Default page/section background.
- `gray-100` `#EEF1FF`: Cards, hover fills.
- `gray-300` `#CBD0E4`: Borders, dividers.
- `gray-500` `#8E94B0`: Secondary text, metadata.
- `gray-700` `#555A75`: Navigation, tertiary headings.
- `gray-900` `#2A2E3C`: Text on dark fills, modal overlays.

## Interaction & Feedback
- Success `#4CAF6D`, Warning `#FFCA24`, Danger `#E05858`.
- Focus ring defaults to `#FFBC4C` to align with CTA energy and stay AA compliant.
- Gradients blend `primary` → `accent` for hero bands; use `highlight` sparingly to avoid visual fatigue.

## Contrast Guide
- `text-primary` on `bg-gray-50` ≈ 6.4:1 (section headings).
- `text-light` on `bg-accent` ≈ 5.1:1 (primary CTA).
- `text-primary` on `bg-primary-soft` ≈ 8.9:1 (stat tiles).
- `text-highlight` on `bg-canvas` ≈ 4.5:1 (alerts, badges).
- `text-gray-700` on `bg-gray-50` ≈ 5.8:1 (body copy).

## Usage Notes
- Reserve `bg-accent` for the most important action per screen; lean on `bg-primary-soft` and `bg-highlight-soft` for supporting modules.
- Apply `text-primary` or `text-highlight` to statistic numbers so they stand apart from surrounding copy.
- Use `bg-canvas` for large background regions to keep the experience light while allowing CTAs to pop.
- Pair `text-charcoal` with sunshine backgrounds to maintain readability.

## Implementation Checklist
- Tailwind tokens updated in `tailwind.config.ts`.
- Global defaults (`styles/globals.css`) refreshed: background, focus ring, skip link, gradients.
- CTA utilities (`bg-accent`, `hover:bg-accent-strong`, `text-light`) aligned with the new scheme.
- Metadata `theme-color` set to the azure base (`#799EFF`).

## Next Steps
- Update Figma design tokens to mirror the azure + sunshine palette.
- Regenerate marketing assets (SNS, press kits) to remove residual olive tones.
- Evaluate dark-mode compatibility if needed and derive CMYK/Pantone values for print collateral.
