# 소셜 미디어 자동 게시 (Instagram + Threads) — 설계

작성일: 2026-06-10

## 목표

Admin 포털에서 작품을 선택해 **Instagram 피드**에 게시하고 게시 이력을 추적한다. Instagram을 먼저
구현하되, 이후 **Threads**를 어댑터 하나만 추가하면 동작하도록 멀티 플랫폼 구조로 설계한다.

확정된 요구사항 (브레인스토밍):

- **트리거**: 순수 수동 — Admin 화면에서 작품 선택 후 버튼으로 즉시 게시 (자동/cron 없음)
- **캡션**: 혼합 — 템플릿으로 초안 자동 생성 + 게시 전 편집 가능
- **이미지**: 작품 대표 이미지 1장 (`artworks.images[0]`) 사용, 단일 이미지 포스트
- **이력**: Supabase DB 테이블에 저장 (일시·작품·상태·플랫폼 post id·에러), 재시도 가능
- **위치**: Admin nav `도구` 그룹 → `소셜 미디어` (`/admin/social`)

## 아키텍처

```
lib/social/
├── types.ts          # Platform, SocialPostStatus, PublishInput, PublishResult, SocialAdapter
├── caption.ts        # 작품 → 캡션 초안 자동 생성 (씨앗페 연대 프레이밍 준수)
├── image-url.ts      # artworks.images[0] → 공개 절대 URL 해석
├── instagram.ts      # Instagram Graph API 어댑터 (graph.instagram.com)
├── threads.ts        # Threads API 어댑터 (graph.threads.net)
└── registry.ts       # platform → adapter 매핑 + isPlatformConfigured(env 점검)

app/(portal)/admin/social/
├── page.tsx                      # 이력 목록 + "새 게시" + 플랫폼 설정 상태 배너
└── _components/
    ├── NewSocialPostModal.tsx     # 작품 검색·선택 → 이미지 미리보기 → 캡션 편집 → 플랫폼 선택 → 게시
    ├── SocialPostList.tsx         # 이력 테이블 (상태 배지·permalink·재시도·삭제)
    └── PlatformBadge.tsx          # instagram/threads 배지

app/actions/admin-social.ts        # publishSocialPost, listSocialPosts, retrySocialPost, deleteSocialPost, getSocialConfigStatus
                                    # (작품 검색은 기존 searchBroadcastArtworks 재사용)

supabase/migrations/<ts>_social_posts.sql
```

## 데이터 흐름 (게시)

1. Admin이 모달에서 작품 검색·선택 → `searchBroadcastArtworks` 재사용
2. 선택 시 `buildCaptionDraft(artwork)`로 캡션 초안 생성, textarea에 채움 (편집 가능)
3. 이미지 URL = `resolvePublicImageUrl(images[0])` (공개 절대 URL), 미리보기 + 편집 가능 override 필드
4. 플랫폼 체크박스 (Instagram/Threads) — `isPlatformConfigured`로 미설정 플랫폼은 비활성
5. "게시" → `publishSocialPost({ platform, artworkId, caption, imageUrl })` (선택된 플랫폼마다 1건)
6. Server Action:
   - `social_posts` INSERT (status=`publishing`)
   - 어댑터 `publish()` 호출 → 2단계 (컨테이너 생성 → media_publish)
   - 성공: status=`published`, `platform_post_id`, `permalink`, `published_at` 업데이트
   - 실패: status=`failed`, `error_message` 저장
   - `logAdminAction('social_publish', 'social_post', id, {...})`
   - `revalidatePath('/admin/social')`

## 어댑터 인터페이스

```ts
interface SocialAdapter {
  platform: Platform;
  isConfigured(): boolean;
  publish(input: PublishInput): Promise<PublishResult>; // 컨테이너 생성 → publish → permalink 조회(best effort)
}

type Platform = 'instagram' | 'threads';
interface PublishInput {
  caption: string;
  imageUrl?: string;
}
interface PublishResult {
  platformPostId: string;
  permalink: string | null;
}
```

- **Instagram** (`graph.instagram.com/v21.0`):
  1. `POST /{IG_USER_ID}/media` body `{ image_url, caption }`, Bearer 토큰 → `{ id }`
  2. `POST /{IG_USER_ID}/media_publish` body `{ creation_id }` → `{ id }`
  3. `GET /{id}?fields=permalink` (best effort)
  - 제약: 24h당 100건, **JPEG 권장**(비-JPEG는 API 에러 → error_message로 노출)
- **Threads** (`graph.threads.net/v1.0`):
  1. `POST /{THREADS_USER_ID}/threads` `{ media_type: 'IMAGE'|'TEXT', text, image_url? }` → `{ id }`
  2. 컨테이너 처리 대기(권장 ~수초 폴링) 후 `POST /{THREADS_USER_ID}/threads_publish` `{ creation_id }`
  3. `GET /{id}?fields=permalink` (best effort)

## DB 스키마 (`social_posts`)

```sql
create table public.social_posts (
  id               uuid primary key default gen_random_uuid(),
  platform         text not null check (platform in ('instagram','threads')),
  artwork_id       uuid references public.artworks(id) on delete set null,
  caption          text not null,
  image_url        text,
  status           text not null default 'pending'
                     check (status in ('pending','publishing','published','failed')),
  platform_post_id text,
  permalink        text,
  error_message    text,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  published_at     timestamptz
);
-- 인덱스: created_at desc, platform, status
-- RLS: enable + admin select 정책 (get_my_role()='admin'). 쓰기는 service-role(서버)만 → insert 정책 불요.
```

## 환경 변수

```
# Instagram (graph.instagram.com — Instagram Login, FB 페이지 불필요)
INSTAGRAM_ACCESS_TOKEN=          # 장기 사용자 토큰 (60일, 갱신 필요)
INSTAGRAM_USER_ID=               # Instagram 프로페셔널 계정 ID

# Threads (2차 — 미설정 시 UI에서 자동 비활성)
THREADS_ACCESS_TOKEN=
THREADS_USER_ID=
```

- 토큰 미설정 시 해당 플랫폼은 `isConfigured()=false` → UI 비활성 + 게시 시도 시 명확한 에러
- 프로덕션은 Vercel env에 추가 (사용자 수행)

## 캡션 프레이밍 (CLAUDE.md 캠페인 구조 준수)

- 출품 작가 = **연대자**. "대출 못 받는 불우한 작가" 프레이밍 **금지**
- 기본 템플릿: 작품명 · 작가명 · (매체·크기) · 가격 · 작품 링크 + 씨앗페 해시태그
- 금융 차별 데이터는 작가 개인 상황으로 서술하지 않음

## 에러 처리

- 어댑터: HTTP 비정상/Meta error JSON → `SocialPublishError(message)` throw, Server Action이 `failed` 기록
- 토큰 만료(190/적절 코드) → "토큰 만료 — 재발급 필요" 친화 메시지
- 미설정 플랫폼 게시 시도 → "환경 변수 미설정" 명시
- 재시도: `failed`/`published` 행을 같은 입력으로 재게시 (새 행 생성, 원본 유지)

## 테스트

- `caption.test.ts`: 템플릿 생성 (필드 누락·연대 프레이밍·해시태그)
- `image-url.test.ts`: 공개 절대 URL 해석 (상대/절대/storage)
- `instagram.test.ts`: fetch mock — 2단계 호출 순서·페이로드·에러 처리
- `threads.test.ts`: fetch mock — media_type 분기·publish
- `registry.test.ts`: env 유무에 따른 isPlatformConfigured

## 범위 밖 (이번 사이클 제외)

- 캐러셀(다중 이미지), Reels, 스토리
- 자동/예약 게시 (cron)
- 토큰 자동 갱신 cron (수동 재발급 안내로 대체)
- Threads 텍스트 외 고급 기능

```

```
