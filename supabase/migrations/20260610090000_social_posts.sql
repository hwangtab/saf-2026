-- 소셜 미디어 게시 이력 (Instagram / Threads 수동 게시 + 재시도 추적)
create table if not exists public.social_posts (
  id               uuid primary key default gen_random_uuid(),
  platform         text not null check (platform in ('instagram', 'threads')),
  artwork_id       uuid references public.artworks(id) on delete set null,
  caption          text not null,
  image_url        text,
  status           text not null default 'pending'
                     check (status in ('pending', 'publishing', 'published', 'failed')),
  platform_post_id text,                    -- Instagram/Threads media id (게시 성공 시)
  permalink        text,                     -- 게시물 공개 링크 (best effort 조회)
  error_message    text,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  published_at     timestamptz
);

create index if not exists social_posts_created_at_idx on public.social_posts (created_at desc);
create index if not exists social_posts_platform_idx on public.social_posts (platform);
create index if not exists social_posts_status_idx on public.social_posts (status);
create index if not exists social_posts_artwork_id_idx on public.social_posts (artwork_id);

alter table public.social_posts enable row level security;

-- 관리자만 조회. 쓰기는 service-role(서버 Server Action)만 — service-role은 RLS 우회하므로
-- insert/update/delete 정책 불요(sms_logs와 동일 패턴).
create policy "admins_can_view_social_posts" on public.social_posts
  for select using (get_my_role() = 'admin');

comment on table public.social_posts is '소셜 미디어(Instagram/Threads) 게시 이력 — 수동 게시 + 재시도 추적';
