# Brand Palette Guidelines

## Strategy
- Balance a confident gunmetal base (`#31393C`) with energetic blues (`#2176FF`, `#33A1FD`) and warm sun accents (`#FDCA40`, `#F79824`).
- Use the dual blues to communicate trust and momentum, while the yellows/oranges capture optimism and calls-to-action.
- Keep typography grounded in gunmetal variants so copy remains readable over the lighter sand backdrops.

## Core Tokens
| Token | Hex | Tailwind Alias | Primary Use |
| --- | --- | --- | --- |
| `primary` | `#2176FF` | `text-primary`, `bg-primary`, `border-primary` | Data highlights, links, interactive states |
| `primary-strong` | `#0E4ECF` | `bg-primary-strong`, `hover:text-primary-strong` | Hero overlays, pill borders |
| `primary-soft` | `#D2E1FF` | `bg-primary-soft` | Cards, badge backgrounds |
| `primary-surface` | `#EDF3FF` | `bg-primary-surface` | Section washes, table headers |
| `sky` | `#33A1FD` | `bg-sky`, `text-sky` | Secondary metrics, decorative accents |
| `sun` | `#FDCA40` | `bg-sun`, `text-sun` | Supporting CTAs, infographics |
| `sun-strong` | `#E3AC0D` | `hover:bg-sun-strong` | Hover/active states on yellow CTAs |
| `accent` | `#F79824` | `bg-accent`, `text-accent` | Primary CTAs, badges, alerts |
| `accent-soft` | `#FFD4A3` | `bg-accent-soft` | Secondary chips, subtle emphasis |
| `canvas` | `#FFF6DD` | `bg-canvas`, `bg-canvas-soft` | Page background, large sections |
| `charcoal` | `#31393C` | `text-charcoal`, `border-charcoal` | Headings, key icons |
| `charcoal-muted` | `#495156` | `text-charcoal-muted` | Body copy |
| `charcoal-soft` | `#6A7378` | `text-charcoal-soft` | Captions, helper text |

## Neutral Ramp
Custom `gray` tokens complement the new scheme.

- `gray-50` `#F7F8FA`: Elevated card background.
- `gray-100` `#E6EAF0`: Table stripes, hover fills.
- `gray-300` `#B3BAC7`: Dividers, icon tint.
- `gray-500` `#707A84`: Muted text, borders on light surfaces.
- `gray-700` `#3D464D`: Navigation links, small headings.
- `gray-900` `#1F2428`: Text on dark overlays.

## Interaction & Feedback
- Success `#2E9F7B`, Warning `#FDCA40`, Danger `#D94F45`.
- Focus outlines use `#2176FF` to stay consistent with primary interactive color.
- Avoid heavy gradients; rely on `bg-canvas-soft`, `bg-primary-surface`, and `bg-sun-soft` to provide contrast.

## Contrast Guide
- `text-charcoal` on `bg-canvas-soft` ≈ 9.7:1 (body copy/headings).
- `text-primary` on `bg-canvas-soft` ≈ 6.3:1 (buttons, links).
- `text-light` on `bg-accent` ≈ 4.7:1 (primary CTA).
- `text-charcoal` on `bg-primary-soft` ≈ 8.8:1 (stat tiles).
- `text-charcoal-muted` on `bg-canvas-soft` ≈ 8.1:1 (paragraphs).

## Usage Notes
- Reserve `bg-accent` for the top-priority CTA; use `bg-sun` for secondary actions.
- Apply `text-charcoal` to headings and numeric KPIs; utilize `text-charcoal-muted` for paragraphs.
- `bg-canvas-soft` keeps long-form sections easy to read, while `bg-primary-surface` or `bg-sun-soft` can highlight callouts.
- Introduce `sky` sparingly for infographics or tab states to keep the palette focused.

## Implementation Checklist
- Tailwind tokens updated (`tailwind.config.ts`) and consumed across components.
- Global base styles (`styles/globals.css`) now use the sand canvas and blue focus ring.
- Layout, hero, and KPI components refactored to new color utilities.
- Metadata `theme-color` switched to `#2176FF` to reflect the primary hue on mobile browsers.

## Next Steps
- Refresh design system tokens in Figma to mirror the new scheme.
- Update marketing assets (OG images, decks) with the blue/sun combo.
- Validate accessibility on key templates after the color shift.
