BEGIN;

-- ============================================================
-- 1. title_en 누락 4개 작품 보완
-- ============================================================

-- 심모비: "9505 SIM_Memory" — 작품명이 이미 영문 표기
UPDATE artworks
SET title_en = '9505 SIM_Memory'
WHERE id = 'fa4dbbe6-ff20-4977-a5e5-32e123ff6868'
  AND (title_en IS NULL OR title_en = '');

-- 박재동: "노무현" × 2 — 전직 대통령 로마자 표기
UPDATE artworks
SET title_en = 'Roh Moo-hyun'
WHERE id IN (
  'a8cca196-abeb-4af7-9edf-e7c4e185370c',
  '0e60e54b-9bb1-4715-8927-87d84f14d194'
)
  AND (title_en IS NULL OR title_en = '');

-- 박재동: "노무현(작품 다섯 점)" — 괄호 병기 포함
UPDATE artworks
SET title_en = 'Roh Moo-hyun (Five Works)'
WHERE id = '94637fa3-503d-4cf6-83da-067c20c54035'
  AND (title_en IS NULL OR title_en = '');

-- ============================================================
-- 2. 박재동 3개 작품 — artist_id 연결 수정 (artist_en 자동 복구)
--    artist_id 가 NULL 이거나 박재동 레코드를 가리키지 않는 경우만
-- ============================================================

UPDATE artworks a
SET artist_id = art.id
FROM (
  SELECT id FROM artists WHERE name_ko = '박재동' LIMIT 1
) art
WHERE a.id IN (
  'a8cca196-abeb-4af7-9edf-e7c4e185370c',
  '0e60e54b-9bb1-4715-8927-87d84f14d194',
  '94637fa3-503d-4cf6-83da-067c20c54035'
)
  AND (a.artist_id IS NULL OR a.artist_id != art.id);

-- ============================================================
-- 3. 심모비 "9505 SIM_Memory" — 가사(description) 영문 번역
-- ============================================================

UPDATE artworks
SET description_en =
'That trivial little thing
Not even a grain of sand in my life

Open the window let me feel that
Tell me you love me

Let it all go and get on
The sun melts away your worries
Think of coming back, sun-scorched

Open your heart please let me feel that
Tell me you''ll forget it all
Even our weary past season'
WHERE id = 'fa4dbbe6-ff20-4977-a5e5-32e123ff6868'
  AND (description_en IS NULL OR description_en = '');

COMMIT;
