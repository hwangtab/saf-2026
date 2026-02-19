# 버튼 리팩토링 작업 보고

## 변경 요약

- `components/ui/Button.tsx`
  - `leadingIcon`, `iconLayout`, `iconClassName` props 추가
  - `iconLayout="fixed-left"` 모드 추가 (아이콘 좌측 고정 + 텍스트 중앙 유지)
  - `size(xs/sm/md/lg)`별 아이콘 offset 매핑 추가
  - 로딩 상태(`loading`/`isLoading`)에서는 leading icon을 숨기고 스피너만 표시하도록 처리
    - `fixed-left` 모드에서는 스피너도 아이콘 위치에 고정 배치

- `app/artworks/[id]/page.tsx`
  - 연락처 버튼 2개를 수동 `absolute left-*` 구조에서 `Button` 신규 API 사용으로 교체

- `app/archive/2026/page.tsx`
  - 참여하기 버튼 2개를 수동 `absolute left-*` 구조에서 `Button` 신규 API 사용으로 교체

- `app/not-found.tsx`
  - 클라이언트 `Button`으로 전환하지 않고 서버 컴포넌트 상태 유지
  - 수동 absolute 정렬 대신 3열 그리드(아이콘/텍스트/투명 아이콘)로 텍스트 중심 정렬

## 검증 결과

- `npx eslint components/ui/Button.tsx` 통과
- `npx eslint 'app/artworks/[id]/page.tsx'` 통과
- `npx eslint app/archive/2026/page.tsx` 통과
- `npx eslint app/not-found.tsx` 통과
- `npm run type-check` 통과

## 추가 확인

- 대상 3개 파일에서 `absolute left-*` 패턴 제거 확인
