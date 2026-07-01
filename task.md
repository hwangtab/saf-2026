# SAF 리팩토링 Phase 3 환불/취소 lifecycle 체크리스트

- [x] 깨끗한 worktree 생성: `.worktrees/refactor-phase-3-refund-cancel`
- [x] 기준 테스트 확인: `admin-orders`, `order-lookup`
- [x] Phase 3 실행 계획 문서 작성
- [x] `markOrderRefundedAfterCancel` RED 테스트 작성 및 실패 확인
- [x] `markOrderRefundedAfterCancel` 최소 구현 및 GREEN 확인
- [x] 관리자 `refundOrder()` shared lifecycle 연결
- [x] 구매자 `cancelBuyerOrder()` paid branch shared lifecycle 연결
- [x] 입금대기 취소 shared lifecycle 분리
- [x] commerce layer boundary 정리 (`lib/commerce` -> `app/actions` import 제거)
- [x] focused Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 4 admin-artworks 판매 기록 분해 체크리스트

- [x] 판매 기록 mutation 분해 계획 작성
- [x] `lib/artworks/sales.ts` RED 테스트 작성 및 실패 확인
- [x] `lib/artworks/sales.ts` 구현 및 GREEN 확인
- [x] `admin-artworks.ts` 판매 기록 action을 domain module에 연결
- [x] `batchUpdateArtworkStatus`를 `lib/artworks/status-mutations.ts`로 분리
- [x] `deleteAdminArtwork`/`batchToggleHidden`/`batchDeleteArtworks`를 `lib/artworks/batch-mutations.ts`로 분리
- [x] 관리자 내부 태그 조회/CRUD/작품 연결을 `lib/artworks/admin-tags.ts`로 분리
- [x] `updateArtworkImages`/`updateArtworkCategory`를 `lib/artworks/core-mutations.ts`로 분리
- [x] create/update details FormData 파싱과 payload builder를 `lib/artworks/details-form.ts`로 분리
- [x] create/update details DB mutation과 artist-name lookup을 `lib/artworks/details-mutations.ts`로 분리
- [x] focused Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 5 admin-orders 소형 mutation 분해 체크리스트

- [x] 관리자 주문 소형 mutation 분해 계획 작성
- [x] `lib/orders/admin-mutations.ts` RED 테스트 작성 및 실패 확인
- [x] 배송정보/입금대기 자동취소 보류/에스컬레이션 mutation 구현
- [x] `admin-orders.ts` 관련 action을 domain module에 연결
- [x] focused Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 6 buyer order shipping mutation 분해 체크리스트

- [x] 구매자 배송정보 mutation 분해 계획 작성
- [x] `lib/orders/buyer-mutations.ts` RED 테스트 작성 및 실패 확인
- [x] 배송정보 입력/소유권/상태/update mutation 구현
- [x] `order-lookup.ts` `updateBuyerShipping` action을 domain module에 연결
- [x] focused Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 7 buyer order cancel mutation 분해 체크리스트

- [x] 구매자 셀프 취소 mutation 분해 계획 작성
- [x] `lib/orders/buyer-cancel.ts` RED 테스트 작성 및 실패 확인
- [x] 주문 조회/소유권/상태/Toss/shared lifecycle mutation 구현
- [x] `order-lookup.ts` `cancelBuyerOrder` action을 domain module에 연결
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 8 public order lookup read model 분해 체크리스트

- [x] 구매자 주문조회 read model 분해 계획 작성
- [x] `lib/orders/public-lookup.ts` RED 테스트 작성 및 실패 확인
- [x] 주문 목록/상세 DTO 조립 및 무통장 표시 read model 구현
- [x] `order-lookup.ts` `lookupOrders`/`lookupOrderDetail`/`lookupOrderByToken` action을 domain module에 연결
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 9 admin order deposit confirmation 분해 체크리스트

- [x] 관리자 입금확정 mutation 분해 계획 작성
- [x] `lib/orders/deposit-confirmation.ts` RED 테스트 작성 및 실패 확인
- [x] 주문 조회/상태 guard/RPC/artwork sync mutation 구현
- [x] `admin-orders.ts` `confirmDeposit` action을 domain module에 연결
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 10 admin order status transition 분해 체크리스트

- [x] 관리자 주문 상태 전이 mutation 분해 계획 작성
- [x] `lib/orders/status-transition.ts` RED 테스트 작성 및 실패 확인
- [x] 상태 전이표/optimistic update/취소 cleanup mutation 구현
- [x] `admin-orders.ts` `updateOrderStatus` action을 domain module에 연결
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 11 admin order read model 분해 체크리스트

- [x] 관리자 주문 목록/상세 read model 분해 계획 작성
- [x] `lib/orders/admin-read-model.ts` RED 테스트 작성 및 실패 확인
- [x] 목록 q/status/SLA/대표작품 및 상세 payment/sale/line items read model 구현
- [x] `admin-orders.ts` `getOrders`/`getOrderDetail` action을 domain module에 연결
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 12 admin order refund mutation 분해 체크리스트

- [x] 관리자 환불 mutation 분해 계획 작성
- [x] `lib/orders/admin-refund.ts` RED 테스트 작성 및 실패 확인
- [x] 주문/결제 조회, 환불 가능 상태 guard, Toss 취소/skip 판단, shared refunded lifecycle 호출 구현
- [x] `admin-orders.ts` `refundOrder` action을 domain module에 연결
- [x] sync failure 운영 알림/audit와 성공 알림/audit/revalidate 유지 검증
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 13 admin awaiting cancel mutation 분해 체크리스트

- [x] 관리자 입금대기 취소 mutation 분해 계획 작성
- [x] `lib/orders/admin-awaiting-cancel.ts` RED 테스트 작성 및 실패 확인
- [x] 주문 조회, `awaiting_deposit` 상태 guard, shared awaiting cancel lifecycle 호출 구현
- [x] `admin-orders.ts` `cancelAwaitingOrder` action을 domain module에 연결
- [x] 예약 해제 실패 운영 알림과 구매자 취소 알림/audit/revalidate 유지 검증
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 14 guest order claims mutation 분해 체크리스트

- [x] 게스트 주문 귀속 mutation 분해 계획 작성
- [x] `lib/orders/guest-claims.ts` RED 테스트 작성 및 실패 확인
- [x] 검증된 이메일 guard, guest order update, update error 구조화 구현
- [x] `order-lookup.ts` `claimGuestOrders` action을 domain module에 연결
- [x] source boundary test로 action DB update 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 15 artwork taken auto refund 분해 체크리스트

- [x] 동시 구매 경합 자동환불 분해 계획 작성
- [x] `lib/commerce/refund-cancel/auto-refund-taken.ts` RED 테스트 작성 및 실패 확인
- [x] 주문 refunded 마킹, 예약 해제, public revalidation, Toss cancel, payments CANCELED sync 구현
- [x] 자동환불 성공 시 운영자/구매자 알림, 실패 시 운영자 수동환불 알림 분기 검증
- [x] confirm route `ARTWORK_TAKEN` branch를 shared helper에 연결
- [x] webhook DEPOSIT_CALLBACK/STATUS_CHANGED `ARTWORK_TAKEN` branch를 shared helper에 연결
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 16 cancelled-order DONE compensation 분해 체크리스트

- [x] 취소 주문 DONE webhook 보상 분해 계획 작성
- [x] `lib/commerce/refund-cancel/cancelled-order-done.ts` RED 테스트 작성 및 실패 확인
- [x] Toss cancel 예약, 성공 시 payments CANCELED sync, 성공/실패 운영자 알림 분기 구현
- [x] webhook DEPOSIT_CALLBACK 취소 주문 DONE branch를 shared helper에 연결
- [x] webhook STATUS_CHANGED 취소 주문 DONE branch를 shared helper에 연결
- [x] source contract test로 route local function 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 17 status changed missing payment repair 분해 체크리스트

- [x] STATUS_CHANGED DONE payment row 복구 분해 계획 작성
- [x] `lib/commerce/payment-lifecycle/status-missing-payment-repair.ts` RED 테스트 작성 및 실패 확인
- [x] `orders.order_no` 기반 주문 조회, `ensureTossPaymentRecord` 호출, payment row 반환 helper 구현
- [x] paymentId 없음 refetch fallback과 ORDER/PAYMENT 실패 code 검증
- [x] webhook STATUS_CHANGED missing payment branch를 shared helper에 연결
- [x] source contract test로 route 직접 ensure/order lookup 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 18 deposit callback missing payment repair 분해 체크리스트

- [x] DEPOSIT_CALLBACK DONE payment row 복구 분해 계획 작성
- [x] `lib/commerce/payment-lifecycle/deposit-missing-payment-repair.ts` RED 테스트 작성 및 실패 확인
- [x] `orders.order_no` 조회, provider resolve, Toss DONE/orderId 검증, `ensureTossPaymentRecord` 호출 helper 구현
- [x] paymentId 없음 refetch fallback과 ORDER/VERIFY/PAYMENT 실패 code 검증
- [x] webhook DEPOSIT_CALLBACK missing payment branch를 shared helper에 연결
- [x] source contract test로 route 직접 ensure/order/payment lookup 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 19 Toss canceled cascade 분해 체크리스트

- [x] Toss CANCELED/PARTIAL_CANCELED webhook cascade 분해 계획 작성
- [x] `lib/commerce/refund-cancel/toss-canceled-cascade.ts` RED 테스트 작성 및 실패 확인
- [x] 주문 refunded 업데이트, active sale void, 작품 상태 재동기화, 예약 해제, public revalidation helper 구현
- [x] terminal refunded/cancelled 주문 skip과 `tossWebhook.canceled.notifications` 알림 예약 검증
- [x] webhook CANCELED_STATUSES branch를 shared helper에 연결
- [x] notification source contract test로 canceled notification label 보존
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 20 STATUS_CHANGED DONE promotion 분해 체크리스트

- [x] STATUS_CHANGED DONE 보정 promotion 분해 계획 작성
- [x] `lib/commerce/payment-lifecycle/status-changed-done-promotion.ts` RED 테스트 작성 및 실패 확인
- [x] pending/awaiting 주문 paid promotion, cancelled 주문 refund scheduling, payment record fatal result helper 구현
- [x] `tossWebhook.statusChangedDone.notifications` 운영자/구매자 알림 예약 검증
- [x] webhook STATUS_CHANGED DONE branch를 shared helper에 연결
- [x] source contract tests로 route local promotion orchestration 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 21 DEPOSIT_CALLBACK CANCELED 분해 체크리스트

- [x] DEPOSIT_CALLBACK CANCELED branch 분해 계획 작성
- [x] `lib/commerce/refund-cancel/deposit-callback-canceled.ts` RED 테스트 작성 및 실패 확인
- [x] payment row 존재 시 주문 조회 후 `cancelAwaitingDepositOrder` shared lifecycle 호출 구현
- [x] payment row 없음 skip과 `가상계좌 입금 취소/만료` warning 알림 유지 검증
- [x] reservation release warning을 Toss retry fatal로 올리지 않는 logging 검증
- [x] webhook DEPOSIT_CALLBACK CANCELED branch를 shared helper에 연결
- [x] source contract test로 route local reservation/revalidation 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 22 DEPOSIT_CALLBACK DONE promotion 분해 체크리스트

- [x] DEPOSIT_CALLBACK DONE promotion 분해 계획 작성
- [x] `lib/commerce/payment-lifecycle/deposit-callback-done-promotion.ts` RED 테스트 작성 및 실패 확인
- [x] payment row 없음, already paid, cancelled order, payment record fatal result 검증
- [x] awaiting-deposit 주문 paid promotion과 `tossWebhook.depositPaid.notifications` 알림 예약 구현
- [x] ARTWORK_TAKEN 경합 시 거짓 입금확인 알림 없이 자동환불 helper 위임 유지
- [x] webhook DEPOSIT_CALLBACK DONE branch를 shared helper에 연결
- [x] source contract tests로 route local promotion orchestration 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 23 Toss confirm success notifications 분해 체크리스트

- [x] Toss confirm 최종 성공 알림 분해 계획 작성
- [x] `lib/commerce/payment-lifecycle/toss-confirm-success-notifications.ts` RED 테스트 작성 및 실패 확인
- [x] 결제완료 `tossConfirm.paymentConfirmed.notifications` helper 구현
- [x] 가상계좌발급 `tossConfirm.virtualAccountIssued.notifications` helper 구현
- [x] buyer email 없음 분기에서 SMS 알림 유지 검증
- [x] confirm route final notification block을 shared helper에 연결
- [x] source contract test로 confirm route local notification orchestration 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 24 Toss confirm virtual-account promotion 분해 체크리스트

- [x] Toss confirm 가상계좌 promotion/reservation 분해 계획 작성
- [x] `lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.ts` RED 테스트 작성 및 실패 확인
- [x] payment row 생성, unique 예약, `awaiting_deposit` 전이, public revalidation helper 구현
- [x] payment record 실패, unique 예약 실패 자동 취소, order 상태 경합 release/cancel 보상 검증
- [x] `app/actions` import 없이 route 주입 logging callback으로 activity log boundary 유지
- [x] confirm route 가상계좌 branch를 shared helper에 연결
- [x] source contract test로 confirm route local reservation/release orchestration 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 25 Toss confirm paid promotion 분해 체크리스트

- [x] Toss confirm DONE paid promotion 분해 계획 작성
- [x] `lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.ts` RED 테스트 작성 및 실패 확인
- [x] `markOrderPaidWithOutcome` 호출, payment record 실패, already promoted, status mismatch 보상 helper 구현
- [x] cancelled order 자동 Toss cancel 알림과 order sync failure logging callback 검증
- [x] `ARTWORK_TAKEN` 경합 자동환불 helper 위임과 판매기록 warning 알림 검증
- [x] confirm route DONE branch를 shared helper에 연결
- [x] source contract test로 confirm route local paid promotion orchestration 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 26 admin-artwork tag action 분해 체크리스트

- [x] 관리자 내부 태그 server action 분해 계획 작성
- [x] `app/actions/admin-artwork-tags.ts` RED 테스트 작성 및 실패 확인
- [x] 태그 조회/CRUD/작품 연결 action wrapper를 전용 module로 분리
- [x] `admin-artworks.ts`는 기존 UI import 호환을 위해 tag action re-export만 유지
- [x] audit log, admin/detail revalidation, 빈 bulk add/remove 반환값 유지 검증
- [x] source contract test로 `admin-artworks.ts` tag mutation direct import 재유입 방지
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# SAF 리팩토링 Phase 27 admin-artwork details action 분해 체크리스트

- [x] 관리자 작품 생성/상세 수정 action 분해 계획 작성
- [x] `app/actions/admin-artwork-details.ts` RED 테스트 작성 및 실패 확인
- [x] 생성/상세 수정 action wrapper와 공개 캐시 재검증 예약 helper를 전용 module로 분리
- [x] `admin-artworks.ts`는 기존 UI import 호환을 위해 details action re-export만 유지
- [x] 신규 작품 등록 응답 경량화, protected revalidation route 예약, 실패 알림/시스템 로그 유지 검증
- [x] 상세 수정 public/admin revalidation과 audit snapshot 유지 검증
- [x] focused Jest / regression Jest / type-check / lint / diff check 검증
- [x] `walkthrough.md` 결과 정리

---

# 결제/환불 상태 불일치 차단 체크리스트

- [x] confirm route 주문 상태 전이 실패 RED 테스트 추가
- [x] confirm route hard-stop 구현
- [x] 환불 경로 Toss 취소 후 DB 불일치 알림 테스트 추가
- [x] 관리자/구매자 환불 경로 운영 알림 구현
- [x] 이벤트 reconcile 환불 후 상태 갱신 실패 테스트/구현
- [x] checkout availability helper 및 CTA/route gating 정리
- [x] targeted tests 통과
- [x] lint/type/full Jest/validate-artworks 실행
- [x] walkthrough.md 업데이트
- [x] 기존 dirty generated files와 이번 변경 분리 확인

---

# 배송 검증 및 작품 공개 캐시 개선 체크리스트

- [x] `implementation_plan.md`에 승인 전 구현 계획 추가
- [x] 사용자 승인 확인
- [x] checkout 공백 필수값 실패 테스트 작성 및 RED 확인
- [x] checkout 서버 action trim 기반 검증/저장 구현
- [x] checkout targeted 테스트 GREEN 확인
- [x] order lookup 배송정보 공백 실패 테스트 작성 및 RED 확인
- [x] order lookup 서버 action trim 기반 검증/저장 구현
- [x] order lookup targeted 테스트 GREEN 확인
- [x] 작품 상세 KO/EN revalidation helper 실패 테스트 작성 및 RED 확인
- [x] 작품 mutation revalidation 순서/범위 contract 테스트 작성 및 RED 확인
- [x] admin/artist artwork mutation revalidation helper 적용
- [x] targeted cache/status 테스트 GREEN 확인
- [x] lint/type/full Jest/validate-artworks 검증
- [x] `walkthrough.md` 결과 정리
- [x] 기존 unrelated dirty files와 이번 변경 분리 확인

---

# CI 실패 수정 체크리스트

- [x] 원격 CI 실패 로그와 Playwright 리포트 원인 확인
- [x] 카트 데이터 조회와 테스트 seed 안정화
- [x] 카트/추도식 색 대비 및 `<dl>` 구조 수정
- [x] targeted a11y 및 정적 검증 실행
- [x] walkthrough 작성

---

# Google Merchant API 상품 동기화 체크리스트

- [x] Merchant API 공식 요구사항 확인
- [x] 한국어 실행계획을 `implementation_plan.md`에 추가
- [x] 작품 → Merchant `ProductInput` 매핑 테스트 추가
- [x] 판매 불가/가격 없음/이미지 없음 작품 제외 로직 추가
- [x] Merchant API REST client 추가
- [x] dry-run 기본 동기화 스크립트 추가
- [x] `--apply` 실제 insert/update 지원
- [x] `--delete-id` 특정 상품 delete 지원
- [x] `merchant:sync`, `merchant:sync:apply` npm script 추가
- [x] dry-run 리포트 생성 확인
- [x] 관련 테스트 통과
- [x] `npm run type-check` 통과
- [x] `npm run lint` 통과
- [x] Merchant Center OAuth/env 설정 후 소수 상품 `--apply` 실행
- [x] 전체 판매 가능 상품 Merchant API 등록 실행

---

# GSC 잔존 개선사항 정리 체크리스트

- [x] GSC 감사 리포트 URL별 잔존 issue payload 확인
- [x] `implementation_plan.md`에 실행계획 기록
- [x] 작품 상세 Product/Merchant/FAQ rich-result 잔존 원인 회귀 테스트 추가
- [x] 작가 페이지 `mainEntity` 오류 회귀 테스트 추가
- [x] 현실 페이지 `Review` 오류 회귀 테스트 추가
- [x] P1/P2 schema 수정
- [x] 관련 테스트 통과
- [x] `npm run type-check` 통과
- [x] `npm run lint` 통과
- [x] `walkthrough.md` 업데이트
- [x] GSC 관련 production 파일만 분리한 임시 worktree에서 preview 배포 생성
- [x] preview JSON-LD 샘플 검증
- [x] production 배포 완료
- [x] `saf2026.com`/`www.saf2026.com` production JSON-LD 샘플 검증
- [x] 이전 GSC issue URL 409개 production live HTML 전수 재검사
- [x] production live HTML 기준 잔존 schema 문제 0건 확인
- [x] Search Console API로 `https://www.saf2026.com/sitemap.xml` 재제출
- [x] in-app Playwright에서 GSC UI 접근 가능성 확인
- [x] 로그인된 Chrome에서 GSC UI 잔존 카운트 확인
- [x] GSC UI에서 Product snippets 주요 오류 수정 결과 확인 시작
- [x] GSC UI에서 Review snippets 오류 수정 결과 확인 시작
- [x] GSC UI에서 FAQ/Profile page 오류가 `문제 없음` 상태임을 확인
- [x] GSC UI에서 Image Metadata `creditText` 경고 수정 결과 확인 시작
- [x] Image Metadata `copyrightNotice` 수정 결과 확인 시작 상태 확인
- [ ] Google 재크롤 후 GSC 감사 스크립트 재실행

---

# GSC 개선사항 오류 전수 점검 체크리스트

- [x] GSC API URL Inspection 응답 구조 확인
- [x] Search Analytics 최근 28일 URL 수집 구현
- [x] sitemap URL 재귀 수집 구현
- [x] rich result issue grouping / priority mapping / route classification 구현
- [x] Markdown + JSON 리포트 생성 구현
- [x] 단위 테스트 추가
- [x] dry-run 검사 통과
- [x] 전체 865개 URL 감사 리포트 생성
- [x] retry URL 0개 확인
- [x] `npm run type-check` 통과
- [x] `npm run lint` 통과

---

# GSC 제품 스니펫 Product mention 오류 수정 체크리스트

- [x] GSC 오류 원인 후보 조사
- [x] 매거진 `BlogPosting.mentions`의 관련 작품 타입을 `Product`에서 `VisualArtwork`로 변경
- [x] `BlogPostingMention` 타입을 `VisualArtwork` 기준으로 정리
- [x] Product mention 회귀 테스트 추가
- [x] `npm test -- --runInBand __tests__/schemas/schema-validation.test.ts` 통과
- [x] `npm run type-check` 통과
- [x] `npm run lint` 통과

---

# 관리자 이메일 발송 UX 전면 재정리 체크리스트

- [x] `implementation_plan.md`에 전면 재정리 실행 계획 기록
- [x] `세그먼트 발송` / `검색 발송` 노출 제거
- [x] `받는 사람` 중심 섹션으로 재구성
- [x] `그룹 전체 선택` / `개별로 추가` 행동 기준 선택지로 변경
- [x] 명단에 없는 이메일 직접 추가 지원
- [x] 직접 입력 이메일 형식 오류/중복/이미 추가됨 요약 표시
- [x] `발송 예약` 문구를 `발송하기`로 변경
- [x] 성공 메시지를 발송 시작 기준으로 변경
- [x] 광고성 개별 발송에서 고객 마케팅 수신거부도 함께 제외
- [x] 테스트 버튼을 `나에게 테스트 보내기`로 변경
- [x] UI 문구 회귀 테스트 보강
- [ ] `npm run lint` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가
- [ ] `npm run type-check` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가

---

# 관리자 이메일 작품 구매자 대상 검색 선택 체크리스트

- [x] `implementation_plan.md`에 작품 검색 선택 계획 기록
- [x] 웹사이트 작품 검색과 같은 `matchesAnySearch` 기반 서버 검색 액션 추가
- [x] 작품 ID 직접 입력을 실시간 작품 검색/선택 UI로 교체
- [x] 작품명/작가명 입력 후 300ms 디바운스 검색 적용
- [x] 선택된 작품 요약과 다시 선택 기능 추가
- [x] 작품 검색 선택 컴포넌트 테스트 추가
- [ ] `npm run lint` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가
- [ ] `npm run type-check` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가

---

# 관리자 이메일 발송 UX 메인 반영 체크리스트

- [x] `implementation_plan.md`에 main 기준 UX 반영 계획 기록
- [x] 검색 발송 수신자 0명 발송 전 차단
- [x] 청원 미선택/작품 ID 미입력 발송 전 차단
- [x] 차단 사유 UI 표시
- [x] 검색 결과 0건 안내 표시
- [x] 선택 수신자 이름/이메일 검토 패널 추가
- [x] 선택 수신자 개별 해제와 전체 해제 추가
- [x] ContactSearch 회귀 테스트 보강
- [ ] `npm run lint` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가
- [ ] `npm run type-check` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가

---

# 스토리 제목 하이픈 정리 체크리스트

- [x] 하이픈 포함 스토리 제목 조회
- [x] 실제 치환 대상 문자 확인
- [x] Supabase `stories` 제목 업데이트
- [x] 변경 후 결과 재조회
- [x] 재현용 SQL 마이그레이션 추가
- [x] `walkthrough.md` 업데이트

---

# 매거진 공통 하단 링크 단순화 체크리스트

- [x] 스토리 상세의 공통 하단 링크를 모든 게시물에 단순 인라인 형태로 통일
- [x] 작가 글/일반 글에 맞는 첫 번째 링크 문구 분기
- [x] 별도 footer 섹션 제거
- [x] 관련 작품 폴백 로직 단순화
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# 작품 이미지 AI 업스케일 체크리스트

- [x] Supabase 기준 저해상도 대상 재집계
- [x] 업스케일 배치 스크립트 추가
- [x] 업스케일 보조 Python 스크립트 추가
- [x] 1순위 대상 dry-run 리포트 생성
- [x] 작품 이미지 백업 생성
- [x] 1순위 대상 업스케일 및 업로드 반영
- [x] Cafe24 동기화 결과 확인
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# 포털 진행바 rAF 충돌 수정 체크리스트

- [x] `components/layout/NavigationProgress.tsx`의 rAF/timer cleanup 보강
- [x] 연속 네비게이션 회귀 테스트 추가
- [x] 관련 테스트 실행
- [x] `npm run lint` 통과
- [x] `walkthrough.md` 업데이트

---

# 이미지 업로드 장애 수정 체크리스트

- [x] CSP `img-src`에 `blob:` 허용 추가
- [x] 출품자 작품 업로드 `pathPrefix`를 artist id 기준으로 변경
- [x] Storage policy migration 작성(출품자 권한 추가)
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# 최근 등록 검수 큐 개선 체크리스트

- [x] 대시보드 최근 작품 CTA를 `최근 등록 검수하기`로 변경
- [x] 대시보드 최근 작품 소스를 “작가 직접 등록” 기준으로 보강
- [x] `/admin/artworks?queue=artist-recent` 큐 모드 서버 필터 추가
- [x] 검수 큐 모드 상단 맥락 배지/안내/일반 목록 복귀 버튼 추가
- [x] 작품 목록에 등록일 정렬/등록일 컬럼 추가
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# 최근 등록 정렬 필터 전환 체크리스트 (방향 변경)

- [x] 대시보드 CTA를 `/admin/artworks?sort=recent`로 변경
- [x] 작품 관리 페이지 `queue` 모드 제거
- [x] 작품 목록에 `기본/최근/오래된` 정렬 필터 추가
- [x] 정렬 필터를 URL `sort` 파라미터와 동기화
- [x] 대시보드 최근 작품 데이터 소스를 전체 최신 등록 기준으로 복원
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# Cafe24 초기 매핑 자동화 체크리스트

- [x] `scripts/cafe24/build_initial_mapping.py` 추가
- [x] `scripts/cafe24/README.md` 작성
- [x] `package.json`에 `cafe24:build-mapping` 스크립트 등록
- [x] `npm run cafe24:build-mapping` 실행 및 산출물 검증
- [x] `walkthrough.md`에 결과/잔여 과제 기록

---

# Cafe24 OAuth 콜백 라우트 체크리스트

- [x] `/api/integrations/cafe24/authorize` 라우트 추가
- [x] `/api/integrations/cafe24/callback` 라우트 추가
- [x] `.env.local.example`에 Cafe24 OAuth 환경변수 예시 추가
- [x] `docs/cafe24-oauth-integration.md` 사용 가이드 추가
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과

---

# Cafe24 자동 동기화 2단계 체크리스트

- [x] `public.cafe24_tokens` + 작품 동기화 메타 컬럼 마이그레이션 추가
- [x] Cafe24 API 클라이언트(토큰 refresh 포함) 구현
- [x] OAuth callback에서 토큰 DB 영구 저장 연동
- [x] 작품 등록/수정/이미지변경 액션에 Cafe24 자동 동기화 트리거 연결
- [x] `artworks` 동기화 상태(`cafe24_sync_status`, `cafe24_sync_error`) 기록 처리
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과

---

# 작품 상세 작가 관련 URL 확장 체크리스트

- [x] 현재 `artist-articles.ts` 보유 현황 파악
- [x] 출품 작가 대비 누락/공백 작가 집계
- [x] URL 중복 현황 확인
- [x] 동명이인 리스크 작가 식별
- [x] `implementation_plan.md`에 수집/검수/중복방지 계획 작성
- [x] 1차 배치 대상(0개/공백 작가) 확정
- [x] 작가별 검색 힌트 시트 작성
- [x] 후보 URL 수집
- [x] canonical URL 정규화 및 중복 제거
- [x] 동명이인 검수
- [x] `content/artist-articles.ts` 반영
- [x] 필요 시 `npm run lint`
- [x] 필요 시 `npm run type-check`
- [x] `walkthrough.md` 업데이트

---

# GSC/GA4 작품판매 매출 개선 체크리스트

- [x] 공통 판매 작품 스포트라이트 컴포넌트 추가
- [x] `/petition/oh-yoon`에 구매 가능한 오윤 판화 우선 노출
- [x] `/special/oh-yoon`에 checkout 신호 작품 우선 노출
- [x] 작가 페이지 hero 직후 구매 가능 작품/가격대 스포트라이트 추가
- [x] GSC 기회 매거진 글에 검색 의도형 작품 스포트라이트 추가
- [x] 국내/해외 checkout cancel/error 이벤트 추가
- [x] 환불/취소 제외 매출 RPC 마이그레이션 추가
- [x] 회귀 테스트 추가
- [x] 테스트/린트/type-check 실행
- [x] `walkthrough.md` 업데이트
