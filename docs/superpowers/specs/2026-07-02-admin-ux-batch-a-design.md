# 관리자 UX 개선 — 묶음 A (일상 마찰 제거) 설계

날짜: 2026-07-02
작업 브랜치: `feat/admin-ux-batch-a`

## 배경

관리자 포털 UX 분석에서 7개 개선안이 도출됐으나, 실제 코드를 검증한 결과 절반이 이미 구현돼 있었다(분석 문서가 stale). 현재 상태:

| #   | 제안                                | 상태                                                                                                                  |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | 주문 행 단위 입금 확인 quick action | ✅ 구현됨 (`d844c8c5`) — **일괄(bulk)만 미비**                                                                        |
| 2   | 대시보드 "오늘 할 일" 큐            | 🟡 부분 — `awaiting_deposit`·`refund_requested` 카드 존재. **인바운드 메일·행사 큐 카드, 신청 리스트 개별 링크 미비** |
| 3   | nav 처리 대기 뱃지                  | ✅ 구현됨 (`admin-nav-badges.ts`)                                                                                     |
| 4   | 외부 알림 / 일일 다이제스트         | ❌ 미구현 (스펙 B 예정)                                                                                               |
| 5   | 승인/반려 통지                      | 🟡 승인 구현됨 (`2adb76db`), **반려 미구현**                                                                          |
| 6   | ⌘K 전역 검색                        | ✅ 구현됨 (`AdminGlobalSearch.tsx`)                                                                                   |
| 7   | 주문 CSV export + 정산 리포트       | ❌ 미구현 (스펙 C 예정)                                                                                               |

**묶음 A**는 남은 것 중 "기존 패턴 복제로 저위험·고빈도"인 세 조각을 하나의 스펙으로 묶는다: #1 일괄, #5 반려, #2 잔여. 스펙 B(#4)·C(#7)는 별도 사이클.

## 목표 / 비목표

**목표**

- 무통장 입금 다건 처리 시 목록 왕복 제거 (A-1)
- 반려된 신청자가 로그인 없이 결과를 알 수 있게 (A-2)
- 첫 화면에서 "처리 대기" 큐 가시성 완성 (A-3)

**비목표**

- 외부 알림/다이제스트(스펙 B), CSV export·정산(스펙 C)
- 주문 목록 페이지네이션/정렬 개선 (별건)
- 반려 사유 입력 UI (A-2는 사유 미포함 정중 안내로 확정)

## A-1. 주문 일괄 입금 확인

### 현재

- [order-list.tsx](<../../../app/(portal)/admin/orders/order-list.tsx>)에 `awaiting_deposit` 행 단위 "입금 확인" 버튼 + `AdminConfirmModal` 존재
- 서버: [admin-orders.ts](../../../app/actions/admin-orders.ts) `confirmDeposit(orderId)` (421) — mutation + `after()` 알림(관리자·구매자 email/SMS) + `logAdminAction`
- 다중 선택·일괄 처리 없음

### 변경

**클라이언트 (`order-list.tsx`)**

- `selectedIds: Set<string>` 상태 추가
- 테이블에 체크박스 열(맨 앞) 추가 — **`status === 'awaiting_deposit'` 행만** 체크박스 렌더(그 외 행은 빈 셀)
- thead에 "전체 선택" 체크박스 — 현재 `filtered` 중 `awaiting_deposit` 행 전체 토글
- bulk 툴바: `selectedIds.size > 0`일 때 카드 상단(또는 헤더 아래)에 노출. 패턴은 [admin-artwork-list.tsx](<../../../app/(portal)/admin/artworks/admin-artwork-list.tsx>) 1063-1134 복제. 구성: "N건 선택" 텍스트 + "일괄 입금 확인" 버튼(`bg-primary-strong`) + "선택 해제"
- 일괄 확인 클릭 → `AdminConfirmModal` (기존 재사용). description: "선택한 N건의 입금을 확인하고 결제 완료 처리합니다."
- 확인 시 `confirmDepositBatch([...selectedIds])` 호출. 결과에 따라 토스트: 전건 성공 "N건 입금 확인 완료" / 일부 실패 "N건 확인, M건 실패" (`toast.error` 또는 warning). `setSelectedIds(new Set())` + `router.refresh()`
- 필터 변경 시 선택 초기화(스테일 선택 방지)
- 리터럴은 한국어(파일 관례)

**서버 (`admin-orders.ts`)**

- `confirmDepositBatch(orderIds: string[]): Promise<{ succeeded: string[]; failed: { id: string; error: string }[] }>` 신설
- 구현: `orderIds`를 **순차** 루프, 각 id마다 `try { await confirmDeposit(id) } catch`로 개별 성공/실패 수집. `confirmDeposit`가 이미 mutation·알림·감사 로그를 처리하므로 로직 재사용(중복 구현 없음)
- 순차 선택 이유: 입금 다건은 소량(수 건)이고, 각 건이 `after()` 알림을 스케줄하므로 병렬 시 DB/알림 부하·감사 로그 순서 혼선 회피
- `requireAdmin()`는 `confirmDepositBatch` 진입부에서 1회, 내부 `confirmDeposit`도 자체 가드하지만 이중 가드는 무해
- 부분 실패는 throw하지 않고 결과 객체로 반환(한 건 실패가 나머지를 막지 않게)

### 엣지 케이스

- 선택 후 다른 관리자가 먼저 확인 → 해당 id의 `confirmDeposit`가 상태 불일치로 throw → `failed`에 수집, 나머지 진행. 토스트에 실패 건수 노출

## A-2. 반려 통지 (정중 안내 메일)

### 현재

- [admin.ts](../../../app/actions/admin.ts) `rejectUser(userId)` (698) — profile status를 `suspended`로, `logAdminAction`만. 이메일 없음. select는 `id, name, role, status, updated_at`(email 미포함)
- 승인은 `approveUser`가 `after()` + `sendArtistApprovalEmail`로 발송 (673-687)

### 변경

**`lib/notify.ts`**

- `sendArtistRejectionEmail(to: string, artistName: string): Promise<void>` 신설
- `sendArtistApprovalEmail` (399) 브랜드 레이아웃 그대로 미러(헤더·카드·푸터, `BRAND_COLORS`, `escapeHtml`, `recordEmailLog`, `resendFetch` 재사용)
- 톤(확정): 사유 미포함. "이번 출품 신청은 진행이 어렵게 되었다"는 정중한 안내 + 문의처(contact@kosmart.org) 안내. CTA 버튼 없음(대시보드 링크 부적절) — 문의 이메일 텍스트만
- 제목: `[씨앗페] 작가 신청 안내`
- `type: 'artist_rejection'`으로 `recordEmailLog`
- 발송 실패 처리: 승인 메일은 실패 시 throw(관리자 명시 액션). 반려는 `after()` 비차단이므로 throw하지 않고 `console.error`만(반려 DB는 이미 커밋됨) — `confirmDeposit`의 `after()` 패턴을 따름

**`admin.ts` `rejectUser`**

- select에 `email` 추가
- status 업데이트·로그 후, `normalizeEmail(beforeProfile?.email)` 존재 시 `after(async () => { ... sendArtistRejectionEmail(email, name) })` (approveUser 675-687 패턴 복제)
- name은 신청서(`application?.artist_name`)가 approveUser처럼 있으면 우선, 없으면 `beforeProfile?.name` — rejectUser에 application 조회가 없다면 `beforeProfile?.name || '작가님'`로 단순화

## A-3. 대시보드 잔여

### 현재

- [admin-dashboard-overview.ts](../../../app/actions/admin-dashboard-overview.ts): `pendingOrderCount`·`awaitingDepositCount`·`refundRequestedCount`·`slaOverdueCount`·`escalatedCount` fetch·반환
- [dashboard/page.tsx](<../../../app/(portal)/admin/dashboard/page.tsx>): 위 카드 렌더(refund·escalation은 count>0 조건부). 신청 리스트(457-470)는 이름/이메일 plain text
- 데이터 출처: `email_inbound_messages` status=`new` (admin-notifications.ts:269), `event_registrations` status `awaiting_deposit`/`waitlist` (admin-notifications.ts:152-203)

### 변경

**`admin-dashboard-overview.ts`**

- 반환 타입에 `newInboundMailCount: number`, `eventActionNeededCount: number` 추가
- `Promise.all` 병렬 fetch에 2개 head-count 쿼리 추가:
  - `email_inbound_messages` `.eq('status','new')` head count
  - `event_registrations` `.in('status', ['awaiting_deposit','waitlist'])` head count
- 실패 폴백 0 (nav-badges 패턴)

**`dashboard/page.tsx`**

- 처리 대기 카드 그리드(115-188)에 조건부 카드 2개(refund 카드처럼 count>0일 때만):
  - `newInboundMailCount` → title `t('newInboundMail')`, href `/admin/email`
  - `eventActionNeededCount` → title `t('eventActionNeeded')`, href `/admin/event`
- 신청 리스트 항목(457-470): 각 `<li>` 내용을 `<Link href="/admin/users?status=pending">`로 감싸 클릭 가능화(사용자 상세 페이지 부재 → pending 목록 랜딩). hover 스타일 기존 유지
- i18n: 대시보드는 이미 `useTranslations` 전면 사용 → `messages/ko.json`·`messages/en.json`의 해당 admin dashboard 네임스페이스에 `newInboundMail`, `eventActionNeeded` 키 추가(파일 관례 유지)

## 파일 변경 요약

| 파일                                       | 변경                                         |
| ------------------------------------------ | -------------------------------------------- |
| `app/(portal)/admin/orders/order-list.tsx` | 체크박스·bulk 툴바·일괄 확인 모달            |
| `app/actions/admin-orders.ts`              | `confirmDepositBatch` 신설                   |
| `lib/notify.ts`                            | `sendArtistRejectionEmail` 신설              |
| `app/actions/admin.ts`                     | `rejectUser`에 email select + `after()` 발송 |
| `app/actions/admin-dashboard-overview.ts`  | 카운트 2개 추가                              |
| `app/(portal)/admin/dashboard/page.tsx`    | 카드 2개 + 신청 리스트 링크화                |
| `messages/ko.json`, `messages/en.json`     | 대시보드 키 2개                              |

## 테스트 / 검증

- `confirmDepositBatch` 단위 테스트: 전건 성공 / 일부 실패(mock으로 한 건 throw) → `{succeeded, failed}` 정확성
- `npm run type-check`, `npm run lint`
- `npm run build` (SSG/Turbopack 검증 — `'use server'` 재-export 금지 회귀 주의)
- 반려 이메일: env(`RESEND_API_KEY`) 미설정 시 no-op 확인(로컬)
- 시각 확인은 사용자에게 요청(Playwright 미사용 정책)

## 리스크 / 주의

- `after()` 필수 — bare `void notifyEmail`은 서버리스 함수 정지로 발송 abort(메모리: serverless-notify-after). 승인/confirmDeposit 패턴 그대로 사용
- 반려 메일은 외부 발신 민감 — 사유 미포함 정중 톤으로 확정. 톤 재검토 시 이 문서 갱신
- `confirmDepositBatch`는 `confirmDeposit`를 재사용하므로 알림 로직 중복 없음. 향후 `confirmDeposit` 시그니처 변경 시 배치도 자동 반영
- 대시보드 i18n: admin은 원칙상 한국어 전용이나 이 파일은 이미 next-intl 전면 사용 → 파일 관례를 따라 키 추가(신규 리터럴 직접 삽입 시 불일치)
