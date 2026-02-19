# 서버/클라이언트 경계 최적화(버튼 분리) 구현 계획서

## 1) 목표

Vercel 배포 기준으로 서버 페이지의 불필요한 클라이언트 번들 포함을 줄이기 위해,
버튼 시스템을 `링크 전용(서버 친화)`과 `액션 전용(클라이언트)`으로 분리한다.

핵심 목표:

- 링크용 버튼은 서버 컴포넌트에서 안전하게 사용
- `loading`/`onClick`이 필요한 버튼만 클라이언트 컴포넌트 사용
- 기존 디자인/스타일/아이콘 정렬 API는 유지

## 2) 범위

### 포함

- 버튼 공통 스타일/타입을 별도 모듈로 분리
- 신규 `LinkButton`(서버 컴포넌트) 도입
- 기존 `Button`(클라이언트 컴포넌트)은 액션 중심으로 유지
- 서버 컴포넌트의 링크형 버튼 사용처를 `LinkButton`으로 전환

### 제외

- 전체 버튼 컴포넌트 네이밍 대규모 변경
- 전 페이지 UI 재설계
- 전역 레이아웃 구조 개편(헤더/트랜지션 분리)는 이번 단계에서 보류

## 3) 현재 문제 요약

1. 현재 `Button`이 클라이언트 컴포넌트라 서버 페이지에서 링크용으로만 써도 클라이언트 경계가 생김
2. 서버 페이지 다수가 `href` 버튼만 사용 중
3. 구조적으로 최적화 여지가 명확하지만 전면 리팩토링은 과도함

## 4) 설계 방향

## 4.1 모듈 분리

- `components/ui/button-base.ts` (서버/클라이언트 공용)
  - `buttonVariants`
  - `ButtonSize`, `IconLayout`, 아이콘 offset 맵

## 4.2 컴포넌트 역할

- `components/ui/Button.tsx` (클라이언트)
  - `onClick`, `loading`, 상태 관리 담당

- `components/ui/LinkButton.tsx` (서버)
  - `href` 이동 전용
  - `leadingIcon`, `iconLayout`, `iconClassName` 지원
  - `disabled` 시 링크 대신 비활성 `span` 렌더링

## 5) 구현 단계

1. `button-base.ts` 생성 후 `Button.tsx` 리팩토링
2. `LinkButton.tsx` 신규 추가
3. 서버 컴포넌트 링크형 버튼 사용처 전환
   - `app/page.tsx`
   - `app/archive/2026/page.tsx`
   - `app/artworks/[id]/page.tsx`
   - `app/our-proof/page.tsx`
   - `app/onboarding/page.tsx`
   - `app/admin/artists/page.tsx`
   - `app/admin/artworks/page.tsx`
   - `app/dashboard/(artist)/artworks/page.tsx`
   - `app/exhibitor/(dashboard)/artists/page.tsx`
   - `app/exhibitor/(dashboard)/artworks/page.tsx`
   - `components/common/CTAButtonGroup.tsx`
   - `components/ui/ActionCard.tsx`
4. 회귀 검사(린트/타입)

## 6) 검증 계획

- `npx eslint components/ui/button-base.ts`
- `npx eslint components/ui/LinkButton.tsx`
- `npx eslint components/ui/Button.tsx`
- 전환한 주요 파일들 eslint 검사
- `npm run type-check`

검증 포인트:

1. 링크 버튼 스타일/아이콘 정렬 기존과 동일
2. `loading` 버튼 동작 회귀 없음
3. 서버 페이지에서 `Button` import가 감소했는지 확인

## 7) 리스크 및 대응

- 리스크: `disabled` 링크 동작 차이
  - 대응: 서버 컴포넌트에서 `disabled`는 비클릭 `span` 렌더링으로 명시적 처리

- 리스크: 아이콘 정렬 회귀
  - 대응: 기존 offset 맵 재사용 + 대상 페이지 육안 점검

## 8) 완료 기준 (Definition of Done)

1. `LinkButton` 도입 완료
2. 서버 링크형 버튼 사용처 전환 완료
3. lint/type-check 통과
4. `walkthrough.md`에 변경 요약 반영

---

승인 상태:

- 사용자 요청(“시작하자/네”)에 따라 본 계획으로 바로 EXECUTION 진행
