# 버튼 시스템 리팩토링 구현 계획서

## 1) 목표

반복적으로 발생하는 "이모티콘 + 텍스트 버튼의 시각적 중심 어긋남" 문제를
버튼 공통 컴포넌트에서 해결하여, 페이지별 수동 보정(`absolute left-*`)을 제거한다.

추가 목표:

- 버튼 API를 통해 아이콘 정렬 정책을 일관되게 적용
- 기존 사용처(다수)와의 하위 호환 유지
- 불필요한 대규모 UI 변경 없이 점진 리팩토링

## 2) 범위

### 포함

- `components/ui/Button.tsx` API 확장
- 아이콘/텍스트 정렬 레이아웃을 `Button` 내부로 흡수
- 현재 수동 보정 적용된 페이지를 신규 API로 마이그레이션
  - `app/artworks/[id]/page.tsx`
  - `app/archive/2026/page.tsx`
  - `app/not-found.tsx`

### 제외

- 전체 디자인 리뉴얼
- 버튼 스타일 토큰 전면 재정의
- 링크/버튼 완전 분리(대규모 구조 변경)는 이번 단계에서 보류

## 3) 현재 문제 요약

1. 버튼의 `justify-center`는 "전체 콘텐츠(아이콘+텍스트)"를 기준으로 중앙 정렬됨
2. 텍스트 중심 정렬이 필요한 화면에서 각 페이지가 자체 해법(`relative/absolute`)을 구현
3. 같은 문제를 여러 페이지에서 반복 수정해야 해 유지보수 비용 증가

## 4) 설계 방향

## 4.1 `Button` API 확장

추가 Props(안):

- `leadingIcon?: React.ReactNode`
- `iconLayout?: 'inline' | 'fixed-left'` (기본값 `inline`)
- `iconClassName?: string`

동작:

- `inline`: 기존처럼 아이콘과 텍스트를 한 줄 플렉스로 배치
- `fixed-left`: 버튼 내부에서 아이콘을 좌측 고정 배치하고 텍스트를 버튼 중앙에 배치

## 4.2 하위 호환

- `leadingIcon` 미사용 시 기존 렌더링과 동일
- 기존 `children`만 전달하는 사용처는 코드 수정 불필요

## 4.3 접근성

- 장식용 아이콘은 `aria-hidden="true"` 처리
- 텍스트 레이블은 `children`으로 유지해 스크린리더 텍스트 보존

## 5) 구현 단계

1. `Button.tsx`에 아이콘 정렬 API 추가
2. `fixed-left` 내부 레이아웃 구현(중앙 텍스트 + 좌측 고정 아이콘)
3. 기존 수동 보정 3개 페이지를 신규 API로 교체
4. 페이지별 불필요한 `absolute` 클래스 제거
5. 린트/타입 검사 및 시각 확인

## 6) 검증 계획

- `npx eslint app/not-found.tsx`
- `npx eslint app/archive/2026/page.tsx`
- `npx eslint 'app/artworks/[id]/page.tsx'`
- `npx eslint components/ui/Button.tsx`
- `npm run type-check`

UI 확인 항목:

1. 아이콘 유무와 관계없이 텍스트가 버튼의 시각적 중심에 위치
2. hover/active/disabled/loading 동작 회귀 없음
3. 모바일/데스크톱에서 동일 정렬 유지

## 7) 리스크 및 대응

- 리스크: 아이콘 좌측 고정 여백이 버튼 size별로 어색할 수 있음
  - 대응: `size`별 좌측 offset 분기 또는 CSS 변수화

- 리스크: 기존 `children`가 복합 노드일 때 중앙 정렬이 의도와 다를 수 있음
  - 대응: `iconLayout='fixed-left'`를 opt-in으로 제한

## 8) 완료 기준 (Definition of Done)

1. 수동 보정 코드(`absolute left-*`)가 3개 대상 페이지에서 제거됨
2. `Button` API만으로 동일한 UI 결과 재현 가능
3. lint/type-check 통과
4. 변경 요약을 `walkthrough.md`에 기록

---

승인 요청:

- 위 계획대로 EXECUTION(실제 코드 수정) 진행하겠습니다.
