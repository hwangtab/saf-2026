# 토스 퀵계좌이체 전환 설계

- 작성일: 2026-06-26
- 상태: 설계 승인됨, 구현 plan 대기
- 관련 메모: `project_toss_checkout`, `project_event_registration_oh_yoon_memorial`, `project_serverless_notify_after`, `project_security_definer_role_check`

## 1. 배경 & 목표

현재 작품 구매·이벤트 등록의 "계좌이체" 선택지는 토스를 거치지 않고 우리 기업은행(IBK)
계좌번호를 안내해 구매자가 직접 송금하면 관리자가 **수기로 입금을 확인**(`confirm_bank_transfer_order`
RPC / `register_event_bank_transfer` RPC)하는 수동 무통장입금 방식이다.

토스페이먼츠와 협의해 상점아이디(domestic MID `saf202i818`)에 **퀵계좌이체**를 활성화했다.
퀵계좌이체는 토스 결제창 안에서 `method: 'TRANSFER'`로 호출하는 실시간 계좌이체로,
계좌 선택 → 전화번호+비밀번호 인증 → **즉시 출금 → 결제 완료(`DONE`)** 흐름이며 카드와
동일하게 `/v1/payments/confirm` 승인 시 바로 `DONE`으로 떨어진다(가상계좌의 입금 대기
`WAITING_FOR_DEPOSIT`와 다름). 환불도 즉시.

**목표**: 수동 무통장입금을 제거하고 "계좌이체"를 카드와 동일한 토스 결제 파이프라인에
흡수해 자동 `paid` 처리한다. 수기 대사·새 웹훅·새 상태가 전부 불필요해진다.

## 2. 범위 & 원칙

- **대상**: 작품 구매(단건 `/checkout/[artworkId]`, 카트 `/checkout`) + 이벤트 등록(오윤 추도식)
- **원칙**: `TRANSFER`를 카드 분기와 통합 — `createOrder → requestPayment({ method: 'TRANSFER' })
→ success → confirm(DONE) → paid`.
- **국내(ko)만**: 퀵계좌이체는 한국 계좌 기반. 해외(en/overseas/PayPal) locale에서는
  계좌이체 선택지 미노출.
- **현금영수증**: 토스 결제창/대시보드 정산에 위임. `requestPayment`에 현금영수증 옵션을
  넘기지 않는다. (협동조합이라 발급 불가한 것은 *기부금 영수증(세액공제)*일 뿐, 현금영수증·
  세금계산서 등 일반 영수증은 발급에 제약 없음.)
- **사전 확인됨**: production에 처리 대기 중인 수동 무통장 건이 작품(`awaiting_deposit`)·
  이벤트(`deposit_pending`) 양쪽 모두 **0건** — 코드 제거가 안전.

## 3. 작품 구매 변경

대상 파일:

- `app/[locale]/checkout/[artworkId]/CheckoutClient.tsx` (단건)
- `app/[locale]/checkout/CartCheckoutClient.tsx` (카트)

변경:

- `handlePayment`에서 `TRANSFER` 분기를 **카드 분기와 통합**: `createBankTransferOrder()` 호출을
  제거하고 `createOrder()` → `requestPayment({ method: 'TRANSFER', amount, orderId, orderName,
customerName, customerEmail, successUrl, failUrl })`로 보낸다. (카드와 동일 시그니처, `card`
  옵션 없음)
- `PAYMENT_CHOICES`의 `TRANSFER`는 `cardOptions` 없이 유지. 라벨/안내문구를 "퀵계좌이체(즉시
  출금)" 취지로 갱신하고, 기존 "계좌번호로 입금" 안내 문구는 삭제.
- en locale(overseas provider)에서는 `TRANSFER` 옵션을 렌더에서 제외(provider 가드).

## 4. 이벤트 등록 변경

대상 파일:

- `app/[locale]/event/oh-yoon-memorial/_components/RegistrationForm.tsx`
- `app/actions/event-registration.ts`

변경:

- `RegistrationForm`의 `startTossPayment`에 `method: 'CARD' | 'TRANSFER'` 파라미터를 추가하고,
  `paymentMethod === 'transfer'`면 `'TRANSFER'`로 `requestPayment` 호출.
- `registerEvent`: `paymentMethod === 'transfer'`일 때 `OK_DEPOSIT`(수동 계좌안내) 대신
  **`OK_PENDING`**(좌석 hold + 결제정보)을 반환 → card와 동일 경로. `register_event_bank_transfer`
  RPC 호출 제거.
- 폼의 `OK_DEPOSIT` 계좌안내 렌더 블록(현재 155–191행) 삭제. 관련 i18n 키(`depositTitle`,
  `depositLead`, `depositBankLabel`, `depositAccountLabel`, `depositHolderLabel`,
  `depositAmountLabel`, `depositNotice`, `submitTransfer`)는 미사용분 정리.
- 좌석 hold 패턴(advisory lock RPC)·대기자 승계·USER_CANCEL 시 hold 반환은 card 경로를
  그대로 재사용하므로 추가 변경 없음.

## 5. confirm / DB / webhook

- `app/api/payments/toss/confirm/route.ts`: 변경 거의 없음. `TRANSFER`도 `status=DONE`으로
  떨어지므로 기존 `DONE → orders.status='paid'` + `artwork_sales` 생성 로직이 그대로 처리.
  `payments.method`에는 토스가 반환한 한국어 method 값(예: `계좌이체`)을 그대로 기록.
- 이벤트 confirm route도 동일 — `DONE → event_registrations.status='confirmed'`.
- orders 상태머신·webhook 무변경. 가상계좌(`WAITING_FOR_DEPOSIT`) 분기는 미계약이라 무관하게
  유지(죽은 분기 아님 — 방어적).
- `app/actions/admin-orders.ts` 등 관리자 코드의 입금확인 흐름은 6절 참고.

## 6. 제거 대상 (호출부만, DB DROP은 보류)

호출부/UI 제거:

- `createBankTransferOrder` (`app/actions/checkout.ts`) — **ko 호출부(작품 단건·카트)만 제거.**
  함수 본체·en(overseas) 호출·관련 export(`verifyBankTransferLanding`, `cancelLandingOrder`,
  `cancelLatestLandingOrder`)는 **해외(en) SWIFT 무통장 송금(`OverseasCheckoutClient`)용으로
  유지**. 퀵계좌이체는 한국 계좌 전용이므로 en에서는 기존 수동 무통장 방식이 필요.
- `register_event_bank_transfer` 호출 경로 (`event-registration.ts`의 transfer 분기).
- 관리자 "입금 확인" UI/버튼(`confirm_bank_transfer_order` RPC 호출부) — `status==='awaiting_deposit'`
  조건부 렌더라 신규 무통장 미생성 시 자연 비활성. **UI 진입점 제거 대신 유지**가 en SWIFT
  무통장·과거 주문 안전망으로 더 안전.
- `metadata.payment_provider='manual_bank_transfer'` 생성 로직, 계좌 안내 i18n 키(ko 이벤트·작품),
  무통장 관련 안내 컴포넌트(ko).

**보류(별도 정리 사이클)**:

- `confirm_bank_transfer_order` / `register_event_bank_transfer` RPC 및 마이그레이션 파일은
  DB에서 즉시 DROP하지 않는다. 과거 `paid` 처리된 주문의 감사 흔적·재현 가능성 보존.
  호출부가 사라져 dead code가 되지만, DROP은 안정화 후 별도 PR.

## 7. 엣지케이스

- **en locale**: `TRANSFER` 선택지 렌더 제외. 영문 사용자는 카드/PayPal만.
- **결제창 닫기(USER_CANCEL)**: 카드와 동일 — 작품은 `cancelPendingOrder`, 이벤트는
  `cancelEventPendingPayment`로 hold/주문 즉시 반환. TRANSFER도 같은 catch 경로.
- **환불**: 퀵계좌이체 즉시환불 지원. 기존 Toss `/v1/payments/{paymentKey}/cancel` 경로 그대로.
- **알림(SMS/이메일)**: `paid` 확정 시 발송. `after()`로 응답 후 발송(메모 `project_serverless_notify_after`).
  기존 무통장 발급 알림(`bank_transfer_issued` 템플릿)은 더는 발송되지 않음 — 미사용 처리.

## 8. 테스트

- **단위**: `registerEvent({ paymentMethod: 'transfer' })`가 `OK_PENDING`(좌석 hold + 결제정보)을
  반환하는지 검증. 작품/이벤트 결제수단 선택 UI 스냅샷 갱신.
- **e2e-a11y**: 결제수단 라디오 변경분 spec 갱신(`e2e/a11y/`).
- **빌드/타입**: `npm run build`, `npm run type-check`, `npm run lint` 통과.
- **수동 스모크(verify-first, 메모 `feedback_payment_diagnosis_verify`)**: 토스 라이브 환경에서
  퀵계좌이체 실제 1건 결제 → confirm → `orders.status='paid'` 확인, 환불 1건 즉시환불 확인.
  이벤트 1건 동일 검증.

## 9. Open Questions / 운영 확인

- **정산 주기**: 퀵계좌이체 정산 타이밍은 토스 문서 미기재 → 토스 계약 조건으로 확인(코드 무관).
- **현금영수증 발급 책임**: 토스 결제창이 자동 처리하는지, 대시보드 설정이 필요한지 토스에 확인.
- **수수료율**: 카드 대비 낮은 현금성 수수료 — 정산/회계용으로 확인(코드 무관).

## 10. 비범위 (YAGNI)

- 가상계좌(`VIRTUAL_ACCOUNT`) 신규 계약/연동.
- 펀딩 플랫폼(`/funding`)의 결제수단 변경 — 별도 트랙(`funding_payments`).
- RPC/마이그레이션 DB DROP(6절 보류 항목).
- 자동결제(빌링키) — 퀵계좌이체가 지원하나 현재 요구 없음.
- **해외(en) 무통장입금 전환** — `OverseasCheckoutClient`의 SWIFT 무통장(`createBankTransferOrder`)은
  유지. 퀵계좌이체는 한국 계좌 전용이라 en에 적용 불가. en 구매자는 기존 수동 무통장입금
  (`IBK 계좌 안내 → 관리자 입금확인`) 방식 그대로.
