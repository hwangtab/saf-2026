# 월간 아트 뉴스레터 시스템 설계

**날짜**: 2026-07-02
**상태**: 설계 승인됨 (구현 계획 수립 전)
**브랜치(예정)**: `feat/monthly-newsletter`

## 배경과 목표

기존 admin 이메일 시스템(`/admin/email`)은 안내·공지 위주의 단발 브로드캐스트에 맞춰져 있다. 여기에 **매월 발송하는 큐레이션 뉴스레터**를 추가한다. 작품 소개와 이벤트(예: 오윤 테라코타 기금마련전) 홍보를 카드 형태로 담고, 스티비 수준의 시각 완성도를 갖춘 이메일을 admin이 직접 조립·발송할 수 있어야 한다.

### 사용자 결정 사항 (2026-07-02 브레인스토밍)

1. **수신자 풀**: 기존 회원/구매자 중 수신동의자만. 신규 공개 구독 폼은 만들지 않는다. 기존 audience resolver(`lib/email/audiences/`)를 재사용한다.
2. **에디터 자유도**: 블록 조립식 에디터. 자유 드래그앤드롭 빌더(스티비식)는 과투자로 배제, 고정 템플릿 폼은 유연성 부족으로 배제.
3. **웹 아카이브**: 포함. 각 호를 공개 URL로 아카이브(스티비 '웹에서 보기' 상당). SNS 공유·SEO 유입 채널 겸용.
4. **아키텍처**: 접근 B — 뉴스레터를 1급 엔티티로 만들고, 발송은 기존 브로드캐스트 파이프라인에 올라탄다.

## 기존 인프라 (재사용 대상)

2026-07-02 코드베이스 탐사 결과. 이 설계는 아래를 전제로 한다.

| 자산                | 위치                                                                                  | 재사용 방식                       |
| ------------------- | ------------------------------------------------------------------------------------- | --------------------------------- |
| Resend 배치 발송    | `lib/email/resend-batch.ts` (`sendBatch`, 100건/요청, 멱등키, 재시도)                 | 그대로                            |
| 발송 cron           | `app/api/internal/broadcast-dispatch/route.ts` (1분 주기, 리스 락, 청크)              | 뉴스레터 렌더 분기 추가           |
| 브로드캐스트 테이블 | `email_broadcasts` + recipients 스냅샷                                                | `newsletter_id` 컬럼 추가         |
| 수신자 resolver     | `lib/email/audiences/{customer,member,petition,artwork-buyer}.ts`                     | 그대로 (customer/member 중심)     |
| 수신거부            | `email_suppressions` + RFC 8058 원클릭 + HMAC 토큰 (`lib/email/unsubscribe-token.ts`) | 그대로                            |
| (광고) 표기         | `emails/broadcast.tsx`의 `isAdvertisement` 로직                                       | 뉴스레터 템플릿에 동일 적용       |
| 리치 에디터         | `app/(portal)/admin/email/_components/RichEmailEditor.tsx` (TipTap)                   | text 블록 내부 에디터로 재사용    |
| 작품 검색           | `.../ArtworkSearchSelect.tsx` + `searchBroadcastArtworks` server action               | artworkCard 블록 삽입 UI로 재사용 |
| 수신자 수 미리보기  | `.../LiveAudienceCount.tsx`                                                           | 발송 준비 화면에서 재사용         |
| 이메일 레이아웃     | `emails/_components/saf-email-layout.tsx`                                             | 푸터(수신거부·발송자 정보) 재사용 |
| 이메일 이미지 정책  | `lib/email/rich-content.ts` (`assets/email-broadcasts/` 경로만 허용, 2MB)             | text 블록 내 이미지에 그대로      |
| 작품 이미지 변형    | Supabase storage `__card`(960px) 등 실물 파일 (`lib/utils/artwork-image.ts`)          | artworkCard 이미지 소스           |

## 1. 데이터 모델

### `newsletters` 테이블 (신규)

```sql
create table newsletters (
  id uuid primary key default gen_random_uuid(),
  issue_no int unique not null,          -- 제N호
  slug text unique not null,             -- '2026-07' (웹 아카이브 URL 세그먼트)
  title text not null default '',        -- 이메일 제목 겸 웹 제목
  preheader text not null default '',    -- 받은편지함 미리보기 문구
  blocks jsonb not null default '[]',    -- NewsletterBlock[]
  status text not null default 'draft',  -- draft | scheduled | sending | sent
  scheduled_at timestamptz,
  sent_at timestamptz,
  broadcast_id uuid references email_broadcasts(id),
  is_advertisement boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- RLS: admin 전용 (기존 admin 테이블 패턴 준수).
- 상태 전이: `draft → scheduled → sending → sent`. `scheduled → draft`(예약 취소) 허용. `sent`는 종착 — 편집 불가, 복제만 가능.
- migration은 `supabase/migrations/`에 작성, 단건 적용 정책(`supabase db query --linked -f`) 준수.

### `email_broadcasts.newsletter_id` 컬럼 (기존 테이블 확장)

```sql
alter table email_broadcasts add column newsletter_id uuid references newsletters(id);
```

디스패처가 이 컬럼으로 렌더 경로를 분기한다.

### 블록 스키마 — `lib/newsletter/blocks.ts` (단일 출처, Zod)

```typescript
type NewsletterBlock =
  | { type: 'cover'; title: string; subtitle?: string; imageUrl?: string }
  | { type: 'text'; html: string } // TipTap 산출, 기존 sanitize 통과
  | {
      type: 'artworkCard';
      artworkId: string;
      showPrice: boolean;
      snapshot: {
        title: string;
        artistName: string;
        imageUrl: string;
        description: string;
        price: string | null;
        url: string;
      };
    }
  | {
      type: 'eventBanner';
      title: string;
      dateText?: string;
      imageUrl?: string;
      ctaLabel: string;
      ctaUrl: string;
    }
  | { type: 'button'; label: string; url: string }
  | { type: 'divider' };
```

각 블록에 클라이언트 생성 `id: string`(uuid)을 부여해 리스트 편집 키로 쓴다.

**작품 스냅샷 원칙**: `artworkCard`는 삽입 시점에 작품 정보를 snapshot으로 복사한다. 발송된 메일은 불변이므로 스냅샷이 정합적이다. 소개글(`description`)은 작품 description에서 자동 시드 후 그 호에 맞게 수정 가능. 에디터에 "작품 정보 새로고침" 버튼을 두어 최신 DB 값으로 스냅샷을 갱신할 수 있다. 이미지는 `__card`(960px) 변형의 public object URL.

## 2. 블록 에디터 (admin)

- 라우트: `/admin/newsletter` (목록) + `/admin/newsletter/[id]` (편집기). admin 포털이므로 **한국어 리터럴 직접 작성** (i18n 비-스코프, CLAUDE.md).
- 목록: 호수·제목·상태·발송일·수신자 수. "새 호 만들기"(빈 초안)와 "다음 호 만들기"(직전 호 블록 구조 복제 — 스냅샷은 유지하되 status/발송 필드 초기화).
- 편집기 레이아웃: 좌측 블록 리스트 패널, 우측 실시간 미리보기.
  - 미리보기는 React Email 렌더 결과 HTML을 iframe(srcDoc)으로 표시 — 실제 발송물과 동일 렌더러.
  - 블록 조작은 버튼식(추가/삭제/↑/↓). 드래그앤드롭 미도입 (월 1회 편집 용도에 과함, 접근성·구현 단순성 우선).
- 블록별 편집 UI:
  - `text`: 기존 TipTap `RichEmailEditor` 재사용. 저장 전 기존 `sanitizeRichEmailHtml` 통과.
  - `artworkCard`: 기존 `ArtworkSearchSelect`로 검색·선택 → 스냅샷 생성. showPrice 토글.
  - `cover`/`eventBanner` 이미지: 기존 이메일 이미지 업로드 경로(`assets/email-broadcasts/`) 재사용.
- 저장: 명시적 저장 버튼 + dirty 상태 이탈 경고. (자동저장은 v1 비-스코프)
- 테스트 발송: 지정 이메일 1건으로 즉시 발송 (기존 개별 발송 경로 재사용).

## 3. 이메일 렌더링

- `emails/newsletter.tsx` 신규 — React Email 컴포넌트. `blocks: NewsletterBlock[]`을 받아 600px 단일 컬럼 매거진 레이아웃으로 렌더.
- 톤: 갤러리 화이트 큐브 (DESIGN.md). 색상 hex는 반드시 `BRAND_COLORS` import (`lib/colors.ts`) — 리터럴 금지.
- 작품 카드: 이미지 상단 배치, 제목(`.text-artwork-title` 상당의 도록 스타일), 작가명, 소개글, (옵션) 가격 — 가격 강조는 `sun` 토큰 텍스트. "작품 보러가기" 링크는 작품 상세 URL.
- 푸터: 기존 saf-email-layout 재사용 — 수신거부 링크(recipient별 HMAC 토큰), 발송자 정보, `is_advertisement`면 제목 `(광고)` 접두.
- 상단에 "웹에서 보기" 링크 → 웹 아카이브 URL.
- 호환성: react-email의 테이블 기반 산출에 의존. 배경 이미지 미사용(아웃룩 회피). 이미지는 절대 URL(Supabase public object URL)만.

## 4. 발송 플로우

1. 편집기에서 **발송 준비** → 수신자 채널 선택(customer/member — 기존 resolver) + `LiveAudienceCount`로 수신자 수 확인.
2. **즉시 발송** 또는 **예약**(`scheduled_at` 설정, status=`scheduled`).
3. 발송 시점(즉시든 예약 도래든): `email_broadcasts`에 행 생성(`newsletter_id` 세팅), recipients 스냅샷은 기존 로직 그대로. newsletters.status=`sending`.
   - 예약 도래 감지: 기존 1분 cron(`broadcast-dispatch`) 핸들러 앞단에서 due 뉴스레터(`status='scheduled' and scheduled_at <= now()`)를 enqueue. 신규 cron 불필요.
4. 디스패처 렌더 분기: broadcast 행에 `newsletter_id`가 있으면 `NewsletterEmail(blocks)`, 없으면 기존 `Broadcast(bodyHtml)`. 청크·리스 락·멱등성·재시도·suppression 필터는 기존 코드 그대로.
5. 전량 발송 완료 시 newsletters.status=`sent`, `sent_at` 기록, 웹 아카이브 revalidate.
6. `sent` 후 편집기는 읽기 전용 + "복제해서 다음 호 만들기"만 노출.

## 5. 웹 아카이브 (공개)

- `app/[locale]/newsletter/page.tsx` — 발행호 목록 (status=`sent`만). SSG + 발송 시 revalidate.
- `app/[locale]/newsletter/[slug]/page.tsx` — 개별 호. 같은 blocks 데이터를 **웹 전용 컴포넌트로 병렬 렌더** (이메일 HTML 재사용 아님 — 웹은 반응형·고해상도·표준 컴포넌트 사용 가능).
- 공개 라우트이므로 **next-intl 메시지 필수** (chrome 텍스트: "지난 뉴스레터", "웹에서 보기" 등). 뉴스레터 본문 자체는 작성 언어(한국어) 그대로.
- 비-hero standalone 페이지 → `HEADER_SAFE_TOP_PADDING` 적용 + `__tests__/lib/page-header-clearance.test.ts`에 케이스 추가. 푸터 sawtooth 위 `SAWTOOTH_TOP_SAFE_PADDING`.
- SEO: 호별 metadata, OG 이미지는 cover 이미지. `sent`만 색인 허용.
- 이메일 상단 "웹에서 보기"가 이 URL을 가리킴.

## 6. 엣지 케이스·에러 처리

| 상황                        | 처리                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| 발송 후 작품 판매/가격 변경 | 이메일·아카이브 모두 스냅샷 유지(발송물 불변). 링크 타면 현재 상태 확인 가능              |
| 스냅샷 이미지 URL 깨짐      | 발송 준비 단계에서 블록 내 이미지 URL 존재 검증(HEAD), 실패 시 발송 차단 + 해당 블록 표시 |
| 수신자 0명/오발송           | 발송 확인 화면에 채널·수신자 수·(광고) 여부 요약 (기존 `SendSummaryCard` 패턴)            |
| 예약 후 내용 수정           | `scheduled` 상태에서는 편집 잠금. "예약 취소" 버튼으로 `draft` 회귀 후 편집               |
| slug/호수 중복              | DB unique 제약 + 폼 검증                                                                  |
| 발송 중 실패 잔량           | 기존 파이프라인의 재시도·부분 실패 리포트 그대로. 이력 화면에서 확인                      |

## 7. 테스트

- `lib/newsletter/blocks.ts` Zod 스키마 단위 테스트 (유효/무효 블록).
- blocks fixture → `NewsletterEmail` 렌더 → HTML에 핵심 요소(작품 제목, 수신거부 링크, (광고) 표기) 존재 검증.
- 디스패처 분기(newsletter_id 유무) 테스트.
- `page-header-clearance` 정적 테스트에 `/newsletter` 추가.
- 기존 audience/발송 파이프라인은 기존 테스트 커버리지에 의존 (변경 최소).

## 비-스코프 (v1 제외)

- 신규 공개 구독 폼, 구독자 성장 채널 (수신자 풀 결정에 따라 배제)
- 드래그앤드롭 편집, 열 분할 레이아웃
- 오픈율/클릭율 트래킹 (Resend 웹훅 연동 — 추후 별도 사이클)
- 자동 콘텐츠 생성(이달의 작품 자동 선정), 발송 자동화(매월 자동 발송 — 사람이 조립하는 콘텐츠라 무의미)
- exhibitor/artist 포털 노출
