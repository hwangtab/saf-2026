# Oh Yoon 40th Anniversary Special Exhibition

## TL;DR

> **Quick Summary**: Create a dedicated, immersive exhibition page for Oh Yoon (오윤) featuring 39 artworks, rich biographical content, and a distinct "Minjung Art" aesthetic using existing components.
>
> **Deliverables**:
>
> - New Route: `/special/oh-yoon`
> - Filtered Gallery: 39 artworks by '오윤'
> - Content Sections: Intro, Themes, Biography (derived from article)
> - Mobile-responsive layout with woodcut-style styling
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Route Creation → Component Assembly → Content Integration → QA

---

## Context

### Original Request

Create a special exhibition page for Oh Yoon's 40th anniversary with a "cool view", purchase capability, and rich content based on a provided article.

### Interview Summary

**Key Discussions**:

- **Content**: Title "Returning Blade of the People", themes of Reality/Han/Shared Art.
- **Data**: Verified 39 artworks exist in `content/saf2026-artworks.ts` under artist '오윤'.
- **Style**: "Minjung Art" aesthetic (bold, woodcut, rough edges) using Tailwind.

**Research Findings**:

- **Data**: `content/saf2026-artworks.ts` has the data. `content/artists-data.ts` has the profile.
- **Components**: `MasonryGallery` and `ArtworkCard` exist and are reusable.
- **Route**: `app/special/oh-yoon/page.tsx` is a clean, new path.

### Metis Review

**Identified Gaps** (addressed):

- **Data Validation**: Verified 39 artworks exist.
- **Scope**: Explicitly excluded new payment flows and custom CMS.
- **Testing**: Added curl/grep based acceptance criteria.

---

## Work Objectives

### Core Objective

Launch a high-impact, narrative-driven exhibition page for Oh Yoon that drives engagement and sales without building new infrastructure.

### Concrete Deliverables

- `app/special/oh-yoon/page.tsx`
- `components/special/OhYoonHero.tsx` (or inline)
- `components/special/OhYoonBio.tsx` (or inline)

### Definition of Done

- [ ] Page loads at `/special/oh-yoon` with 200 OK
- [ ] Displays exactly 39 artworks filtered by '오윤'
- [ ] "Buy" buttons link correctly to `/artworks/[id]`
- [ ] Mobile layout is fully responsive
- [ ] All content from the brief is present

### Must Have

- **Filtered Gallery**: Only Oh Yoon's works.
- **Narrative Flow**: Intro -> Themes -> Gallery.
- **Responsiveness**: Mobile-first design.
- **Performance**: Use Next.js `<Image>` for all assets.

### Must NOT Have (Guardrails)

- **New Payment Flow**: Use existing `/artworks/[id]` logic.
- **Custom CMS**: Content is hardcoded/code-driven.
- **New Fonts**: Use existing Tailwind font stack.
- **Heavy Interactivity**: No WebGL or complex scroll-jacking.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### QA Policy

Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

| Deliverable Type | Verification Tool                 | Method                              |
| ---------------- | --------------------------------- | ----------------------------------- |
| Page Route       | `curl`                            | Check 200 OK, content presence      |
| Data Filtering   | `grep` / `curl`                   | Count occurrences of "오윤" in HTML |
| Component UI     | `playwright` (if avail) or `grep` | Check class names and structure     |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation & Structure):
├── Task 1: Route & Layout Setup [quick]
├── Task 2: Data Retrieval & Filtering Logic [quick]
└── Task 3: Content Component Creation (Hero/Bio) [visual-engineering]

Wave 2 (Integration & Polish):
├── Task 4: Gallery Integration (Masonry) [visual-engineering]
├── Task 5: Aesthetic Refinement (Tailwind) [visual-engineering]
└── Task 6: Final QA & SEO [quick]

Critical Path: Task 1 → Task 2 → Task 4 → Task 6
Parallel Speedup: ~50%
```

---

## TODOs

- [x] 1. **Create Special Route & Base Layout**
     **What to do**:
  - Create `app/special/oh-yoon/page.tsx`.
  - Implement a basic layout wrapper (removing standard container if needed for "immersive" feel, or using a wide container).
  - Add metadata (Title: "Oh Yoon 40th Anniversary Special Exhibition").

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-ui-ux`

  **References**:
  - `app/layout.tsx`: Global layout context.
  - `lib/constants.ts`: Site metadata.

  **QA Scenarios**:

  ```
  Scenario: Route Accessibility
    Tool: Bash (curl)
    Steps:
      1. curl -I http://localhost:3000/special/oh-yoon
    Expected Result: HTTP/1.1 200 OK
    Evidence: .sisyphus/evidence/task-1-route-check.txt
  ```

- [ ] 2. **Implement Data Filtering Logic**
     **What to do**:
  - In `app/special/oh-yoon/page.tsx` (or a utility), import `artworks` from `content/saf2026-artworks.ts`.
  - Filter `artworks` where `artist === '오윤'`.
  - Handle empty state (though unlikely).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-ui-ux`

  **References**:
  - `content/saf2026-artworks.ts`: Source data.

  **QA Scenarios**:

  ```
  Scenario: Data Count Verification
    Tool: Bash (grep)
    Steps:
      1. Create a temp test script to import and log count.
      2. Run script with bun/node.
    Expected Result: Output "Found 39 artworks"
    Evidence: .sisyphus/evidence/task-2-data-count.txt
  ```

- [ ] 3. **Build Content Sections (Hero & Bio)**
     **What to do**:
  - Create sections for "Introduction", "Themes", and "Quotes" based on the draft.
  - Use `SectionTitle` component if suitable, or create custom headers with `font-poster` (if available) or bold serif.
  - content: "40년 만에 돌아온 민중의 칼날...", "미술은 많은 사람이 나누어야 한다" etc.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **References**:
  - `.sisyphus/drafts/oh-yoon-exhibition.md`: Content source.
  - `components/ui/SectionTitle.tsx`: Reusable component.

  **QA Scenarios**:

  ```
  Scenario: Content Presence
    Tool: Bash (curl/grep)
    Steps:
      1. curl http://localhost:3000/special/oh-yoon | grep "민중의 칼날"
    Expected Result: Matches found
    Evidence: .sisyphus/evidence/task-3-content-check.txt
  ```

- [ ] 4. **Integrate Masonry Gallery**
     **What to do**:
  - Import `MasonryGallery` from `components/features/MasonryGallery`.
  - Pass the filtered Oh Yoon artworks to it.
  - Ensure `ArtworkCard` within it links to `/artworks/[id]`.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **References**:
  - `components/features/MasonryGallery.tsx`: Component API.

  **QA Scenarios**:

  ```
  Scenario: Gallery Rendering
    Tool: Bash (curl/grep)
    Steps:
      1. curl http://localhost:3000/special/oh-yoon | grep "Masonry" (or class name)
      2. curl http://localhost:3000/special/oh-yoon | grep "href=\"/artworks/"
    Expected Result: Structure present and links exist
    Evidence: .sisyphus/evidence/task-4-gallery-check.txt
  ```

- [ ] 5. **Apply Minjung Art Aesthetic**
     **What to do**:
  - Style the page background (e.g., `bg-amber-50` or texture).
  - Add bold, rough borders to images or sections.
  - Use high-contrast typography (Charcoal on Paper color).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **References**:
  - `tailwind.config.ts`: Color palette (`canvas-strong`, `charcoal`).

  **QA Scenarios**:

  ```
  Scenario: Style Class Verification
    Tool: Bash (curl/grep)
    Steps:
      1. curl http://localhost:3000/special/oh-yoon | grep "bg-amber" (or chosen class)
    Expected Result: Class present
    Evidence: .sisyphus/evidence/task-5-style-check.txt
  ```

- [ ] 6. **Final QA & SEO**
     **What to do**:
  - Verify Viewport meta tag.
  - Check Open Graph tags.
  - Verify mobile responsiveness (via code inspection of classes `md:`, `lg:`).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-ui-ux`

  **QA Scenarios**:

  ```
  Scenario: Meta Tags
    Tool: Bash (curl)
    Steps:
      1. curl http://localhost:3000/special/oh-yoon | grep "<meta"
    Expected Result: Viewport and OG tags present
    Evidence: .sisyphus/evidence/task-6-seo-check.txt
  ```

---

## Success Criteria

### Final Checklist

- [ ] URL `/special/oh-yoon` is live
- [ ] 39 Artworks displayed
- [ ] No "Lorem Ipsum" - real content only
- [ ] "Buy" buttons work (link to detail)
- [ ] Mobile view is usable (no horizontal overflow)
