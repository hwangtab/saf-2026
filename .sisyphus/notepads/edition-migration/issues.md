- File 20260215040000_add_edition_system.sql already existed in the environment; updated it to match precise task requirements.
- SQL price parsing handled via REGEXP_REPLACE and CAST to integer with COALESCE fallbacks.
- The `app/actions/admin-artworks.ts` file needs to be updated to handle `edition_type` and `edition_limit` in `createAdminArtwork` and `updateArtworkDetails`. The current implementation only updates the frontend form to include these fields in the `FormData` submission, but the backend action ignores them. This was out of scope for the current task (frontend form update).

## 2026-02-15

- Encountered a race condition or external modification while editing `app/actions/admin-artworks.ts`. The file was updated with the requested changes before the `edit` tool could apply them. `npm run type-check` passed, confirming the state is valid.

### Database Schema Cache Issue

- Encountered `PGRST205` error when running the script locally because `artwork_sales` table was not yet available in the schema cache or the migration hadn't been applied to the local/target environment.
- Verified table name and schema from `supabase/migrations/20260215040000_add_edition_system.sql`.
