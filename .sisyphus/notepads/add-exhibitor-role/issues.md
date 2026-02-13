# Issues & Gotchas: Add Exhibitor Role

## Known Issues

(To be populated during implementation)

## [2026-02-13 12:20] Issue: artists.profile column missing in DB

**Problem:**

- `lib/supabase-data.ts` queries `profile` column from `artists` table
- Database does not have this column (error: `column artists.profile does not exist`)
- Error appears during build when generating static pages

**Impact:**

- Build completes successfully but logs errors
- May cause issues when fetching artist data in production

**Note:**

- This is a PRE-EXISTING issue, not introduced by Task 1 (exhibitor migration)
- Should be addressed in a separate task or migration

**Location:**

- File: `lib/supabase-data.ts:14`
- Definition: `const ARTIST_SELECT_COLUMNS = 'id, name_ko, profile, bio, history';`
