# Monthly Revenue Feature Plan

## TL;DR

> **Quick Summary**: Implement "Monthly Revenue" view in Admin Dashboard with Year Selection (2024, 2025, 2026) and Year-over-Year (YoY) comparison.
>
> **Deliverables**:
>
> - Backend: Support `year_YYYY` periods in `getDashboardStats`, fetch previous year data, calculate monthly YoY growth.
> - Frontend: Add Year tabs to Period Selector, update Table with YoY columns, enhance Chart with comparison data.
>
> **Estimated Effort**: Medium
> **Parallel Execution**: Sequential (Backend → Frontend)
> **Critical Path**: Update `admin-dashboard.ts` → Update `page.tsx` → Verify Data

---

## Context

### Original Request

User wants to see revenue by month (e.g., January, February) in the admin dashboard.

### Interview Summary

**Key Discussions**:

- **View Type**: Monthly Table View + Calendar Year Selection + YoY Comparison.
- **Year Range**: Last 3 years (e.g., 2026, 2025, 2024).
- **Edge Case**: If previous year revenue is $0, display YoY growth as "N/A" (or "-").
- **Current Month**: Include partial data for current month.

### Metis Review

**Identified Gaps** (addressed):

- **Scope**: Restricted to Revenue only (no orders/customers YoY).
- **Data Handling**: Explicit handling of missing data/zero division for YoY.
- **UI**: No export functionality, no new pages, integrated into existing dashboard.

---

## Work Objectives

### Core Objective

Enable admins to view and compare monthly revenue performance across specific calendar years.

### Concrete Deliverables

- [ ] Updated `app/actions/admin-dashboard.ts` supporting `year_YYYY` period keys.
- [ ] Enhanced `DashboardStats` type with `previousRevenue` and `growthRate` per month.
- [ ] Updated `app/admin/dashboard/page.tsx` with dynamic year tabs.
- [ ] Updated `RevenueTrendChart` visualizing selected year's trend.
- [ ] Updated Table view showing explicit months and YoY growth.

### Definition of Done

- [ ] Admin can select "2025", "2024" from tabs.
- [ ] Selecting a year shows Jan-Dec breakdown in table.
- [ ] Table shows "Revenue", "Prev Year Revenue", "YoY Growth", "Sold Count", "Avg Price".
- [ ] Chart displays data for the selected calendar year.

### Must Have

- [ ] Last 3 years in selector (dynamic based on current year).
- [ ] YoY Growth calculation: `((current - previous) / previous) * 100`.
- [ ] "N/A" display for undefined growth (prev = 0).

### Must NOT Have (Guardrails)

- [ ] No export to CSV/Excel.
- [ ] No new API endpoints (extend existing action).
- [ ] No filtering by product/category.
- [ ] No "All Time" aggregation view for this specific feature.
- [ ] No clickable drill-down in table.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: YES (Jest/Vitest setup implied by `npm test`)
- **Automated tests**: YES (Tests after implementation for logic)
- **Agent-Executed QA**: ALWAYS (mandatory)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Backend Logic (getDashboardStats):**

```
Scenario: Fetch stats for specific year returns 12 months
  Tool: Bash (ts-node or script)
  Preconditions: DB has data or mock
  Steps:
    1. Call getDashboardStats('year_2025')
    2. Assert: timeSeries length is 12 (Jan-Dec)
    3. Assert: bucketKey format is '2025-01' ... '2025-12'
  Expected Result: 12 monthly buckets returned
  Evidence: Output JSON

Scenario: YoY Growth calculation handles zero previous revenue
  Tool: Bash (ts-node or script)
  Preconditions: Mock data where Jan 2024 revenue is 0
  Steps:
    1. Call getDashboardStats('year_2025')
    2. Check Jan 2025 bucket
    3. Assert: previousRevenue is 0
    4. Assert: growthRate is null (or specific indicator)
  Expected Result: Graceful handling of division by zero
  Evidence: Output JSON
```

**Frontend UI (Year Selector & Table):**

```
Scenario: Year tabs are rendered
  Tool: Playwright/Cheerio (via test script)
  Preconditions: Page rendered with mock stats
  Steps:
    1. Render AdminDashboardPage
    2. Query selector for year tabs (e.g., text "2025")
    3. Assert: Element exists
  Expected Result: Year options visible
  Evidence: HTML snapshot
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Backend):
└── Task 1: Update admin-dashboard.ts (Types & Logic)

Wave 2 (Frontend):
└── Task 2: Update Page & Components (UI)
```

### Dependency Matrix

| Task | Depends On | Blocks |
| ---- | ---------- | ------ |
| 1    | None       | 2      |
| 2    | 1          | None   |

---

## TODOs

- [x] 1. Update Server Action for Year Support & YoY

  **What to do**:
  - Update `DashboardPeriodKey` type to allow `year_${number}`.
  - Update `getPeriodStart` and `getPeriodEnd` to handle year keys (Jan 1 - Dec 31).
  - Update `getBucketGranularity` to return 'month' for years.
  - Modify `buildRevenueTimeSeries` to accept `previousPeriodRecords` and calculate `previousRevenue` + `growthRate` for each bucket.
  - Ensure `timeSeries` items include: `previousRevenue: number`, `growthRate: number | null`.
  - Fetch previous year's data in `getDashboardStats` if period is a year.

  **Must NOT do**:
  - Do not change existing logic for '7d', '30d', etc. (keep backward compatibility).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript`, `database`]

  **References**:
  - `app/actions/admin-dashboard.ts` - Main file to modify.
  - `app/actions/admin-dashboard.ts:getDashboardStats` - Main function.
  - `app/actions/admin-dashboard.ts:buildRevenueTimeSeries` - Bucket logic.

  **Acceptance Criteria**:
  - [ ] `getDashboardStats('year_2025')` returns 12 monthly buckets.
  - [ ] Each bucket has `previousRevenue` populated from 2024 data (if exists).
  - [ ] `growthRate` is calculated correctly (null if prev=0).
  - [ ] Existing periods ('30d') still work without regression.

  **Agent-Executed QA Scenarios**:
  - Verify API response structure for 'year_2025'.
  - Verify `previousRevenue` is 0 if no prev data.
  - Verify `growthRate` calculation.

- [ ] 2. Update Admin Dashboard UI (Selector, Table, Chart)

  **What to do**:
  - Update `DASHBOARD_PERIOD_OPTIONS` in `page.tsx` (or move to shared const) to include dynamic years (Current Year, Last Year, 2 Years Ago).
  - Update `DashboardPeriodTabs` to handle the new keys.
  - Update the "Detailed Table" in `page.tsx`:
    - Add columns: "작년 매출" (Prev Revenue), "성장률" (Growth).
    - Render `growthRate` with color (Red for negative, Green for positive, "N/A" for null).
  - Update `RevenueTrendChart.tsx`:
    - (Optional) Visualize previous revenue if possible, or just ensure it renders current year correctly without crashing.
    - Update Tooltip to show YoY data if available.

  **Must NOT do**:
  - Do not create a separate page.
  - Do not break existing chart rendering for '30d'.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react`, `tailwindcss`, `recharts`]

  **References**:
  - `app/admin/dashboard/page.tsx` - UI to update.
  - `app/admin/_components/RevenueTrendChart.tsx` - Chart component.
  - `app/admin/_components/DashboardPeriodTabs.tsx` - Tabs.

  **Acceptance Criteria**:
  - [ ] Year tabs (e.g., 2026, 2025, 2024) are visible and clickable.
  - [ ] Table shows "Prev Revenue" and "Growth" columns when year is selected.
  - [ ] "N/A" displayed for null growth rate.
  - [ ] Chart renders 12 months for selected year.

  **Agent-Executed QA Scenarios**:
  - Verify Table columns presence.
  - Verify "N/A" display logic.
  - Verify Chart renders without error.

---

## Success Criteria

### Final Checklist

- [ ] Can select "2025" and see Jan-Dec revenue.
- [ ] Table shows YoY growth percentages.
- [ ] "N/A" appears for months with 0 previous revenue.
- [ ] Existing "Last 30 Days" view still works perfectly.
