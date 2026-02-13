# Draft: Artist Account Linking Feature

## Context

- **Current State**: ~113 Registered Artists (likely static/content data), but only 2 have connected "User Accounts".
- **Problem**: When a new user signs up, if they are _already_ one of the 113 registered artists, there is no automatic way to link them.
- **Missing Feature**: An admin interface or logic to manually/automatically link a `User` account to an existing `Artist` profile.

## Investigation Status

- [ ] Inspect `Artist` data model for linking fields (`userId`, etc.)
- [ ] Check for existing Admin Dashboard or Management UI.
- [ ] Verify User Registration flow.

## Hypothesis

- The project likely has a "Static" artist list (`content/artists/*.ts` or similar).
- The "User" system (Auth) is likely separate (Supabase/NextAuth).
- A bridge table or a field on the `Artist` object is needed to store the `userId`.
- An Admin UI is needed to update this field.
