# Plan: Edition-Based Artwork System Migration

## TL;DR

> **Quick Summary**: Transition from a `status`-based (Unique only) system to an `edition`-based system (Unique/Limited/Open) where availability is derived from sales vs limits. Includes a new `artwork_sales` table and backfill logic.
>
> **Deliverables**:
>
> - DB Schema: `edition_type`, `edition_limit` cols + `artwork_sales` table.
> - Data Migration: Backfill existing sales, handle specific artist rules.
> - Admin UI: Edition management & sales recording.
> - Revenue Logic: Switch to `artwork_sales` source.
>
> **Estimated Effort**: Medium (2-3 days)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: DB Migration → Types Update → Revenue Logic → Admin UI

---

## Context

### Original Request

- Current system treats all artworks as Unique (1/1).
- Needs to support Limited (N copies) and Open (unlimited) editions.
- Specific case: Oh Yoon's "Song of the Sword" (7 copies) must be handled.
- Public UI: Show "Available" or "Sold Out" (no counts).
- Migration via Supabase CLI.

### Metis Review & Risk Mitigation

**Identified Risks**:

1. **Price Parsing**: `text` ('₩1,000,000') to `integer` conversion is fragile.
   - _Fix_: Added robust SQL parsing logic with regex.
2. **Status Logic**: Dual source of truth risk.
   - _Fix_: `status` column retained as **Cached State**, updated via Database Trigger (auto-sync).
3. **Oh Yoon Case**: Unknown if 7 rows or 1 row exist.
   - _Fix_: Migration defaults to 'Open' for Oh Yoon. Admin manually corrects specific Limited works.
4. **Revenue Regression**:
   - _Fix_: Backfill script creates 1 sale record for every currently 'sold' item to preserve historical revenue.

---

## Work Objectives

### Core Objective

Enable multi-sale support for Limited/Open editions while preserving historical sales data.

### Concrete Deliverables

- [ ] `supabase/migrations/20260215000000_add_edition_system.sql`
- [ ] `types/index.ts` updated with `EditionType`, `ArtworkSale`
- [ ] `app/admin/artworks/artwork-edit-form.tsx` with Edition UI
- [ ] `app/admin/artworks/[id]/page.tsx` with Sales Recording UI
- [ ] `app/actions/admin-revenue.ts` refactored for new schema

### Definition of Done

- [ ] `npm run type-check` passes
- [ ] `npm run build` passes
- [ ] Revenue charts show same totals as before migration
- [ ] Can record 2nd sale for a "Limited (Limit: 5)" artwork
- [ ] "Unique" artwork marks as Sold Out after 1 sale

### Must Have

- **Data Safety**: No loss of existing `sold_at` or `price` data.
- **Backfill**: All currently `sold` items must exist in `artwork_sales`.
- **Artist Rule**: Oh Yoon, Lee Yun-yop, Ryu Yeon-bok defaults to `edition_type='open'`.

### Must NOT Have (Guardrails)

- **Public Counts**: Do NOT show "3/50 sold" on public pages.
- **Manual Status**: Do NOT allow manual toggling of `status` for Limited/Unique items (must be derived).
- **Broken Charts**: Revenue page must not crash or show zero.

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> All tasks verified by Agent-Executed QA Scenarios (Bash/Playwright/SQL).

### Test Decision

- **Infrastructure exists**: YES (Jest/RTL setup found)
- **Automated tests**: YES (Tests-after approach for logic)
- **QA Scenarios**: MANDATORY for all tasks.

### Agent-Executed QA Scenarios

**1. Database Verification (SQL)**

```sql
-- Verify Backfill Count
SELECT count(*) FROM artworks WHERE status = 'sold';
-- Must equal:
SELECT count(*) FROM artwork_sales;

-- Verify Price Parsing
SELECT count(*) FROM artwork_sales WHERE sale_price = 0;
-- Should be 0 (unless original price was 0)

-- Verify Artist Rule
SELECT count(*) FROM artworks
WHERE artist_id IN (SELECT id FROM artists WHERE name_ko IN ('오윤', '이윤엽', '류연복'))
AND edition_type != 'open';
-- Should be 0
```

**2. Logic Verification (TypeScript/Jest)**

- Unit test `isSoldOut(artwork, salesCount)` logic.
- Unit test Revenue calculation function.

**3. UI Verification (Playwright)**

- Admin: Create Limited Artwork → Record Sale → Verify Status != Sold
- Admin: Record Sale reaching limit → Verify Status == Sold
- Public: Check "Sold Out" badge visibility

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Database & Types):
├── Task 1: DB Migration & Backfill (Supabase CLI)
└── Task 2: Update TypeScript Definitions

Wave 2 (Logic & UI):
├── Task 3: Refactor Revenue Actions (Backend)
├── Task 4: Admin UI - Artwork Edit Form
└── Task 5: Admin UI - Sales Management

Wave 3 (Cleanup & Verify):
└── Task 6: Data Validation & Oh Yoon Fix
```

---

## TODOs

- [x] 1. Database Migration & Backfill

  **What to do**:
  - Create `supabase/migrations/20260215000000_add_edition_system.sql`.
  - Define `edition_type` enum (`unique`, `limited`, `open`).
  - Add `edition_type` (default 'unique'), `edition_limit` to `artworks`.
  - Create `artwork_sales` table (`sale_price` as INTEGER).
  - **Backfill Logic**:
    - Insert into `artwork_sales` from `artworks` where `status='sold'`.
    - Parse `price` text ('₩1,000,000') -> Integer.
    - Set `edition_type='open'` for target artists (Oh Yoon, etc).
  - Create Trigger: `update_artwork_status_on_sale` to keep `status` column in sync.

  **Recommended Agent**: `git-master` (for SQL file creation) + `quick`

  **Verification**:
  - `supabase db reset` (if local) or inspection of SQL logic.
  - SQL: `SELECT count(*) FROM artwork_sales` == `SELECT count(*) FROM artworks WHERE status='sold'`.

- [x] 2. Update TypeScript Definitions

  **What to do**:
  - Modify `types/index.ts`.
  - Update `BaseArtwork` / `Artwork`: Add `edition_type`, `edition_limit`.
  - Create `ArtworkSale` interface.
  - Update `app/actions/admin-artworks.ts` return types.

  **Recommended Agent**: `quick` (TypeScript updates)

  **Verification**:
  - `npm run type-check` (will fail until other tasks complete, but syntax should be valid).

- [x] 3. Refactor Revenue Actions

  **What to do**:
  - Modify `app/actions/admin-revenue.ts`.
  - Change query source from `artworks` to `artwork_sales`.
  - Remove manual price parsing (use `sale_price` integer directly).
  - Ensure `getRevenueAnalytics` aggregates correctly from new table.

  **Recommended Agent**: `ultrabrain` (Complex logic refactoring)

  **Verification**:
  - Unit test or script: `await getRevenueAnalytics()` returns valid data structure.

- [x] 4. Admin UI - Artwork Edit Form

  **What to do**:
  - Update `app/admin/artworks/artwork-edit-form.tsx`.
  - Add "Edition Type" select (Unique/Limited/Open).
  - Add "Edition Limit" input (visible only if Limited).
  - Default "Unique" for new artworks.
  - Bind to new fields in `createAdminArtwork` / `updateArtworkDetails`.

  **Recommended Agent**: `frontend-ui-ux`

  **Verification**:
  - Playwright: Fill form with "Limited" + "Limit: 10" → Save → Verify DB has values.

- [x] 5. Admin UI - Sales Management

  **What to do**:
  - Update `app/admin/artworks/[id]/page.tsx` (or new component).
  - Add section "Sales History".
  - Add "Record Sale" button -> Modal/Form.
    - Fields: Date (default now), Price (default artwork price), Buyer (optional).
  - On submit: Call `recordArtworkSale` action.
  - Show "Sold / Limit" progress bar.

  **Recommended Agent**: `frontend-ui-ux`

  **Verification**:
  - Playwright: Record sale → Verify list updates → Verify `artwork_sales` table.

- [x] 6. Data Validation & Oh Yoon Fix

  **What to do**:
  - Create a script `scripts/validate-migration.ts`.
  - Check for artworks with `status='sold'` but no sales record.
  - Check for `limited` artworks with `sales > limit`.
  - **Manual Step Support**: Output list of Oh Yoon's "Song of the Sword" works for Admin to review/merge.

  **Recommended Agent**: `quick`

  **Verification**:
  - Run script → Output "Validation Passed".

---

## Success Criteria

- [x] `status` column correctly syncs with `artwork_sales` count via trigger.
- [x] Revenue charts match pre-migration totals.
- [x] Admin can create a "Limited Edition (10)" and sell it 10 times.
- [x] 11th sale attempt fails or marks as Sold Out.
- [x] Public site shows "Sold Out" only when limit reached.
