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

---

## 최근 등록 검수 큐 개선

### 1) 대시보드 동선 수정

- `/Users/hwang-gyeongha/saf/app/admin/dashboard/page.tsx`
  - 최근 작품 섹션 제목을 `최근 작가 직접 등록 작품`으로 변경
  - CTA를 `최근 등록 검수하기`로 변경
  - 링크를 `/admin/artworks?queue=artist-recent`로 연결
  - 빈 상태 문구를 검수 맥락에 맞게 조정

### 2) 최근 작품 데이터 기준 개선

- `/Users/hwang-gyeongha/saf/app/actions/admin-dashboard-overview.ts`
  - 최근 작품 산출 시 `activity_logs.action = artist_artwork_created` 로그를 우선 사용
  - 로그 기준 5개가 부족할 경우, `artists.user_id`가 연결된 작품 최신순으로 보강
  - 결과적으로 대시보드 최근 카드가 “작가 직접 등록” 의도에 맞도록 정렬

### 3) 작품 목록 검수 큐 모드 추가

- `/Users/hwang-gyeongha/saf/app/admin/artworks/page.tsx`
  - `queue` 검색 파라미터 추가 (`queue=artist-recent`)
  - 큐 모드일 때:
    - `artists.user_id`가 연결된 작품만 조회
    - 페이지 타이틀/설명 문구를 검수 큐 문맥으로 전환
    - 우측 액션 버튼을 `일반 작품 목록` 복귀 버튼으로 전환
  - 기본 모드에서는 기존 작품 관리 동작 유지

### 4) 검수 큐 UI/정렬 보강

- `/Users/hwang-gyeongha/saf/app/admin/artworks/admin-artwork-list.tsx`
  - `reviewMode`(`artist-recent`) 지원 추가
  - 큐 모드에서 기본 정렬을 `등록일 내림차순`으로 초기화
  - 상단에 `검수 큐` 배지 + 안내 문구 + `일반 목록으로 이동` 버튼 추가
  - 테이블에 `등록일` 컬럼 및 정렬 추가
  - 빈 상태 `colSpan`을 컬럼 수에 맞게 조정

## 검증 결과

- `npm run lint` 통과
- `npm run type-check` 통과

---

## Cafe24 OAuth 라우트 구현

### 변경 파일

- `/Users/hwang-gyeongha/saf/app/api/integrations/cafe24/authorize/route.ts` (신규)
  - CSRF 방지용 `state` 생성
  - `state`/`return_to`를 HttpOnly 쿠키로 저장
  - Cafe24 인가 URL로 리다이렉트
- `/Users/hwang-gyeongha/saf/app/api/integrations/cafe24/callback/route.ts` (신규)
  - `code`/`state` 검증
  - Cafe24 토큰 엔드포인트로 교환 요청
  - Access/Refresh 토큰을 HttpOnly 쿠키로 저장
  - 성공 시 `?cafe24=connected`, 실패 시 `?cafe24=error&reason=...`로 리다이렉트
- `/Users/hwang-gyeongha/saf/.env.local.example`
  - `CAFE24_MALL_ID`, `CAFE24_CLIENT_ID`, `CAFE24_CLIENT_SECRET`, `CAFE24_REDIRECT_URI`, `CAFE24_SCOPE` 예시 추가
- `/Users/hwang-gyeongha/saf/docs/cafe24-oauth-integration.md` (신규)
  - 실제 접속 URL/설정 순서/현재 구현 상태 정리

### 사용 방법

1. `.env.local`에 Cafe24 OAuth 값 설정
2. 카페24 앱 Redirect URI에 `https://saf2026.com/api/integrations/cafe24/callback` 등록
3. 브라우저에서 `/api/integrations/cafe24/authorize?return_to=/admin/artworks` 접속
4. 승인 후 `return_to` 경로로 복귀하며 상태 파라미터 확인

### 검증 결과

- `npm run lint` 통과
- `npm run type-check` 통과

---

## Cafe24 자동 동기화 2단계 구현

### 1) DB 스키마 확장

- `/Users/hwang-gyeongha/saf/supabase/migrations/20260220213000_add_cafe24_integration.sql` (신규)
  - `public.cafe24_tokens` 테이블 추가
  - `artworks` 테이블에 동기화 메타 컬럼 추가
    - `cafe24_product_no`
    - `cafe24_custom_product_code`
    - `cafe24_sync_status`
    - `cafe24_sync_error`
    - `cafe24_synced_at`

### 2) Cafe24 API 클라이언트/토큰 갱신

- `/Users/hwang-gyeongha/saf/lib/integrations/cafe24/client.ts` (신규)
  - 환경변수 기반 설정 로딩
  - 토큰 영구 저장(`persistCafe24Token`)
  - Access Token 만료 시 Refresh Token 자동 갱신
  - Admin API 호출 클라이언트(`Cafe24AdminApiClient`)

### 3) 작품 자동 동기화 로직

- `/Users/hwang-gyeongha/saf/lib/integrations/cafe24/sync-artwork.ts` (신규)
  - 작품 데이터 → Cafe24 상품 payload 변환
  - 상품 생성/수정 자동 처리
  - 대표 이미지 URL 다운로드 후 Cafe24 이미지 업로드/연결 시도
  - 성공 시 `shop_url`, `cafe24_product_no` 자동 반영
  - 실패 시 `cafe24_sync_status`, `cafe24_sync_error` 기록

### 4) OAuth callback 영구 저장 연동

- `/Users/hwang-gyeongha/saf/app/api/integrations/cafe24/callback/route.ts`
  - 토큰 교환 성공 시 `public.cafe24_tokens` upsert 추가

### 5) 작품 액션 연동

- `/Users/hwang-gyeongha/saf/app/actions/artwork.ts`
  - 작가 작품 생성/수정 후 `triggerCafe24ArtworkSync` 실행
  - 수정 시 `shop_url` 강제 초기화 제거(기존 값 보존 후 동기화 결과 반영)
- `/Users/hwang-gyeongha/saf/app/actions/admin-artworks.ts`
  - 관리자 생성/수정/이미지 변경 후 자동 동기화 실행
- `/Users/hwang-gyeongha/saf/app/actions/exhibitor-artworks.ts`
  - 출품자 생성/수정/이미지 변경 후 자동 동기화 실행

### 6) 문서/환경변수 업데이트

- `/Users/hwang-gyeongha/saf/.env.local.example`
  - `CAFE24_DEFAULT_CATEGORY_NO` 예시 추가
- `/Users/hwang-gyeongha/saf/docs/cafe24-oauth-integration.md`
  - 토큰 DB 저장/자동 갱신/작품 자동 동기화 반영

### 검증 결과

- `npm run lint` 통과
- `npm run type-check` 통과

---

## Cafe24 초기 매핑 자동화 1차 실행

### 변경 파일

- `/Users/hwang-gyeongha/saf/scripts/cafe24/build_initial_mapping.py` (신규)
  - `docs/cafe24-products-*.csv` 병합/중복 제거
  - `custom_product_code(SAF2026-xxx)` 기준 매핑 테이블 생성
  - 이미지 컬럼(`상세/목록/작은목록/축소`)의 실제 로컬 파일 해석(fallback 포함)
  - API 준비 여부(`ready_for_api`) 계산
- `/Users/hwang-gyeongha/saf/scripts/cafe24/README.md` (신규)
  - 실행 명령, 산출물, 다음 단계 운영 가이드 문서화
- `/Users/hwang-gyeongha/saf/package.json`
  - `cafe24:build-mapping` 스크립트 추가

### 실행 결과

- 실행 명령: `npm run cafe24:build-mapping`
- 입력 CSV 파일: 8개
- 처리 행 수: `181` (중복 제거 후 동일 `181`)
- `ready_for_api=Y`: `181`
- 누락 이미지: `0`
- fallback 해석: `208`건
  - 빈 이미지 참조를 ID 기반으로 자동 보정: `188`건 (`SAF2026-63 -> 63.jpg` 등)
  - 확장자 불일치 자동 보정: `20`건 (`173.png -> 173.jpg`, `226.png -> 226.jpg` 등)

### 산출물

- `/Users/hwang-gyeongha/saf/docs/cafe24-mapping/master-products.csv`
- `/Users/hwang-gyeongha/saf/docs/cafe24-mapping/initial-mapping.csv`
- `/Users/hwang-gyeongha/saf/docs/cafe24-mapping/image-manifest.csv`
- `/Users/hwang-gyeongha/saf/docs/cafe24-mapping/missing-images.csv`
- `/Users/hwang-gyeongha/saf/docs/cafe24-mapping/duplicate-codes.csv`
- `/Users/hwang-gyeongha/saf/docs/cafe24-mapping/summary.json`

### 참고

- 현재는 “초기 매핑/이미지 준비” 단계만 구현.
- 다음 단계로 Cafe24 API 연동(`products` 생성/수정, `product_no` 및 `shop_url` 자동 반영)과
  등록 폼의 `shop_url` 수동 입력 제거가 남아 있음.

---

## 최근 등록 정렬 필터 전환 (방향 변경)

사용자 피드백(검수 큐 불필요, 최근 등록 작품 전체 확인 필요)에 따라 기존 검수 큐 접근을 단순 정렬 필터 방식으로 전환했습니다.

### 1) 대시보드 CTA 단순화

- `/Users/hwang-gyeongha/saf/app/admin/dashboard/page.tsx`
  - 카드 제목을 `최근 등록된 작품`으로 정리
  - CTA를 `최근 등록순으로 보기`로 변경
  - 링크를 `/admin/artworks?sort=recent`로 변경

### 2) 대시보드 최근 작품 데이터 기준 복원

- `/Users/hwang-gyeongha/saf/app/actions/admin-dashboard-overview.ts`
  - 최근 작품 소스를 다시 전체 작품 최신 등록 5건으로 복원
  - `artist_artwork_created` 로그 우선 로직 제거

### 3) 작품 관리 페이지 라우팅 단순화

- `/Users/hwang-gyeongha/saf/app/admin/artworks/page.tsx`
  - `queue` 파라미터 및 전용 모드 제거
  - `sort` 파라미터(`recent`, `oldest`)를 초기 필터로 전달
  - 기본 진입은 기존과 동일하게 전체 작품 관리

### 4) 작품 목록 정렬 필터 추가

- `/Users/hwang-gyeongha/saf/app/admin/artworks/admin-artwork-list.tsx`
  - 정렬 필터 추가: `기본 정렬`, `최근 등록순`, `오래된 등록순`
  - URL `sort` 쿼리와 양방향 동기화
  - 기존 컬럼 헤더 정렬과 함께 사용 가능하도록 상태 매핑 처리
  - 검수 큐 배지/안내/복귀 버튼 등 전용 UI 제거

## 검증 결과

- `npm run lint` 통과
- `npm run type-check` 통과
