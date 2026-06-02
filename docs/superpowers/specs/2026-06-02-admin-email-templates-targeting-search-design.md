# 관리자 이메일 — 템플릿 라이브러리 · 타겟팅 세분화 · 검색 발송 (설계)

- **날짜**: 2026-06-02
- **상태**: 설계 승인 대기
- **선행 시스템**: [2026-05-27 대량 이메일 시스템 설계](./2026-05-27-bulk-email-system-design.md)
- **유형**: 기존 라이브 기능 **확장** (그린필드 아님)

## 0. 맥락 (반드시 먼저 읽을 것)

요청은 "관리자 페이지에서 고객·청원자·작가/출품자 회원에게 종류별·기준별로 골라 이메일 발송"이었으나, **해당 대량 이메일 시스템은 이미 구현·main 머지·production env 설정 완료된 라이브 상태**다. 그래서 본 작업은 신규 구축이 아니라 **세 가지 갭을 메우는 확장**이다.

이미 동작하는 것 (`/admin/email`):

- 채널 3종: `member`(작가·출품자 업무) · `customer`(고객 마케팅, 광고) · `petition`(청원 알림)
- audience resolver 3종 + suppression 차감 + 정규화 dedup ([lib/email/audiences/](../../../lib/email/audiences/))
- 디스패치 크론(매분, 청크 100, 리스락) → Resend 배치 → [emails/broadcast.tsx](../../../emails/broadcast.tsx)
- 수신거부 토큰·엔드포인트(RFC 8058 패턴), 바운스/컴플레인 웹훅 자동 suppress
- 정통망법 §50 처리: customer 채널 "(광고)" 접두어 + 발송사 정보 footer
- 발송 전 수신자 수 미리보기·확정 체크박스·야간 발송 경고

**실전 발송 이력 0건** — 코드는 완성, 실전 검증 미실시. (테스트 발송 기능을 본 작업에 포함하는 이유)

## 1. 목표 / 비목표

### 목표

1. **템플릿 라이브러리** — 미리 쓰인 이메일 양식(스타터 프리셋)을 골라 폼을 채우고 자유 편집.
2. **타겟팅 세분화** — 채널 내에서 더 좁히기: ① 작가/출품자 분리 ② 청원 드롭다운 선택 ③ 특정 작품 구매자.
3. **검색 발송** — 보유 연락처를 이름·이메일로 검색해 개별/다수 선택 후 발송 (운영·광고 양용).

### 비목표 (YAGNI)

- 기간(가입·서명·구매일) 필터 — 이번 사이클 미선택
- 외부 임의 이메일 주소 추가 (동의 모델 우회 금지)
- 관리자용 템플릿 CRUD UI (코드 프리셋으로 충분)
- A/B 테스트, 예약 발송 시각 지정, SMS 브로드캐스트

## 2. 핵심 결정 (브레인스토밍 확정)

| 항목           | 결정                                                        |
| -------------- | ----------------------------------------------------------- |
| 템플릿 모델    | **스타터 프리셋** (골라서 자유 편집) — 슬롯형 아님          |
| 템플릿 관리    | **코드 프리셋** (`lib/email/templates.ts`) — DB CRUD 아님   |
| 타겟 기준      | 작가/출품자 분리 · 청원 드롭다운 · 특정 작품 구매자         |
| 검색 발송 용도 | 개별 연락 + ad-hoc 리스트 **둘 다** (운영/광고 토글로 구분) |
| 접근법         | **A. 기존 파이프라인 확장** (B 분리·C contacts 레이어 기각) |

## 3. 아키텍처

모든 발송은 기존 단일 경로를 그대로 탄다:

```
[폼: 템플릿 선택 + (세그먼트 | 검색) + 운영/광고]
        │
        ├─ 세그먼트 → resolver.resolve(filter)  ─┐
        └─ 검색     → 선택 리스트 + suppression 차감 ─┤
                                                    ▼
              email_broadcasts(INSERT) + email_broadcast_recipients(INSERT)
                                                    ▼
              broadcast-dispatch 크론(매분) → Resend 배치 → broadcast.tsx 렌더
                                                    ▼
              수신거부/바운스 → email_suppressions (기존 그대로)
```

검증된 안전장치(suppression·수신거부·웹훅·잠금·이력)를 100% 재사용한다. 변경은 ① 광고 분기를 채널에서 분리, ② `individual` 채널 추가, ③ resolver에 필터 인자, ④ 폼 UI 확장에 국한된다.

## 4. 데이터 모델 변경 — 마이그레이션 1개

신규 파일 `supabase/migrations/<ts>_email_broadcasts_individual_and_ad_flag.sql`:

```sql
-- 1) 광고 여부를 채널에서 분리 (현재 channel='customer' 하드코딩 → 명시 플래그)
ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS is_advertisement boolean NOT NULL DEFAULT false;

-- 기존 동작 보존: customer 채널은 광고였음
UPDATE public.email_broadcasts SET is_advertisement = true WHERE channel = 'customer';

-- 2) 검색 발송 전용 채널값 'individual' 추가
ALTER TABLE public.email_broadcasts DROP CONSTRAINT email_broadcasts_channel_check;
ALTER TABLE public.email_broadcasts ADD CONSTRAINT email_broadcasts_channel_check
  CHECK (channel IN ('customer', 'member', 'petition', 'individual'));

ALTER TABLE public.email_suppressions DROP CONSTRAINT email_suppressions_channel_check;
ALTER TABLE public.email_suppressions ADD CONSTRAINT email_suppressions_channel_check
  CHECK (channel IN ('customer', 'member', 'petition', 'individual', 'all'));
```

- **새 컬럼은 `is_advertisement` 하나만.** 세부 필터(`subset`/`artworkId`/`mode`)는 기존 `audience_filter jsonb`에 저장.
- MCP `apply_migration`으로 1건만 적용 (CLAUDE.md 정책). 파일은 `supabase/migrations/`에 보존.
- 적용 후 `generate_typescript_types`로 `types/supabase.ts` 재생성.

### 타입·런타임 touch points (`individual` 추가)

- [lib/email/audiences/types.ts](../../../lib/email/audiences/types.ts): `BroadcastChannel = 'customer'|'member'|'petition'|'individual'`
- [lib/email/unsubscribe-token.ts](../../../lib/email/unsubscribe-token.ts):47 — verify 화이트리스트에 `'individual'` 추가
- [app/api/email/unsubscribe/route.ts](../../../app/api/email/unsubscribe/route.ts):68 — `labels`에 `individual: '개별 발송'` 추가
- [emails/broadcast.tsx](../../../emails/broadcast.tsx): `channel` prop 타입 확장, `isAd` 결정을 prop으로 받기 (아래 §5)

## 5. 광고 분기 분리 (is_advertisement)

현재 [broadcast.tsx:38](../../../emails/broadcast.tsx)·[dispatch:162](../../../app/api/internal/broadcast-dispatch/route.ts)에서 `isAd = channel === 'customer'`로 하드코딩.

변경:

- `BroadcastEmailProps`에 `isAdvertisement: boolean` 추가 → `isAd`는 이 값 사용. `channel`은 unsub 토큰 스코프용으로만 유지.
- dispatch select에 `is_advertisement` 추가, `BroadcastEmail`에 전달, subject "(광고)" 접두어도 이 플래그로 판단.
- **불변식**: **고객 마케팅 세그먼트**(`CustomerAudienceResolver`로 추출하는 광범위 마케팅 리스트)는 항상 `is_advertisement=true` — enqueue에서 강제. 단 작품 구매자·검색 발송은 channel이 customer/individual이어도 **메시지 성격(운영/광고) 토글**에 따라 false 가능(운영·거래성 발송은 (광고) 표기 불필요, 정통망법상 합법). 즉 불변식은 *채널*이 아니라 *광범위 마케팅 세그먼트 사용 여부*에 건다.

| 발송 종류             | channel    | is_advertisement                   | unsub 스코프 |
| --------------------- | ---------- | ---------------------------------- | ------------ |
| 고객 마케팅(세그먼트) | customer   | **항상 true**                      | customer     |
| 작가·출품자(세그먼트) | member     | false                              | member       |
| 청원(세그먼트)        | petition   | false                              | petition     |
| 작품 구매자           | customer   | 운영=false / 광고=true(6개월 제한) | customer     |
| 검색 발송             | individual | 토글                               | individual   |

## 6. Feature 1 — 템플릿 라이브러리

### 데이터

신규 [lib/email/templates.ts](../../../lib/email/templates.ts):

```ts
export interface BroadcastTemplate {
  id: string; // 'new-artwork', 'exhibition-invite', ...
  label: string; // 드롭다운 표시명
  description: string; // 짧은 설명
  channel: BroadcastChannel; // 권장 채널 (선택 시 자동 설정, 편집 가능)
  isAdvertisement: boolean; // 권장 광고 여부
  subject: string;
  bodyMd: string; // 빈 줄로 문단 구분; {{name}} 토큰 허용
  ctaLabel?: string;
  ctaUrl?: string;
}
export const BROADCAST_TEMPLATES: BroadcastTemplate[];
```

### 시드 템플릿 (브랜드 톤: "연대자, not 불우한 작가")

- **member**: 전시 일정·준비 안내 / 출품·정산 안내 / 참여 작가 감사
- **customer(광고)**: 신작 입고 안내 / 전시 초대 / 컬렉션·기획전 추천
- **petition**: 진행 상황 업데이트 / 목표·마감 임박 / 결과 보고·감사
- **individual**: 문의 답변 / 구매 관련 개별 안내 / 작가 개별 안내

### 동작

- 폼 상단 "템플릿 선택" 드롭다운 → 선택 시 subject·bodyMd·cta·channel·isAdvertisement 필드 채움 → 자유 편집. (선택 안 함 = 빈 폼, 현 동작)
- 순수 프런트. enqueue·스키마 영향 없음.

### `{{name}}` 개인화 (선택 포함)

- 인사말("{name}님,")은 dispatch가 이미 자동 생성. 추가로 **본문 `{{name}}` 토큰**을 dispatch 렌더 시 `r.name ?? '회원'`으로 치환 (수신자명 없을 때 fallback). [dispatch:127](../../../app/api/internal/broadcast-dispatch/route.ts) `bodyParagraphs` 생성 직후 문자열 치환.

## 7. Feature 2 — 타겟팅 세분화

### ① 작가/출품자 분리

- [MemberAudienceResolver.resolve](../../../lib/email/audiences/member.ts)가 `filter.subset ∈ {'artist','exhibitor','all'}` 처리 (`'all'` 기본). `artist`면 exhibitor 쿼리 skip, `exhibitor`면 artists skip.
- `AudienceResolver.resolve(filter?)` 인터페이스에 인자 이미 존재 — 시그니처 변경 없음.
- 폼: channel=member 선택 시 하위 select(전체/작가만/출품자만) 노출. `audience_filter={subset}` 저장.

### ② 청원 드롭다운

- 신규 쿼리 `getActivePetitions()` (admin-broadcast.ts) → `petitions`에서 `slug, title, is_active` 조회.
- 폼: petition 선택 시 freeform 슬러그 입력을 드롭다운(slug·title)으로 교체 + 수신자 수 미리보기.
- enqueue는 이미 `petitionSlug`를 받음 — 백엔드 변경 최소.

### ③ 특정 작품 구매자

- 신규 `ArtworkBuyerAudienceResolver(artworkId)` ([lib/email/audiences/artwork-buyer.ts](../../../lib/email/audiences/artwork-buyer.ts)):
  - `orders`에서 `artwork_id = ?` + `status IN ('paid','preparing','shipped','delivered')` + `NOT is_test_buyer_email(buyer_email)` + `buyer_email IS NOT NULL`.
  - **광고 모드**: 추가로 `created_at >= now()-6개월` (정통망법 §50 거래고객 예외 유지).
  - `customer`+`all` suppression 차감, 정규화 dedup.
- enqueue: channel=`customer`, `audience_filter={ artworkId, mode:'artwork-buyer' }`. CustomerAudienceResolver 대신 이 resolver 사용 (channel은 unsub 스코프상 customer 유지).
- 폼: "특정 작품 구매자" 선택 시 작품 검색 select(제목→artwork_id) + 운영/광고 토글.

## 8. Feature 3 — 검색 발송

### 통합 연락처 검색

신규 서버 액션 `searchContacts(query: string)` (admin-broadcast.ts 또는 신규 `admin-contact-search.ts`):

- 입력(이름 또는 이메일 일부)으로 4개 출처 검색:
  - `orders` (buyer_name·buyer_email) → 라벨 "구매자"
  - `petition_signatures` (full_name·email, `is_masked=false`) → "서명자"
  - `artists` (name_ko·name_en·contact_email) → "작가"
  - `profiles` (name·email, role IN artist/exhibitor/user) → "회원"
- 이메일 정규화 dedup, 출처 라벨 병합(한 사람이 여러 출처면 합침).
- 각 결과에 **suppression 여부** 표시(이미 `all` 또는 `individual` suppress 시 발송 불가 배지).
- 결과 상한(예: 50) + "N건 더 있음" 표기 (silent truncation 금지).

### 발송

- 폼 검색 UI: 입력 → 결과 목록 → 체크 담기(1~다수) → 담긴 리스트(제거 가능) → 운영/광고 토글 → 발송.
- 신규 `enqueueIndividualBroadcast({ recipients: {email,name}[], subject, bodyMd, ctaLabel?, ctaUrl?, isAdvertisement })`:
  - 선택 리스트에서 `individual`+`all` suppression 차감, 정규화 dedup.
  - `email_broadcasts(channel='individual', is_advertisement, audience_filter={mode:'search'})` + recipients INSERT.
  - 기존 dispatch 크론이 그대로 발송. 수신거부 시 `channel='individual'` suppress (개별 발송만 차단, 세그먼트 무영향).
- locale: 검색 결과의 출처별 locale 알기 어려우므로 기본 `ko` (필요 시 추후 보강).

## 9. 横단 — 안전장치

- **"나에게 테스트 발송"** 버튼 (신규): 현재 폼 내용으로 관리자 본인 이메일에 1통 즉시 발송(`sendBatch` 직접 호출, 큐 우회). 실전 0건 리스크 완화 + 렌더 확인. 감사 로그 기록.
- 발송 전 수신자 수 미리보기·확정 체크박스·야간 경고 — 기존 유지, 검색 발송에도 적용.
- 모든 enqueue 경로 `logAdminAction('broadcast_enqueued', ...)` 감사 로그.
- admin 포털 = **전부 한국어 리터럴** (i18n 비대상). 발송 이메일 본문은 수신자 locale ko/en 유지(broadcast.tsx).
- 색상은 브랜드 토큰만 (DESIGN.md). admin-ui 컴포넌트 재사용.

## 10. UI 변경 — `/admin/email`

[BroadcastForm.tsx](<../../../app/(portal)/admin/email/_components/BroadcastForm.tsx>) 확장 (또는 발송 모드 탭 분리):

```
┌ 새 이메일 캠페인 ──────────────────────────────┐
│ [발송 모드]  ○ 세그먼트   ○ 검색 발송           │
│ [템플릿 선택 ▼] (선택 시 아래 필드 자동 채움)    │
│                                                  │
│ ── 세그먼트 모드 ──                              │
│ [채널 ▼] member|customer|petition|작품 구매자    │
│   · member → [하위: 전체/작가만/출품자만 ▼]      │
│   · petition → [청원 ▼ (목록)]                   │
│   · 작품 구매자 → [작품 검색 ▼] + [운영/광고]    │
│ [수신자 수 미리보기]                             │
│                                                  │
│ ── 검색 발송 모드 ──                             │
│ [검색: 이름/이메일] → 결과 체크 담기             │
│ [담긴 수신자 N명] (제거 가능) + [운영/광고]      │
│                                                  │
│ 제목 / 본문(마크다운) / CTA 라벨·URL             │
│ [나에게 테스트 발송]  ☑ 확정   [발송 예약]        │
└──────────────────────────────────────────────┘
```

## 11. 테스트 전략

- **단위**: `ArtworkBuyerAudienceResolver`(광고 시 6개월 제한·test buyer 제외·suppression 차감), `MemberAudienceResolver` subset 분기, `searchContacts` dedup·라벨 병합·suppression 배지, unsubscribe-token `individual` round-trip.
- **enqueue**: customer→is_advertisement 강제, individual suppression 차감, 멱등 가드 유지.
- **dispatch**: `is_advertisement` 기반 (광고) 접두어/footer 분기, `{{name}}` 치환·fallback.
- 기존 테스트(broadcast 관련) 회귀 없음 확인. `npm test`·`npm run type-check`·`npm run build`.

## 12. 파일 변경 맵

**신규**

- `supabase/migrations/<ts>_email_broadcasts_individual_and_ad_flag.sql`
- `lib/email/templates.ts`
- `lib/email/audiences/artwork-buyer.ts`
- (선택) `app/actions/admin-contact-search.ts`
- 테스트: `__tests__/lib/email/*`

**수정**

- `lib/email/audiences/types.ts` — `BroadcastChannel += 'individual'`
- `lib/email/audiences/member.ts` — `subset` 필터
- `lib/email/unsubscribe-token.ts` — `individual` 화이트리스트
- `app/api/email/unsubscribe/route.ts` — `individual` 라벨
- `emails/broadcast.tsx` — `isAdvertisement` prop, channel 타입 확장
- `app/api/internal/broadcast-dispatch/route.ts` — `is_advertisement` select·전달, `{{name}}` 치환
- `app/actions/admin-broadcast.ts` — `getActivePetitions`, artwork-buyer 분기, `enqueueIndividualBroadcast`, customer→ad 강제
- `app/(portal)/admin/email/_components/BroadcastForm.tsx`(+ `AudiencePreview.tsx`) — 템플릿 선택·발송 모드·세부 필터·검색 UI·테스트 발송
- `types/supabase.ts` — 재생성

## 13. 리스크 / 주의

- **마이그레이션은 production DB 직접 영향** — MCP `apply_migration` 1건, 사용자 컨펌 후.
- 실전 발송 0건 → 첫 실발송 전 반드시 "나에게 테스트 발송"으로 확인.
- 검색 발송이 동의 모델을 우회하지 않도록: 보유 연락처 한정 + suppression 차감 + 광고 시 (광고) 표기·footer 강제.
- customer 채널 audience가 현재 ~4명(opt-in 0) — 마케팅 효과는 marketing_consent 수집에 달림(본 작업 범위 밖, 별도 안내).
