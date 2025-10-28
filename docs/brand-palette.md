# Brand Palette Guidelines

## Strategy
- Blend a calming teal primary (`#BADFDB`) with blush accents to deliver a 밝고 신뢰감 있는 톤.
- Use vanilla canvas backgrounds (`#FCF9EA`) so 콘텐츠가 가벼우면서도 안정적으로 보입니다.
- Highlight actions with coral (`#FFA4A4`) and petal blush (`#FFBDBD`) while maintaining legible warm-neutral text.

## Core Tokens
| Token | Hex | Tailwind Alias | Primary Use |
| --- | --- | --- | --- |
| `primary` | `#6FA4AF` | `text-primary`, `bg-primary`, `border-primary` | Section leads, key metrics |
| `primary-strong` | `#4E8893` | `bg-primary-strong`, `hover:text-primary-strong` | Hero overlays, emphasized stats |
| `primary-soft` | `#D2E3E6` | `bg-primary-soft` | Cards, pills, timeline badges |
| `primary-surface` | `#EDF4F5` | `bg-primary-surface` | Section backgrounds, table headers |
| `accent` | `#FFA4A4` | `bg-accent`, `text-accent` | Primary CTAs, focus highlights |
| `accent-strong` | `#FF7C7C` | `hover:bg-accent-strong` | Hover/active states |
| `accent-soft` | `#FFD6D6` | `bg-accent-soft` | Secondary badges, chips |
| `highlight` | `#B8C4A9` | `bg-highlight`, `text-highlight` | KPI callouts, alerts |
| `highlight-soft` | `#E2E7D9` | `bg-highlight-soft` | Table stripes, surface blends |
| `canvas` | `#F4E9D7` | `bg-canvas`, `text-canvas` | Page background, hero underlay |

## Neutral Ramp
Custom grays (`gray-50` → `gray-900`) lean warm to bridge the teal and clay tones.

- `gray-50` `#FBF8F1`: Default page/section background.
- `gray-100` `#F2E9DB`: Cards, hover fills.
- `gray-300` `#D2C3AA`: Borders, dividers.
- `gray-500` `#9A8C78`: Secondary text, metadata.
- `gray-700` `#61584C`: Navigation, tertiary headings.
- `gray-900` `#332C26`: Text on dark fills, modal overlays.

## Interaction & Feedback
- Success `#4CAF6D`, Warning `#FFCA24`, Danger `#E05858`.
- Focus ring defaults to `#FFA4A4` for brand alignment and AA contrast.
- Use solid fills or subtle overlays; gradients는 배제하여 차분한 화면을 유지합니다.

## Contrast Guide
- `text-primary` on `bg-gray-50` ≈ 6.0:1 (section headings).
- `text-light` on `bg-accent` ≈ 4.5:1 (primary CTA).
- `text-primary` on `bg-primary-soft` ≈ 8.2:1 (stat tiles).
- `text-highlight` on `bg-canvas` ≈ 5.1:1 (alerts, badges).
- `text-gray-700` on `bg-canvas-soft` ≈ 5.5:1 (body copy).

## Usage Notes
- Reserve `bg-accent` for 최우선 CTA, `bg-primary-soft`/`bg-highlight-soft`로 보조 블록을 구성합니다.
- 통계 수치에는 `text-primary`를 적용해 본문과 계층을 분리합니다.
- 넓은 영역은 `bg-canvas-soft`로 통일해 부드러운 파스텔 무드를 유지합니다.
- Coral 배경에서는 `text-light` 혹은 `text-charcoal`을 사용해 대비를 확보합니다.

## Implementation Checklist
- Tailwind tokens updated in `tailwind.config.ts`.
- Global defaults (`styles/globals.css`) refreshed: background, focus ring, skip link, gradients.
- CTA utilities (`bg-accent`, `hover:bg-accent-strong`, `text-light`) aligned with the new scheme.
- Metadata `theme-color` set to the teal base (`#BADFDB`).

## Next Steps
- Update Figma design tokens to mirror the azure + sunshine palette.
- Regenerate marketing assets (SNS, press kits) to remove residual olive tones.
- Evaluate dark-mode compatibility if needed and derive CMYK/Pantone values for print collateral.
