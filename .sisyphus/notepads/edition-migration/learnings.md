- Migration files follow timestamped naming convention: YYYYMMDDHHMMSS_description.sql
- Enum creation in Supabase migrations is safer within a DO block with IF NOT EXISTS check.
- Data backfill in migrations should be idempotent (e.g., using WHERE NOT EXISTS or CTEs) to avoid duplicate entries during re-runs.
- Admin RLS policies often reference a separate 'profiles' table with a 'role' column for authorization.
- SQL migrations in this project use YYYYMMDDHHMMSS prefix.
- Artwork price backfill requires robust regex parsing ('₩1,000,000' -> 1000000).
- Trigger-based status sync ensures data consistency between sales and artwork status.
- RLS policies should distinguish between public read access and admin management.
- Updated createAdminArtwork and updateArtworkDetails to handle edition_type and edition_limit fields from FormData.
- Included new fields in Supabase snapshots for activity logging consistency.
- Verified with npm run type-check.

## 2026-02-15

- Observed file modification of `app/actions/admin-artworks.ts` between read and edit calls. The file was updated to include `edition_type` and `edition_limit` extraction and saving logic, which matched the task requirements.
- Verified the implementation: `edition_limit` is set to `null` unless `edition_type` is `limited`, which follows the business logic.
- Snapshot fields in `deleteAdminArtwork` and `batchDeleteArtworks` were also updated to include these new fields.

### Validation Script Implementation

- Created `scripts/validate-migration.ts` to verify the edition migration.
- Implemented 4 specific checks:
  1. Sold artworks vs sales entries.
  2. Non-sold artworks vs sales entries (allowing for multiple editions).
  3. Limited edition limits vs total quantity sold.
  4. Specific artist edition type validation.
- Used `SUPABASE_SERVICE_ROLE_KEY` for full database access.
- Handled quantity summation for limited editions to match migration logic.
