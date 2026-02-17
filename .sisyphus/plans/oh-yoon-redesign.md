# Oh Yoon Exhibition Redesign & Accessibility

## TL;DR

> **Quick Summary**: Redesign the Oh Yoon Special Exhibition page (`/special/oh-yoon`) to align with the site's typography system and replace the generic masonry layout with a dynamic "Asymmetrical Mosaic" grid. Also expose the page in the main navigation.
>
> **Deliverables**:
>
> - Update `lib/menus.ts`: Add "오윤 특별전" link.
> - Refactor `app/special/oh-yoon/page.tsx`: Remove `font-serif`, use `font-display`/`font-sans`.
> - New Component `components/special/OhYoonGallery.tsx`: Asymmetrical grid with hero items and slight rotations.
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Menu Update → Gallery Component → Page Integration → QA

---

## Context

### Original Request

1.  **Typography**: "Fonts lack consistency with other pages." (Correction: Don't add new fonts, align with existing system).
2.  **Layout**: "3-column grid is not attractive." (Solution: Asymmetrical Mosaic).
3.  **Navigation**: "Where is the menu?" (Solution: Add to header).

### Metis Review

**Identified Gaps** (addressed):

- **Design Spec**: Defined "Asymmetrical Mosaic" as a 12-column grid with variable spans (6/4/8) and rotation.
- **Responsive**: Mobile defaults to single column, tablet to 2-3 columns.
- **Scope**: Strictly limited to `/special/oh-yoon`.

---

## Work Objectives

### Core Objective

Launch a polished, system-aligned, and visually striking Oh Yoon exhibition page discoverable via the main menu.

### Concrete Deliverables

- `lib/menus.ts` (Modified)
- `app/special/oh-yoon/page.tsx` (Modified)
- `components/special/OhYoonGallery.tsx` (New)

### Definition of Done

- [ ] "오윤 특별전" appears in "전시 작품" dropdown menu
- [ ] Page uses `GMarketSans` / `PartialSans` (no system serif)
- [ ] Gallery displays in an asymmetrical, dynamic grid on desktop
- [ ] Gallery is fully responsive on mobile
- [ ] No build errors or lint warnings

### Must Have

- **Font Consistency**: Use `font-display` for titles, `font-sans` for body.
- **Asymmetrical Grid**: Mix of wide, large, and standard cards.
- **Minjung Aesthetic**: Retain bold borders and rough textures, but within system fonts.

### Must NOT Have (Guardrails)

- **New Fonts**: Do NOT import Google Fonts or modify `tailwind.config.ts`.
- **Global Changes**: Do NOT touch other pages.
- **Generic Components**: `OhYoonGallery` is specific to this page.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### QA Policy

Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

| Deliverable Type | Verification Tool     | Method                                           |
| ---------------- | --------------------- | ------------------------------------------------ |
| Navigation       | `grep` / `playwright` | Check menu item existence and link               |
| Typography       | `grep`                | Ensure `font-serif` is removed, `font-sans` used |
| Layout           | `playwright`          | Screenshot comparison / Element visibility check |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Structure & Access):
├── Task 1: Add Menu Entry [quick]
└── Task 2: Create OhYoonGallery Component [visual-engineering]

Wave 2 (Integration & Polish):
├── Task 3: Refactor Page Typography & Integrate Gallery [visual-engineering]
└── Task 4: Final QA & Build Verification [quick]

Critical Path: Task 1 → Task 3 → Task 4
```

---

## TODOs

- [x] 1. **Add Menu Entry**
     **What to do**:
  - Edit `lib/menus.ts`.
  - Add `{ name: '오윤 특별전', href: '/special/oh-yoon', description: '40주기 민중미술 거장 특별전' }` to the "전시 작품" (`/artworks`) section.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-ui-ux`

  **References**:
  - `lib/menus.ts`: Navigation structure.

  **QA Scenarios**:

  ```
  Scenario: Menu Entry Verification
    Tool: Bash (grep)
    Steps:
      1. grep "오윤 특별전" lib/menus.ts
    Expected Result: Match found
    Evidence: .sisyphus/evidence/task-1-menu-check.txt
  ```

- [ ] 2. **Create OhYoonGallery Component**
     **What to do**:
  - Create `components/special/OhYoonGallery.tsx`.
  - Implement a 12-column grid (`grid-cols-1 md:grid-cols-12`).
  - Map through artworks and assign dynamic classes based on index (e.g., `index % 10` pattern):
    - Hero (large): `md:col-span-6 md:row-span-2`
    - Wide: `md:col-span-8`
    - Standard: `md:col-span-4`
  - Add slight random rotation (`rotate-1`, `-rotate-1`) to select items for "wall poster" feel.
  - Use `ArtworkCard` internally.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **References**:
  - `components/features/MasonryGallery.tsx`: Existing gallery pattern (for props).
  - `components/ui/ArtworkCard.tsx`: Card component.

  **QA Scenarios**:

  ```
  Scenario: Component Structure
    Tool: Bash (grep)
    Steps:
      1. grep "grid-cols-12" components/special/OhYoonGallery.tsx
      2. grep "rotate-" components/special/OhYoonGallery.tsx
    Expected Result: Grid and rotation classes present
    Evidence: .sisyphus/evidence/task-2-component-check.txt
  ```

- [ ] 3. **Refactor Page Typography & Integrate Gallery**
     **What to do**:
  - Modify `app/special/oh-yoon/page.tsx`.
  - Remove all `font-serif` classes.
  - Apply `font-display` to the main title ("40년 만에 돌아온...") and section headers.
  - Apply `font-sans` (or default) to body text.
  - Replace `<MasonryGallery />` with `<OhYoonGallery />`.
  - Keep the Minjung aesthetic (borders, colors) but strictly with system fonts.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **References**:
  - `app/layout.tsx`: Global font usage context.
  - `tailwind.config.ts`: Font family definitions.

  **QA Scenarios**:

  ```
  Scenario: Typography Check
    Tool: Bash (grep)
    Steps:
      1. grep "font-serif" app/special/oh-yoon/page.tsx (Should be empty/minimal)
      2. grep "font-display" app/special/oh-yoon/page.tsx
    Expected Result: Serif removed, Display added
    Evidence: .sisyphus/evidence/task-3-typography-check.txt
  ```

- [ ] 4. **Final QA & Build Verification**
     **What to do**:
  - Run full lint and type check.
  - Build the project to ensure no layout/hydration errors.
  - Verify mobile responsiveness via code inspection (ensure `md:` prefixes are used correctly).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `vercel-react-best-practices`

  **QA Scenarios**:

  ```
  Scenario: Build Success
    Tool: Bash
    Steps:
      1. npm run build
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-4-build-log.txt
  ```

---

## Success Criteria

### Final Checklist

- [ ] Menu contains "오윤 특별전"
- [ ] Page font matches site system (Sans/Display)
- [ ] Gallery layout is asymmetrical and dynamic
- [ ] No broken images or layout shifts
- [ ] "Buy" flow remains intact via ArtworkCard
