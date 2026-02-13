- Implemented support for 'year_YYYY' periods in admin dashboard stats.
- Added YoY comparison logic to revenue time series by mapping previous period records to current period buckets.
- Used template literal types for 'year\_${number}' to provide better type safety for period keys.
- Handled edge cases like leap years (indirectly through Date object) and division by zero in growth rate calculations.

## UI Enhancement for Admin Dashboard (YoY Data)

- **Dynamic Period Options**: Added `year_2026`, `year_2025`, etc. dynamically using `new Date().getFullYear()`. This avoids hardcoding and ensures relevance as time passes.
- **Conditional Formatting**: Used Tailwind's text color utilities (`text-green-600`, `text-red-600`) to visualize growth rates effectively.
- **Chart Tooltips**: Updated `Recharts` custom tooltip to include optional data fields (`previousRevenue`, `growthRate`) only when they exist, keeping the UI clean for simpler datasets.
- **Table Structure**: Added columns for YoY analysis while maintaining the existing responsive table layout.
