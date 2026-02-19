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

## 잔여 이슈 개선

- `components/ui/LinkButton.tsx`
  - 동일 오리진 절대 URL(`https://...`)을 내부 경로로 변환해 `next/link`를 사용하도록 개선
  - `mailto:`/`tel:`/외부 오리진 URL만 `<a>`로 유지

- `scripts/check-server-button-imports.js` 신규 추가
  - 서버 컴포넌트(`'use client'` 미선언)에서 `@/components/ui/Button` import를 자동 검사
  - 위반 시 실패(exit 1)하도록 구현

- `package.json`
  - `check:server-button-imports` 스크립트 추가
  - `lint`에 서버/클라이언트 버튼 경계 검사 포함

## 잔여 이슈 검증 결과

- `npm run check:server-button-imports` 통과
- `npm run lint` 통과 (경계 검사 포함)
- `npm run type-check` 통과

## 헤더 투명도 블라인드 스팟 개선

- `lib/hooks/useHeaderStyle.ts`
  - 비히어로 페이지에서 헤더 모드를 항상 `solid`로 확정하도록 분기 보강
    - 기존에는 이전 페이지의 `heroAtTop` 상태가 남아 투명 상태가 전이될 여지가 있었음
  - `data-route-path` 루트 탐색 실패 시 `document`로 fallback하도록 변경
    - route wrapper 탐색 실패로 sentinel을 못 찾는 경우를 방어

- `lib/path-rules.ts` (신규)
  - 공통 경로 판정 유틸 추가
    - `isProtectedSurfacePath`
    - `shouldHidePublicHeader`
    - `shouldShowFooterSlider`

- 경로 판정 유틸 적용
  - `components/common/Header.tsx`
  - `components/common/PageTransition.tsx`
  - `components/common/PageLoader.tsx`
  - `components/common/FooterSlider.tsx`
  - 각 파일의 하드코딩 prefix/except 규칙을 제거하고 공통 유틸로 통일

## 헤더 이슈 검증 결과

- `npx eslint lib/path-rules.ts lib/hooks/useHeaderStyle.ts components/common/Header.tsx components/common/PageTransition.tsx components/common/PageLoader.tsx components/common/FooterSlider.tsx` 통과
- `npm run type-check` 통과
- `npm run lint` 통과

## 이미지 업로드 장애 수정

- `next.config.js`
  - CSP `img-src`에 `blob:` 추가
  - 업로드 전 클라이언트 이미지 최적화(`URL.createObjectURL`) 단계가 차단되지 않도록 조정

- `app/exhibitor/(dashboard)/artworks/_components/exhibitor-artwork-form.tsx`
  - 출품자 작품 업로드 `pathPrefix`를 `selectedArtistId` 우선으로 변경
  - Storage 정책의 artist-id 폴더 규칙과 경로 정렬

- `supabase/migrations/20260219183000_allow_exhibitor_artwork_storage.sql` (신규)
  - `artworks` 버킷의 insert/update/delete 정책을 재정의
  - 기존 active artist/admin 허용은 유지
  - active exhibitor + `artists.owner_id = auth.uid()` 조건을 추가해 출품자 업로드 허용
  - `storage.foldername(storage.objects.name)` 기준으로 폴더 prefix 검증

## 이미지 업로드 수정 검증 결과

- `npm run lint` 통과
- `npm run type-check` 통과
