# Page Transition Fade Animation

## Context

### Original Request

페이지 전환 시 부드러운 트랜지션 애니메이션 추가 (로딩 상태 개선)

### Interview Summary

**Key Discussions**:

- 현재 상태: 페이지 전환 시 피드백 없음, 전역 PageLoader 스피너만 존재
- 구현 방식: Fade 전환만 (200ms), slide/direction 애니메이션 없음
- Skeleton 로딩: 불필요 (현재 PageLoader 유지)
- 중첩 라우트: 최상위 세그먼트 전환만 fade 적용

**Research Findings**:

- `template.tsx`는 첫 번째 세그먼트가 변경될 때만 리마운트됨
- 기존 `AnimationProvider`가 `LazyMotion` + `domAnimation` 제공
- `FadeInSection.tsx`에서 `m`, `useReducedMotion` 패턴 사용 중

### Metis Review

**Identified Gaps** (addressed):

- template.tsx 세그먼트 동작: 사용자가 최상위만 fade로 결정
- exit 애니메이션 불필요: template remount 특성상 exit 실행 안됨 → 제거
- `motion.div` vs `m.div`: LazyMotion 최적화 위해 `m.div` 사용

---

## Work Objectives

### Core Objective

Next.js App Router의 `template.tsx`를 활용하여 최상위 라우트 간 페이지 전환 시 부드러운 fade-in 애니메이션을 구현한다.

### Concrete Deliverables

- `app/template.tsx` 파일 생성

### Definition of Done

- [ ] `/` → `/artworks` 전환 시 fade 애니메이션 발생
- [ ] `prefers-reduced-motion: reduce` 설정 시 즉시 전환 (애니메이션 없음)
- [ ] `npm run build` 성공 (SSG 호환)
- [ ] `npm run lint` 통과

### Must Have

- 200ms fade-in 애니메이션 (easeOut)
- `useReducedMotion` 접근성 지원
- `m.div` 사용 (LazyMotion 최적화)
- pathname을 key로 사용

### Must NOT Have (Guardrails)

- ❌ exit 애니메이션 (template remount로 인해 작동 안함)
- ❌ `motion.div` 사용 (LazyMotion 트리쉐이킹 방해)
- ❌ slide/direction 애니메이션
- ❌ Header/Footer 애니메이션 (서버 컴포넌트 유지)
- ❌ layout.tsx 수정
- ❌ Skeleton/loading.tsx 추가
- ❌ 중첩 라우트용 별도 template.tsx

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: YES (Jest + React Testing Library)
- **User wants tests**: Manual-only
- **Framework**: N/A

### Manual QA Procedures

**By Deliverable Type: Frontend/UI**

| Type            | Verification Tool  | Procedure                          |
| --------------- | ------------------ | ---------------------------------- |
| Fade 애니메이션 | Playwright browser | Navigate, observe transition       |
| 접근성          | OS 설정 변경       | Reduce motion → instant transition |
| 빌드            | Terminal           | npm run build 성공                 |

---

## Task Flow

```
Task 1 (template.tsx 생성)
    ↓
Task 2 (수동 검증)
    ↓
Task 3 (빌드 & 린트 확인)
```

## Parallelization

| Task | Depends On | Reason                 |
| ---- | ---------- | ---------------------- |
| 2    | 1          | 코드 작성 후 검증 가능 |
| 3    | 1          | 코드 작성 후 빌드 가능 |

---

## TODOs

- [ ] 1. app/template.tsx 생성

  **What to do**:
  - `app/template.tsx` 파일 생성
  - Framer Motion의 `m`, `useReducedMotion` import
  - `usePathname`으로 현재 경로 가져오기
  - fade-in 애니메이션 구현 (opacity: 0 → 1, 200ms)
  - reduced motion 시 duration: 0

  **Must NOT do**:
  - AnimatePresence 사용하지 않음 (exit 불필요)
  - motion.div 사용하지 않음 (m.div 사용)
  - initial 이외의 direction 애니메이션 없음

  **Parallelizable**: NO (첫 번째 작업)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `components/ui/FadeInSection.tsx:1-44` - `m`, `useReducedMotion` 사용 패턴, reduced motion 처리 방식 (line 30-31)
  - `components/providers/AnimationProvider.tsx:1-8` - LazyMotion 설정 확인

  **API/Type References** (contracts to implement against):
  - Next.js App Router `template.tsx` 규칙: 세그먼트 변경 시 리마운트

  **External References** (libraries and frameworks):
  - Framer Motion `m` component: LazyMotion 하위에서 사용하는 최적화된 motion 컴포넌트
  - `useReducedMotion`: 사용자 접근성 설정 감지 훅

  **WHY Each Reference Matters**:
  - `FadeInSection.tsx`: 동일한 패턴으로 구현하여 코드 일관성 유지. 특히 line 30-31의 reduced motion 처리 방식 그대로 따름
  - `AnimationProvider.tsx`: LazyMotion이 이미 설정되어 있으므로 `m.div` 사용 가능 확인

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Using playwright browser automation:
    - Navigate to: `http://localhost:3000/`
    - Action: 네비게이션 메뉴에서 "출품작" 클릭
    - Verify: 페이지 콘텐츠가 fade-in으로 나타남 (갑작스럽지 않음)
  - [ ] 접근성 테스트:
    - macOS: 시스템 설정 → 손쉬운 사용 → 디스플레이 → 동작 줄이기 활성화
    - Action: 페이지 간 이동
    - Verify: 애니메이션 없이 즉시 전환

  **Evidence Required:**
  - [ ] 페이지 전환 시 fade 효과 확인
  - [ ] Reduced motion 설정 시 즉시 전환 확인

  **Commit**: YES
  - Message: `feat(ux): add page transition fade animation`
  - Files: `app/template.tsx`
  - Pre-commit: `npm run lint && npm run type-check`

---

- [ ] 2. 수동 검증 - 라우트 전환 테스트

  **What to do**:
  - 개발 서버에서 모든 최상위 라우트 간 전환 테스트
  - Reduced motion 설정 테스트
  - 빠른 연속 클릭 시 동작 확인

  **Must NOT do**:
  - 중첩 라우트 전환에 대한 fade 기대 (설계상 미지원)

  **Parallelizable**: NO (Task 1 완료 후)

  **References**:

  **Pattern References**:
  - 없음 (수동 테스트)

  **Test Routes** (모두 fade 확인):
  - `/` → `/our-reality`
  - `/our-reality` → `/our-proof`
  - `/our-proof` → `/exhibition`
  - `/exhibition` → `/artworks`
  - `/artworks` → `/archive`
  - `/archive` → `/news`
  - `/news` → `/`

  **Known Limitation** (fade 미작동, 정상):
  - `/artworks` → `/artworks/123` (같은 세그먼트)
  - `/artworks/123` → `/artworks/456` (같은 세그먼트)

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Using playwright browser automation:
    - Navigate through all top-level routes
    - Verify: 각 전환마다 fade-in 애니메이션 발생
    - Verify: 빠른 연속 클릭 시 애니메이션 겹침 없음

  - [ ] 중첩 라우트 확인:
    - Navigate: `/artworks` → `/artworks/123`
    - Verify: fade 없이 즉시 전환 (예상된 동작)

  **Evidence Required:**
  - [ ] 7개 최상위 라우트 전환 테스트 완료
  - [ ] 중첩 라우트 동작 확인

  **Commit**: NO

---

- [ ] 3. 빌드 및 린트 확인

  **What to do**:
  - `npm run lint` 실행
  - `npm run type-check` 실행
  - `npm run build` 실행 (SSG 호환 확인)

  **Must NOT do**:
  - 빌드 에러 무시

  **Parallelizable**: YES (Task 2와 병렬 가능)

  **References**:

  **Pattern References**:
  - `package.json` - 스크립트 명령어 확인

  **Acceptance Criteria**:

  **Terminal Verification:**
  - [ ] Command: `npm run lint`
    - Expected: 에러 없음 (경고는 허용)

  - [ ] Command: `npm run type-check`
    - Expected: 타입 에러 없음

  - [ ] Command: `npm run build`
    - Expected: 빌드 성공
    - Expected output contains: `✓ Generating static pages`

  **Evidence Required:**
  - [ ] 각 명령어 성공 출력 캡처

  **Commit**: NO

---

## Commit Strategy

| After Task | Message                                        | Files              | Verification                         |
| ---------- | ---------------------------------------------- | ------------------ | ------------------------------------ |
| 1          | `feat(ux): add page transition fade animation` | `app/template.tsx` | `npm run lint && npm run type-check` |

---

## Success Criteria

### Verification Commands

```bash
npm run lint          # Expected: 0 errors
npm run type-check    # Expected: 0 errors
npm run build         # Expected: Build successful
```

### Final Checklist

- [ ] `/` ↔ `/artworks` 전환 시 fade 애니메이션 작동
- [ ] `prefers-reduced-motion` 시 즉시 전환
- [ ] `npm run build` 성공
- [ ] Header/Footer 변경 없음
- [ ] 중첩 라우트는 fade 미작동 (의도된 동작)
