BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS career_tier text;
COMMENT ON COLUMN public.artists.career_tier IS '작가 경력 단계: 신진/중견/거장 (신진 작가 발견 큐레이션 + 거장 라인업 단일 출처 — 매뉴얼 9.2)';
COMMIT;
