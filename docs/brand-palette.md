# Brand Palette Guidelines

## Intent
- Support a warmer, more legible visual voice while expanding beyond the former yellow/black pairing.
- Provide a scalable token set that maps directly to Tailwind classes and design system usage.
- Guarantee AA contrast for core text/background pairings and define accent roles for campaigns or data viz.

## Core Brand Colors
| Token | Hex | Tailwind Class | Primary Use |
| --- | --- | --- | --- |
| `primary` | `#F6B300` | `bg-primary`, `text-primary` | Hero actions, key metrics, badges |
| `primary-strong` | `#D99000` | `bg-primary-strong`, `hover:bg-primary-strong` | Hover/active states, small buttons |
| `primary-soft` | `#FFE9A6` | `bg-primary-soft` | Elevated surfaces, subtle highlights |
| `primary-surface` | `#FFF4D1` | `bg-primary-surface` | Gradient stops, empty states |
| `charcoal` | `#222326` | `text-charcoal`, `bg-charcoal` | Primary text, dense backgrounds |
| `charcoal-muted` | `#3B3C40` | `text-charcoal-muted` | Muted titles, icon tint on light bg |
| `accent` | `#2CA6A4` | `bg-accent`, `text-accent` | Secondary CTAs, data highlights |
| `accent-strong` | `#1E7C7A` | `bg-accent-strong` | Accent hover/active, outlines |

## Neutral Ramp
The custom `gray` scale in `tailwind.config.ts` now mirrors our “warm neutral” ramp.

- `gray-50` `#F9F9F8`: App shell background (`body`, cards grid)
- `gray-100` `#EFEFEA`: Hover fills, table stripes
- `gray-300` `#C8C9BC`: Borders, dividers, subtle icons
- `gray-500` `#7A7C64`: Secondary text on light surfaces
- `gray-700` `#45483A`: Section headings, UI chrome
- `gray-900` `#1E2119`: Text on dark surfaces, overlay copies

## Support & Feedback States
- Success `#3BB273` (`bg-success`, `text-success`)
- Warning `#FFB020` (`bg-warning`, `text-warning`)
- Danger `#E15554` (`bg-danger`, `text-danger`)
- Focus outline defaults to `#F6B300` for a visible yet brand-aligned ring.

## Contrast-Approved Pairings
- `text-charcoal` on `bg-primary-soft` (ratio 8.2:1)
- `text-light` on `bg-charcoal` (11.4:1) – use sparingly for hero bands
- `text-charcoal` on `bg-primary` (7.1:1) – default for prominent CTAs
- `text-gray-700` on `bg-gray-50` (6.8:1) – standard paragraph configuration
- `text-light` on `bg-accent-strong` (5.2:1) – acceptable for secondary buttons

## Usage Notes
- Reserve `bg-primary` for the single most important action per screen; use `bg-accent` for secondary emphasis to avoid yellow fatigue.
- Prefer `bg-primary-soft` for cards and badges so the base gold is perceived as an accent, not a background wash.
- Swap any legacy `text-black`/`bg-black` usage with `text-charcoal`/`bg-charcoal` to retain depth without harsh contrast.
- `accent` pairs well with the gold primary in split backgrounds or charts; keep accent coverage below 30% of any given layout.

## Implementation Checklist
- Tailwind tokens updated in `tailwind.config.ts` (see `extend.colors`).
- Global focus, gradient, and base body colors aligned in `styles/globals.css`.
- CTA components refactored to use `bg-primary` + `hover:bg-primary-strong` with `text-charcoal`.
- Meta `theme-color` refreshed to `#F6B300` for mobile browser chrome.

## Next Steps
- Re-export the palette to Figma (update shared styles / color tokens).
- Smoke-test key pages in light/dark ambient light to ensure legibility.
- If marketing collateral needs CMYK/Pantone values, derive them from the new hex set and store alongside this doc.
