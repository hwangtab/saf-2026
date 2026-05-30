-- 작품 치수 구조화 컬럼. 기존 size text는 표시용 원본으로 유지.
-- spec: docs/superpowers/specs/2026-05-30-artwork-size-db-design.md §3
alter table public.artworks
  add column if not exists width_cm  numeric(7,2),
  add column if not exists height_cm numeric(7,2),
  add column if not exists depth_cm  numeric(7,2),
  add column if not exists size_bucket text;

alter table public.artworks
  add constraint artworks_width_cm_positive  check (width_cm  is null or width_cm  > 0),
  add constraint artworks_height_cm_positive check (height_cm is null or height_cm > 0),
  add constraint artworks_depth_cm_positive  check (depth_cm  is null or depth_cm  > 0),
  add constraint artworks_size_bucket_valid  check (
    size_bucket is null or size_bucket in ('small','medium','large','xlarge','object')
  );

create index if not exists idx_artworks_size_bucket on public.artworks (size_bucket);
create index if not exists idx_artworks_dimensions  on public.artworks (width_cm, height_cm);
