# 실험: 홈 상품 우선 재배열 + Hero solid CTA (pre/post)

**상태:** 출시(ship-it). 2026-06-17 Variant B를 새 기본 홈으로 적용. A/B 미들웨어 분기 대신 **pre/post 비교**로 측정(사용자 결정 2026-06-17 — 미들웨어 locale rewrite 위험 회피, force-static 유지).

## 변경 (Variant B)

1. **Hero CTA solid화** — ghost(흰 테두리·투명) → `bg-primary-strong`(6.98:1 AA) solid 버튼. 행동 유도 강화. (`components/features/HomeHero.tsx`)
2. **명분 섹션 재배열** — `AboutIdentity`·`MechanismSection`을 Hero 직후에서 **쇼핑 그리드(NowShowing·MasterArtists·EntryLevel·Category·Emerging) 아래**로 이동. 작품을 먼저 보여주고 명분은 그 뒤에 설명. (`app/[locale]/page.tsx`)
3. Hero 카피 상품 우선화는 이미 Phase 1에서 선반영(`6f421e6e`).

## 가설

Hero에서 즉시 상품(작품 그리드)에 도달하고 CTA가 시각적으로 강해지면, 홈 방문자의 작품상세 도달률(home→view_item)과 구매 클릭이 상승한다. 명분은 구매 의향이 생긴 뒤(그리드 하단)에서 더 효과적으로 작동한다.

## 측정 (pre/post)

방금 구축한 홈 퍼널 계측(`get_home_entry_funnel` 등, `/admin/analytics` 홈 진입 퍼널 패널)으로 **배포 전 N일 vs 배포 후 N일**을 비교한다.

- **1차 지표:** `detail_viewers / home_visitors` (홈→작품상세 도달률).
- **보조:** `purchase_clickers / detail_viewers`, 섹션별 노출/클릭 분포(재배열로 상단 섹션 클릭이 늘었는지).
- **가드레일:** 홈 CLS p75·LCP p75(admin WebVitalsPanel) 무악화, 실매출.

> 주의: pre/post는 외부 요인(시즌·트래픽 소스 변화)이 혼입될 수 있다. 배포 전후 2주씩 비교하고, 급격한 트래픽 소스 변화가 있으면 해석에 반영한다. 결과가 음(-)이거나 가드레일 악화 시 즉시 revert(섹션 순서·CTA 클래스 되돌리기 — 단일 커밋 reverts).

## 배포 마커

- 배포 커밋: (배포 시 기입) — 이 SHA의 머지/배포 시각을 pre/post 경계로 사용.
- 재배열·CTA는 force-static 유지(미들웨어 무관). 되돌리기 = 해당 커밋 revert.

## 후속(필요 시)

- 결과가 강하게 양(+)이고 더 엄밀한 인과가 필요하면, 그때 proxy.ts 쿠키 버킷팅 진짜 A/B로 승격(별도 plan). 현재는 pre/post로 충분.
