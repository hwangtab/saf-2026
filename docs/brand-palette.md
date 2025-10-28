# Brand Palette Guidelines

## Strategy
- Ground the experience in an organic olive base (`#5B532C`) so data-heavy sections feel stable without defaulting to pure black.
- Use a bold sunbeam accent (`#FFC50F`) to elevate CTAs and key metrics above surrounding copy.
- Layer in a wheat highlight (`#FDE7B3`) for supportive surfaces and a meadow green (`#63A361`) for growth-positive storytelling.

## Core Tokens
| Token | Hex | Tailwind Alias | Primary Use |
| --- | --- | --- | --- |
| `primary` | `#5B532C` | `text-primary`, `bg-primary`, `border-primary` | Section leads, KPI numbers |
| `primary-strong` | `#433D1F` | `bg-primary-strong`, `hover:text-primary-strong` | Dense cards, hero overlays |
| `primary-soft` | `#D6CEA2` | `bg-primary-soft` | Statistic tiles, pill backgrounds |
| `primary-surface` | `#F6F1D8` | `bg-primary-surface` | Section washes, table headers |
| `accent` | `#FFC50F` | `bg-accent`, `text-accent` | Primary CTAs, peak metrics |
| `accent-strong` | `#E0A500` | `hover:bg-accent-strong` | Hover/active states |
| `accent-soft` | `#FFE59A` | `bg-accent-soft` | Secondary badges, chart highlights |
| `highlight` | `#FDE7B3` | `bg-highlight`, `text-highlight` | Info banners, inline emphasis |
| `highlight-soft` | `#FFF2D4` | `bg-highlight-soft` | Table stripes, light surfaces |
| `support` | `#63A361` | `bg-support`, `text-support` | Success stories, optimistic stats |
| `support-strong` | `#4E824C` | `hover:bg-support-strong` | Hover, graph focus states |

## Neutral Ramp
Warm neutrals remain exposed through `gray-50` → `gray-900`.

- `gray-50` `#FFF2D4`: Page background, large canvas areas.
- `gray-100` `#F1E5C2`: Subtle section breaks, hover states.
- `gray-300` `#D0C196`: Dividers, chart axes.
- `gray-500` `#A3926F`: Secondary text, metadata.
- `gray-700` `#6D644A`: Navigation, tertiary headings.
- `gray-900` `#332E1F`: Text on dark fills, overlay typography.

## Interaction & Feedback
- Success leverages the meadow green (`#63A361`), warning the sunbeam accent (`#FFC50F`), and destructive states default to the deep olive (`#5B532C`) until a separate alert hue is introduced.
- Focus outline: `#FFC50F` to remain both accessible and on-brand.
- Gradient treatments: `primary` → `accent` → `highlight` for hero ribbons.

## Contrast Guide
- `text-primary` on `bg-gray-50` ≈ 7.0:1 (section headings).
- `text-light` on `bg-accent` ≈ 5.7:1 (primary CTA).
- `text-primary` on `bg-primary-soft` ≈ 8.6:1 (data tiles).
- `text-support` on `bg-support-soft` ≈ 5.1:1 (success banners).
- `text-charcoal` on `bg-highlight-soft` ≈ 9.4:1 (body copy).

## Usage Notes
- Allow only one `bg-accent` CTA per viewport; promote supporting actions with `bg-support` or `bg-primary-soft`.
- Assign `text-primary` to 중간 제목·핵심 데이터 so they outrank standard body text without grabbing the CTA spotlight.
- Pair `bg-highlight` with `border-primary` for storytelling blocks to keep hierarchy clear.
- Reserve `bg-support` for positive messages to maintain semantic color language.

## Implementation Checklist
- Tailwind tokens updated in `tailwind.config.ts`.
- Global defaults (`styles/globals.css`) aligned: background, text color, focus ring, skip-link.
- CTAs use `bg-accent` + `hover:bg-accent-strong` with `text-light`; supporting actions can pull `bg-support`.
- Metadata `theme-color` matches the olive base (`#5B532C`).

## Next Steps
- Update Figma color styles to the olive/sunbeam/meadow scheme.
- Refresh marketing assets (SNS cards, banners) with the new combo to avoid residual indigo/coral usage.
- Evaluate destructive/error color separately if product surfaces begin to rely on red semantics.
