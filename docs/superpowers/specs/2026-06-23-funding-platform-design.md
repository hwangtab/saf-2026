# 크라우드펀딩 플랫폼 설계 (오윤 테라코타 이전 모금 1차)

작성일: 2026-06-23
상태: 설계 확정 (구현 계획 대기)

## 1. 배경 & 목표

오윤(작고한 민중미술 거장)이 1974년 서울 구의동 상업은행(현 우리은행) 외벽에 새긴 **양면 테라코타 부조**가 건물 매매로 **2026년 8월 철거 예정**이다. 기존 청원([/petition/oh-yoon](../../../app/[locale]/petition/oh-yoon/page.tsx))은 차기 서울시장·문체부 장관에게 보존을 요청하는 **정책 압박** 트랙이다.

본 프로젝트는 그와 별개로 **시민이 직접 이전(해체·보존) 비용을 모금**하는 펀딩 트랙을 신설한다. 텀블벅을 참조 모델로 하되, 향후 다른 작가도 펀딩을 열 수 있도록 **범용 구조**로 설계한다. 청원 서명자 약 11,508명(이메일 보유)이 1차 후원자 풀이다.

### 캠페인 프레이밍 주의

출품 작가는 금융 피해 당사자가 아니라 연대자다. 본 펀딩은 "작품 보존을 위한 시민 모금"이며, 후원자에게 리워드를 제공하는 **통신판매** 형태로 구조화한다(아래 §3 법무 참조).

## 2. 핵심 결정 (확정)

| 항목        | 결정                                                                               |
| ----------- | ---------------------------------------------------------------------------------- |
| 범위        | 범용 펀딩 구조, 1차는 오윤 프로젝트 1건 런칭                                       |
| 개설 주체   | **admin 대리 개설** (작가 셀프 개설 포털은 후속)                                   |
| 정산 방식   | **Keep-it-All** (목표 미달이어도 모인 만큼 집행), **즉시결제**                     |
| 리워드      | 혼합(소액~상위), **전부 리워드형** — 모든 티어에 반대급부 부여                     |
| 배송        | 배송 있는 리워드 포함 (배송지 수집 + admin 발송 추적)                              |
| 동선        | 별도 `/funding/[slug]` 페이지, 청원에서 CTA 연결                                   |
| 결제 수단   | **1차는 카드 즉시결제만** (가상계좌는 후속)                                        |
| 데이터 모델 | 전용 `funding_*` 테이블 신설 + **별도 `funding_payments`** (작품 결제 코드 무영향) |
| 운영 주체   | 한국스마트협동조합 (**일반 협동조합** → 기부금영수증 발급 불가)                    |
| 모금 성격   | **전부 리워드형** (기부금품법 등록 회피, 전자상거래법 전면 적용)                   |

### 1차 범위에서 제외 (후속 사이클)

가상계좌, 다티어 장바구니(후원=단일 티어×수량), 작가 셀프 개설 포털, 부분환불, 신규 알림톡 템플릿, All-or-Nothing 모드.

## 3. 법무·세무 제약 (설계 반영 필수)

전자상거래 법무·세무 전문가 검토 결과. **모금 개시 전 항목별 변호사·세무사 최종 확인 필요.**

- **전부 리워드형 = 통신판매**: 기부금품법(1천만원 이상 모집 등록 의무)을 회피하나, **전자상거래법이 전면 적용**된다.
- **청약철회권(7일)은 약관으로 배제 불가**: "원칙 환불불가" 초안은 위법 소지. 법정 7일 청약철회권을 보장한다. 단 **주문제작 리워드(이름 각인 등)는 사전 별도 동의 시 청약철회 제한 가능**(전자상거래법 제17조 제2항 예외). 기성품(엽서·도록)은 배송 후 7일 보장.
- **통신판매업 신고** 필요(연 50회 이상 거래 예상).
- **표시·광고 의무**: 결제 전 화면에 상호·대표·사업자번호·통신판매업 신고번호·주소·연락처·환불조건 고지.
- **기부금영수증 불가**: 일반 협동조합은 공익법인 지정 대상이 아니다. "세액공제 대상 기부금영수증 발급 불가"를 명시하고, 리워드 티어에 "기부·세액공제" 표현 사용 금지.
- **현금영수증**: 카드 결제는 자동 처리. (가상계좌는 후속 범위라 별도 발급 동선 미구현.)
- **목적 불능 조항**: Keep-it-All 즉시집행이라 환불 재원이 없을 수 있다. "작품 이전이 불가능해진 경우(예: 철거 선행으로 멸실) 후원금은 오윤 작품 보존·기록·추모 등 유사 목적으로 전용할 수 있으며 사전 통지한다"를 **모금 개시 전 약관에 명시**한다.

## 4. 데이터 모델

전용 `funding_*` 테이블을 신설하고, 결제 기록은 작품 `payments`(라이브에서 `order_id` NOT NULL)와 충돌하지 않도록 **별도 `funding_payments`** 테이블로 분리한다. Toss 호출·검증 저수준 로직([lib/integrations/toss/](../../../lib/integrations/toss/))은 공유한다.

```
funding_projects (admin 개설)
  id uuid PK
  slug text UNIQUE                 -- 공개 URL ('oh-yoon-terracotta')
  title / summary / story / cover_image
  category text
  goal_amount integer              -- 목표 금액(원)
  funding_type text DEFAULT 'keep_it_all'   -- 향후 'all_or_nothing' 확장 여지
  status text                      -- draft | active | closed | settled (전이 가드)
  start_at / end_at timestamptz
  created_at / updated_at
  -- raised_amount/backer_count는 캐시 컬럼으로 두지 않는다(§5 동시성). 공개 표시는 파생 집계 view + 마감 스냅샷.

reward_tiers
  id uuid PK
  project_id uuid FK -> funding_projects
  title / description text
  amount integer                   -- 후원 금액
  total_quantity integer NULL      -- 한정 수량(NULL=무제한)
  requires_shipping boolean DEFAULT false
  is_made_to_order boolean DEFAULT false   -- 주문제작(청약철회 제한 가능) 표식
  estimated_delivery date NULL
  image_url text NULL              -- (Phase B 추가) 판화·엽서 썸네일. 판화 리워드는 펀딩 전용 독립 데이터
  reward_kind text DEFAULT 'goods' -- (Phase B 추가) 'postcard' | 'print' 등 표시 분기용
  sort_order integer
  -- claimed_quantity 캐시 컬럼 두지 않음 — 파생 SUM으로 점유 산정(§5)

funding_pledges (후원 1건 = 결제 단위)
  id uuid PK
  project_id uuid FK
  order_no text UNIQUE             -- 'FND-YYYYMMDD-XXXX'
  backer_user_id uuid NULL         -- 비회원 후원 허용
  backer_name / backer_email / backer_phone
  total_amount integer             -- 서버 RPC가 reward_tiers.amount*qty로 계산
  status text                      -- pending_payment | paid | cancelled | refunded | expired
  hold_expires_at timestamptz      -- 한정 티어 점유 TTL(15~30분), 만료 시 점유 자동 해제
  shipping_name / shipping_phone / shipping_address / shipping_postal_code / shipping_memo (NULL 가능)
  is_anonymous boolean             -- 공개 명단 익명 표시
  supporter_message text NULL      -- 응원 한마디(최대 500자, 개행 정규화)
  message_public boolean
  paid_at / cancelled_at / refunded_at
  agreed_terms / agreed_privacy boolean
  agreed_withdrawal_waiver boolean -- 주문제작 청약철회 제한 사전동의
  user_agent / ip_hash             -- 평문 IP 저장 금지(hash_ip 재사용)
  created_at / updated_at

pledge_items (후원 ↔ 티어; 1차는 단일 티어이나 구조는 N 대비)
  id uuid PK
  pledge_id uuid FK -> funding_pledges
  reward_tier_id uuid FK -> reward_tiers
  quantity integer
  unit_amount integer              -- 시점가 보존
  option_values jsonb              -- 각인 문구 등
  UNIQUE(pledge_id, reward_tier_id)

funding_payments (★ 작품 payments와 분리된 신규 테이블)
  id uuid PK
  pledge_id uuid FK -> funding_pledges
  payment_key text UNIQUE
  toss_order_id text
  method / amount / currency / status
  approved_at / cancelled_at
  confirm_response jsonb / webhook_responses jsonb[]
  idempotency_key text UNIQUE      -- 'fnd-confirm-{orderNo}' / 'fnd-webhook-{paymentKey}' prefix 분리
  created_at / updated_at
```

### 인덱스

- `funding_pledges (project_id, status)` — 집계·명단
- `funding_pledges (status, hold_expires_at) WHERE status='pending_payment'` — 만료 스윕/점유 SUM
- `funding_pledges (project_id, paid_at DESC) WHERE status='paid'` — 공개 명단
- `pledge_items (reward_tier_id)` — 점유 SUM

## 5. 동시성 & 데이터 정합성 (좌석 패턴 차용 — 교훈 반영)

선례: [register_event_seat / confirm_event_registration](../../../supabase/migrations/20260614190000_event_registrations.sql), [confirm state guard](../../../supabase/migrations/20260614190100_event_registration_confirm_guard.sql). 좌석 패턴의 핵심 5종(advisory lock + **파생 점유 SUM** + **hold TTL** + confirm 재검증 + `auth.role()` 가드)을 그대로 따른다.

- **점유는 캐시 컬럼이 아니라 파생 SUM**: 한정 티어 잔량은 매번
  ```sql
  SELECT COALESCE(SUM(pi.quantity),0)
  FROM pledge_items pi JOIN funding_pledges p ON p.id = pi.pledge_id
  WHERE pi.reward_tier_id = $1
    AND ( p.status='paid' OR (p.status='pending_payment' AND p.hold_expires_at > now()) )
  ```
  로 산정한다. 캐시 컬럼(claimed_quantity)을 두면 결제 이탈·환불 시 드리프트가 확정되므로 두지 않는다. 만료 pending은 `now()` 비교로 자동 제외 → 보상 트랜잭션 불필요.
- **공개 금액·후원자 수도 파생 집계**: `SUM(total_amount) WHERE status='paid'`, `COUNT WHERE status='paid'`. `funding_projects`에 raised/backer 캐시를 두지 않고, 마감 시 스냅샷([petition_snapshot](../../../supabase/migrations/20260427034200_petition_snapshot.sql) 패턴)만 보존. 환불은 집계 시점에 제외되어 과다집계 원천 차단.
- **advisory lock 키**: 무제한 티어(`total_quantity NULL`)는 점유 경쟁이 없으므로 lock 생략. 한정 티어는 `pg_advisory_xact_lock(hashtext('reward:'||tier_id))` 티어별 lock(여러 한정 티어 시 tier_id 정렬 후 순차 lock으로 데드락 회피).
- **confirm 단계 재검증**: `pending→paid` 승격 전 hold 만료 여부와 한정 티어 잔량을 재확인(oversell 방지). 상태 전이는 `WHERE status='pending_payment'`로 가드(refunded/cancelled replay 차단). 금액 가산이 아니라 status 전이 자체로 멱등 보장.
- **금액은 서버 계산만 신뢰**: `total_amount = reward_tiers.amount * quantity`를 RPC가 계산. 클라이언트 amount 폐기. tier가 해당 project 소유인지 검증(cross-project 변조 차단).
- **RLS 기본 deny**: `funding_pledges`/`pledge_items`/`funding_payments`에 anon/authenticated INSERT 정책을 만들지 않는다(전 쓰기는 service_role RPC 경유). 비회원 후원도 Server Action이 RPC로 처리.
- **SECURITY DEFINER RPC role 검사는 `auth.role()`만**: `request.jwt.claim.role` GUC는 라이브 PostgREST에서 NULL(동일 회귀 3회). `SET search_path = public, pg_catalog` 고정. end_at 자동 close cron 작성 시 구 GUC 검사 복붙 금지.

## 6. 결제 흐름

선례 베이스는 작품 confirm route(882줄 핫패스)가 아니라 **이벤트 결제 라우트**([app/api/payments/event/confirm/route.ts](../../../app/api/payments/event/confirm/route.ts)) — 같은 domestic MID 공유, 별도 lifecycle 테이블, 별도 confirm route.

```
1. /funding/[slug] 티어 선택 + (배송 필요 시) 배송지 + 약관 동의
2. createPledge server action
     - IP rate limit (+ email 키 추가 권장)
     - RPC create_funding_pledge:
         · (한정 티어면) 티어별 advisory lock + 파생 SUM 잔량 검사
         · total_amount 서버 계산, order_no 'FND-...' 생성, status=pending_payment, hold_expires_at 설정
         · checkout token(httpOnly cookie SHA256, 1h)
3. Toss SDK v2 결제창 (카드만, 1차)
4. /funding/[slug]/success — window.location.search로 파라미터 읽기
     (server searchParams 금지: Next.js 16 미들웨어 rewrite가 default-locale query 떨굼 회귀)
5. POST /api/payments/funding/toss/confirm
     - checkout token 검증(비회원 소유 증명) + 금액 이중검증(서버 계산값 == Toss DONE totalAmount)
     - RPC confirm_funding_pledge: pending→paid (WHERE status='pending_payment'로 멱등), hold/잔량 재검증
     - funding_payments insert, idempotency_key 'fnd-confirm-{orderNo}'
     - 23505(중복) 시 payment_key 재SELECT로 멱등 처리
     - after(): 결제 완료(paid)에만 알림 발송
6. POST /api/webhooks/funding/toss (백업)
     - FND 전용 endpoint. mutate 전 fetchPayment 재조회 + status 대조(위조·순서역전 방어)
     - 같은 confirm RPC 호출(멱등)
```

- **webhook 격리**: 같은 domestic MID라 FND 결제 webhook이 작품 webhook endpoint로도 들어온다. [lib/integrations/toss/webhook.ts](../../../lib/integrations/toss/webhook.ts)의 `isEventOrderId`처럼 **`isFundingOrderId`('FND-') 추가**, 작품 webhook 최상단에서 즉시 200 ack 후 무시(2026-06-15 EVT 거짓알림 폭주 회귀 방지).
- **stale cleanup / reconcile**: 작품 cron(`expire-stale-orders`/`reconcile-payments`)은 `orders` 전용. 펀딩용 별도 stale-cleanup + reconcile cron을 세트로(미입금/confirm 실패 pledge 정리). 단 점유는 파생 SUM이라 만료 자체는 cron 없이도 무해(위생용).
- **환불**: 자가취소 UI 없음. admin이 Toss 취소 API([cancel.ts](../../../lib/integrations/toss/cancel.ts))로 전액 취소 → `refunded`. 1차는 단일 티어라 부분환불 불필요. 단 **법정 7일 청약철회 요청은 admin이 처리**(기성품 리워드).

## 7. 페이지 & UI

**공개 (`app/[locale]/funding/[slug]/`)** — next-intl 메시지 필수, 갤러리 화이트큐브 디자인 토큰

- 펀딩 페이지: PageHero + 진행률(달성률·후원자수·D-day, 집계 view 폴링 — [ProgressBar](../../../app/[locale]/petition/oh-yoon/_components/ProgressBar.tsx) 패턴) + 스토리 + 리워드 티어 카드(금액·잔량·예상발송일·배송여부) + 후원 CTA(`Button variant="primary"`).
- 후원 플로우: 티어 선택 → 배송지/후원자 정보 → 약관 동의(청약철회·개인정보·Keep-it-All) + 주문제작 티어면 청약철회 제한 사전동의 체크 → Toss → success.
- 후원자 명단: 집계 view에서 `paid`만, `is_anonymous`면 '익명', 메시지는 `message_public` 한정. email/phone/배송지 **절대 비노출**(petition PII 격리 모델: anon REVOKE + 집계 view만 GRANT).
- 청원 연결: [/petition/oh-yoon](../../../app/[locale]/petition/oh-yoon/page.tsx) retention slot + 서명 완료 화면 + 발송 이메일에 펀딩 CTA.

**Admin (`app/(portal)/admin/funding/`)** — 영구 한국어(i18n 비스코프)

- 프로젝트 개설·수정(목표·기간·스토리·티어 CRUD), 후원자 명단·배송지 다운로드, 발송 상태 관리(기존 주문 배송 UI 재사용), Toss 취소 API 환불 예외처리. 모든 action 첫 줄 `requireAdmin()`.

## 8. 알림

`after()` + 기존 인프라([lib/server/after-response.ts](../../../lib/server/after-response.ts), [lib/notify.ts](../../../lib/notify.ts), [lib/sms/buyer-sms.ts](../../../lib/sms/buyer-sms.ts)). **결제 완료(paid)에만** 후원 확인 이메일(Resend, escapeHtml 적용) + SMS/알림톡(Solapi). pending 단계 발송 금지(스팸 벡터 차단). 발송 관리 알림은 기존 주문 템플릿 재사용. 1차는 이메일 우선, SMS는 기존 승인 템플릿 범위 내(신규 알림톡 템플릿 심사는 후속).

## 9. 약관·고지 체크리스트 (결제 전 노출 필수)

- [ ] 운영주체: 상호·대표·사업자번호·**통신판매업 신고번호**·주소·연락처
- [ ] 모집 목적·목표·기간·집행계획
- [ ] 환불/청약철회: 법정 7일 보장, 주문제작 예외(사전동의)
- [ ] **"세액공제용 기부금영수증 발급 불가"** 명시
- [ ] **Keep-it-All 고지** + **목적 불능 시 전용 조항**
- [ ] 리워드 미이행 시 책임, 개인정보 처리방침
- [ ] "기부·세액공제" 표현 리워드 티어 사용 금지

## 10. 롤아웃 순서

1. DB 마이그레이션(`funding_*` + `funding_payments`, RPC, RLS, 집계 view) — 단건 적용 원칙(여러 pending 시 `db push` 금지)
2. 후원 코어(create/confirm/webhook RPC + route, 카드 즉시결제, 단일 티어, FND webhook 격리)
3. 공개 펀딩 페이지 + 청원 연결
4. Admin 개설·관리
5. 알림 + 약관 + e2e-a11y spec(신규 공개 페이지 필수)
6. 오윤 첫 프로젝트 콘텐츠 입력 → 런칭

### 선행 운영 과제 (코드 외 — 사용자 트랙)

통신판매업 신고, 토스 가상계좌/정산분리 문의, 약관 법무 검토, 협동조합 사업자 유형·현금영수증 의무 세무 확인.

### 동시 작업 주의

codex가 `saf-refactor`(결제 리팩토링: `lib/commerce/`, confirm/webhook route, payment lifecycle)를 동시 진행 중. 펀딩이 의존하는 Toss 저수준·payment-record 헬퍼가 그 리팩토링 대상이므로, **구현 착수 전 saf-refactor 머지 상태를 확인하고 최신 인터페이스에 맞춘다.**

## 11. 전문가 검토 반영 요약

PG·DB동시성·전자상거래법무세무·보안 4개 검토 결과 중 설계에 반영한 핵심:

- (DB) payments 이중 FK 금지 → 별도 `funding_payments`
- (DB) 캐시 컬럼 금지 → 파생 SUM + hold TTL
- (PG) VA 제외(카드만), 단일 티어, 선례=이벤트 route
- (PG/보안) FND orderId webhook 격리
- (보안) reward_tier 서버 재조회, PII 집계 view, paid만 집계
- (동시성) 티어별 lock, confirm 재검증, auth.role() 가드
- (법무) 청약철회권 보장으로 환불정책 전환, 리워드형 구조, 기부금영수증 불가 명시, 목적불능 전용 조항

## 12. Phase B 확정 사항 (2026-06-23, 공개 펀딩 페이지)

### 오윤 프로젝트 콘텐츠

- `slug`: `oh-yoon-terracotta`, `goal_amount`: **100,000,000** (1억 원), `end_at`: **2026-07-31**(철거 전, 임시 — 조정 가능), `status`: `active`
- 스토리: 청원 페이지의 작품/위기 서사 재활용 + 모금 목적(시민이 직접 이전비 조달)

### 리워드 구성 (전부 리워드형 — 반대급부 필수)

- **엽서 티어** (`reward_kind='postcard'`, `requires_shipping=true`, `total_quantity=NULL` 무제한): 10,000 / 30,000 / 50,000 / 100,000 / 300,000 / 500,000 / 1,000,000 — 모두 오윤 엽서 답례. 고액(100만)도 엽서만 받는 후원자 수용.
- **사후판화 티어** (`reward_kind='print'`, `requires_shipping=true`, `total_quantity`=에디션 잔여): [oh-yun-prints](../../../content/imports/oh-yun-prints-2026.json) 가격대에서 선별한 N점. **펀딩 전용 독립 데이터**(reward_tiers에 제목·가격·이미지·수량 직접 입력, 기존 `/artworks` 작품 판매와 재고 분리 → 동시구매 충돌 없음).
- `reward_tiers.image_url`로 판화·엽서 썸네일 표시.

### 시드 전략

- admin 개설(Phase C) 전이므로 **시드 마이그레이션**으로 오윤 `funding_projects` 1행 + `reward_tiers`(엽서 7 + 판화 N) 적재. production 적용은 Phase A와 동일 방식(statement별 `db query --linked` 또는 대시보드).

### 페이지 `/funding/[slug]` (SSR + 진행률 동적)

표준 컴포넌트 재사용(PageHero·Section·Card — [feedback_reuse_standard_components]). 구성:
PageHero(다크) → 진행률 바(달성률%·모금액·후원자수·D-day, [petition ProgressBar](../../../app/[locale]/petition/oh-yoon/_components/ProgressBar.tsx) 패턴 + 폴링) → 스토리 → 리워드 목록(엽서 카드 + 판화 카드[이미지·잔여수량]) → 후원 CTA(`Button variant="primary"`) → 후원자 명단(집계 view, `paid`만, 익명 마스킹) → 청원 연결(retention).

### 후원 플로우 (client)

티어 선택 → 후원자 정보(이름·이메일·전화) + 배송지(엽서·판화 모두 배송) + 약관 동의(청약철회·개인정보·Keep-it-All 고지 체크박스) → `createPledge`(Phase A) → Toss SDK v2 결제창(카드, 기존 checkout SDK 패턴) → `/funding/[slug]/success`(window.location.search → `/api/payments/funding/toss/confirm`).

### API & 공개 데이터

- `GET /api/funding/[slug]/status` — `funding_project_status` RPC, ISR 60s (진행률 폴링)
- 후원자 명단 공개 집계 view — `paid`만, `is_anonymous`면 '익명', `email`/`phone`/`shipping_*`/`ip_hash` 절대 비노출 (petition PII 격리 모델: anon REVOKE + 집계 view만 GRANT)
- 신규 공개 페이지이므로 `e2e/a11y/`에 spec 추가 필수 (bg-primary+small text 금지 등 a11y 게이트)

### 약관 (Phase B 최소)

결제 전 핵심 고지(운영주체·환불/청약철회·기부금영수증 불가·Keep-it-All·목적불능 전용) 요약 + 동의 체크박스. 약관 전문 페이지는 Phase D.

## 13. Phase C 확정 사항 (2026-06-23, admin 펀딩 관리)

**풀 admin** — 프로젝트 개설·수정·티어 CRUD + 후원자 운영(명단·환불·발송). 범용(다른 작가 펀딩 대비). 한국어·**i18n 비스코프**(admin 정책).

### 데이터 보강 (발송 관리)

`funding_pledges`에 컬럼 추가(마이그레이션 1건):

- `fulfillment_status text DEFAULT 'none'` (`none`|`preparing`|`shipped`|`delivered`)
- `tracking_company text NULL`, `tracking_number text NULL`

### admin server actions (`app/actions/admin-funding.ts` — 전부 `requireAdmin()` + service_role RPC)

- `createFundingProject` / `updateFundingProject` — 제목·요약·스토리·커버·목표·기간·status
- `createRewardTier` / `updateRewardTier` / `deleteRewardTier` — paid 후원이 묶인 티어 삭제는 차단
- `listFundingBackers(projectId)` — admin은 PII 포함(배송지·이메일·전화·상태)
- `refundFundingPledge(pledgeId)` — `funding_payments.payment_key`로 Toss `cancelPayment` → `funding_pledges.status='refunded'`, `refunded_at`, funding_payments cancelled. **전액 환불만**(1차 단일 티어). Toss 취소 성공과 내부 sync 실패를 분리해 operator alert.
- `updateFulfillment(pledgeId, status, company?, number?)` — 발송상태·송장

### admin 페이지 (`app/(portal)/admin/funding/`, 기존 [event admin](<../../../app/(portal)/admin/event/oh-yoon-memorial/>) 패턴 미러)

- `/admin/funding` — 프로젝트 목록(달성률·후원자수·status)
- `/admin/funding/new` — 개설 폼
- `/admin/funding/[id]` — 프로젝트 수정 + 티어 CRUD + 후원자 명단(배송지·상태·환불 버튼·발송 입력) + CSV 내보내기

### 무결성 가드

- 프로젝트 status 전이 `draft→active→closed→settled` admin RPC에서만, 역행 금지.
- 환불은 `status='paid'`에서만. RPC role 검사 `auth.role()='service_role'`(§5).
- 티어 금액·수량 수정은 이미 paid 후원에 소급 안 됨(pledge_items.unit_amount 시점가 보존).
