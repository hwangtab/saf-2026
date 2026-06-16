# 작품 카드 장바구니 담기 (이미지 오버레이) 설계

> **상태:** 승인됨(2026-06-16). 구현은 Sonnet 서브에이전트 위임 + Opus 리뷰.

**Goal:** 작품 리스트 카드에서 상세 진입 없이 바로 **장바구니 담기**가 가능하도록, 기존 위시 하트 옆에 카트 아이콘을 추가한다 — 서버 카드 성능을 보존하면서.

## 결정 (승인)
- **액션**: 위시 하트(기존) + **장바구니 담기**(신규) 두 아이콘만. 바로구매·문의는 상세페이지 유지.
- **배치**: 이미지 우하단 오버레이 아이콘(위시 하트 미러).
- **scope**: 메인 전시작품 갤러리(`ArtworkCategoryGrid`) 먼저 → 사용자 시각 확인 후 나머지 그리드 전파.

## 핵심 제약
1. **카드는 순수 server `<Link>`** (`ArtworkGridCard`, hydration 0 — `feedback_hero_server_island_regression`). 카트는 client island 필요.
2. **성능**: 위시 하트가 이미 카드당 island 1개. 카트를 **위시와 한 island로 묶어** 카드당 island 수 불변(증가 0) 유지 — 따로 만들면 모바일 회귀 위험.
3. **중첩 인터랙션**: 카드 전체가 `<a>`. 버튼은 `preventDefault()+stopPropagation()`으로 링크 이동 차단(위시 하트 방식 동일).

## 설계
- **신규 `components/features/ArtworkCardActions.tsx`** (`'use client'`): 위시 하트 + 카트 아이콘을 한 컴포넌트(=한 island)에 묶어 `absolute bottom-3 right-3` 그룹 오버레이. 기존 `WishlistHeartButton`(overlay variant)을 내부에서 재사용 + 카트 버튼 추가.
- **카트 버튼**: `WishlistHeartButton` overlay 스타일 미러(8×8 흰 원형, `ShoppingBag`). 탭 → `useCart().addOne(id,{unique}) + openDrawer()`, `preventDefault()+stopPropagation()`. `inCart`면 채움/체크 + aria 변경.
- **게이팅**: 카트 버튼은 **판매가능 + 정가**일 때만 렌더 — `!sold && !reserved && 가격이 문의/미정(확인 중)이 아님`. 위시 하트는 전 작품 유지.
- **슬롯 배선**: `ArtworkCategoryGrid`의 `wishlistSlot` 주입을 `WishlistHeartButton` → `ArtworkCardActions`로 교체, `artwork.id/edition_type/sold/reserved/price` 전달. (전파 시 EntryLevel·Emerging·Collections·상세 연관작·WishlistPage도 동일 교체.)
- **a11y**: 카트 aria-label(담기/담김), `e2e/a11y`에 메인 갤러리 카트 버튼 spec 추가. 버튼-in-링크는 위시가 쓰는 검증된 패턴.
- **i18n**: `cart` 네임스페이스 `addToCart`/`inCart` 재사용 + 필요한 aria 키.

## 검증
- build + type-check + 전체 test(무인자). UI 시각확인은 **프리뷰 URL로 사용자 확인**(`feedback_no_playwright` — Playwright 미사용).
- 성능: island 수 불변 확인(위시 1 → 위시+카트 1).

## 범위 밖
- 바로구매(buy-now) 카드 노출, 해외(PayPal) 카드 결제, 전 그리드 동시 전파(메인 확인 후 별도 단계).
