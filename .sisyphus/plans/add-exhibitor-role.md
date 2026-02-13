# Plan: Add Exhibitor Role

## TL;DR

> **Quick Summary**: 갤러리 관장님 등 타 작가의 작품을 관리하는 '출품자(Exhibitor)' 역할을 추가합니다.
>
> **Deliverables**:
>
> - [SQL] `supabase/migrations/20260213_add_exhibitor_role.sql`: DB 스키마 변경 스크립트
> - [Type] `types/index.ts`: `exhibitor` 역할 및 `owner_id` 속성 추가
> - [Auth] `lib/auth/guards.ts`: `requireExhibitor` 권한 가드 함수 구현
> - [Data] `lib/supabase-data.ts`: 소유자별 작가 목록 조회 함수 추가
>
> **Estimated Effort**: Medium
> **Parallel Execution**: Sequential

---

## Context

### Original Request

사용자는 "출품자(Exhibitor)" 역할을 추가하여, 본인 소유의 작가(타인)의 작품을 등록하고 수정할 수 있는 기능을 요청했습니다. 관리자보다는 권한이 적고, 아티스트보다는 많은(또는 다른) 권한이 필요합니다.

### Implementation Strategy

1.  **Database**: `artists` 테이블에 `owner_id` 컬럼을 추가하여 소유권 관계를 명시합니다.
    - 기존 아티스트: `owner_id` = 본인 ID
    - 출품자가 등록한 작가: `owner_id` = 출품자 ID
2.  **Role**: `exhibitor` 역할을 추가하고, 이에 따른 권한 가드(Guard)를 구현합니다.
3.  **Logic**: 출품자는 자신이 소유한(`owner_id`가 일치하는) 작가 프로필과 작품만 수정할 수 있습니다.

---

## Work Objectives

### Core Objective

출품자(Exhibitor)가 여러 작가를 등록하고 그들의 작품을 관리할 수 있는 기반 시스템 구축

### Must Have

- `artists` 테이블에 `owner_id` 컬럼 추가
- `UserRole` 또는 관련 타입에 `exhibitor` 추가
- `requireExhibitor` 서버 사이드 권한 체크 함수
- 소유한 작가 목록 조회 기능

### Must NOT Have (Guardrails)

- 기존 아티스트 권한(`artist` role)의 변경이나 삭제
- 관리자 권한(`admin` role)의 축소

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Agent-Executed QA Scenarios

**Scenario 1: Verify SQL Migration File Creation**

- Tool: Bash (ls, cat)
- Steps:
  1. Check if `supabase/migrations/20260213_add_exhibitor_role.sql` exists.
  2. Read file content and assert it contains `ALTER TABLE artists ADD COLUMN`.
- Expected Result: File exists with correct SQL commands.

**Scenario 2: Verify Type Definition Update**

- Tool: Bash (grep)
- Steps:
  1. Grep `'exhibitor'` in `types/index.ts`.
- Expected Result: Found `'exhibitor'` in the file.

**Scenario 3: Verify Auth Guard Implementation**

- Tool: Bash (grep)
- Steps:
  1. Grep `export async function requireExhibitor` in `lib/auth/guards.ts`.
- Expected Result: Function definition found.

---

## TODOs

- [x] 1. Create & Apply Migration via Supabase CLI

  **What to do**:
  1. Run `npx supabase migration new add_exhibitor_role` to generate a timestamped migration file.
  2. Locate the created file in `supabase/migrations/`.
  3. Write the SQL content to that file:
     - `ALTER TABLE artists ADD COLUMN owner_id UUID REFERENCES auth.users(id);`
     - `CREATE POLICY` statements for RLS.
     - `ALTER TABLE profiles` check constraint update.
  4. Run `npx supabase db push` to apply changes to the remote DB.
     - _Note: Use the DB password from environment variables._

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`, `interactive_bash`]

  **Acceptance Criteria**:
  - [ ] Migration file created in `supabase/migrations/`
  - [ ] SQL content written correctly
  - [ ] `supabase db push` executed successfully (exit code 0)

- [x] 2. Update Type Definitions

  **What to do**:
  - Update `types/index.ts`:
    - Add `'exhibitor'` to `UserRole`.
    - Add `owner_id?: string` to `ArtistData` interface.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Acceptance Criteria**:
  - [ ] `types/index.ts` contains `'exhibitor'`
  - [ ] `types/index.ts` contains `owner_id`

- [ ] 3. Implement Auth Guard for Exhibitor

  **What to do**:
  - Update `lib/auth/guards.ts`:
    - Implement `requireExhibitor()` function.
    - Logic: Check `profile.role === 'exhibitor'`.
    - Redirect: If valid, return user; else redirect to `/login`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Acceptance Criteria**:
  - [ ] `requireExhibitor` function exported
  - [ ] Redirects correctly based on role

- [ ] 4. Add Data Fetching Logic for Owned Artists

  **What to do**:
  - Update `lib/supabase-data.ts`:
    - Add `getSupabaseArtistsByOwner(ownerId: string)` function.
    - Query: `.from('artists').select('*').eq('owner_id', ownerId)`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Acceptance Criteria**:
  - [ ] Function `getSupabaseArtistsByOwner` exists
  - [ ] Returns list of artists owned by the user

- [ ] 5. Create Exhibitor Dashboard Layout

  **What to do**:
  - Create `app/exhibitor/layout.tsx`:
    - Use `requireExhibitor()` guard.
    - Include a sidebar or nav specifically for exhibitors (Artists, Artworks).
  - Create `app/exhibitor/page.tsx`:
    - Display overview stats (Total Artists, Total Artworks).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Acceptance Criteria**:
  - [ ] `/exhibitor` route accessible only to exhibitors
  - [ ] Shows basic dashboard structure

- [ ] 6. Implement "My Artists" Management UI

  **What to do**:
  - Create `app/exhibitor/artists/page.tsx`.
  - Display table of owned artists using `getSupabaseArtistsByOwner`.
  - Add "Add Artist" button -> opens modal or redirects to form.
  - Implement simple "Add Artist" form (Name, Bio, etc.).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`, `dev-browser`]

  **Acceptance Criteria**:
  - [ ] List of artists displayed
  - [ ] Can add a new artist (which gets `owner_id` set automatically)

- [ ] 7. Implement "My Artworks" Management UI

  **What to do**:
  - Create `app/exhibitor/artworks/page.tsx`.
  - Display table of artworks from ALL owned artists.
  - Add "Add Artwork" button.
  - **Crucial**: The Add/Edit form must include an **"Artist Selector"** dropdown (populated by owned artists only).

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Acceptance Criteria**:
  - [ ] List of artworks displayed
  - [ ] Add Artwork form allows selecting from owned artists

---

## Success Criteria

### Final Checklist

- [ ] SQL migration file created
- [ ] Types updated with `exhibitor`
- [ ] Auth guard `requireExhibitor` implemented
- [ ] Data fetching for owned artists implemented
