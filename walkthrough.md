# 버튼 리팩토링 작업 보고

## 1차 변경(아이콘 정렬 통합)

- `components/ui/Button.tsx`
  - `leadingIcon`, `iconLayout`, `iconClassName` props 추가
  - `iconLayout="fixed-left"` 모드 추가 (아이콘 좌측 고정 + 텍스트 중앙 유지)
  - `size(xs/sm/md/lg)`별 아이콘 offset 매핑 추가
  - 로딩 상태(`loading`/`isLoading`)에서는 leading icon을 숨기고 스피너만 표시
    - `fixed-left` 모드에서는 스피너도 아이콘 위치에 고정 배치

- `app/artworks/[id]/page.tsx`
  - 연락처 버튼 2개를 수동 `absolute left-*` 구조에서 `Button` API 사용으로 교체

- `app/archive/2026/page.tsx`
  - 참여하기 버튼 2개를 수동 `absolute left-*` 구조에서 `Button` API 사용으로 교체

- `app/not-found.tsx`
  - 클라이언트 `Button`으로 전환하지 않고 서버 컴포넌트 유지
  - 수동 absolute 정렬 대신 3열 그리드(아이콘/텍스트/투명 아이콘)로 텍스트 중심 정렬

## 2차 변경(서버/클라이언트 경계 최적화)

- 신규 추가
  - `components/ui/button-base.ts`
    - 버튼 공통 스타일(`buttonVariants`)과 타입/아이콘 offset 정의 분리
  - `components/ui/LinkButton.tsx`
    - 서버 컴포넌트에서 사용하는 링크 전용 버튼 추가
    - `leadingIcon`, `iconLayout`, `iconClassName` 지원
    - `disabled` 시 비활성 `span` 렌더링

- 리팩토링
  - `components/ui/Button.tsx`
    - 공통 스타일/타입을 `button-base.ts`에서 import하도록 분리
    - 역할을 클라이언트 액션 버튼(`onClick`, `loading`) 중심으로 정리

- 서버 링크형 버튼 전환
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

- 명시적 클라이언트 경계 보강
  - `app/admin/users/_components/UserTable.tsx`에 `'use client'` 추가

## 검증 결과

- `npx eslint components/ui/button-base.ts components/ui/LinkButton.tsx components/ui/Button.tsx` 통과
- `npx eslint app/page.tsx app/archive/2026/page.tsx 'app/artworks/[id]/page.tsx' app/our-proof/page.tsx app/onboarding/page.tsx app/admin/artists/page.tsx app/admin/artworks/page.tsx 'app/dashboard/(artist)/artworks/page.tsx' 'app/exhibitor/(dashboard)/artists/page.tsx' 'app/exhibitor/(dashboard)/artworks/page.tsx' app/admin/users/_components/UserTable.tsx` 통과
- `npx eslint components/common/CTAButtonGroup.tsx components/ui/ActionCard.tsx` 통과
- `npm run type-check` 통과

## 추가 확인

- `app` 영역에서 `Button` import 사용처는 모두 클라이언트 컴포넌트로 정리됨
- 서버 컴포넌트의 링크 버튼은 `LinkButton`으로 전환 완료
