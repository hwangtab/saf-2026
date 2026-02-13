# Learnings: Add Exhibitor Role

## [START] Session: ses_3ab19a41dffeNSyDfZJArgKyNs

Starting work on add-exhibitor-role plan.

## [2026-02-13 03:20] Task 1: Supabase Migration

- Migration file: `supabase/migrations/20260213031405_add_exhibitor_role.sql`
- Database push: Success
- Notes:
  - Added `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'exhibitor'` to handle the enum type which was missing the 'exhibitor' role.
  - Used `role::text` in the check constraint for compatibility.
  - Supabase CLI successfully pushed the migration to the remote database.
