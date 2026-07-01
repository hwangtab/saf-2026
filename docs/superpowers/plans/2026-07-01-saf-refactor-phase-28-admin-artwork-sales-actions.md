# SAF Refactor Phase 28 Admin Artwork Sales Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `app/actions/admin-artworks.ts`에 남아 있는 판매 기록 server action wrapper들을 `app/actions/admin-artwork-sales.ts`로 분리한다.

**Architecture:** 기존 UI import 경로는 `@/app/actions/admin-artworks`로 유지한다. 새 sales action 파일은 admin auth, FormData parsing/validation, `lib/artworks/sales` domain mutation 호출, public/admin revalidation, audit log만 담당하고, `admin-artworks.ts`는 해당 action들을 re-export해서 공개 API 호환성을 유지한다.

**Tech Stack:** Next.js Server Actions, Supabase admin client, existing `lib/artworks/sales` domain mutations, Jest behavior/source tests, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 관리자 작품 상세의 판매 기록 UI import 경로와 반환값은 바꾸지 않는다.
- 분리 불변조건: `admin-artworks.ts`는 판매 기록 domain mutation들을 직접 import하거나 구현하지 않고 새 action module을 re-export한다.
- 감사 로그 불변조건: 기존 `logAdminAction` action type, resource type, snapshots, summaries를 보존한다.
- revalidation 불변조건: 판매 기록 생성/수정/취소 후 공개 상세/목록과 admin 관련 경로 revalidation 범위를 보존한다.
- validation 불변조건: `validateSaleInput`, 필수값 guard, void reason trim 정책을 보존한다.
- TDD: production code 변경 전에 failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `app/actions/admin-artwork-sales.ts`
  - `getArtworkSales`, `recordArtworkSale`, `updateArtworkSale`, `voidArtworkSale`를 담당한다.
- Create Test: `__tests__/actions/admin-artwork-sales.test.ts`
  - 판매 기록 생성/취소 action의 대표 behavior를 검증한다.
- Modify Test: `__tests__/app/admin-artwork-create-revalidate-contract.test.ts`
  - 판매 action source contract를 새 module 기준으로 갱신하고, `admin-artworks.ts` re-export boundary를 검증한다.
- Modify: `app/actions/admin-artworks.ts`
  - 판매 action 구현과 sales-specific imports를 제거하고 새 module에서 re-export한다.
- Modify: `task.md`, `walkthrough.md`
  - Phase 28 체크리스트와 검증 결과를 기록한다.

---

## Execution Status

2026-07-01 완료:

- [x] sales action RED tests 추가 및 실패 확인
- [x] `app/actions/admin-artwork-sales.ts` 구현
- [x] `admin-artworks.ts` re-export 연결
- [x] focused tests, type-check, regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

### Task 1: Admin artwork sales action module 도입

**Files:**

- Create Test: `__tests__/actions/admin-artwork-sales.test.ts`
- Modify Test: `__tests__/app/admin-artwork-create-revalidate-contract.test.ts`
- Create: `app/actions/admin-artwork-sales.ts`

**Interfaces:**

- Produces:
  - `getArtworkSales(artworkId: string)`
  - `recordArtworkSale(formData: FormData)`
  - `updateArtworkSale(formData: FormData)`
  - `voidArtworkSale(saleId: string, reason: string)`
- Consumes:
  - `requireAdmin`
  - `requireAdminClient`
  - `logAdminAction`
  - `getString`
  - `validateSaleInput`
  - `listArtworkSales`, `recordManualArtworkSale`, `updateManualArtworkSale`, `voidManualArtworkSale`
  - `revalidatePublicArtworkDetails`, `revalidatePublicArtworkSurfaces`
  - `revalidatePath`

- [x] **Step 1: RED behavior/source tests 추가**
  - behavior: `recordArtworkSale`는 FormData를 파싱/검증하고 domain mutation, audit log, public/admin revalidation을 유지한다.
  - behavior: `voidArtworkSale`는 reason trim guard, domain mutation, audit snapshot, buyers/revenue/artist-sales revalidation을 유지한다.
  - source: sales action source contract는 `admin-artwork-sales.ts`를 기준으로 검증한다.
  - source: `admin-artworks.ts`는 sales action names를 `./admin-artwork-sales`에서 re-export하고 sales domain mutation을 직접 import하지 않는다.

- [x] **Step 2: RED 실패 확인**
  - Run: `npm test -- --runInBand __tests__/actions/admin-artwork-sales.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts`
  - Expected: FAIL with module not found or source contract mismatch for `admin-artwork-sales`.

- [x] **Step 3: action module 구현**
  - 기존 `admin-artworks.ts`의 sales action block을 새 파일로 옮긴다.
  - 새 파일 상단에 `'use server'`를 선언한다.
  - 기존 import order와 audit/revalidation payload를 유지한다.

- [x] **Step 4: tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/actions/admin-artwork-sales.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts`
  - Expected: PASS.

### Task 2: `admin-artworks.ts` re-export 연결

**Files:**

- Modify: `app/actions/admin-artworks.ts`

**Interfaces:**

- Consumes:
  - all exports from `./admin-artwork-sales`

- [x] **Step 1: sales action block 제거**
  - `admin-artworks.ts`에서 sales action implementations와 `lib/artworks/sales`, `validateSaleInput`, `getString` imports를 제거한다.

- [x] **Step 2: re-export 추가**
  - `export { getArtworkSales, recordArtworkSale, updateArtworkSale, voidArtworkSale } from './admin-artwork-sales';`를 추가해 기존 UI imports를 유지한다.

- [x] **Step 3: focused action/source tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/actions/admin-artwork-sales.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/lib/artworks/sales.test.ts`

### Task 3: verification and docs

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`
- Modify: `docs/superpowers/plans/2026-07-01-saf-refactor-phase-28-admin-artwork-sales-actions.md`

- [x] **Step 1: Phase focused regression Jest**
  - Admin artworks sales/details/tag/status/delete/source regression suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: 문서 갱신**
  - plan execution status를 완료로 바꾼다.
  - `task.md`에 Phase 28 체크리스트를 추가한다.
  - `walkthrough.md`에 helper, action line count, 검증 결과, 남은 후보를 갱신한다.

## Self-Review

- Spec coverage: UI import compatibility, audit log preservation, revalidation preservation, validation guard, source boundary가 각 task에 포함되어 있다.
- Placeholder scan: TBD/TODO/implement later placeholder 없음.
- Type consistency: exported action names are identical in File Structure, Interfaces, and Task 2 re-export requirements.

## Verification Notes

- RED 확인: `npm test -- --runInBand __tests__/actions/admin-artwork-sales.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts`가 새 module 부재/source contract mismatch로 실패하는 것을 확인했다.
- Focused GREEN: 같은 명령 통과, 2 suites / 16 tests.
- Broader focused GREEN: `npm test -- --runInBand __tests__/actions/admin-artwork-sales.test.ts __tests__/actions/admin-artwork-details.test.ts __tests__/actions/admin-artwork-tags.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-tags-action-source.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts` 통과, 12 suites / 56 tests.
- Phase regression GREEN: Phase 3-28 regression suite 통과, 52 suites / 248 tests.
- `npm run type-check` 통과.
- `npm run lint` 통과. 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건은 유지.
- `git diff --check` 통과.
- Line count: `app/actions/admin-artworks.ts` 332줄, `app/actions/admin-artwork-sales.ts` 196줄, `app/actions/admin-artwork-details.ts` 170줄, `app/actions/admin-artwork-tags.ts` 239줄.
