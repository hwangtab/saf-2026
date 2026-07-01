# SAF Refactor Phase 26 Admin Artwork Tag Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `app/actions/admin-artworks.ts`에 남아 있는 관리자 내부 태그 server action wrapper들을 `app/actions/admin-artwork-tags.ts`로 분리한다.

**Architecture:** 기존 UI import 경로는 `@/app/actions/admin-artworks`로 유지한다. 새 action 파일은 auth, tag domain mutation 호출, admin revalidation, audit log만 담당하고, `admin-artworks.ts`는 해당 action들을 re-export해서 공개 API 호환성을 유지한다.

**Tech Stack:** Next.js Server Actions, Supabase admin client, existing `lib/artworks/admin-tags` domain mutations, Jest source/behavior tests, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 관리자 태그 생성/수정/보관/복원/삭제/작품 연결 action의 UI import 경로와 반환값은 바꾸지 않는다.
- 분리 불변조건: `admin-artworks.ts`는 내부 태그 mutation들을 직접 import하거나 구현하지 않고 새 action module을 re-export한다.
- 감사 로그 불변조건: 기존 `logAdminAction` action type, resource type, snapshots, summaries를 보존한다.
- revalidation 불변조건: `/admin/artworks`와 연결 작품 상세 admin path revalidation 범위를 보존한다.
- batch 불변조건: 빈 bulk add/remove는 기존처럼 auth 없이 `{ success: true, count: 0 }`를 반환한다.
- TDD: production code 변경 전에 failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `app/actions/admin-artwork-tags.ts`
  - `getAdminTags`, `getArtworkAdminTags`, `createAdminTag`, `updateAdminTag`, `archiveAdminTag`, `restoreAdminTag`, `deleteAdminTag`, `createAndAttachAdminTagToArtwork`, `addAdminTagToArtworks`, `removeAdminTagFromArtworks`를 담당한다.
- Create Test: `__tests__/actions/admin-artwork-tags.test.ts`
  - 새 action module의 representative behavior를 검증한다.
- Create Test: `__tests__/app/admin-artwork-tags-action-source.test.ts`
  - `admin-artworks.ts`가 tag action들을 re-export하고 tag mutation을 직접 import하지 않는 source contract를 검증한다.
- Modify: `app/actions/admin-artworks.ts`
  - tag action 구현과 tag mutation imports를 제거하고 새 module에서 re-export한다.
- Modify: `task.md`, `walkthrough.md`
  - Phase 26 체크리스트와 검증 결과를 기록한다.

---

## Execution Status

2026-07-01 완료:

- [x] tag action RED tests 추가 및 실패 확인
- [x] `app/actions/admin-artwork-tags.ts` 구현
- [x] `admin-artworks.ts` re-export 연결
- [x] focused tests, type-check, regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

### Task 1: Admin artwork tag action module 도입

**Files:**

- Create Test: `__tests__/actions/admin-artwork-tags.test.ts`
- Create Test: `__tests__/app/admin-artwork-tags-action-source.test.ts`
- Create: `app/actions/admin-artwork-tags.ts`

**Interfaces:**

- Produces:
  - `getAdminTags(includeArchived?: boolean)`
  - `getArtworkAdminTags(artworkId: string)`
  - `createAdminTag(input: AdminTagInput)`
  - `updateAdminTag(id: string, input: AdminTagInput)`
  - `archiveAdminTag(id: string)`
  - `restoreAdminTag(id: string)`
  - `deleteAdminTag(id: string)`
  - `createAndAttachAdminTagToArtwork(artworkId: string, input: AdminTagInput)`
  - `addAdminTagToArtworks(artworkIds: string[], tagId: string)`
  - `removeAdminTagFromArtworks(artworkIds: string[], tagId: string)`
- Consumes:
  - `requireAdmin`
  - `requireAdminClient`
  - `logAdminAction`
  - `revalidatePath`
  - `validateBatchSize`
  - `lib/artworks/admin-tags` mutations

- [x] **Step 1: RED behavior/source tests 추가**
  - behavior: `deleteAdminTag`는 mutation 결과의 linked artwork ids를 revalidate하고 기존 audit log payload를 남긴다.
  - behavior: `addAdminTagToArtworks([])`는 auth/mutation 없이 `{ success: true, count: 0 }`를 반환한다.
  - behavior: `addAdminTagToArtworks(['art-1', 'art-2'], 'tag-1')`는 batch validation, mutation, list/detail revalidation, audit log를 유지한다.
  - source: `admin-artworks.ts`는 tag action names를 `./admin-artwork-tags`에서 re-export하고 `createAdminTagMutation` 등 tag mutation names를 포함하지 않는다.

- [x] **Step 2: RED 실패 확인**
  - Run: `npm test -- --runInBand __tests__/actions/admin-artwork-tags.test.ts __tests__/app/admin-artwork-tags-action-source.test.ts`
  - Expected: FAIL with module not found or source contract mismatch for `admin-artwork-tags`.

- [x] **Step 3: action module 구현**
  - 기존 `admin-artworks.ts`의 tag action block을 새 파일로 옮긴다.
  - 새 파일 상단에 `'use server'`를 선언한다.
  - 기존 import order와 audit/revalidation payload를 유지한다.

- [x] **Step 4: tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/actions/admin-artwork-tags.test.ts __tests__/app/admin-artwork-tags-action-source.test.ts`
  - Expected: PASS.

### Task 2: `admin-artworks.ts` re-export 연결

**Files:**

- Modify: `app/actions/admin-artworks.ts`

**Interfaces:**

- Consumes:
  - all exports from `./admin-artwork-tags`

- [x] **Step 1: tag action block 제거**
  - `admin-artworks.ts`에서 tag action implementations와 `lib/artworks/admin-tags` imports를 제거한다.

- [x] **Step 2: re-export 추가**
  - `export { ... } from './admin-artwork-tags';`를 추가해 기존 UI imports를 유지한다.

- [x] **Step 3: focused action/source tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/actions/admin-artwork-tags.test.ts __tests__/app/admin-artwork-tags-action-source.test.ts __tests__/lib/artworks/admin-tags.test.ts`

### Task 3: verification and docs

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`
- Modify: `docs/superpowers/plans/2026-07-01-saf-refactor-phase-26-admin-artwork-tag-actions.md`

- [x] **Step 1: Phase focused regression Jest**
  - Admin artworks/tag/order/commerce regression suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: 문서 갱신**
  - plan execution status를 완료로 바꾼다.
  - `task.md`에 Phase 26 체크리스트를 추가한다.
  - `walkthrough.md`에 helper, action line count, 검증 결과, 남은 후보를 갱신한다.

## Self-Review

- Spec coverage: UI import compatibility, audit log preservation, revalidation preservation, empty bulk behavior, batch validation, source boundary가 각 task에 포함되어 있다.
- Placeholder scan: TBD/TODO/implement later placeholder 없음.
- Type consistency: exported action names are identical in File Structure, Interfaces, and Task 2 re-export requirements.

## Verification Notes

- RED 확인: `npm test -- --runInBand __tests__/actions/admin-artwork-tags.test.ts __tests__/app/admin-artwork-tags-action-source.test.ts`가 새 module 부재/source contract mismatch로 실패하는 것을 확인했다.
- Focused GREEN: `npm test -- --runInBand __tests__/actions/admin-artwork-tags.test.ts __tests__/app/admin-artwork-tags-action-source.test.ts` 통과.
- Broader focused GREEN: `npm test -- --runInBand __tests__/actions/admin-artwork-tags.test.ts __tests__/app/admin-artwork-tags-action-source.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts` 통과, 7 suites / 39 tests.
- Phase regression GREEN: Phase 3-26 regression suite 통과, 50 suites / 242 tests.
- `npm run type-check` 통과.
- `npm run lint` 통과. 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건은 유지.
- `git diff --check` 통과.
- Line count: `app/actions/admin-artworks.ts` 667줄, `app/actions/admin-artwork-tags.ts` 239줄.
