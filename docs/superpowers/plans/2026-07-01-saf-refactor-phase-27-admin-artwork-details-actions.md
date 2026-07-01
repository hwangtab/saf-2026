# SAF Refactor Phase 27 Admin Artwork Details Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `app/actions/admin-artworks.ts`에 남아 있는 작품 생성/상세 수정 server action wrapper와 공개 작품 캐시 재검증 예약 helper를 `app/actions/admin-artwork-details.ts`로 분리한다.

**Architecture:** UI import 경로는 기존처럼 `@/app/actions/admin-artworks`로 유지한다. 새 details action 파일은 admin auth, details form parsing, details mutation 호출, admin/public revalidation, audit/system log, 공개 캐시 재검증 예약만 담당한다. `admin-artworks.ts`는 `createAdminArtwork`, `updateArtworkDetails`를 re-export해서 공개 API 호환성을 유지한다.

**Tech Stack:** Next.js Server Actions, `after()`, Supabase admin client, existing `lib/artworks/details-*` domain helpers, Jest behavior/source tests, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 신규 작품 등록 응답은 관리자 목록 revalidation만 즉시 싣고, 공개 목록/작가/API tag 무효화는 보호된 내부 route 호출로 응답 후 예약한다.
- UI 호환성: `app/(portal)/admin/artworks/artwork-edit-form.tsx`의 import path는 바꾸지 않는다.
- 공개 캐시 실패 가시성: config 누락, route HTTP 실패, fetch 실패는 기존처럼 operator-visible email/system log로 남긴다.
- 감사 로그 불변조건: `artwork_created`, `artwork_updated` action type과 snapshot 정책을 보존한다.
- revalidation 불변조건: update는 공개 목록/상세와 admin 목록/상세를 즉시 무효화하고, create는 admin 목록 즉시 + public surfaces 예약 정책을 유지한다.
- TDD: production code 변경 전에 failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `app/actions/admin-artwork-details.ts`
  - `updateArtworkDetails`, `createAdminArtwork`와 internal `createAdminArtworkRecord`, `schedulePublicArtworkSurfaceRevalidation`을 담당한다.
- Create Test: `__tests__/actions/admin-artwork-details.test.ts`
  - create/update action의 audit, revalidation, protected-route scheduling을 검증한다.
- Modify Test: `__tests__/app/admin-artwork-create-revalidate-contract.test.ts`
  - 공개 캐시 예약 source contract를 새 module 기준으로 갱신하고, `admin-artworks.ts` re-export boundary를 검증한다.
- Modify Test: `__tests__/app/admin-artwork-create-image-upload-source.test.ts`
  - draft image/create action source contract를 새 module 기준으로 갱신한다.
- Modify: `app/actions/admin-artworks.ts`
  - details action 구현과 details-specific imports를 제거하고 새 module에서 re-export한다.
- Modify: `task.md`, `walkthrough.md`
  - Phase 27 체크리스트와 검증 결과를 기록한다.

---

## Execution Status

2026-07-01 완료:

- [x] details action RED tests 추가 및 실패 확인
- [x] `app/actions/admin-artwork-details.ts` 구현
- [x] `admin-artworks.ts` re-export 연결
- [x] focused tests, type-check, regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

### Task 1: Admin artwork details action module 도입

**Files:**

- Create Test: `__tests__/actions/admin-artwork-details.test.ts`
- Modify Test: `__tests__/app/admin-artwork-create-revalidate-contract.test.ts`
- Modify Test: `__tests__/app/admin-artwork-create-image-upload-source.test.ts`
- Create: `app/actions/admin-artwork-details.ts`

**Interfaces:**

- Produces:
  - `updateArtworkDetails(id: string, formData: FormData)`
  - `createAdminArtwork(formData: FormData)`
- Consumes:
  - `requireAdmin`
  - `requireAdminClient`
  - `logAdminAction`, `logSystemAction`
  - `notifyEmail`
  - `parseAdminArtworkCreateFormData`, `parseAdminArtworkDetailsFormData`
  - `createAdminArtworkRecordMutation`, `updateAdminArtworkDetailsMutation`
  - public/admin revalidation helpers
  - `resolvePublicArtworkRevalidationConfig`
  - `after`

- [x] **Step 1: RED behavior/source tests 추가**
  - behavior: `createAdminArtwork`는 admin list만 즉시 revalidate하고 protected internal route 호출을 `after()`로 예약한다.
  - behavior: `updateArtworkDetails`는 public surfaces/details와 admin list/detail revalidation, audit snapshot을 유지한다.
  - source: create revalidate/image upload contract는 `admin-artwork-details.ts`를 기준으로 검증한다.
  - source: `admin-artworks.ts`는 details action names를 `./admin-artwork-details`에서 re-export하고 details parser/mutation/config를 직접 import하지 않는다.

- [x] **Step 2: RED 실패 확인**
  - Run: `npm test -- --runInBand __tests__/actions/admin-artwork-details.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts`
  - Expected: FAIL with module not found or source contract mismatch for `admin-artwork-details`.

- [x] **Step 3: action module 구현**
  - 기존 `admin-artworks.ts`의 create/update details block과 public revalidation schedule helper를 새 파일로 옮긴다.
  - 새 파일 상단에 `'use server'`를 선언한다.
  - 기존 route scheduling, notify/log payload, audit/revalidation payload를 보존한다.

- [x] **Step 4: tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/actions/admin-artwork-details.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts`
  - Expected: PASS.

### Task 2: `admin-artworks.ts` re-export 연결

**Files:**

- Modify: `app/actions/admin-artworks.ts`

**Interfaces:**

- Consumes:
  - `createAdminArtwork`, `updateArtworkDetails` from `./admin-artwork-details`

- [x] **Step 1: details action block 제거**
  - `admin-artworks.ts`에서 create/update details implementations, `schedulePublicArtworkSurfaceRevalidation`, details-specific imports를 제거한다.

- [x] **Step 2: re-export 추가**
  - `export { createAdminArtwork, updateArtworkDetails } from './admin-artwork-details';`를 추가해 기존 UI imports를 유지한다.

- [x] **Step 3: focused action/source tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/actions/admin-artwork-details.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts`

### Task 3: verification and docs

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`
- Modify: `docs/superpowers/plans/2026-07-01-saf-refactor-phase-27-admin-artwork-details-actions.md`

- [x] **Step 1: Phase focused regression Jest**
  - Admin artworks details/tag/status/delete/source regression suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: 문서 갱신**
  - plan execution status를 완료로 바꾼다.
  - `task.md`에 Phase 27 체크리스트를 추가한다.
  - `walkthrough.md`에 helper, action line count, 검증 결과, 남은 후보를 갱신한다.

## Self-Review

- Spec coverage: create 응답 경량화, public route scheduling, failure visibility, update revalidation, UI import compatibility, source boundary가 각 task에 포함되어 있다.
- Placeholder scan: TBD/TODO/implement later placeholder 없음.
- Type consistency: exported action names are identical in File Structure, Interfaces, and Task 2 re-export requirements.

## Verification Notes

- RED 확인: `npm test -- --runInBand __tests__/actions/admin-artwork-details.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts`가 새 module 부재/source contract mismatch로 실패하는 것을 확인했다.
- Focused GREEN: 같은 명령 통과, 3 suites / 24 tests.
- Broader focused GREEN: `npm test -- --runInBand __tests__/actions/admin-artwork-details.test.ts __tests__/actions/admin-artwork-tags.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-tags-action-source.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts` 통과, 10 suites / 49 tests.
- Phase regression GREEN: Phase 3-27 regression suite 통과, 51 suites / 245 tests.
- `npm run type-check` 통과.
- `npm run lint` 통과. 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건은 유지.
- `git diff --check` 통과.
- Line count: `app/actions/admin-artworks.ts` 510줄, `app/actions/admin-artwork-details.ts` 170줄, `app/actions/admin-artwork-tags.ts` 239줄.
