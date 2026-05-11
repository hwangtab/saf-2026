-- Foreign key 인덱스 보강.
--
-- Supabase performance advisor `unindexed_foreign_keys` 5건 해소.
-- FK 컬럼에 인덱스가 없으면 부모 row 삭제(ON DELETE CASCADE/SET NULL)나
-- nested join 시 full scan 비용. artworks.artist_id는 모든 gallery 페이지의
-- artists 조인 hot path라 가장 큰 효과.
--
-- 모든 인덱스는 IF NOT EXISTS — 재실행 안전.
-- supabase migration은 transaction 안에서 실행되므로 CONCURRENTLY 사용 불가.
-- 테이블 크기(artworks 379, 나머지 더 작음)에서 lock 영향 무시 가능.

CREATE INDEX IF NOT EXISTS idx_artworks_artist_id
  ON public.artworks (artist_id);

CREATE INDEX IF NOT EXISTS idx_artists_owner_id
  ON public.artists (owner_id);

CREATE INDEX IF NOT EXISTS idx_artists_notice_updated_by
  ON public.artists (notice_updated_by);

CREATE INDEX IF NOT EXISTS idx_activity_logs_purged_by
  ON public.activity_logs (purged_by);

CREATE INDEX IF NOT EXISTS idx_petition_signatures_masked_by
  ON public.petition_signatures (masked_by);
